// Client-compatible Cache Interface (no fs dependency)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  cacheHits: number;
  cacheMisses: number;
  lastRefresh: number | null;
  forceRefreshCount: number;
}

class ClientCacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  
  // Statistics tracking
  private stats: CacheStats = {
    totalEntries: 0,
    validEntries: 0,
    expiredEntries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastRefresh: null,
    forceRefreshCount: 0
  };
  
  private lastGlobalRefresh: number | null = null;
  private refreshHistory: number[] = [];

  // Check if data should be fetched fresh (either expired or force refresh)
  shouldFetchFresh(key: string, forceRefresh = false): boolean {
    if (forceRefresh) {
      console.log(`🔄 Force refresh requested for ${key}`);
      this.stats.forceRefreshCount++;
      return true;
    }

    const cached = this.cache.get(key);
    if (!cached) {
      this.stats.cacheMisses++;
      console.log(`❌ Cache miss for ${key}`);
      return true;
    }

    if (cached.expiresAt <= Date.now()) {
      this.stats.cacheMisses++;
      console.log(`⏰ Cache expired for ${key} (expired ${Math.round((Date.now() - cached.expiresAt) / 1000 / 60)} minutes ago)`);
      return true;
    }

    this.stats.cacheHits++;
    const timeLeft = Math.round((cached.expiresAt - Date.now()) / 1000 / 60);
    console.log(`✅ Cache hit for ${key} (${timeLeft} minutes remaining)`);
    return false;
  }

  // Get cached data
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      this.stats.cacheHits++;
      return cached.data;
    }
    
    if (cached) {
      // Remove expired entry
      this.cache.delete(key);
      this.stats.expiredEntries++;
    }
    
    this.stats.cacheMisses++;
    return null;
  }

  // Set cached data
  set<T>(key: string, data: T): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    };
    
    this.cache.set(key, entry);
    this.stats.totalEntries++;
    this.updateStats();
    
    console.log(`💾 Cached ${key} for 30 minutes (expires at ${new Date(entry.expiresAt).toLocaleTimeString()})`);
  }

  // Clear all cache
  clearAll(): void {
    const clearedCount = this.cache.size;
    this.cache.clear();
    this.stats.totalEntries = 0;
    this.stats.validEntries = 0;
    this.stats.expiredEntries = 0;
    
    console.log(`🗑️  Cleared ${clearedCount} cache entries`);
  }

  // Clear specific key
  clear(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️  Cleared cache for ${key}`);
      this.updateStats();
    }
    return deleted;
  }

  // Mark global refresh (when user clicks refresh button)
  markGlobalRefresh(): void {
    this.lastGlobalRefresh = Date.now();
    this.refreshHistory.push(this.lastGlobalRefresh);
    this.stats.lastRefresh = this.lastGlobalRefresh;
    this.stats.forceRefreshCount++;
    
    // Clear all cache on global refresh
    this.clearAll();
    
    console.log(`🔄 Global refresh initiated at ${new Date(this.lastGlobalRefresh).toLocaleTimeString()}`);
  }

  // Check if data needs refresh based on 30-minute rule or global refresh
  needsRefresh(key: string): boolean {
    // Check if there was a recent global refresh
    if (this.lastGlobalRefresh && (Date.now() - this.lastGlobalRefresh) < 60000) {
      // If global refresh was less than 1 minute ago, always refresh
      return true;
    }

    return this.shouldFetchFresh(key, false);
  }

  // Update cache statistics
  private updateStats(): void {
    let validEntries = 0;
    let expiredEntries = 0;
    const now = Date.now();

    for (const [, entry] of this.cache) {
      if (entry.expiresAt > now) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    this.stats.validEntries = validEntries;
    this.stats.expiredEntries = expiredEntries;
  }

  // Get comprehensive cache statistics
  getStats(): CacheStats & {
    cacheDurationMinutes: number;
    lastGlobalRefresh: string | null;
    nextExpiry: string | null;
    recentRefreshes: string[];
  } {
    this.updateStats();
    
    // Find next expiry time
    let nextExpiry: number | null = null;
    for (const [, entry] of this.cache) {
      if (entry.expiresAt > Date.now()) {
        if (!nextExpiry || entry.expiresAt < nextExpiry) {
          nextExpiry = entry.expiresAt;
        }
      }
    }

    return {
      ...this.stats,
      cacheDurationMinutes: this.CACHE_DURATION / (1000 * 60),
      lastGlobalRefresh: this.lastGlobalRefresh ? new Date(this.lastGlobalRefresh).toLocaleString() : null,
      nextExpiry: nextExpiry ? new Date(nextExpiry).toLocaleString() : null,
      recentRefreshes: this.refreshHistory.slice(-5).map(ts => new Date(ts).toLocaleString())
    };
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
      this.updateStats();
    }
  }

  // Get all cache keys for debugging
  getAllKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Check if cache is empty
  isEmpty(): boolean {
    return this.cache.size === 0;
  }

  // Get cache age for a specific key
  getCacheAge(key: string): number | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    return Date.now() - cached.timestamp;
  }

  // Helper method to generate cache keys
  generateKey(type: string, ...params: string[]): string {
    return `${type}:${params.join(':')}`;
  }
}

// Export singleton instance - safe for client-side use
export const enhancedCacheService = new ClientCacheService();
export type { CacheStats };
