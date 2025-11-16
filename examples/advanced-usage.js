const { CacheComposer } = require('../dist');

async function advancedDemo() {
  const cache = new CacheComposer({
    memory: {
      enabled: true,
      maxSize: 50,
      ttl: 10000,
      invalidation: { type: 'lfu' } // Least Frequently Used
    },
    analytics: true
  });

  console.log('=== Advanced Features Demo ===\n');

  // 1. Batch operations
  console.log('1. Batch Operations');
  const entries = new Map([
    ['item:1', { name: 'Item 1', price: 100 }],
    ['item:2', { name: 'Item 2', price: 200 }],
    ['item:3', { name: 'Item 3', price: 300 }]
  ]);
  await cache.mset(entries, { tags: ['items'] });
  
  const items = await cache.mget(['item:1', 'item:2', 'item:3']);
  console.log('Retrieved items:', items.size);

  // 2. Pattern-based invalidation
  console.log('\n2. Pattern Invalidation');
  await cache.set('user:123:profile', { name: 'Alice' });
  await cache.set('user:123:settings', { theme: 'dark' });
  await cache.set('user:456:profile', { name: 'Bob' });
  
  const deleted = await cache.invalidatePattern(/^user:123:/);
  console.log(`Deleted ${deleted} keys matching pattern`);

  // 3. Cache warming with dependencies
  console.log('\n3. Cache Warming');
  const warmCache = new CacheComposer({
    memory: { enabled: true },
    warmup: {
      enabled: true,
      keys: [
        {
          key: 'app:config',
          loader: async () => {
            console.log('Loading config...');
            return { version: '1.0', features: ['cache', 'analytics'] };
          },
          options: { ttl: 3600000 }
        },
        {
          key: 'app:constants',
          loader: async () => {
            console.log('Loading constants...');
            return { MAX_SIZE: 1000, TIMEOUT: 5000 };
          }
        }
      ]
    }
  });

  // Config should be pre-loaded
  const config = await warmCache.get('app:config');
  console.log('Pre-warmed config:', config);

  // 4. TTL management
  console.log('\n4. TTL Management');
  await cache.set('temp-data', { value: 'temporary' }, { ttl: 5000 });
  console.log('Has temp-data:', await cache.has('temp-data'));
  
  // Refresh TTL
  await cache.touch('temp-data', 10000);
  console.log('TTL refreshed');

  // 5. Tag-based cache groups
  console.log('\n5. Tag-Based Groups');
  await cache.set('post:1', { title: 'Post 1' }, { tags: ['posts', 'published'] });
  await cache.set('post:2', { title: 'Post 2' }, { tags: ['posts', 'draft'] });
  await cache.set('post:3', { title: 'Post 3' }, { tags: ['posts', 'published'] });
  
  // Invalidate all published posts
  const publishedDeleted = await cache.deleteByTag('published');
  console.log(`Deleted ${publishedDeleted} published posts`);

  // 6. Performance monitoring
  console.log('\n6. Performance Monitoring');
  for (let i = 0; i < 10; i++) {
    await cache.getOrSet(`perf:${i}`, async () => ({ data: i }));
  }
  
  const stats = cache.getStats();
  console.log('Performance Stats:');
  console.log(`  Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`  Avg Access Time: ${stats.layerStats.memory?.avgAccessTime.toFixed(3)}ms`);
  console.log(`  Cache Size: ${stats.layerStats.memory?.size}`);

  // 7. Conditional caching
  console.log('\n7. Conditional Caching');
  const fetchUser = async (id) => {
    const cached = await cache.get(`user:${id}`);
    if (cached) {
      console.log(`User ${id} from cache`);
      return cached;
    }
    
    console.log(`User ${id} from database`);
    const user = { id, name: `User ${id}`, timestamp: Date.now() };
    await cache.set(`user:${id}`, user, { ttl: 5000, tags: ['users'] });
    return user;
  };

  await fetchUser(100);
  await fetchUser(100); // Should hit cache
  await fetchUser(101);

  // Cleanup
  await cache.clear();
  console.log('\n=== Demo Complete ===');
}

advancedDemo().catch(console.error);
