import { SearchSource } from '../deepResearch';
import { CostTracker } from './CostTracker';
import { RateLimiter } from './RateLimiter';
import { CacheService } from './CacheService';
import { SearchAnalytics } from './SearchAnalytics';
import { withRetry, CircuitBreaker, withTimeout } from '../utils/retryUtils';
import { SEARCH_CONFIG, ENHANCED_SEARCH_STRATEGY } from '../config/searchConfig';

export interface EnhancedSearchOptions {
  maxResults?: number;
  forceRefresh?: boolean;
  priority?: 'low' | 'normal' | 'high';
  userId?: string;
  bypassRateLimit?: boolean;
}

export interface SearchResponse {
  results: SearchSource[];
  metadata: {
    cached: boolean;
    cost: number;
    duration: number;
    attempts: number;
    rateLimitRemaining: number;
    qualityScore?: number;
  };
}

export interface BatchSearchRequest {
  query: string;
  options?: EnhancedSearchOptions;
}

export interface BatchSearchResponse {
  results: Array<{
    query: string;
    response: SearchResponse | Error;
  }>;
  totalCost: number;
  totalDuration: number;
}

export class EnhancedSearchService {
  private static instance: EnhancedSearchService;
  private costTracker: CostTracker;
  private rateLimiter: RateLimiter;
  private cache: CacheService;
  private analytics: SearchAnalytics;
  private circuitBreaker: CircuitBreaker;
  private tavilyApiKey: string;

  private constructor(tavilyApiKey: string) {
    this.tavilyApiKey = tavilyApiKey;
    this.costTracker = CostTracker.getInstance();
    this.rateLimiter = RateLimiter.getInstance();
    this.cache = CacheService.getInstance();
    this.analytics = SearchAnalytics.getInstance();
    this.circuitBreaker = new CircuitBreaker(5, 60000, 3);
  }

  static getInstance(tavilyApiKey?: string): EnhancedSearchService {
    if (!EnhancedSearchService.instance && tavilyApiKey) {
      EnhancedSearchService.instance = new EnhancedSearchService(tavilyApiKey);
    }
    if (!EnhancedSearchService.instance) {
      throw new Error('EnhancedSearchService must be initialized with API key first');
    }
    return EnhancedSearchService.instance;
  }

  private getUserIdentifier(options: EnhancedSearchOptions): string {
    return options.userId || 'anonymous';
  }

  private calculateQualityScore(results: SearchSource[]): number {
    if (results.length === 0) return 0;

    let totalScore = 0;
    let validResults = 0;

    for (const result of results) {
      if (!result.content || result.content.length < SEARCH_CONFIG.QUALITY.minContentLength) {
        continue;
      }

      validResults++;
      
      // Content length score (normalized)
      const lengthScore = Math.min(
        result.content.length / SEARCH_CONFIG.QUALITY.maxContentLength, 1
      );

      // Title relevance (simple heuristic)
      const titleScore = result.title && result.title.length > 10 ? 0.8 : 0.4;

      // URL quality (https, domain reputation)
      const urlScore = result.url.startsWith('https://') ? 0.8 : 0.6;

      totalScore += (lengthScore * 0.5 + titleScore * 0.3 + urlScore * 0.2);
    }

    return validResults > 0 ? (totalScore / validResults) : 0;
  }

