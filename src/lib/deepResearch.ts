import OpenAI from "openai";
import { EnhancedSearchService } from "./services/EnhancedSearchService";
import { CostTracker } from "./services/CostTracker";
import { SearchAnalytics } from "./services/SearchAnalytics";
import { PipelineService, PipelineOptions } from "./services/PipelineService";

export const REPORT_STRUCTURE = [
  "TLDR",
  "Project Information & Competition",
  "Team, Venture Funds, CEO and Key Members",
  "Tokenomics",
  "Airdrops and Incentive Programs",
  "Social Media & Community Analysis",
  "On-Chain Overview",
  "Conclusion"
];

export const SEARCH_PROMPT_TEMPLATE = `You are an expert blockchain analyst. Your job is to research a given crypto project and create a report based on the following structure:
${REPORT_STRUCTURE.map((section, index) => `${index + 1}. ${section}`).join('\n')}

Your report should be comprehensive, clear, and concise. Use markdown formatting.
`;

export const STRICT_SEARCH_PROMPT_TEMPLATE = `You are an expert blockchain analyst. Your job is to research a given crypto project and create a report based on the following structure:
${REPORT_STRUCTURE.map((section, index) => `${index + 1}. ${section}`).join('\n')}

Your report MUST ONLY include information that is directly related to the project. Do not include any general information about blockchain, crypto, or other projects.
Your report should be comprehensive, clear, and concise. Use markdown formatting.
`;

export const LITE_SEARCH_PROMPT_TEMPLATE = `You are an expert blockchain analyst. Your job is to research a given crypto project and create a report based on the following structure:
${REPORT_STRUCTURE.map((section, index) => `${index + 1}. ${section}`).join('\n')}

Your report should be brief and to the point. Focus on the most important information. Use markdown formatting.
`;

export const STRICT_LITE_SEARCH_PROMPT_TEMPLATE = `You are an expert blockchain analyst. Your job is to research a given crypto project and create a report based on the following structure:
${REPORT_STRUCTURE.map((section, index) => `${index + 1}. ${section}`).join('\n')}

Your report MUST ONLY include information that is directly related to the project. Do not include any general information about blockchain, crypto, or other projects.
Your report should be brief and to the point. Focus on the most important information. Use markdown formatting.
`;

export const OPENAI_DEFAULT_PARAMS = {
  model: "gpt-4-turbo-preview",
  max_tokens: 4096,
  temperature: 0.7,
};

export type ProjectInput = {
  project_name: string;
  project_website: string;
  project_twitter: string;
  project_contract?: string;
  strict_mode?: boolean;
  mode: 'deep-dive' | 'lite';
};

export type SearchSource = {
  title: string;
  url: string;
  content: string;
};

export type ResearchReport = {
  report: string;
  sources: SearchSource[];
  requestId: string;
  confidenceScore: number;
  mode: "deep-dive" | "lite";
  metadata: {
    createdAt: number;
    requestId: string;
    wordCount: number;
    queryTerms: string[];
    retries: number;
    durationMs: number;
    confidenceReason?: string;
    strictModeWarnings?: string[];
    speculativeDensity?: number;
    sectionCoverageScore?: number;
    // Enhanced business metadata
    totalSearchCost?: number;
    cacheHitRate?: number;
    searchQualityScore?: number;
    businessMetrics?: {
      costPerQuery: number;
      rateLimitStatus: string;
      performanceGrade: string;
    };
    // Pipeline metadata
    pipelineMetadata?: {
      modelUsed: string[];
      processingStages: string[];
      bottlenecks: string[];
      qualityGates: { stage: string; passed: boolean; reason: string }[];
      totalTokensUsed: number;
      totalDuration: number;
      performanceGrade: string;
    };
  };
  jsonSections?: Record<string, string>;
};

export class DeepResearchDegen {
  private openaiApiKey: string;
  private tavilyApiKey: string;
  private modelName: string;
  private searchService: EnhancedSearchService;
  private pipelineService: PipelineService;

  constructor(openaiApiKey: string, tavilyApiKey: string, modelName = "o3-deep-research") {
    this.openaiApiKey = openaiApiKey;
    this.tavilyApiKey = tavilyApiKey;
    this.modelName = modelName;
    this.searchService = EnhancedSearchService.getInstance(tavilyApiKey);
    this.pipelineService = new PipelineService(openaiApiKey);
  }

