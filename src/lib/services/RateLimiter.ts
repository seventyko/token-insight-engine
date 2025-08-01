import { SEARCH_CONFIG } from '../config/searchConfig';

interface RequestRecord {
  timestamp: number;
  count: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private requests: Map<string, RequestRecord[]> = new Map();
  private burstTokens: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  private getKey(identifier: string, window: 'minute' | 'hour'): string {
    const now = new Date();
    if (window === 'minute') {
      return `${identifier}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    } else {
      return `${identifier}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
    }
  }

  private cleanOldRecords(): void {
    const cutoff = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
    
    for (const [key, records] of this.requests) {
      const filtered = records.filter(record => record.timestamp > cutoff);
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    }
  }

  private getRequestCount(identifier: string, window: 'minute' | 'hour'): number {
    const key = this.getKey(identifier, window);
    const records = this.requests.get(key) || [];
    return records.reduce((sum, record) => sum + record.count, 0);
  }

  private addRequest(identifier: string, count: number = 1): void {
    const now = Date.now();
    
    // Add to minute window
    const minuteKey = this.getKey(identifier, 'minute');
    if (!this.requests.has(minuteKey)) {
      this.requests.set(minuteKey, []);
    }
    this.requests.get(minuteKey)!.push({ timestamp: now, count });

    // Add to hour window
    const hourKey = this.getKey(identifier, 'hour');
    if (!this.requests.has(hourKey)) {
      this.requests.set(hourKey, []);
    }
    this.requests.get(hourKey)!.push({ timestamp: now, count });

    this.cleanOldRecords();
  }

  private getBurstTokens(identifier: string): number {
    return this.burstTokens.get(identifier) || SEARCH_CONFIG.RATE_LIMITS.burstAllowance;
  }

  private consumeBurstToken(identifier: string): boolean {
    const tokens = this.getBurstTokens(identifier);
    if (tokens > 0) {
      this.burstTokens.set(identifier, tokens - 1);
      return true;
    }
    return false;
  }

  private replenishBurstTokens(): void {
    // Replenish burst tokens every minute
    for (const [identifier] of this.burstTokens) {
      const current = this.getBurstTokens(identifier);
      const max = SEARCH_CONFIG.RATE_LIMITS.burstAllowance;
      if (current < max) {
        this.burstTokens.set(identifier, Math.min(max, current + 1));
      }
    }
  }

  checkRateLimit(identifier: string, requestCount: number = 1): RateLimitResult {
    this.replenishBurstTokens();

    const minuteCount = this.getRequestCount(identifier, 'minute');
    const hourCount = this.getRequestCount(identifier, 'hour');

    // Check minute limit
    const minuteLimit = SEARCH_CONFIG.RATE_LIMITS.requestsPerMinute;
    const hourLimit = SEARCH_CONFIG.RATE_LIMITS.requestsPerHour;

    let allowed = true;
    let retryAfter: number | undefined;

    // Check if request would exceed limits
    if (minuteCount + requestCount > minuteLimit) {
      // Try to use burst tokens
      if (!this.consumeBurstToken(identifier)) {
        allowed = false;
        retryAfter = 60; // Wait 1 minute
      }
    }

    if (hourCount + requestCount > hourLimit) {
      allowed = false;
      retryAfter = 3600; // Wait 1 hour
    }

    // Calculate remaining requests
    const minuteRemaining = Math.max(0, minuteLimit - minuteCount);
    const hourRemaining = Math.max(0, hourLimit - hourCount);
    const remaining = Math.min(minuteRemaining, hourRemaining);

    // Calculate reset time (next minute boundary)
    const now = new Date();
    const resetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                              now.getHours(), now.getMinutes() + 1, 0, 0).getTime();

    if (allowed) {
      this.addRequest(identifier, requestCount);
    }

    return {
      allowed,
      remaining: Math.max(0, remaining - (allowed ? requestCount : 0)),
      resetTime,
      retryAfter,
    };
  }

  // Get current usage for monitoring
  getUsage(identifier: string): { minute: number; hour: number; burstTokens: number } {
    return {
      minute: this.getRequestCount(identifier, 'minute'),
      hour: this.getRequestCount(identifier, 'hour'),
      burstTokens: this.getBurstTokens(identifier),
    };
  }

  // Reset rate limits for an identifier (for testing or admin override)
  reset(identifier?: string): void {
    if (identifier) {
      // Remove all records for this identifier
      for (const key of this.requests.keys()) {
        if (key.startsWith(identifier + ':')) {
          this.requests.delete(key);
        }
      }
      this.burstTokens.delete(identifier);
    } else {
      // Reset everything
      this.requests.clear();
      this.burstTokens.clear();
    }
  }
}