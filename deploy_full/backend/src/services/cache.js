import { config } from '../config/index.js';
import logger from '../../logger.js';

/**
 * Cache service for managing application caches
 */
export class CacheService {
  constructor() {
    this.caches = new Map();
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
   * Get or create a cache
   * @param {string} name - Cache name
   * @param {Object} options - Cache options
   * @param {number} [options.maxSize=1000] - Maximum cache size
   * @param {number} [options.ttl=3600000] - Time to live in milliseconds
   * @returns {Map} Cache instance
   */
  getCache(name, options = {}) {
    if (!this.caches.has(name)) {
      const cache = new Map();
      const maxSize = options.maxSize || config.cache.maxSize;
      const ttl = options.ttl || config.cache.ttl;

      // Add metadata for cache management
      cache._metadata = {
        name,
        maxSize,
        ttl,
        created: Date.now(),
        accessCount: 0,
        hitCount: 0,
        missCount: 0
      };

      this.caches.set(name, cache);

      logger.info(`Cache created: ${name}`, { maxSize, ttl });
    }

    return this.caches.get(name);
  }

  /**
   * Get an item from cache
   * @param {string} cacheName - Cache name
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(cacheName, key) {
    const cache = this.getCache(cacheName);
    const item = cache.get(key);

    if (item) {
      // Check if item has expired
      if (item.expires && Date.now() > item.expires) {
        cache.delete(key);
        this.metrics.evictions++;
        cache._metadata.missCount++;
        return undefined;
      }

      this.metrics.hits++;
      cache._metadata.hitCount++;
      cache._metadata.accessCount++;
      return item.value;
    }

    this.metrics.misses++;
    cache._metadata.missCount++;
    cache._metadata.accessCount++;
    return undefined;
  }

  /**
   * Set an item in cache
   * @param {string} cacheName - Cache name
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} [ttl] - Time to live in milliseconds
   */
  set(cacheName, key, value, ttl) {
    const cache = this.getCache(cacheName);
    const metadata = cache._metadata;

    // Check if cache is at max size
    if (cache.size >= metadata.maxSize) {
      // Remove oldest item (simple LRU)
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
        this.metrics.evictions++;
      }
    }

    const expires = ttl ? Date.now() + ttl : (metadata.ttl ? Date.now() + metadata.ttl : undefined);

    cache.set(key, {
      value,
      expires,
      created: Date.now()
    });

    logger.debug(`Cache set: ${cacheName}:${key}`);
  }

  /**
   * Delete an item from cache
   * @param {string} cacheName - Cache name
   * @param {string} key - Cache key
   * @returns {boolean} True if item was deleted
   */
  delete(cacheName, key) {
    const cache = this.getCache(cacheName);
    const deleted = cache.delete(key);
    if (deleted) {
      logger.debug(`Cache delete: ${cacheName}:${key}`);
    }
    return deleted;
  }

  /**
   * Clear a cache
   * @param {string} cacheName - Cache name
   */
  clear(cacheName) {
    if (this.caches.has(cacheName)) {
      const cache = this.caches.get(cacheName);
      const size = cache.size;
      cache.clear();
      logger.info(`Cache cleared: ${cacheName}`, { itemsCleared: size });
    }
  }

  /**
   * Get cache statistics
   * @param {string} [cacheName] - Specific cache name, or all caches
   * @returns {Object} Cache statistics
   */
  getStats(cacheName) {
    if (cacheName) {
      const cache = this.caches.get(cacheName);
      if (!cache) {
        return null;
      }

      const metadata = cache._metadata;
      return {
        name: cacheName,
        size: cache.size,
        maxSize: metadata.maxSize,
        ttl: metadata.ttl,
        hitRate: metadata.accessCount > 0 ? (metadata.hitCount / metadata.accessCount) * 100 : 0,
        created: metadata.created,
        accessCount: metadata.accessCount,
        hitCount: metadata.hitCount,
        missCount: metadata.missCount
      };
    }

    // Return stats for all caches
    const stats = {
      global: {
        totalHits: this.metrics.hits,
        totalMisses: this.metrics.misses,
        totalEvictions: this.metrics.evictions,
        hitRate: (this.metrics.hits + this.metrics.misses) > 0
          ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100
          : 0
      },
      caches: {}
    };

    for (const [name] of this.caches) {
      stats.caches[name] = this.getStats(name);
    }

    return stats;
  }

  /**
   * Clean up expired items across all caches
   */
  cleanup() {
    let totalCleaned = 0;

    for (const [name, cache] of this.caches) {
      const toDelete = [];

      for (const [key, item] of cache) {
        if (item.expires && Date.now() > item.expires) {
          toDelete.push(key);
        }
      }

      toDelete.forEach(key => cache.delete(key));
      totalCleaned += toDelete.length;

      if (toDelete.length > 0) {
        logger.debug(`Cache cleanup: ${name}`, { itemsRemoved: toDelete.length });
      }
    }

    if (totalCleaned > 0) {
      logger.info('Cache cleanup completed', { totalItemsRemoved: totalCleaned });
    }
  }

  /**
   * Start periodic cleanup
   * @param {number} [interval=300000] - Cleanup interval in milliseconds (default 5 minutes)
   */
  startCleanup(interval = 300000) {
    setInterval(() => {
      this.cleanup();
    }, interval);

    logger.info('Cache cleanup scheduler started', { interval });
  }
}

// Create singleton instance
export const cacheService = new CacheService();

// Start cleanup scheduler
cacheService.startCleanup();
