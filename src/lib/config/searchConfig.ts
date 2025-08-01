export const SEARCH_CONFIG = {
  // Cost Management
  COST_CONTROLS: {
    maxQueriesPerRequest: 10,
    maxResultsPerQuery: 15,
    dailySpendLimit: 100,
    costPerQuery: 0.001,
    costPerToken: 0.00001,
    warningThreshold: 0.8, // 80% of daily limit
  },

  // Rate Limiting
  RATE_LIMITS: {
    requestsPerMinute: 30,
    requestsPerHour: 500,
    burstAllowance: 5,
    windowSizeMs: 60000, // 1 minute
  },

  // Caching
  CACHE: {
    searchResultsTtl: 3600000, // 1 hour
    maxCacheSize: 1000,
    compressionEnabled: true,
    keyPrefix: 'search_',
  },

  // Retry Logic
  RETRY: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    exponentialBackoff: true,
    retryableStatusCodes: [429, 500, 502, 503, 504],
  },

  // Analytics
  ANALYTICS: {
    enableMetrics: true,
    sampleRate: 1.0, // 100% sampling
    retentionDays: 30,
  },

  // Search Quality
  QUALITY: {
    minContentLength: 100,
    maxContentLength: 10000,
    relevanceThreshold: 0.6,
    duplicateThreshold: 0.8,
  },

  // API Timeouts
  TIMEOUTS: {
    searchTimeoutMs: 30000,
    batchTimeoutMs: 60000,
    healthCheckTimeoutMs: 5000,
  },
};

export type SearchConfig = typeof SEARCH_CONFIG;