import { CacheLayer, CacheEntry, CacheOptions, LayerStats } from '../types';

export class FileLayer implements CacheLayer {
  name = 'file';
  private stats: LayerStats = { hits: 0, misses: 0, size: 0, avgAccessTime: 0 };
  private accessTimes: number[] = [];
  private defaultTTL: number;
  private directory: string;
  private fs: any;
  private path: any;
  private isNode: boolean;

  constructor(directory = '.cache', defaultTTL = 3600000) {
    this.directory = directory;
    this.defaultTTL = defaultTTL;
    this.isNode = typeof process !== 'undefined' && !!process.versions?.node;

    if (this.isNode) {
      try {
        this.fs = require('fs').promises;
        this.path = require('path');
        this.ensureDirectory();
      } catch (error) {
        console.warn('File system not available, FileLayer disabled');
      }
    }
  }

  private async ensureDirectory(): Promise<void> {
    if (!this.fs) return;
    try {
      await this.fs.mkdir(this.directory, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private getFilePath(key: string): string {
    const hash = this.hashKey(key);
    return this.path.join(this.directory, `${hash}.json`);
  }

  private hashKey(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.fs) return null;

    const start = performance.now();
    
    try {
      const filePath = this.getFilePath(key);
      const data = await this.fs.readFile(filePath, 'utf-8');
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
    if (!this.fs) return;

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
      const filePath = this.getFilePath(key);
      await this.fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
    } catch (error) {
      console.error('File write error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.fs) return false;

    try {
      const filePath = this.getFilePath(key);
      await this.fs.unlink(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.fs) return;

    try {
      const files = await this.fs.readdir(this.directory);
      await Promise.all(
        files.map((file: string) => 
          this.fs.unlink(this.path.join(this.directory, file))
        )
      );
    } catch (error) {
      console.error('File clear error:', error);
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.fs) return false;

    try {
      const filePath = this.getFilePath(key);
      await this.fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async keys(): Promise<string[]> {
    if (!this.fs) return [];

    try {
      const files = await this.fs.readdir(this.directory);
      return files.map((f: string) => f.replace('.json', ''));
    } catch (error) {
      return [];
    }
  }

  async size(): Promise<number> {
    if (!this.fs) return 0;

    try {
      const files = await this.fs.readdir(this.directory);
      return files.length;
    } catch (error) {
      return 0;
    }
  }

  getStats(): LayerStats {
    return { ...this.stats };
  }

  async deleteByTag(tag: string): Promise<number> {
    if (!this.fs) return 0;

    let count = 0;
    try {
      const files = await this.fs.readdir(this.directory);
      
      for (const file of files) {
        const filePath = this.path.join(this.directory, file);
        const data = await this.fs.readFile(filePath, 'utf-8');
        const entry: CacheEntry = JSON.parse(data);
        
        if (entry.tags?.includes(tag)) {
          await this.fs.unlink(filePath);
          count++;
        }
      }
    } catch (error) {
      console.error('Delete by tag error:', error);
    }

    return count;
  }

  private recordAccessTime(time: number): void {
    this.accessTimes.push(time);
    if (this.accessTimes.length > 100) {
      this.accessTimes.shift();
    }
    this.stats.avgAccessTime = this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length;
  }
}
