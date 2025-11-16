import { CacheLayer, CacheEntry, CacheOptions, LayerStats } from '../types';

export class RedisLayer implements CacheLayer {
  name = 'redis';
  private client: any;
  private stats: LayerStats = { hits: 0, misses: 0, size: 0, avgAccessTime: 0 };
  private accessTimes: number[] = [];
  private defaultTTL: number;
  private prefix: string;

  constructor(client: any, defaultTTL = 3600000, prefix = 'cache:') {
    this.client = client;
    this.defaultTTL = defaultTTL;
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const start = performance.now();
    
    try {
      const data = await this.client.get(this.getKey(key));
      
      if (!data) {
        this.stats.misses++;
        this.recordAccessTime(performance.now() - start);
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(data);
      
      if (entry.expiresAt < Date.now()) {
        await this.delete(key);
        this.stats.misses++;
        this.recordAccessTime(performance.now() - start);
        return null;
      }

      this.stats.hits++;
      this.recordAccessTime(performance.now() - start);
      return entry.value;
    } catch (error) {
      this.stats.misses++;
      this.recordAccessTime(performance.now() - start);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || this.defaultTTL;
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      tags: options.tags,
    };

    try {
      await this.client.set(
        this.getKey(key),
        JSON.stringify(entry),
        'PX',
        ttl
      );

      if (options.tags) {
        for (const tag of options.tags) {
          await this.client.sadd(`${this.prefix}tag:${tag}`, key);
        }
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(this.getKey(key));
      return result > 0;
    } catch (error) {
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.error('Redis clear error:', error);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(this.getKey(key));
      return exists === 1;
    } catch (error) {
      return false;
    }
  }

  async keys(): Promise<string[]> {
    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      return keys.map((k: string) => k.replace(this.prefix, ''));
    } catch (error) {
      return [];
    }
  }

  async size(): Promise<number> {
    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      return keys.length;
    } catch (error) {
      return 0;
    }
  }

  getStats(): LayerStats {
    return { ...this.stats };
  }

  async deleteByTag(tag: string): Promise<number> {
    try {
      const keys = await this.client.smembers(`${this.prefix}tag:${tag}`);
      if (keys.length === 0) return 0;

      const fullKeys = keys.map((k: string) => this.getKey(k));
      await this.client.del(...fullKeys);
      await this.client.del(`${this.prefix}tag:${tag}`);
      
      return keys.length;
    } catch (error) {
      return 0;
    }
  }

  private recordAccessTime(time: number): void {
    this.accessTimes.push(time);
    if (this.accessTimes.length > 100) {
      this.accessTimes.shift();
    }
    this.stats.avgAccessTime = this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length;
  }
}
