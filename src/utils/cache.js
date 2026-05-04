import { LRUCache } from 'lru-cache';

// In-memory LRU cache for query results.
// max: 500 — limits memory usage by evicting the least recently used entries first.
// ttl: 5 minutes — cached results expire after 5 minutes so stale data is not served indefinitely.
// No external service needed — runs inside the Node.js process.
export const queryCache = new LRUCache({
  max: 500,
  ttl: 5 * 60 * 1000,
});
