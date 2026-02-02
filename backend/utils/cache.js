/**
 * Advanced In-Memory Cache System with LRU Eviction
 * Features:
 * - LRU (Least Recently Used) eviction policy
 * - TTL (Time To Live) support
 * - Memory limit management
 * - Namespace/Tag support for grouped operations
 * - Cache statistics and monitoring
 * - Batch operations
 * - Cache warming and preloading
 * - Event system for cache events
 * - Compression for large values
 */

const EventEmitter = require('events');
const zlib = require('zlib');

class AdvancedCache extends EventEmitter {
    constructor(options = {}) {
        super();

        // Configuration
        this.config = {
            maxSize: options.maxSize || 1000,           // Maximum number of entries
            maxMemoryMB: options.maxMemoryMB || 50,     // Maximum memory in MB
            defaultTTL: options.defaultTTL || 300000,   // Default TTL: 5 minutes
            compressionThreshold: options.compressionThreshold || 1024, // Compress if > 1KB
            enableCompression: options.enableCompression || false,
            enableStats: options.enableStats !== false,
            cleanupInterval: options.cleanupInterval || 60000, // Cleanup every minute
            ...options
        };

        // Core storage
        this.cache = new Map();
        this.timers = new Map();
        this.accessOrder = []; // For LRU tracking

        // Namespace/Tags storage
        this.namespaces = new Map();
        this.tags = new Map();

        // Statistics
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            expirations: 0,
            compressions: 0,
            decompressions: 0,
            memoryUsage: 0,
            startTime: Date.now()
        };

        // Start cleanup interval
        this._startCleanup();