  private async performRawSearch(query: string, maxResults: number): Promise<SearchSource[]> {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: this.tavilyApiKey,
        query: query,
        search_depth: 'advanced',
        include_answer: true,
        include_images: false,
        include_raw_content: false,
        max_results: maxResults,
        include_domains: [],
        exclude_domains: []
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return (data.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      content: this.cleanWebContent(r.content || '')
    }));
  }

  private cleanWebContent(content: string): string {
    return content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  }

  private removeDuplicates(results: SearchSource[]): SearchSource[] {
    const seen = new Set<string>();
    const unique: SearchSource[] = [];

    for (const result of results) {
      // Create a fingerprint for duplicate detection
      const fingerprint = result.url + '|' + result.title.toLowerCase();
      
      if (!seen.has(fingerprint)) {
        seen.add(fingerprint);
        unique.push(result);
      }
    }

    return unique;
  }

  async searchSingle(query: string, options: EnhancedSearchOptions = {}): Promise<SearchResponse> {
    const startTime = Date.now();
    const userIdentifier = this.getUserIdentifier(options);
    const maxResults = Math.min(
      options.maxResults || SEARCH_CONFIG.COST_CONTROLS.maxResultsPerQuery,
      SEARCH_CONFIG.COST_CONTROLS.maxResultsPerQuery
    );

    try {
      // Cost validation
      if (!this.costTracker.canAffordOperation(1)) {
        throw new Error('Daily cost limit exceeded');
      }

      // Rate limiting (unless bypassed)
      if (!options.bypassRateLimit) {
        const rateCheck = this.rateLimiter.checkRateLimit(userIdentifier, 1);
        if (!rateCheck.allowed) {
          throw new Error(`Rate limit exceeded. Retry after ${rateCheck.retryAfter} seconds`);
        }
      }

      // Check cache first (unless force refresh)
      let results: SearchSource[] | null = null;
      let cached = false;

      if (!options.forceRefresh) {
        results = this.cache.getSearchResults(query, maxResults);
        cached = !!results;
      }

      // Perform search if not cached
      if (!results) {
        results = await this.circuitBreaker.execute(async () => {
          return await withTimeout(
            withRetry(
              () => this.performRawSearch(query, maxResults),
              {
                maxRetries: SEARCH_CONFIG.RETRY.maxRetries,
                onRetry: (attempt, error) => {
                  console.warn(`Search retry ${attempt} for query "${query}":`, error.message);
                }
              }
            ).then(retryResult => retryResult.result),
            SEARCH_CONFIG.TIMEOUTS.searchTimeoutMs
          );
        });

        // Remove duplicates and filter by quality
        results = this.removeDuplicates(results).filter(result => 
          result.content.length >= SEARCH_CONFIG.QUALITY.minContentLength &&
          result.content.length <= SEARCH_CONFIG.QUALITY.maxContentLength
        );

        // Cache the results
        this.cache.setSearchResults(query, results, maxResults);
      }

      // Calculate costs and metrics
      const cost = cached ? 0 : this.costTracker.recordCost(1, 'search');
      const duration = Date.now() - startTime;
      const qualityScore = this.calculateQualityScore(results);
      const rateCheck = this.rateLimiter.checkRateLimit(userIdentifier, 0); // Just check, don't consume

      // Record analytics
      this.analytics.recordSearch({
        query,
        duration,
        resultCount: results.length,
        success: true,
        cost,
        cached,
        source: cached ? 'cache' : 'tavily',
        retries: 0, // TODO: Get from retry result
        relevanceScore: qualityScore,
      });

      return {
        results,
        metadata: {
          cached,
          cost,
          duration,
          attempts: 1, // TODO: Get from retry result
          rateLimitRemaining: rateCheck.remaining,
          qualityScore,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const rateCheck = this.rateLimiter.checkRateLimit(userIdentifier, 0);

      // Record failed search
      this.analytics.recordSearch({
        query,
        duration,
        resultCount: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        cost: 0,
        cached: false,
        source: 'tavily',
        retries: 0,
      });

      throw error;
    }
  }

  async searchBatch(requests: BatchSearchRequest[]): Promise<BatchSearchResponse> {
    const startTime = Date.now();
    
    // Validate batch size
    if (requests.length > SEARCH_CONFIG.COST_CONTROLS.maxQueriesPerRequest) {
      throw new Error(`Batch size ${requests.length} exceeds limit of ${SEARCH_CONFIG.COST_CONTROLS.maxQueriesPerRequest}`);
    }

    // Execute all searches in parallel
    const searchPromises = requests.map(async (request) => {
      try {
        const response = await this.searchSingle(request.query, request.options);
        return { query: request.query, response };
      } catch (error) {
        return { query: request.query, response: error as Error };
      }
    });

    const results = await Promise.all(searchPromises);
    
    // Calculate totals
    let totalCost = 0;
    for (const result of results) {
      if (!(result.response instanceof Error)) {
        totalCost += result.response.metadata.cost;
      }
    }

    const totalDuration = Date.now() - startTime;

    return {
      results,
      totalCost,
      totalDuration,
    };
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    circuitBreakerState: string;
  }> {
    const checks: Record<string, boolean> = {};

    try {
      // Test API connectivity
      checks.apiConnectivity = await withTimeout(
        this.performRawSearch('test health check', 1).then(() => true),
        SEARCH_CONFIG.TIMEOUTS.healthCheckTimeoutMs
      ).catch(() => false);

      // Check cost limits
      checks.costLimits = this.costTracker.canAffordOperation(1);

      // Check cache functionality
      try {
        this.cache.set('health_check', 'test');
        checks.cache = this.cache.get('health_check') === 'test';
      } catch {
        checks.cache = false;
      }

      // Check rate limiting
      checks.rateLimiting = true; // Rate limiter is always functional

      const healthyChecks = Object.values(checks).filter(Boolean).length;
      const totalChecks = Object.keys(checks).length;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyChecks === totalChecks) {
        status = 'healthy';
      } else if (healthyChecks >= totalChecks * 0.5) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        checks,
        circuitBreakerState: this.circuitBreaker.getState(),
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        checks: { error: false },
        circuitBreakerState: this.circuitBreaker.getState(),
      };
    }
  }

  // Get service statistics
  getStats() {
    return {
      cost: this.costTracker.getMetrics(),
      cache: this.cache.getStats(),
      analytics: this.analytics.getSnapshot(),
      circuitBreaker: this.circuitBreaker.getStats(),
    };
  }

  // Reset all services (for testing/admin)
  reset(): void {
    this.costTracker.reset();
    this.rateLimiter.reset();
    this.cache.clear();
    this.analytics.reset();
    this.circuitBreaker.reset();
  }

  // Enhanced search method for 100 queries
  async searchEnhanced(
    queries: string[],
    options: EnhancedSearchOptions = {}
  ): Promise<{
    results: SearchSource[];
    totalQueries: number;
    successfulQueries: number;
    cacheHitRate: number;
    duration: number;
    requestId: string;
    errors: string[];
    cached: boolean;
  }> {
    const startTime = Date.now();
    const requestId = `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Use enhanced search strategy
    const strategy = ENHANCED_SEARCH_STRATEGY;
    const totalQueries = Math.min(queries.length, strategy.total);
    
    // Distribute queries across stages
    const stageQueries = {
      initial: queries.slice(0, strategy.initialQueries),
      focused: queries.slice(strategy.initialQueries, strategy.initialQueries + strategy.focusedQueries),
      validation: queries.slice(strategy.initialQueries + strategy.focusedQueries, strategy.initialQueries + strategy.focusedQueries + strategy.validationQueries),
      recent: queries.slice(strategy.initialQueries + strategy.focusedQueries + strategy.validationQueries, totalQueries)
    };

    const allResults: SearchSource[] = [];
    const errors: string[] = [];
    let cacheHits = 0;

    // Execute searches in stages
    for (const [stage, queries] of Object.entries(stageQueries)) {
      if (queries.length === 0) continue;
      
      console.log(`Executing ${stage} stage with ${queries.length} queries`);
      
      for (const query of queries) {
        try {
          const result = await this.searchSingle(query, {
            ...options,
            maxResults: options.maxResults || 3,
          });
          
          allResults.push(...result.results);
          if (result.metadata.cached) cacheHits++;
          
          // Add delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          errors.push(`${query}: ${error.message}`);
          console.error(`Search failed for query "${query}":`, error);
        }
      }
    }

    // Remove duplicates and apply quality filters
    const uniqueResults = this.removeDuplicates(allResults);
    const qualityFiltered = uniqueResults.filter(result => 
      result.content.length >= SEARCH_CONFIG.QUALITY.minContentLength &&
      result.content.length <= SEARCH_CONFIG.QUALITY.maxContentLength
    );
    
    const duration = Date.now() - startTime;
    const cacheHitRate = totalQueries > 0 ? cacheHits / totalQueries : 0;

    return {
      results: qualityFiltered,
      totalQueries: totalQueries,
      successfulQueries: totalQueries - errors.length,
      cacheHitRate,
      duration,
      requestId,
      errors,
      cached: cacheHitRate > 0.5
    };
  }
}