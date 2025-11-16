# Cache Composer

[![npm version](https://img.shields.io/npm/v/cache-composer.svg)](https://www.npmjs.com/package/cache-composer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/github/stars/codecrypt112/Cache-Composer?style=social)](https://github.com/codecrypt112/Cache-Composer)

Advanced multi-layer caching library with memory, Redis, and file storage. Features automatic invalidation strategies, cache warming, and comprehensive analytics.

## Features

- **Multi-Layer Caching**: Memory → Redis → File system with automatic promotion
- **Invalidation Strategies**: LRU, LFU, TTL-based, and manual invalidation
- **Cache Warming**: Pre-populate cache on startup
- **Tag-Based Invalidation**: Group and invalidate related cache entries
- **Analytics**: Hit/miss rates, access times, and per-layer statistics
- **Universal**: Works in Node.js, React, and browser environments
- **TypeScript**: Full type safety and IntelliSense support

## Installation

```bash
npm install cache-composer
```

For Redis support:
```bash
npm install cache-composer ioredis
```

## Quick Start

### Basic Usage (Memory Only)

```typescript
import { CacheComposer } from 'cache-composer';

const cache = new CacheComposer();

// Set a value
await cache.set('user:123', { name: 'John', age: 30 });

// Get a value
const user = await cache.get('user:123');

// Get or set with loader
const data = await cache.getOrSet('expensive-data', async () => {
  return await fetchExpensiveData();
}, { ttl: 60000 }); // 1 minute TTL
```

### Multi-Layer Configuration

```typescript
import { CacheComposer } from 'cache-composer';
import Redis from 'ioredis';

const redis = new Redis();

const cache = new CacheComposer({
  memory: {
    enabled: true,
    maxSize: 1000,
    ttl: 60000, // 1 minute
    invalidation: { type: 'lru' }
  },
  redis: {
    enabled: true,
    client: redis,
    ttl: 3600000 // 1 hour
  },
  file: {
    enabled: true,
    directory: '.cache',
    ttl: 86400000 // 24 hours
  },
  analytics: true
});
```


### React Usage

```typescript
import { CacheComposer } from 'cache-composer';
import { useEffect, useState } from 'react';

const cache = new CacheComposer();

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    cache.getOrSet(`user:${userId}`, async () => {
      const response = await fetch(`/api/users/${userId}`);
      return response.json();
    }, { ttl: 300000 }).then(setUser);
  }, [userId]);

  return <div>{user?.name}</div>;
}
```

## API Reference

### Core Methods

#### `get<T>(key: string): Promise<T | null>`
Retrieve a value from cache.

#### `set<T>(key: string, value: T, options?: CacheOptions): Promise<void>`
Store a value in cache.

Options:
- `ttl`: Time to live in milliseconds
- `tags`: Array of tags for grouped invalidation

#### `delete(key: string): Promise<boolean>`
Remove a key from cache.

#### `clear(): Promise<void>`
Clear all cache entries.

#### `getOrSet<T>(key: string, loader: () => Promise<T>, options?: CacheOptions): Promise<T>`
Get from cache or load and cache if missing.

### Advanced Methods

#### `mget<T>(keys: string[]): Promise<Map<string, T>>`
Get multiple keys at once.

#### `mset<T>(entries: Map<string, T>, options?: CacheOptions): Promise<void>`
Set multiple keys at once.

#### `deleteByTag(tag: string): Promise<number>`
Delete all entries with a specific tag.

#### `invalidatePattern(pattern: RegExp): Promise<number>`
Delete all keys matching a pattern.

#### `touch(key: string, ttl?: number): Promise<boolean>`
Refresh TTL for a key.

### Analytics

#### `getStats(): CacheStats`
Get comprehensive cache statistics.

```typescript
const stats = cache.getStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Memory layer hits: ${stats.layerStats.memory?.hits}`);
```

#### `resetStats(): void`
Reset analytics counters.

## Advanced Features

### Cache Warming

Pre-populate cache on startup:

```typescript
const cache = new CacheComposer({
  warmup: {
    enabled: true,
    keys: [
      {
        key: 'config',
        loader: async () => await loadConfig(),
        options: { ttl: 3600000 }
      },
      {
        key: 'popular-items',
        loader: async () => await fetchPopularItems()
      }
    ]
  }
});
```

### Tag-Based Invalidation

Group related cache entries:

```typescript
// Set with tags
await cache.set('user:123', userData, { tags: ['users', 'profile'] });
await cache.set('user:456', userData2, { tags: ['users', 'profile'] });

// Invalidate all user-related cache
await cache.deleteByTag('users');
```

### Invalidation Strategies

```typescript
const cache = new CacheComposer({
  memory: {
    enabled: true,
    maxSize: 1000,
    invalidation: { 
      type: 'lru' // or 'lfu', 'ttl', 'manual'
    }
  }
});
```

- **LRU** (Least Recently Used): Evicts least recently accessed items
- **LFU** (Least Frequently Used): Evicts least frequently accessed items
- **TTL**: Time-based expiration
- **Manual**: No automatic eviction

## Performance Tips

1. **Layer Order**: Memory → Redis → File provides optimal performance
2. **TTL Strategy**: Use shorter TTL for memory, longer for Redis/File
3. **Batch Operations**: Use `mget`/`mset` for multiple keys
4. **Analytics**: Monitor hit rates to optimize cache configuration

## Examples

Check out the [examples](./examples) directory for more use cases:
- [Basic Node.js usage](./examples/nodejs-example.js)
- [Advanced features](./examples/advanced-usage.js)
- [Redis integration](./examples/redis-example.js)
- [React integration](./examples/react-example.tsx)
- [Browser usage](./examples/browser-example.html)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [codecrypt1112](https://github.com/codecrypt112)

## Links

- [GitHub Repository](https://github.com/codecrypt112/Cache-Composer)
- [npm Package](https://www.npmjs.com/package/cache-composer)
- [Issue Tracker](https://github.com/codecrypt112/Cache-Composer/issues)
