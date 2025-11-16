import { CacheLayer, CacheEntry, CacheOptions, LayerStats, InvalidationStrategy } from '../types';

export class MemoryLayer implements CacheLayer {
  name = 'memory';
  private cache: Map<string, CacheEntry> = new Map();
  private stats: LayerStats = { hits: 0, misses: 0, size: 0, avgAccessTime: 0 };
  private accessTimes: number[] = [];
  private maxSize: number;
  private defaultTTL: number;
  private invalidation: InvalidationStrategy;

  constructor(maxSize = 1000, defaultTTL = 3600000, invalidation: InvalidationStrategy = { type: 'lru' }) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.invalidation = invalidation;
  }

  async get<T>(key: string): Promise<T | null> {
    const start = performance.now();
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.recordAccessTime(performance.now() - start);
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      this.recordAccessTime(performance.now() - start);
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.recordAccessTime(performance.now() - start);
    return entry.value as T;
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    const ttl = options.ttl || this.defaultTTL;
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      tags: options.tags,
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
  }

  async delete(key: string): Promise<boolean> {
    const result = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return result;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.size = 0;
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  getStats(): LayerStats {
    return { ...this.stats };
  }

  async deleteByTag(tag: string): Promise<number> {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.stats.size = this.cache.size;
    return count;
  }

  private evict(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string | null = null;

    switch (this.invalidation.type) {
      case 'lru':
        keyToEvict = this.evictLRU();
        break;
      case 'lfu':
        keyToEvict = this.evictLFU();
        break;
      default:
        keyToEvict = this.evictLRU();
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
    }
  }

  private evictLRU(): string | null {
    let oldest = Infinity;
    let keyToEvict: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldest) {
        oldest = entry.lastAccessed;
        keyToEvict = key;
      }
    }

    return keyToEvict;
  }

  private evictLFU(): string | null {
    let lowest = Infinity;
    let keyToEvict: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < lowest) {
        lowest = entry.accessCount;
        keyToEvict = key;
      }
    }

    return keyToEvict;
  }

  private recordAccessTime(time: number): void {
    this.accessTimes.push(time);
    if (this.accessTimes.length > 100) {
      this.accessTimes.shift();
    }
    this.stats.avgAccessTime = this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length;
  }
}
