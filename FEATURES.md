# Cache Composer - Feature Documentation

## Core Features

### 1. Multi-Layer Architecture

Cache Composer implements a hierarchical caching strategy with automatic promotion:

- **Memory Layer** (L1): Fastest access, limited size
- **Redis Layer** (L2): Shared across instances, persistent
- **File Layer** (L3): Disk-based, survives restarts

When data is found in a lower layer, it's automatically promoted to higher layers for faster subsequent access.

### 2. Invalidation Strategies

#### LRU (Least Recently Used)
Evicts items that haven't been accessed recently.
```javascript
const cache = new CacheComposer({
  memory: {
    invalidation: { type: 'lru' }
  }
});
```

#### LFU (Least Frequently Used)
Evicts items with the lowest access count.
```javascript
const cache = new CacheComposer({
  memory: {
    invalidation: { type: 'lfu' }
  }
});
```

#### TTL (Time To Live)
Automatic expiration based on time.
```javascript
await cache.set('key', value, { ttl: 60000 }); // 1 minute
```

### 3. Cache Warming

Pre-populate cache on application startup:

```javascript
const cache = new CacheComposer({
  warmup: {
    enabled: true,
    keys: [
      {
        key: 'config',
        loader: async () => await loadConfig(),
        options: { ttl: 3600000 }
      }
    ]
  }
});
```

### 4. Tag-Based Invalidation

Group related cache entries for bulk operations:

```javascript
// Set with tags
await cache.set('user:123', userData, { tags: ['users', 'active'] });
await cache.set('user:456', userData2, { tags: ['users', 'active'] });

// Invalidate all active users
await cache.deleteByTag('active');
```

### 5. Analytics & Monitoring

Track cache performance in real-time:

```javascript
const stats = cache.getStats();
console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
console.log(`Memory Layer: ${stats.layerStats.memory.hits} hits`);
console.log(`Avg Access Time: ${stats.layerStats.memory.avgAccessTime}ms`);
```

### 6. Batch Operations

Efficient multi-key operations:

```javascript
// Set multiple keys
const entries = new Map([
  ['key1', value1],
  ['key2', value2]
]);
await cache.mset(entries);

// Get multiple keys
const results = await cache.mget(['key1', 'key2']);
```

### 7. Pattern-Based Invalidation

Delete keys matching a regex pattern:

```javascript
// Delete all user cache entries
await cache.invalidatePattern(/^user:/);

// Delete all session data
await cache.invalidatePattern(/^session:\d+/);
```

### 8. Get-or-Set Pattern

Atomic cache-aside pattern:

```javascript
const data = await cache.getOrSet('expensive-key', async () => {
  return await fetchExpensiveData();
}, { ttl: 300000 });
```

## Advanced Use Cases

### 1. API Response Caching

```javascript
async function fetchUser(id) {
  return await cache.getOrSet(
    `api:user:${id}`,
    async () => {
      const response = await fetch(`/api/users/${id}`);
      return response.json();
    },
    { ttl: 300000, tags: ['api', 'users'] }
  );
}
```

### 2. Database Query Caching

```javascript
async function getProducts(category) {
  return await cache.getOrSet(
    `db:products:${category}`,
    async () => {
      return await db.query('SELECT * FROM products WHERE category = ?', [category]);
    },
    { ttl: 600000, tags: ['database', 'products'] }
  );
}

// Invalidate when products change
await cache.deleteByTag('products');
```

### 3. Computed Value Caching

```javascript
async function getStatistics() {
  return await cache.getOrSet(
    'stats:daily',
    async () => {
      // Expensive computation
      return await calculateDailyStatistics();
    },
    { ttl: 3600000 } // Cache for 1 hour
  );
}
```

### 4. Session Management

```javascript
async function getSession(sessionId) {
  return await cache.get(`session:${sessionId}`);
}

async function setSession(sessionId, data) {
  await cache.set(
    `session:${sessionId}`,
    data,
    { ttl: 1800000, tags: ['sessions'] } // 30 minutes
  );
}
```

### 5. Rate Limiting

```javascript
async function checkRateLimit(userId) {
  const key = `ratelimit:${userId}`;
  const count = await cache.get(key) || 0;
  
  if (count >= 100) {
    throw new Error('Rate limit exceeded');
  }
  
  await cache.set(key, count + 1, { ttl: 60000 }); // 1 minute window
}
```

## Performance Optimization Tips

### 1. Layer Configuration

```javascript
const cache = new CacheComposer({
  memory: {
    maxSize: 1000,      // Frequently accessed items
    ttl: 60000          // Short TTL
  },
  redis: {
    ttl: 3600000        // Longer TTL for shared cache
  },
  file: {
    ttl: 86400000       // Longest TTL for persistence
  }
});
```

### 2. Strategic TTL Usage

- Hot data: 1-5 minutes (memory)
- Warm data: 15-60 minutes (Redis)
- Cold data: 1-24 hours (file)

### 3. Tag Organization

```javascript
// Hierarchical tags
await cache.set('post:123', data, { 
  tags: ['posts', 'posts:published', 'posts:category:tech'] 
});

// Invalidate by specificity
await cache.deleteByTag('posts:category:tech');
```

### 4. Monitoring & Tuning

```javascript
setInterval(() => {
  const stats = cache.getStats();
  
  if (stats.hitRate < 0.7) {
    console.warn('Low hit rate, consider increasing cache size or TTL');
  }
  
  if (stats.layerStats.memory.avgAccessTime > 1) {
    console.warn('Slow memory access, check cache size');
  }
}, 60000);
```

## Environment-Specific Features

### Node.js
- Full support for all layers (memory, Redis, file)
- File system caching
- Redis integration

### React/Browser
- Memory layer only (file and Redis not available)
- Perfect for client-side caching
- Works with React hooks

### Universal
- Automatic environment detection
- Graceful degradation
- No configuration changes needed

## Best Practices

1. **Use appropriate TTLs** - Balance freshness vs performance
2. **Tag strategically** - Enable efficient bulk invalidation
3. **Monitor hit rates** - Optimize cache configuration
4. **Batch operations** - Use mget/mset for multiple keys
5. **Layer sizing** - Memory < Redis < File
6. **Error handling** - Cache failures shouldn't break your app
7. **Warmup critical data** - Reduce cold start impact
8. **Pattern invalidation** - Clean up related keys efficiently