  private async searchWeb(query: string, maxResults: number = 15): Promise<SearchSource[]> {
    try {
      const response = await this.searchService.searchSingle(query, {
        maxResults,
        priority: 'high',
      });
      return response.results;
    } catch (error) {
      console.error('Enhanced web search failed:', error);
      return [];
    }
  }

  private async generateAIReport(
    input: ProjectInput,
    sources: SearchSource[]
  ): Promise<string> {
    const openai = new OpenAI({ apiKey: this.openaiApiKey });
    const promptTemplate = input.strict_mode ?
      (input.mode === 'lite' ? STRICT_LITE_SEARCH_PROMPT_TEMPLATE : STRICT_SEARCH_PROMPT_TEMPLATE) :
      (input.mode === 'lite' ? LITE_SEARCH_PROMPT_TEMPLATE : SEARCH_PROMPT_TEMPLATE);

    const systemPrompt = `${promptTemplate}\nProject Name: ${input.project_name}\nProject Website: ${input.project_website}\nProject Twitter: ${input.project_twitter}\n`;
    const content = sources.map(source => `Source: ${source.title}\nURL: ${source.url}\nContent: ${source.content}`).join('\n---\n');

    const messages: Array<{ role: "system" | "user"; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Please create a report based on the following sources:\n${content}` },
    ];

    try {
      const completion = await openai.chat.completions.create({
        ...OPENAI_DEFAULT_PARAMS,
        model: "gpt-4-turbo-preview",
        messages: messages,
      });

      const report = completion.choices[0]?.message?.content;
      if (!report) {
        throw new Error("No report generated");
      }
      return report;
    } catch (error) {
      console.error("OpenAI report generation failed:", error);
      throw error;
    }
  }

  async generateReport(input: ProjectInput): Promise<ResearchReport> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    // Business validation checks
    const costTracker = CostTracker.getInstance();
    if (!costTracker.canAffordOperation(15)) { // Increased for multi-stage pipeline
      throw new Error(`Research operation would exceed daily cost limit. Remaining budget: $${costTracker.getRemainingBudget().toFixed(4)}`);
    }

    // Enhanced query generation for 100 searches
    const queryTerms = [
      // Stage 1: Initial broad discovery (25)
      input.project_name,
      `${input.project_name} crypto`,
      `${input.project_name} blockchain`,
      `${input.project_name} tokenomics`,
      `${input.project_name} team founders`,
      `${input.project_name} venture capital funding`,
      `${input.project_name} whitepaper`,
      `${input.project_name} roadmap`,
      `${input.project_name} governance`,
      `${input.project_name} utility token`,
      `${input.project_name} protocol`,
      `${input.project_name} DeFi`,
      `${input.project_name} smart contract`,
      `${input.project_name} audit`,
      `${input.project_name} liquidity`,
      `${input.project_name} staking`,
      `${input.project_name} yield farming`,
      `${input.project_name} partnerships`,
      `${input.project_name} community`,
      `${input.project_name} social media`,
      `${input.project_name} Twitter`,
      `${input.project_name} Discord`,
      `${input.project_name} Telegram`,
      `${input.project_name} ecosystem`,
      `${input.project_name} competitors`,
      
      // Stage 2: Focused gap-filling (25)
      `${input.project_name} market cap`,
      `${input.project_name} trading volume`,
      `${input.project_name} price analysis`,
      `${input.project_name} technical analysis`,
      `${input.project_name} on-chain metrics`,
      `${input.project_name} holder distribution`,
      `${input.project_name} wallet activity`,
      `${input.project_name} transaction volume`,
      `${input.project_name} TVL total value locked`,
      `${input.project_name} revenue model`,
      `${input.project_name} business model`,
      `${input.project_name} monetization`,
      `${input.project_name} use cases`,
      `${input.project_name} adoption`,
      `${input.project_name} integration`,
      `${input.project_name} API`,
      `${input.project_name} developer`,
      `${input.project_name} GitHub`,
      `${input.project_name} development activity`,
      `${input.project_name} updates`,
      `${input.project_name} releases`,
      `${input.project_name} changelog`,
      `${input.project_name} security`,
      `${input.project_name} vulnerabilities`,
      `${input.project_name} risks`,
      
      // Stage 3: Validation (25)
      `${input.project_name} review`,
      `${input.project_name} analysis report`,
      `${input.project_name} research`,
      `${input.project_name} opinion`,
      `${input.project_name} expert`,
      `${input.project_name} analyst`,
      `${input.project_name} rating`,
      `${input.project_name} score`,
      `${input.project_name} recommendation`,
      `${input.project_name} investment`,
      `${input.project_name} bull case`,
      `${input.project_name} bear case`,
      `${input.project_name} thesis`,
      `${input.project_name} fundamentals`,
      `${input.project_name} valuation`,
      `${input.project_name} comparison`,
      `${input.project_name} benchmark`,
      `${input.project_name} metrics`,
      `${input.project_name} KPIs`,
      `${input.project_name} performance`,
      `${input.project_name} success factors`,
      `${input.project_name} challenges`,
      `${input.project_name} limitations`,
      `${input.project_name} concerns`,
      `${input.project_name} criticism`,
      
      // Stage 4: Recent updates (25)
      `${input.project_name} news`,
      `${input.project_name} latest`,
      `${input.project_name} recent`,
      `${input.project_name} announcement`,
      `${input.project_name} launch`,
      `${input.project_name} update 2024`,
      `${input.project_name} Q4 2024`,
      `${input.project_name} Q1 2025`,
      `${input.project_name} 2025`,
      `${input.project_name} future`,
      `${input.project_name} upcoming`,
      `${input.project_name} planned`,
      `${input.project_name} schedule`,
      `${input.project_name} timeline`,
      `${input.project_name} milestone`,
      `${input.project_name} progress`,
      `${input.project_name} development`,
      `${input.project_name} beta`,
      `${input.project_name} testnet`,
      `${input.project_name} mainnet`,
      `${input.project_name} upgrade`,
      `${input.project_name} fork`,
      `${input.project_name} proposal`,
      `${input.project_name} vote`,
      `${input.project_name} governance decision`
    ];

    // Execute enhanced search with 100 queries
    const searchResults = await this.searchService.searchEnhanced(queryTerms, {
      maxResults: 3, // 3 results per query = 300 total sources
      priority: 'high',
    });

    // Execute multi-stage pipeline
    const pipelineOptions: PipelineOptions = {
      mode: input.mode,
      strictMode: input.strict_mode,
      highDepthMode: input.mode === 'deep-dive'
    };

    const { results, metadata: pipelineMetadata } = await this.pipelineService.executePipeline(
      { sources: searchResults.results },
      pipelineOptions
    );

    // Get final report from pipeline
    const finalStage = results.find(r => r.stage === 'finalReport');
    const report = finalStage?.output || "Pipeline failed to generate report";
    
    return {
      report,
      sources: searchResults.results,
      requestId,
      confidenceScore: this.calculateConfidenceScore(results, searchResults),
      mode: input.mode,
      metadata: {
        createdAt: Date.now(),
        requestId,
        wordCount: report.length,
        queryTerms: queryTerms.slice(0, 10), // Sample for brevity
        retries: 0,
        durationMs: Date.now() - startTime,
        totalSearchCost: searchResults.totalQueries * 0.001,
        cacheHitRate: searchResults.cacheHitRate,
        searchQualityScore: this.calculateSearchQuality(searchResults),
        businessMetrics: {
          costPerQuery: 0.001,
          rateLimitStatus: 'healthy',
          performanceGrade: pipelineMetadata.performanceGrade,
        },
        // Enhanced pipeline metadata
        pipelineMetadata
      },
    };
  }

  private calculateConfidenceScore(pipelineResults: any[], searchResults: any): number {
    const qualityGatesPassedRatio = pipelineResults.filter(r => r.qualityGate?.passed).length / pipelineResults.length;
    const searchQualityScore = this.calculateSearchQuality(searchResults);
    
    return (qualityGatesPassedRatio * 0.6) + (searchQualityScore * 0.4);
  }

  private calculateSearchQuality(searchResults: any): number {
    if (!searchResults.results || searchResults.results.length === 0) return 0;
    
    const avgContentLength = searchResults.results.reduce((sum: number, r: any) => sum + r.content.length, 0) / searchResults.results.length;
    const uniqueDomains = new Set(searchResults.results.map((r: any) => new URL(r.url).hostname)).size;
    
    // Quality score based on content richness and source diversity
    const contentScore = Math.min(avgContentLength / 1000, 1); // Normalize to 0-1
    const diversityScore = Math.min(uniqueDomains / 10, 1); // Normalize to 0-1
    
    return (contentScore * 0.7) + (diversityScore * 0.3);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getServiceStats() {
    return this.searchService.getStats();
  }

  async healthCheck() {
    return await this.searchService.healthCheck();
  }
}

function truncate(str: string, n: number): string {
  return (str.length > n) ? str.slice(0, n - 1) + '...' : str;
}
