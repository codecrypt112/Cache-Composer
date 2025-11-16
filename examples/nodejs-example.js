const { CacheComposer } = require('../dist');

async function main() {
  // Create cache instance
  const cache = new CacheComposer({
    memory: {
      enabled: true,
      maxSize: 100,
      ttl: 5000, // 5 seconds
      invalidation: { type: 'lru' }
    },
    file: {
      enabled: true,
      directory: '.cache',
      ttl: 60000 // 1 minute
    },
    analytics: true
  });

  console.log('=== Cache Composer Demo ===\n');

  // Basic set/get
  await cache.set('user:1', { id: 1, name: 'Alice', email: 'alice@example.com' });
  const user = await cache.get('user:1');
  console.log('Retrieved user:', user);

  // Get or set with loader
  const data = await cache.getOrSet('expensive-data', async () => {
    console.log('Loading expensive data...');
    return { computed: Math.random(), timestamp: Date.now() };
  }, { ttl: 10000 });
  console.log('Expensive data:', data);

  // Second call should hit cache
  const cachedData = await cache.getOrSet('expensive-data', async () => {
    console.log('This should not print');
    return { computed: Math.random(), timestamp: Date.now() };
  });
  console.log('Cached data:', cachedData);

  // Tag-based invalidation
  await cache.set('product:1', { name: 'Laptop' }, { tags: ['products', 'electronics'] });
  await cache.set('product:2', { name: 'Phone' }, { tags: ['products', 'electronics'] });
  await cache.set('product:3', { name: 'Book' }, { tags: ['products', 'books'] });

  console.log('\nDeleting electronics...');
  const deleted = await cache.deleteByTag('electronics');
  console.log(`Deleted ${deleted} items`);

  // Check stats
  const stats = cache.getStats();
  console.log('\n=== Cache Statistics ===');
  console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Hits: ${stats.hits}, Misses: ${stats.misses}`);
  console.log(`Memory Layer - Hits: ${stats.layerStats.memory?.hits}, Size: ${stats.layerStats.memory?.size}`);
  console.log(`File Layer - Hits: ${stats.layerStats.file?.hits}, Size: ${stats.layerStats.file?.size}`);

  // Cleanup
  await cache.clear();
  console.log('\nCache cleared!');
}

main().catch(console.error);
