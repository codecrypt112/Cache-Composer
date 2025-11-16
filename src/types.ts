export interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  tags?: string[];
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  tags?: string[];
  priority?: number;
}

export interface InvalidationStrategy {
  type: 'ttl' | 'lru' | 'lfu' | 'manual';
  maxSize?: number;
  maxAge?: number;
}

export interface CacheLayerConfig {
  enabled: boolean;
  maxSize?: number;
  ttl?: number;
  invalidation?: InvalidationStrategy;
}

export interface CacheComposerConfig {
  memory?: CacheLayerConfig;
  redis?: CacheLayerConfig & {
    client?: any;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
  file?: CacheLayerConfig & {
    directory?: string;
  };
  analytics?: boolean;
  warmup?: {
    enabled: boolean;
    keys?: Array<{ key: string; loader: () => Promise<any>; options?: CacheOptions }>;
  };
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  totalRequests: number;
  layerStats: {
    memory?: LayerStats;
    redis?: LayerStats;
    file?: LayerStats;
  };
}

export interface LayerStats {
  hits: number;
  misses: number;
  size: number;
  avgAccessTime: number;
}

export interface CacheLayer {
  name: string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
  getStats(): LayerStats;
}
