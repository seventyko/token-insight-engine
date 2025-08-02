export const ENHANCED_SEARCH_STRATEGY = {
  // Stage 1: Broad discovery (25 searches)
  initialQueries: 25,
  
  // Stage 2: Gap-filling (25 searches) 
  focusedQueries: 25,
  
  // Stage 3: Deep validation (25 searches)
  validationQueries: 25,
  
  // Stage 4: Real-time updates (25 searches)
  recentQueries: 25,
  
  total: 100
};

export const MODEL_REGISTRY = {
  sourceGathering: "gpt-4o",
  contentExtraction: "gpt-4o", 
  synthesis: "o3-deep-research",
  speculation: "o3-deep-research",
  finalReport: "o3-deep-research",
  validation: "gpt-4o"
};

export const TOKEN_LIMITS = {
  sourceGathering: 3000,
  contentExtraction: 5000,
  synthesis: 10000,
  speculation: 6000,
  finalReport: 16000,
  validation: 2000,
};

export const PIPELINE_STAGES = [
  'sourceGathering',
  'contentExtraction', 
  'synthesis',
  'speculation',
  'finalReport',
  'validation'
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

export const SEARCH_CONFIG = {
  // Cost Management
  COST_CONTROLS: {
    maxQueriesPerRequest: 100, // Increased for enhanced search
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

  // Enhanced search parameters
  enhancedMode: true,
  searchStrategy: ENHANCED_SEARCH_STRATEGY,
};

export type SearchConfig = typeof SEARCH_CONFIG;