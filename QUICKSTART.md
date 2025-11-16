# Quick Start Guide

## Installation

```bash
npm install cache-composer
```

## 30-Second Start

```javascript
const { CacheComposer } = require('cache-composer');

// Create cache
const cache = new CacheComposer();

// Use it
await cache.set('key', 'value');
const value = await cache.get('key');
```

## 5-Minute Tutorial

### Step 1: Basic Caching

```javascript
const cache = new CacheComposer();

// Store data
await cache.set('user:123', {
  name: 'Alice',
  email: 'alice@example.com'
});

// Retrieve data
const user = await cache.get('user:123');
console.log(user); // { name: 'Alice', email: 'alice@example.com' }
```

### Step 2: Cache with TTL

```javascript
// Cache for 5 minutes
await cache.set('session:abc', sessionData, { ttl: 300000 });

// Check if exists
const exists = await cache.has('session:abc');
```

### Step 3: Get-or-Set Pattern

```javascript
// Fetch from cache or load if missing
const data = await cache.getOrSet('api-data', async () => {
  const response = await fetch('https://api.example.com/data');
  return response.json();
}, { ttl: 60000 });
```

### Step 4: Tag-Based Invalidation

```javascript
// Set with tags
await cache.set('post:1', post1, { tags: ['posts', 'published'] });
await cache.set('post:2', post2, { tags: ['posts', 'draft'] });

// Delete all posts
await cache.deleteByTag('posts');
```

### Step 5: Monitor Performance

```javascript
const stats = cache.getStats();
console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
console.log(`Total Requests: ${stats.totalRequests}`);
```

## Common Patterns

### API Response Caching

```javascript
async function getUser(id) {
  return await cache.getOrSet(
    `user:${id}`,
    async () => {
      const res = await fetch(`/api/users/${id}`);
      return res.json();
    },
    { ttl: 300000 } // 5 minutes
  );
}
```

### Database Query Caching

```javascript
async function getProducts() {
  return await cache.getOrSet(
    'products:all',
    async () => await db.query('SELECT * FROM products'),
    { ttl: 600000, tags: ['products'] }
  );
}

// Invalidate when data changes
await cache.deleteByTag('products');
```

### React Hook

```javascript
import { useEffect, useState } from 'react';
import { CacheComposer } from 'cache-composer';

const cache = new CacheComposer();

function useCache(key, fetcher) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    cache.getOrSet(key, fetcher).then(setData);
  }, [key]);
  
  return data;
}

// Usage
function UserProfile({ userId }) {
  const user = useCache(`user:${userId}`, () => 
    fetch(`/api/users/${userId}`).then(r => r.json())
  );
  
  return <div>{user?.name}</div>;
}
```

## Multi-Layer Setup

```javascript
import Redis from 'ioredis';

const redis = new Redis();

const cache = new CacheComposer({
  memory: {
    enabled: true,
    maxSize: 1000,
    ttl: 60000 // 1 minute
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
  }
});
```

## Next Steps

- Read [FEATURES.md](FEATURES.md) for advanced features
- Check [examples/](examples/) for more examples
- See [README.md](README.md) for full API documentation
- Review [PUBLISHING.md](PUBLISHING.md) to publish your own version

## Need Help?

- Check the examples in the `examples/` directory
- Review the full documentation in README.md
- Open an issue on GitHub
