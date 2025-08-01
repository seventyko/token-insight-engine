import { SEARCH_CONFIG } from '../config/searchConfig';

export interface SearchMetrics {
  query: string;
  timestamp: number;
  duration: number;
  resultCount: number;
  success: boolean;
  error?: string;
  cost: number;
  cached: boolean;
  source: 'tavily' | 'cache' | 'fallback';
  retries: number;
  relevanceScore?: number;
}

export interface AnalyticsSnapshot {
  totalQueries: number;
  successRate: number;
  averageDuration: number;
  cacheHitRate: number;
  averageCost: number;
  topQueries: Array<{ query: string; count: number }>;
  errorRate: number;
  performanceTrends: Array<{ timestamp: number; avgDuration: number; successRate: number }>;
}

export interface QualityMetrics {
  relevanceScore: number;
  contentQuality: number;
  diversityScore: number;
  duplicateRate: number;
}

export class SearchAnalytics {
  private static instance: SearchAnalytics;
  private metrics: SearchMetrics[] = [];
  private readonly STORAGE_KEY = 'search_analytics';
  private readonly MAX_METRICS = 10000;

  private constructor() {
    this.loadFromStorage();
    this.startPeriodicCleanup();
  }

  static getInstance(): SearchAnalytics {
    if (!SearchAnalytics.instance) {
      SearchAnalytics.instance = new SearchAnalytics();
    }
    return SearchAnalytics.instance;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.metrics = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load analytics from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      // Keep only recent metrics to prevent localStorage bloat
      const recent = this.metrics.slice(-this.MAX_METRICS);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recent));
      this.metrics = recent;
    } catch (error) {
      console.warn('Failed to save analytics to storage:', error);
    }
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanOldMetrics();
      this.saveToStorage();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private cleanOldMetrics(): void {
    const retentionMs = SEARCH_CONFIG.ANALYTICS.retentionDays * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - retentionMs;
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);
  }

  recordSearch(metrics: Omit<SearchMetrics, 'timestamp'>): void {
    if (!SEARCH_CONFIG.ANALYTICS.enableMetrics) {
      return;
    }

    // Sample metrics based on sample rate
    if (Math.random() > SEARCH_CONFIG.ANALYTICS.sampleRate) {
      return;
    }

    const fullMetrics: SearchMetrics = {
      ...metrics,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetrics);
    
    // Immediate save for critical metrics
    if (!metrics.success || metrics.cost > 1) {
      this.saveToStorage();
    }
  }

  getSnapshot(timeRangeMs?: number): AnalyticsSnapshot {
    const cutoff = timeRangeMs ? Date.now() - timeRangeMs : 0;
    const relevantMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    if (relevantMetrics.length === 0) {
      return {
        totalQueries: 0,
        successRate: 0,
        averageDuration: 0,
        cacheHitRate: 0,
        averageCost: 0,
        topQueries: [],
        errorRate: 0,
        performanceTrends: [],
      };
    }

    const totalQueries = relevantMetrics.length;
    const successfulQueries = relevantMetrics.filter(m => m.success).length;
    const cachedQueries = relevantMetrics.filter(m => m.cached).length;
    
    const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    const totalCost = relevantMetrics.reduce((sum, m) => sum + m.cost, 0);

    // Calculate top queries
    const queryCount = new Map<string, number>();
    relevantMetrics.forEach(m => {
      const count = queryCount.get(m.query) || 0;
      queryCount.set(m.query, count + 1);
    });

    const topQueries = Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate performance trends (hourly buckets)
    const hourlyMetrics = new Map<number, SearchMetrics[]>();
    relevantMetrics.forEach(m => {
      const hour = Math.floor(m.timestamp / (60 * 60 * 1000));
      if (!hourlyMetrics.has(hour)) {
        hourlyMetrics.set(hour, []);
      }
      hourlyMetrics.get(hour)!.push(m);
    });

    const performanceTrends = Array.from(hourlyMetrics.entries())
      .map(([hour, metrics]) => ({
        timestamp: hour * 60 * 60 * 1000,
        avgDuration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
        successRate: metrics.filter(m => m.success).length / metrics.length,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      totalQueries,
      successRate: successfulQueries / totalQueries,
      averageDuration: totalDuration / totalQueries,
      cacheHitRate: cachedQueries / totalQueries,
      averageCost: totalCost / totalQueries,
      topQueries,
      errorRate: (totalQueries - successfulQueries) / totalQueries,
      performanceTrends,
    };
  }

  getQualityMetrics(timeRangeMs?: number): QualityMetrics {
    const cutoff = timeRangeMs ? Date.now() - timeRangeMs : 0;
    const relevantMetrics = this.metrics.filter(m => 
      m.timestamp > cutoff && m.success && m.relevanceScore !== undefined
    );

    if (relevantMetrics.length === 0) {
      return {
        relevanceScore: 0,
        contentQuality: 0,
        diversityScore: 0,
        duplicateRate: 0,
      };
    }

    const avgRelevanceScore = relevantMetrics.reduce((sum, m) => 
      sum + (m.relevanceScore || 0), 0
    ) / relevantMetrics.length;

    // Calculate content quality based on result count and duration
    const avgContentQuality = relevantMetrics.reduce((sum, m) => {
      // Higher score for more results in reasonable time
      const efficiency = m.resultCount / Math.max(m.duration / 1000, 1);
      return sum + Math.min(efficiency, 1);
    }, 0) / relevantMetrics.length;

    // Calculate diversity based on unique queries vs total queries
    const uniqueQueries = new Set(relevantMetrics.map(m => m.query)).size;
    const diversityScore = uniqueQueries / relevantMetrics.length;

    // Estimate duplicate rate (simplified)
    const duplicateRate = Math.max(0, 1 - diversityScore);

    return {
      relevanceScore: avgRelevanceScore,
      contentQuality: avgContentQuality,
      diversityScore,
      duplicateRate,
    };
  }

  getErrorAnalysis(timeRangeMs?: number): Array<{ error: string; count: number; lastOccurrence: number }> {
    const cutoff = timeRangeMs ? Date.now() - timeRangeMs : 0;
    const errorMetrics = this.metrics.filter(m => 
      m.timestamp > cutoff && !m.success && m.error
    );

    const errorCount = new Map<string, { count: number; lastOccurrence: number }>();
    
    errorMetrics.forEach(m => {
      const error = m.error!;
      const existing = errorCount.get(error) || { count: 0, lastOccurrence: 0 };
      errorCount.set(error, {
        count: existing.count + 1,
        lastOccurrence: Math.max(existing.lastOccurrence, m.timestamp),
      });
    });

    return Array.from(errorCount.entries())
      .map(([error, data]) => ({ error, ...data }))
      .sort((a, b) => b.count - a.count);
  }

  getCostAnalysis(timeRangeMs?: number): {
    totalCost: number;
    costPerQuery: number;
    costDistribution: Array<{ range: string; count: number }>;
    topCostlyQueries: Array<{ query: string; cost: number }>;
  } {
    const cutoff = timeRangeMs ? Date.now() - timeRangeMs : 0;
    const relevantMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    const totalCost = relevantMetrics.reduce((sum, m) => sum + m.cost, 0);
    const costPerQuery = relevantMetrics.length > 0 ? totalCost / relevantMetrics.length : 0;

    // Cost distribution
    const ranges = [
      { min: 0, max: 0.001, label: '< $0.001' },
      { min: 0.001, max: 0.01, label: '$0.001 - $0.01' },
      { min: 0.01, max: 0.1, label: '$0.01 - $0.1' },
      { min: 0.1, max: 1, label: '$0.1 - $1' },
      { min: 1, max: Infinity, label: '> $1' },
    ];

    const costDistribution = ranges.map(range => ({
      range: range.label,
      count: relevantMetrics.filter(m => m.cost >= range.min && m.cost < range.max).length,
    }));

    // Top costly queries
    const topCostlyQueries = relevantMetrics
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10)
      .map(m => ({ query: m.query, cost: m.cost }));

    return {
      totalCost,
      costPerQuery,
      costDistribution,
      topCostlyQueries,
    };
  }

  // Export data for external analysis
  exportData(timeRangeMs?: number): SearchMetrics[] {
    const cutoff = timeRangeMs ? Date.now() - timeRangeMs : 0;
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  // Clear all analytics data
  reset(): void {
    this.metrics = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Generate performance report
  generateReport(timeRangeMs: number = 24 * 60 * 60 * 1000): string {
    const snapshot = this.getSnapshot(timeRangeMs);
    const quality = this.getQualityMetrics(timeRangeMs);
    const errors = this.getErrorAnalysis(timeRangeMs);
    const costs = this.getCostAnalysis(timeRangeMs);

    return `
SEARCH ANALYTICS REPORT
======================
Time Range: Last ${timeRangeMs / (60 * 60 * 1000)} hours

PERFORMANCE METRICS:
- Total Queries: ${snapshot.totalQueries}
- Success Rate: ${(snapshot.successRate * 100).toFixed(1)}%
- Average Duration: ${snapshot.averageDuration.toFixed(0)}ms
- Cache Hit Rate: ${(snapshot.cacheHitRate * 100).toFixed(1)}%

QUALITY METRICS:
- Relevance Score: ${(quality.relevanceScore * 100).toFixed(1)}%
- Content Quality: ${(quality.contentQuality * 100).toFixed(1)}%
- Diversity Score: ${(quality.diversityScore * 100).toFixed(1)}%

COST ANALYSIS:
- Total Cost: $${costs.totalCost.toFixed(4)}
- Cost Per Query: $${costs.costPerQuery.toFixed(6)}

TOP QUERIES:
${snapshot.topQueries.slice(0, 5).map(q => `- "${q.query}" (${q.count} times)`).join('\n')}

TOP ERRORS:
${errors.slice(0, 3).map(e => `- ${e.error} (${e.count} times)`).join('\n')}
    `.trim();
  }
}
