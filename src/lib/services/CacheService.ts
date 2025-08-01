import { SEARCH_CONFIG } from '../config/searchConfig';
import { SearchSource } from '../deepResearch';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  compressed?: boolean;
  hits: number;
  size: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  memoryUsage: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheEntry> = new Map();
  private hits: number = 0;
  private misses: number = 0;

  private constructor() {
    this.startCleanupInterval();
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private generateKey(query: string, maxResults?: number): string {
    const normalizedQuery = query.toLowerCase().trim();
    const suffix = maxResults ? `:${maxResults}` : '';
    return `${SEARCH_CONFIG.CACHE.keyPrefix}${this.hashString(normalizedQuery)}${suffix}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private compress(data: any): string {
    if (!SEARCH_CONFIG.CACHE.compressionEnabled) {
      return JSON.stringify(data);
    }
    
    // Simple compression - in production, use a proper compression library
    const jsonString = JSON.stringify(data);
    try {
      // Using built-in compression if available
      if (typeof CompressionStream !== 'undefined') {
        // Browser compression API (modern browsers)
        return jsonString; // Fallback for now
      }
      return jsonString;
    } catch {
      return jsonString;
    }
  }

  private decompress(compressed: string): any {
    try {
      return JSON.parse(compressed);
    } catch (error) {
      console.warn('Failed to decompress cache data:', error);
      return null;
    }
  }

  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictLRU(): void {
    if (this.cache.size <= SEARCH_CONFIG.CACHE.maxCacheSize) {
      return;
    }

    // Find least recently used entry (lowest hits + oldest)
    let lruKey: string | null = null;
    let lruScore = Infinity;

    for (const [key, entry] of this.cache) {
      const score = entry.hits + (Date.now() - entry.timestamp) / 1000000;
      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    // Also enforce size limits
    this.evictLRU();
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  set<T>(key: string, data: T, customTtl?: number): void {
    this.evictLRU(); // Ensure we have space

    const ttl = customTtl || SEARCH_CONFIG.CACHE.searchResultsTtl;
    const compressed = this.compress(data);
    const size = this.calculateSize(data);

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      compressed: SEARCH_CONFIG.CACHE.compressionEnabled,
      hits: 0,
      size,
    };

    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.hits++;
    this.hits++;
    return entry.data as T;
  }

  // Specialized methods for search results
  setSearchResults(query: string, results: SearchSource[], maxResults?: number): void {
    const key = this.generateKey(query, maxResults);
    this.set(key, results);
  }

  getSearchResults(query: string, maxResults?: number): SearchSource[] | null {
    const key = this.generateKey(query, maxResults);
    return this.get<SearchSource[]>(key);
  }

  // Check if search results exist without retrieving them
  hasSearchResults(query: string, maxResults?: number): boolean {
    const key = this.generateKey(query, maxResults);
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  // Batch operations
  setBatch<T>(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }

  getBatch<T>(keys: string[]): Map<string, T | null> {
    const results = new Map<string, T | null>();
    keys.forEach(key => {
      results.set(key, this.get<T>(key));
    });
    return results;
  }

  // Cache management
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  // Analytics
  getStats(): CacheStats {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }

    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate,
      memoryUsage: totalSize,
    };
  }

  // Get cache keys for debugging
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Warm up cache with common queries
  warmUp(commonQueries: string[]): void {
    // This would typically pre-populate cache with common search results
    // For now, just log the intent
    console.log('Cache warm-up initiated for queries:', commonQueries);
  }
}