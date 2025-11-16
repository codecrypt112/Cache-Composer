const { CacheComposer } = require('../dist');
const Redis = require('ioredis');

async function main() {
  // Create Redis client
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    // Add your Redis config here
  });

  // Create cache with all layers
  const cache = new CacheComposer({
    memory: {
      enabled: true,
      maxSize: 100,
      ttl: 5000, // 5 seconds
      invalidation: { type: 'lru' }
    },
    redis: {
      enabled: true,
      client: redis,
      ttl: 60000 // 1 minute
    },
    file: {
      enabled: true,
      directory: '.cache',
      ttl: 300000 // 5 minutes
    },
    analytics: true,
    warmup: {
      enabled: true,
      keys: [
        {
          key: 'config',
          loader: async () => ({ appName: 'MyApp', version: '1.0.0' }),
          options: { ttl: 3600000 }
        }
      ]
    }
  });

  console.log('=== Multi-Layer Cache Demo ===\n');

  // Test cache promotion
  await cache.set('test-key', { data: 'important' }, { ttl: 60000 });
  
  // Clear memory layer to test promotion
  const memoryLayer = cache.layers?.[0];
  if (memoryLayer) {
    await memoryLayer.clear();
    console.log('Memory layer cleared');
  }

  // This should fetch from Redis and promote to memory
  const value = await cache.get('test-key');
  console.log('Retrieved from lower layer:', value);

  // Check stats
  const stats = cache.getStats();
  console.log('\n=== Statistics ===');
  console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`Memory: ${stats.layerStats.memory?.hits} hits, ${stats.layerStats.memory?.size} items`);
  console.log(`Redis: ${stats.layerStats.redis?.hits} hits`);
  console.log(`File: ${stats.layerStats.file?.hits} hits`);

  // Cleanup
  await cache.clear();
  await redis.quit();
  console.log('\nDone!');
}

main().catch(console.error);