        console.log('🚀 Advanced Cache initialized with config:', {
            maxSize: this.config.maxSize,
            maxMemoryMB: this.config.maxMemoryMB,
            defaultTTL: this.config.defaultTTL
        });
    }

    // ==================== CORE METHODS ====================

    /**
     * Set a value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {object} options - { ttl, namespace, tags, compress }
     */
    set(key, value, options = {}) {
        const ttl = options.ttl || this.config.defaultTTL;
        const namespace = options.namespace || 'default';
        const tags = options.tags || [];
        const shouldCompress = options.compress ?? this.config.enableCompression;

        // Check memory and evict if necessary
        this._enforceMemoryLimit();
        this._enforceSizeLimit();

        // Clear existing entry if present
        if (this.cache.has(key)) {
            this._removeFromAccessOrder(key);
            this._clearTimer(key);
        }

        // Prepare value (optionally compress)
        let storedValue = value;
        let isCompressed = false;

        if (shouldCompress && this._shouldCompress(value)) {
            storedValue = this._compress(value);
            isCompressed = true;
            this.stats.compressions++;
        }

        // Create cache entry
        const entry = {
            value: storedValue,
            isCompressed,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl,
            ttl,
            namespace,
            tags,
            accessCount: 0,
            lastAccessed: Date.now(),
            size: this._getSize(storedValue)
        };

        // Store entry
        this.cache.set(key, entry);
        this.accessOrder.push(key);

        // Register in namespace
        if (!this.namespaces.has(namespace)) {
            this.namespaces.set(namespace, new Set());
        }
        this.namespaces.get(namespace).add(key);

        // Register tags
        tags.forEach(tag => {
            if (!this.tags.has(tag)) {
                this.tags.set(tag, new Set());
            }
            this.tags.get(tag).add(key);
        });

        // Set expiration timer
        this._setTimer(key, ttl);

        // Update stats
        this.stats.sets++;
        this.stats.memoryUsage += entry.size;

        // Emit event
        this.emit('set', { key, namespace, tags, ttl, size: entry.size });

        return true;
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @param {object} options - { defaultValue, refresh }
     */
    get(key, options = {}) {
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            this.emit('miss', { key });
            return options.defaultValue ?? null;
        }

        // Check if expired
        if (this._isExpired(entry)) {
            this.delete(key);
            this.stats.misses++;
            this.emit('miss', { key, reason: 'expired' });
            return options.defaultValue ?? null;
        }

        // Update access tracking (LRU)
        this._updateAccessOrder(key);
        entry.accessCount++;
        entry.lastAccessed = Date.now();

        // Optionally refresh TTL
        if (options.refresh) {
            this._refreshTTL(key, entry.ttl);
        }

        // Update stats
        this.stats.hits++;
        this.emit('hit', { key, accessCount: entry.accessCount });

        // Decompress if necessary
        if (entry.isCompressed) {
            this.stats.decompressions++;
            return this._decompress(entry.value);
        }

        return entry.value;
    }

    /**
     * Check if key exists and is not expired
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) return false;
        if (this._isExpired(entry)) {
            this.delete(key);
            return false;
        }
        return true;
    }

    /**
     * Delete a specific key
     */
    delete(key) {
        const entry = this.cache.get(key);
        if (!entry) return false;

        // Remove from namespace
        const namespace = entry.namespace;
        if (this.namespaces.has(namespace)) {
            this.namespaces.get(namespace).delete(key);
        }

        // Remove from tags
        entry.tags.forEach(tag => {
            if (this.tags.has(tag)) {
                this.tags.get(tag).delete(key);
            }
        });

        // Clear timer
        this._clearTimer(key);

        // Remove from access order
        this._removeFromAccessOrder(key);

        // Update memory stats
        this.stats.memoryUsage -= entry.size;

        // Delete from cache
        this.cache.delete(key);

        // Update stats
        this.stats.deletes++;
        this.emit('delete', { key, namespace });

        return true;
    }

    // ==================== PATTERN & BATCH OPERATIONS ====================

    /**
     * Delete all entries matching a pattern (supports wildcards)
     */
    deletePattern(pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        let deletedCount = 0;

        for (const key of [...this.cache.keys()]) {
            if (regex.test(key)) {
                this.delete(key);
                deletedCount++;
            }
        }

        this.emit('deletePattern', { pattern, deletedCount });
        return deletedCount;
    }

    /**
     * Get multiple keys at once
     */
    mget(keys) {
        const result = {};
        keys.forEach(key => {
            result[key] = this.get(key);
        });
        return result;
    }

    /**
     * Set multiple key-value pairs at once
     */
    mset(entries, options = {}) {
        const results = {};
        Object.entries(entries).forEach(([key, value]) => {
            results[key] = this.set(key, value, options);
        });
        return results;
    }

    /**
     * Delete multiple keys at once
     */
    mdelete(keys) {
        let deletedCount = 0;
        keys.forEach(key => {
            if (this.delete(key)) deletedCount++;
        });
        return deletedCount;
    }

    // ==================== NAMESPACE OPERATIONS ====================

    /**
     * Delete all entries in a namespace
     */
    deleteNamespace(namespace) {
        const keys = this.namespaces.get(namespace);
        if (!keys) return 0;

        let deletedCount = 0;
        for (const key of [...keys]) {
            if (this.delete(key)) deletedCount++;
        }

        this.namespaces.delete(namespace);
        this.emit('deleteNamespace', { namespace, deletedCount });
        return deletedCount;
    }

    /**
     * Get all keys in a namespace
     */
    getNamespaceKeys(namespace) {
        return [...(this.namespaces.get(namespace) || [])];
    }

    /**
     * Get all values in a namespace
     */
    getNamespace(namespace) {
        const keys = this.getNamespaceKeys(namespace);
        return this.mget(keys);
    }

    // ==================== TAG OPERATIONS ====================

    /**
     * Delete all entries with a specific tag
     */
    deleteByTag(tag) {
        const keys = this.tags.get(tag);
        if (!keys) return 0;

        let deletedCount = 0;
        for (const key of [...keys]) {
            if (this.delete(key)) deletedCount++;
        }

        this.tags.delete(tag);
        this.emit('deleteByTag', { tag, deletedCount });
        return deletedCount;
    }

    /**
     * Get all keys with a specific tag
     */
    getKeysByTag(tag) {
        return [...(this.tags.get(tag) || [])];
    }

    // ==================== GET OR SET (Cache-Aside Pattern) ====================

    /**
     * Get value or compute and cache it if not exists
     * @param {string} key - Cache key
     * @param {Function} computeFn - Function to compute value if not cached
     * @param {object} options - Cache options
     */
    async getOrSet(key, computeFn, options = {}) {
        // Try to get from cache
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }

        // Compute value
        const value = await computeFn();

        // Store in cache
        this.set(key, value, options);

        return value;
    }

    /**
     * Synchronous version of getOrSet
     */
    getOrSetSync(key, computeFn, options = {}) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }

        const value = computeFn();
        this.set(key, value, options);
        return value;
    }

    // ==================== CACHE WARMING ====================

    /**
     * Preload cache with data
     */
    warm(data, options = {}) {
        const results = { success: 0, failed: 0 };

        Object.entries(data).forEach(([key, value]) => {
            try {
                this.set(key, value, options);
                results.success++;
            } catch (error) {
                results.failed++;
                this.emit('warmError', { key, error });
            }
        });

        this.emit('warm', results);
        return results;
    }

    /**
     * Export cache data for persistence
     */
    export() {
        const data = {};
        for (const [key, entry] of this.cache.entries()) {
            if (!this._isExpired(entry)) {
                data[key] = {
                    value: entry.isCompressed ? this._decompress(entry.value) : entry.value,
                    ttl: entry.expiresAt - Date.now(),
                    namespace: entry.namespace,
                    tags: entry.tags
                };
            }
        }
        return data;
    }

    /**
     * Import cache data
     */
    import(data) {
        Object.entries(data).forEach(([key, entry]) => {
            if (entry.ttl > 0) {
                this.set(key, entry.value, {
                    ttl: entry.ttl,
                    namespace: entry.namespace,
                    tags: entry.tags
                });
            }
        });
    }

    // ==================== STATISTICS ====================

    /**
     * Get cache statistics
     */
    getStats() {
        const uptime = Date.now() - this.stats.startTime;
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;

        return {
            ...this.stats,
            size: this.cache.size,
            maxSize: this.config.maxSize,
            hitRate: `${hitRate}%`,
            uptime: this._formatUptime(uptime),
            uptimeMs: uptime,
            memoryUsageMB: (this.stats.memoryUsage / (1024 * 1024)).toFixed(2),
            maxMemoryMB: this.config.maxMemoryMB,
            namespaceCount: this.namespaces.size,
            tagCount: this.tags.size
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        const oldStats = { ...this.stats };
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            expirations: 0,
            compressions: 0,
            decompressions: 0,
            memoryUsage: this.stats.memoryUsage,
            startTime: Date.now()
        };
        this.emit('statsReset', oldStats);
        return oldStats;
    }

    // ==================== CACHE INSPECTION ====================

    /**
     * Get all keys
     */
    keys() {
        return [...this.cache.keys()];
    }

    /**
     * Get cache entry metadata (without value)
     */
    getMetadata(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        return {
            timestamp: entry.timestamp,
            expiresAt: entry.expiresAt,
            ttl: entry.ttl,
            remainingTTL: entry.expiresAt - Date.now(),
            namespace: entry.namespace,
            tags: entry.tags,
            accessCount: entry.accessCount,
            lastAccessed: entry.lastAccessed,
            size: entry.size,
            isCompressed: entry.isCompressed,
            isExpired: this._isExpired(entry)
        };
    }

    /**
     * Get entries sorted by access (most accessed first)
     */
    getMostAccessed(limit = 10) {
        const entries = [...this.cache.entries()]
            .map(([key, entry]) => ({
                key,
                accessCount: entry.accessCount,
                size: entry.size,
                namespace: entry.namespace
            }))
            .sort((a, b) => b.accessCount - a.accessCount)
            .slice(0, limit);

        return entries;
    }

    /**
     * Get entries sorted by size (largest first)
     */
    getLargestEntries(limit = 10) {
        const entries = [...this.cache.entries()]
            .map(([key, entry]) => ({
                key,
                size: entry.size,
                accessCount: entry.accessCount,
                namespace: entry.namespace
            }))
            .sort((a, b) => b.size - a.size)
            .slice(0, limit);

        return entries;
    }

    // ==================== CLEAR & CLEANUP ====================

    /**
     * Clear all cache entries
     */
    clear() {
        // Clear all timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }

        const size = this.cache.size;

        this.cache.clear();
        this.timers.clear();
        this.accessOrder = [];
        this.namespaces.clear();
        this.tags.clear();
        this.stats.memoryUsage = 0;

        this.emit('clear', { clearedCount: size });
        return size;
    }

    /**
     * Cleanup expired entries
     */
    cleanup() {
        let cleanedCount = 0;
        const now = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.delete(key);
                cleanedCount++;
                this.stats.expirations++;
            }
        }

        if (cleanedCount > 0) {
            this.emit('cleanup', { cleanedCount });
        }

        return cleanedCount;
    }

    /**
     * Destroy cache instance
     */
    destroy() {
        this.clear();
        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
        }
        this.removeAllListeners();
        this.emit('destroy');
    }

    // ==================== PRIVATE METHODS ====================

    _setTimer(key, ttl) {
        const timer = setTimeout(() => {
            this.delete(key);
            this.stats.expirations++;
            this.emit('expire', { key });
        }, ttl);

        this.timers.set(key, timer);
    }

    _clearTimer(key) {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
    }

    _refreshTTL(key, ttl) {
        const entry = this.cache.get(key);
        if (entry) {
            this._clearTimer(key);
            entry.expiresAt = Date.now() + ttl;
            this._setTimer(key, ttl);
        }
    }

    _isExpired(entry) {
        return Date.now() > entry.expiresAt;
    }

    _updateAccessOrder(key) {
        this._removeFromAccessOrder(key);
        this.accessOrder.push(key);
    }

    _removeFromAccessOrder(key) {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
    }

    _enforceSizeLimit() {
        while (this.cache.size >= this.config.maxSize && this.accessOrder.length > 0) {
            const lruKey = this.accessOrder.shift();
            if (lruKey && this.cache.has(lruKey)) {
                this.delete(lruKey);
                this.stats.evictions++;
                this.emit('evict', { key: lruKey, reason: 'size_limit' });
            }
        }
    }

    _enforceMemoryLimit() {
        const maxBytes = this.config.maxMemoryMB * 1024 * 1024;
        while (this.stats.memoryUsage > maxBytes && this.accessOrder.length > 0) {
            const lruKey = this.accessOrder.shift();
            if (lruKey && this.cache.has(lruKey)) {
                this.delete(lruKey);
                this.stats.evictions++;
                this.emit('evict', { key: lruKey, reason: 'memory_limit' });
            }
        }
    }

    _getSize(value) {
        if (Buffer.isBuffer(value)) {
            return value.length;
        }
        return Buffer.byteLength(JSON.stringify(value), 'utf8');
    }

    _shouldCompress(value) {
        const size = this._getSize(value);
        return size > this.config.compressionThreshold;
    }

    _compress(value) {
        const json = JSON.stringify(value);
        return zlib.deflateSync(json);
    }

    _decompress(buffer) {
        const json = zlib.inflateSync(buffer).toString();
        return JSON.parse(json);
    }

    _startCleanup() {
        this._cleanupInterval = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }

    _formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
}

