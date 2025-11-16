import React, { useEffect, useState } from 'react';
import { CacheComposer } from 'cache-composer';

// Create a singleton cache instance
const cache = new CacheComposer({
  memory: {
    enabled: true,
    maxSize: 500,
    ttl: 300000, // 5 minutes
  },
  analytics: true,
});

// Custom hook for cached data fetching
function useCachedData<T>(key: string, fetcher: () => Promise<T>, ttl = 300000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    cache.getOrSet(key, fetcher, { ttl })
      .then((result) => {
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [key]);

  return { data, loading, error };
}

// Example component
export function UserProfile({ userId }: { userId: string }) {
  const { data: user, loading, error } = useCachedData(
    `user:${userId}`,
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      return response.json();
    },
    300000 // 5 minutes
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

// Cache statistics component
export function CacheStats() {
  const [stats, setStats] = useState(cache.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(cache.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
      <h3>Cache Performance</h3>
      <p>Hit Rate: {(stats.hitRate * 100).toFixed(2)}%</p>
      <p>Total Requests: {stats.totalRequests}</p>
      <p>Hits: {stats.hits} | Misses: {stats.misses}</p>
      <p>Memory Size: {stats.layerStats.memory?.size || 0}</p>
    </div>
  );
}
