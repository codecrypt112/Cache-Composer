import { CacheComposerConfig, CacheOptions, CacheStats, CacheLayer } from './types';
import { MemoryLayer } from './layers/MemoryLayer';
import { RedisLayer } from './layers/RedisLayer';
import { FileLayer } from './layers/FileLayer';

export class CacheComposer {
  private layers: CacheLayer[] = [];
  private config: CacheComposerConfig;
  private analytics: boolean;
  private globalStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor(config: CacheComposerConfig = {}) {
    this.config = config;
    this.analytics = config.analytics ?? true;
    this.initializeLayers();
    
    if (config.warmup?.enabled) {
      this.warmup();
    }
  }

  private initializeLayers(): void {
    // Memory layer (always first for fastest access)
    if (this.config.memory?.enabled !== false) {
      const memConfig = this.config.memory;
      this.layers.push(
        new MemoryLayer(
          memConfig?.maxSize || 1000,
          memConfig?.ttl || 3600000,
          memConfig?.invalidation || { type: 'lru' }
        )
      );
    }

    // Redis layer
    if (this.config.redis?.enabled && this.config.redis.client) {
      this.layers.push(
        new RedisLayer(
          this.config.redis.client,
          this.config.redis.ttl || 3600000
        )
      );
    }

    // File layer
    if (this.config.file?.enabled) {
      this.layers.push(
        new FileLayer(
          this.config.file.directory || '.cache',
          this.config.file.ttl || 3600000
        )
      );
    }
  }

  async get<T>(key: string): Promise<T | null> {
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const value = await layer.get<T>(key);

      if (value !== null) {
        if (this.analytics) this.globalStats.hits++;
        
        // Populate higher layers (cache promotion)
        for (let j = 0; j < i; j++) {
          await this.layers[j].set(key, value);
        }

        return value;
      }
    }

    if (this.analytics) this.globalStats.misses++;
    return null;
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    if (this.analytics) this.globalStats.sets++;

    // Set in all layers
    await Promise.all(
      this.layers.map(layer => layer.set(key, value, options))
    );
  }

  async delete(key: string): Promise<boolean> {
    if (this.analytics) this.globalStats.deletes++;

    const results = await Promise.all(
      this.layers.map(layer => layer.delete(key))
    );

    return results.some(r => r);
  }

  async clear(): Promise<void> {
    await Promise.all(this.layers.map(layer => layer.clear()));
  }

  async has(key: string): Promise<boolean> {
    for (const layer of this.layers) {
      if (await layer.has(key)) {
        return true;
      }
    }
    return false;
  }

  async keys(): Promise<string[]> {
    const allKeys = await Promise.all(
      this.layers.map(layer => layer.keys())
    );
    return [...new Set(allKeys.flat())];
  }

  async deleteByTag(tag: string): Promise<number> {
    let totalDeleted = 0;

    for (const layer of this.layers) {
      if ('deleteByTag' in layer && typeof layer.deleteByTag === 'function') {
        const deleted = await (layer as any).deleteByTag(tag);
        totalDeleted += deleted;
      }
    }

    return totalDeleted;
  }

  async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await loader();
    await this.set(key, value, options);
    return value;
  }

  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        if (value !== null) {
          results.set(key, value);
        }
      })
    );

    return results;
  }

  async mset<T>(entries: Map<string, T>, options: CacheOptions = {}): Promise<void> {
    await Promise.all(
      Array.from(entries.entries()).map(([key, value]) =>
        this.set(key, value, options)
      )
    );
  }

  getStats(): CacheStats {
    const totalRequests = this.globalStats.hits + this.globalStats.misses;
    const hitRate = totalRequests > 0 ? this.globalStats.hits / totalRequests : 0;

    const layerStats: any = {};
    for (const layer of this.layers) {
      layerStats[layer.name] = layer.getStats();
    }

    return {
      hits: this.globalStats.hits,
      misses: this.globalStats.misses,
      sets: this.globalStats.sets,
      deletes: this.globalStats.deletes,
      hitRate,
      totalRequests,
      layerStats,
    };
  }

  resetStats(): void {
    this.globalStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }

  private async warmup(): Promise<void> {
    const warmupConfig = this.config.warmup;
    if (!warmupConfig?.keys) return;

    await Promise.all(
      warmupConfig.keys.map(async ({ key, loader, options }) => {
        try {
          const value = await loader();
          await this.set(key, value, options);
        } catch (error) {
          console.error(`Warmup failed for key ${key}:`, error);
        }
      })
    );
  }

  async invalidatePattern(pattern: RegExp): Promise<number> {
    const allKeys = await this.keys();
    const matchingKeys = allKeys.filter(key => pattern.test(key));
    
    await Promise.all(matchingKeys.map(key => this.delete(key)));
    
    return matchingKeys.length;
  }

  async ttl(key: string): Promise<number | null> {
    const layer = this.layers[0];
    if (!layer) return null;

    const value = await layer.get(key);
    if (!value) return null;

    // This is a simplified version - in production you'd store TTL metadata
    return -1; // -1 means no expiry or unknown
  }

  async touch(key: string, ttl?: number): Promise<boolean> {
    const value = await this.get(key);
    if (value === null) return false;

    await this.set(key, value, { ttl });
    return true;
  }
}