// ==================== CACHE MIDDLEWARE FOR EXPRESS ====================

/**
 * Express middleware for caching API responses
 */
function cacheMiddleware(cache, options = {}) {
    const {
        ttl = 60000,
        namespace = 'api',
        keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
        condition = () => true,
        onHit = null,
        onMiss = null
    } = options;

    return (req, res, next) => {
        // Only cache GET requests by default
        if (req.method !== 'GET' || !condition(req)) {
            return next();
        }

        const key = keyGenerator(req);
        const cached = cache.get(key);

        if (cached) {
            if (onHit) onHit(req, cached);
            return res.json(cached);
        }

        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json method to cache response
        res.json = (data) => {
            cache.set(key, data, { ttl, namespace, tags: ['api-response'] });
            if (onMiss) onMiss(req, data);
            return originalJson(data);
        };

        next();
    };
}

/**
 * Clear cache middleware for mutations
 */
function clearCacheMiddleware(cache, options = {}) {
    const {
        patterns = [],
        namespaces = [],
        tags = []
    } = options;

    return (req, res, next) => {
        // Store original json method
        const originalJson = res.json.bind(res);

        // Override to clear cache after successful mutation
        res.json = (data) => {
            // Clear specified patterns
            patterns.forEach(pattern => cache.deletePattern(pattern));

            // Clear specified namespaces
            namespaces.forEach(ns => cache.deleteNamespace(ns));

            // Clear specified tags
            tags.forEach(tag => cache.deleteByTag(tag));

            return originalJson(data);
        };

        next();
    };
}

// ==================== SINGLETON & FACTORY ====================

// Default cache instance
let defaultInstance = null;

/**
 * Get the default cache instance (Singleton)
 */
function getCache(options = {}) {
    if (!defaultInstance) {
        defaultInstance = new AdvancedCache(options);
    }
    return defaultInstance;
}

/**
 * Create a new cache instance (Factory)
 */
function createCache(options = {}) {
    return new AdvancedCache(options);
}

// Create the default instance
const instance = getCache();

// ==================== EXPORTS ====================

// Export a wrapper object that includes the instance and other utilities
const cacheExport = instance;

// Attach utilities to the export object
cacheExport.AdvancedCache = AdvancedCache;
cacheExport.getCache = getCache;
cacheExport.createCache = createCache;
cacheExport.cacheMiddleware = cacheMiddleware;
cacheExport.clearCacheMiddleware = clearCacheMiddleware;

// Also attach the instance itself as a property for alternative access patterns
cacheExport.instance = instance;

console.log('📦 Cache system ready. deleteNamespace available:', typeof instance.deleteNamespace === 'function');

module.exports = cacheExport;
