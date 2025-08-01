import OpenAI from "openai";

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

// Advanced search query templates for comprehensive data gathering
const SEARCH_QUERY_TEMPLATES = {
  basic: (project: string) => [
    `${project} crypto project overview`,
    `${project} tokenomics whitepaper`,
    `${project} team founders background`,
    `${project} roadmap development updates`
  ],
  enhanced: (project: string, twitter?: string, website?: string) => [
    `${project} DeFi TVL volume metrics analytics`,
    `${project} on-chain analytics transaction volume wallets`,
    `${project} crypto twitter KOL influencer opinion sentiment`,
    `${project} governance proposals DAO voting participation`,
    `${project} security audit report vulnerabilities`,
    `${project} competitors comparison market share`,
    `${project} airdrop farming strategy eligibility`,
    `${project} yield farming staking APY rewards protocol`,
    `${project} whale wallet concentration distribution analysis`,
    `${project} regulatory compliance legal risks SEC`,
    `${project} institutional adoption enterprise partnerships`,
    `${project} developer activity GitHub commits contributors`,
    ...(twitter ? [`site:twitter.com ${twitter} ${project} alpha calls predictions`] : []),
    ...(website ? [`site:${website} documentation API technical specs`] : [])
  ],
  speculation: (project: string) => [
    `${project} price prediction 2025 bull bear scenarios`,
    `${project} market catalysts events upcoming releases`,
    `${project} narrative ecosystem integrations partnerships`,
    `${project} competitive advantages moats differentiation`,
    `${project} risks threats regulatory black swan events`,
    `${project} adoption metrics user growth network effects`,
    `${project} token economics game theory incentive alignment`
  ],
  defi: (project: string) => [
    `${project} Total Value Locked TVL DeFiLlama`,
    `${project} yield farming pools liquidity mining`,
    `${project} impermanent loss risks strategies`,
    `${project} governance token utility voting rights`,
    `${project} protocol revenue fee distribution`,
    `${project} liquidity depth order book analysis`,
    `${project} smart contract risks audits exploits`
  ]
};

// Retry configuration for quality control - optimized for o3 model
const RETRY_CONFIG = {
  maxRetries: 3,
  minWordCount: 5000, // Increased for o3's superior capability
  minSpeculativeDensity: 0.08, // Higher speculation threshold
  minSectionCoverage: 0.85 // More stringent section coverage
};

const COMBINED_STRUCTURE_PROMPT = `
🔬 COMPREHENSIVE CRYPTO RESEARCH ANALYSIS

You are a professional cryptocurrency research analyst with extensive experience in blockchain technology, tokenomics, and market dynamics. Your task is to produce a thorough, analytical research report that provides actionable insights for institutional investors and sophisticated market participants.

**CRITICAL REQUIREMENT: This report MUST exceed 5000 words. Each section requires substantial depth and analysis.**

**RESEARCH MISSION:** Deliver comprehensive analytical assessment that examines all critical aspects of the project through multiple analytical frameworks.

**MANDATORY STRUCTURE:** Execute exactly these 8 sections with substantial depth:

${REPORT_STRUCTURE.map((s, i) => `${i + 1}. ${s}`).join("\n")}

**MINIMUM SECTION LENGTHS (QUALITY CONTROL):**
- TLDR: 500+ words (comprehensive market analysis and investment thesis)
- Project Information & Competition: 750+ words (competitive landscape analysis)
- Team, Venture Funds, CEO: 650+ words (leadership assessment and backing analysis)
- Tokenomics: 800+ words (economic model analysis and sustainability)
- Airdrops and Incentives: 550+ words (incentive structure evaluation)
- Social Media & Community: 650+ words (community growth and engagement analysis)
- On-Chain Overview: 750+ words (blockchain metrics and transaction analysis)
- Conclusion: 550+ words (strategic assessment and future outlook)

**ANALYTICAL FRAMEWORK FOR EACH SECTION:**
Each section MUST include:
✅ **EXECUTIVE SUMMARY:** Clear thesis statement for the section
✅ **DETAILED ANALYSIS:** 400+ words of comprehensive breakdown with data
✅ **DATA INTEGRATION:** Specific metrics, percentages, and financial figures from research
✅ **COMPARATIVE ANALYSIS:** Position against 2-3 comparable projects with data
✅ **FORWARD-LOOKING ASSESSMENT:** (150+ words MINIMUM)
   - **Growth Scenarios:** Realistic 6-18 month development pathways
   - **Risk Assessment:** Key challenges that could impact success
   - **Market Opportunities:** Emerging trends and catalysts
   - **Timeline Analysis:** Expected milestones and market implications
   - **Industry Context:** How this project fits within broader market trends
✅ **SOURCE ATTRIBUTION:** Reference specific data points and sources

**ANALYTICAL REQUIREMENTS:**
1. **Economic Analysis:** Token utility, incentive mechanisms, sustainability models
2. **Regulatory Assessment:** Compliance considerations and regulatory environment
3. **Competitive Analysis:** Market positioning, differentiation factors, threats
4. **Adoption Analysis:** User growth patterns, network effects, institutional interest
5. **Risk Analysis:** Technical, market, regulatory, and execution risks
6. **Liquidity Assessment:** Token distribution, market depth, trading dynamics

**PROFESSIONAL STANDARDS:**
- ✅ **ANALYTICAL RIGOR:** Evidence-based conclusions with supporting data
- ✅ **FORWARD-THINKING:** Strategic analysis of future scenarios and developments
- ✅ **TECHNICAL DEPTH:** Understanding of blockchain mechanics and tokenomics
- ✅ **DATA-DRIVEN:** Every assertion supported by quantitative evidence
- ✅ **INSIGHT-FOCUSED:** Identify non-obvious opportunities and risks
- ✅ **STRATEGIC PERSPECTIVE:** Consider long-term implications and trends

**CONTENT REQUIREMENTS:**
- **Quantitative Analysis:** Include TVL, transaction volumes, yields, market capitalizations
- **Technical Assessment:** Protocol mechanics, security models, architectural considerations
- **Market Analysis:** Narrative strength, adoption drivers, competitive positioning
- **Institutional Perspective:** VC backing, institutional adoption, fund perspectives
- **Ecosystem Analysis:** Partnerships, integrations, strategic relationships
- **Risk Framework:** Comprehensive risk assessment across all categories

**OUTPUT REQUIREMENTS:**
You MUST deliver BOTH:

1. **COMPLETE RESEARCH REPORT** (5000+ words minimum)
2. **STRUCTURED JSON OBJECT** with these exact keys:
${REPORT_STRUCTURE.map(s => `"${s}"`).join(", ")}

JSON values must contain the complete section content including summary and forward-looking assessment.

**QUALITY STANDARDS:**
- Word Count: ≥ 5000 words (reports below this threshold will be rejected)
- Section Completeness: All 8 sections with comprehensive analysis
- Analysis Depth: ≥8% of content must include forward-looking assessment
- Data Integration: Extensively reference provided research context
- Technical Accuracy: Proper blockchain and DeFi terminology
- Comparative Analysis: Position against 3+ similar projects with data
- Analytical Rigor: Multi-layered reasoning with evidence-based conclusions

**RESEARCH METHODOLOGY:**
1. **Data Synthesis:** Integrate all available sources into coherent analysis
2. **Pattern Analysis:** Identify trends and connections across data points
3. **Scenario Development:** Analyze multiple potential development pathways
4. **Investment Analysis:** Structure findings as institutional-grade research
5. **Opportunity Identification:** Highlight market opportunities and risks
6. **Risk Assessment:** Comprehensive evaluation of potential challenges

Deliver comprehensive analysis that meets institutional research standards with thorough coverage of all critical aspects.

**MINIMUM 5000 WORDS REQUIRED FOR COMPLETE ANALYSIS.**
`;

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
  };
  jsonSections?: Record<string, string>;
};

function sanitizeInput(input: string) {
  return input ? input.replace(/[<>]/g, "").trim() : "";
}

function cleanURL(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^[\s@]+/, "");
  }
}

function cleanWebContent(content: string) {
  return content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function extractJsonSections(report: string): Record<string, string> | undefined {
  try {
    console.log('Extracting JSON sections from report length:', report.length);
    
    // Look for JSON blocks in markdown format first
    const jsonBlockMatch = report.match(/```json\s*\n([\s\S]*?)\n```/);
    if (jsonBlockMatch) {
      console.log('Found JSON block, parsing...');
      const parsed = JSON.parse(jsonBlockMatch[1]);
      console.log('Successfully parsed JSON with keys:', Object.keys(parsed));
      return parsed;
    }
    
    // Look for standalone JSON object at the end of the report
    const lines = report.split('\n');
    let jsonStart = -1;
    let braceCount = 0;
    
    // Find JSON object by counting braces backwards
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line === '}') {
        braceCount++;
        if (jsonStart === -1) jsonStart = i;
      } else if (line === '{') {
        braceCount--;
        if (braceCount === 0 && jsonStart !== -1) {
          // Found complete JSON object
          const jsonContent = lines.slice(i, jsonStart + 1).join('\n');
          console.log('Found potential JSON object, parsing...');
          const parsed = JSON.parse(jsonContent);
          console.log('Successfully parsed JSON with keys:', Object.keys(parsed));
          return parsed;
        }
      }
    }
    
    console.log('No JSON sections found in report');
    return undefined;
  } catch (error) {
    console.error('Error parsing JSON sections:', error);
    return undefined;
  }
}

function validateStrictMode(report: string, jsonSections: Record<string, string> | undefined, mode: "deep-dive" | "lite"): string[] {
  const warnings: string[] = [];
  const wordCount = report.split(/\s+/).length;
  const minWords = mode === "deep-dive" ? 5000 : 1200;
  if (wordCount < minWords) {
    warnings.push(`Report word count (${wordCount}) is below minimum required (${minWords})`);
  }
  if (!jsonSections) {
    warnings.push("No valid JSON sections extracted.");
  } else {
    for (const key of REPORT_STRUCTURE) {
      if (!jsonSections[key] || !jsonSections[key].trim()) {
        warnings.push(`Missing or empty section: "${key}"`);
      } else {
        if (!/Speculative Angle[\s\S]*?:[\s\S]*?\S/.test(jsonSections[key])) {
          warnings.push(`Section "${key}" missing non-empty 'Speculative Angle' subsection.`);
        }
      }
    }
  }
  return warnings;
}

function computeSpeculativeDensity(report: string, jsonSections?: Record<string, string>): number {
  if (!jsonSections) return 0;
  let totalWords = 0;
  let speculativeWords = 0;
  for (const key of REPORT_STRUCTURE) {
    const section = jsonSections[key];
    if (!section) continue;
    const words = section.split(/\s+/).length;
    totalWords += words;
    const match = section.match(/Speculative Angle[\s\S]*?:([\s\S]*)/i);
    if (match && match[1]) {
      speculativeWords += match[1].split(/\s+/).length;
    }
  }
  return totalWords > 0 ? speculativeWords / totalWords : 0;
}

function scoreSectionCoverage(jsonSections?: Record<string, string>): number {
  if (!jsonSections) return 0;
  let present = 0;
  let withSpeculation = 0;
  for (const key of REPORT_STRUCTURE) {
    const section = jsonSections[key];
    if (section && section.trim()) {
      present += 1;
      if (/Speculative Angle[\s\S]*?:[\s\S]*?\S/.test(section)) {
        withSpeculation += 1;
      }
    }
  }
  return present / REPORT_STRUCTURE.length * 0.7 + withSpeculation / REPORT_STRUCTURE.length * 0.3;
}

export class DeepResearchDegen {
  private openaiApiKey: string;
  private tavilyApiKey: string;
  private modelName: string;

  constructor(openaiApiKey: string, tavilyApiKey: string, modelName = "o3-deep-research-2025-06-26") {
    this.openaiApiKey = openaiApiKey;
    this.tavilyApiKey = tavilyApiKey;
    this.modelName = modelName;
  }

  private async searchWeb(query: string, maxResults: number = 15): Promise<SearchSource[]> {
    try {
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
        throw new Error(`Tavily API error: ${response.status}`);
      }

      const data = await response.json();
      return (data.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        content: cleanWebContent(r.content)
      }));
    } catch (error) {
      console.error('Web search failed:', error);
      return [];
    }
  }

  private async generateAIReport(prompt: string, mode: "deep-dive" | "lite"): Promise<string> {
    try {
      console.log(`[DeepResearch] Starting AI analysis with model: ${this.modelName}, mode: ${mode}`);
      
      // Validate model name
      if (!this.modelName || !this.modelName.includes('o3')) {
        throw new Error(`Invalid or unsupported model: ${this.modelName}`);
      }

      // Create the complete prompt with system instructions
      const completePrompt = `You are a world-class crypto research analyst with exceptional reasoning capabilities. Leverage your advanced analytical skills to provide comprehensive multi-layered analysis. Follow the user's instructions exactly and always provide both the formatted report and a valid JSON object as described.

${prompt}`;

      const requestBody = {
        model: this.modelName,
        input: completePrompt,
        max_output_tokens: mode === "deep-dive" ? 20000 : 8000,
        tools: [
          {
            type: "web_search_preview"
          }
        ],
      };

      console.log(`[DeepResearch] Making API request to /v1/responses with config:`, { 
        model: requestBody.model, 
        max_tokens: requestBody.max_output_tokens,
        input_length: completePrompt.length 
      });

      // Use /v1/responses endpoint for o3 models
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`[DeepResearch] API response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DeepResearch] API error response:`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[DeepResearch] API response structure:`, Object.keys(data));
      
      // Handle the response format for /v1/responses endpoint
      const content = data.response || data.choices?.[0]?.message?.content || data.content;
      
      if (!content) {
        console.error(`[DeepResearch] Unexpected response format:`, data);
        throw new Error("Empty or invalid response from OpenAI API");
      }
      
      console.log(`[DeepResearch] Generated report length: ${content.length} characters`);
      return content;
      
    } catch (error) {
      console.error("[DeepResearch] AI analysis failed:", error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error("[DeepResearch] Error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack?.slice(0, 500)
        });
      }
      
      // Return more specific error message
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return `Analysis unavailable due to API error: ${errorMessage}`;
    }
  }

  private generateAdvancedQueries(input: ProjectInput): string[] {
    const projectName = sanitizeInput(input.project_name);
    const website = sanitizeInput(cleanURL(input.project_website));
    const twitter = sanitizeInput(cleanURL(input.project_twitter));
    
    // Combine all query templates for comprehensive coverage
    const basicQueries = SEARCH_QUERY_TEMPLATES.basic(projectName);
    const enhancedQueries = SEARCH_QUERY_TEMPLATES.enhanced(projectName, twitter, website);
    const speculationQueries = SEARCH_QUERY_TEMPLATES.speculation(projectName);
    const defiQueries = SEARCH_QUERY_TEMPLATES.defi(projectName);
    
    // Additional context-specific queries
    const contextQueries = [
      ...(input.project_contract ? [`${input.project_contract} etherscan audit security`] : []),
      `"${projectName}" ecosystem partnerships integrations`,
      `"${projectName}" narrative meta trends 2024`,
      `"${projectName}" institutional adoption whale activity`,
      `"${projectName}" developer ecosystem grants`,
      `"${projectName}" competitive moat unique value proposition`
    ];

    return [...basicQueries, ...enhancedQueries, ...speculationQueries, ...defiQueries, ...contextQueries]
      .filter(Boolean)
      .slice(0, 25); // Limit to prevent overwhelming search
  }

  private async conductBatchedSearch(queries: string[]): Promise<SearchSource[]> {
    const batchSize = 3;
    const allResults: SearchSource[] = [];
    
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchPromises = batch.map(query => this.searchWeb(query, 12));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults.flat());
        
        // Rate limiting between batches
        if (i + batchSize < queries.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.warn(`Batch search failed for queries ${i}-${i + batchSize}:`, error);
      }
    }
    
    return allResults;
  }

  private evaluateReportQuality(report: string, jsonSections: Record<string, string> | undefined, mode: "deep-dive" | "lite"): {
    isAcceptable: boolean;
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 0;
    
    // Word count validation
    const wordCount = report.split(/\s+/).length;
    const minWords = mode === "deep-dive" ? RETRY_CONFIG.minWordCount : 1200; // Higher standard for lite mode
    if (wordCount >= minWords) {
      score += 30;
    } else {
      issues.push(`Word count ${wordCount} below minimum ${minWords}`);
    }
    
    // JSON sections validation
    if (jsonSections) {
      score += 20;
      const sectionCoverage = scoreSectionCoverage(jsonSections);
      if (sectionCoverage >= RETRY_CONFIG.minSectionCoverage) {
        score += 25;
      } else {
        issues.push(`Section coverage ${sectionCoverage.toFixed(2)} below minimum ${RETRY_CONFIG.minSectionCoverage}`);
      }
    } else {
      issues.push("No valid JSON sections found");
    }
    
    // Speculative density check
    const speculativeDensity = computeSpeculativeDensity(report, jsonSections);
    if (speculativeDensity >= RETRY_CONFIG.minSpeculativeDensity) {
      score += 15;
    } else {
      issues.push(`Speculative density ${speculativeDensity.toFixed(3)} below minimum ${RETRY_CONFIG.minSpeculativeDensity}`);
    }
    
    // Content quality heuristics
    const hasNumbers = /\d+/.test(report);
    const hasPercentages = /%/.test(report);
    const hasCryptoTerms = /(DeFi|TVL|APY|tokenomics|governance|staking|yield|liquidity)/gi.test(report);
    
    if (hasNumbers && hasPercentages && hasCryptoTerms) {
      score += 10;
    } else {
      issues.push("Report lacks sufficient data density and crypto-specific content");
    }
    
    return {
      isAcceptable: score >= 70 && issues.length <= 1,
      score,
      issues
    };
  }

  private async generateReportWithRetry(
    basePrompt: string, 
    mode: "deep-dive" | "lite", 
    webContext: string,
    retryCount = 0
  ): Promise<{ report: string; finalRetryCount: number }> {
    
    let enhancedPrompt = basePrompt;
    
    // Add retry-specific instructions
    if (retryCount > 0) {
      enhancedPrompt += `

**RETRY ATTEMPT #${retryCount}**
⚠️ Previous attempt failed quality checks. THIS MUST BE FIXED:
- MINIMUM ${mode === "deep-dive" ? "4000" : "800"} words (count as you write)
- ALL 8 sections must be substantial with deep analysis
- EVERY section needs 100+ word Speculative Angle with specific predictions
- Include MORE data points, numbers, metrics from the web context
- Be MORE speculative and forward-thinking
- Use MORE crypto-native terminology and insights

**WEB CONTEXT USAGE REQUIREMENT:**
You MUST reference and analyze the following web research data extensively:
${webContext.substring(0, 3000)}...

FAILURE TO MEET THESE REQUIREMENTS WILL RESULT IN ANOTHER RETRY.`;
    }
    
    const report = await this.generateAIReport(enhancedPrompt, mode);
    const jsonSections = extractJsonSections(report);
    const quality = this.evaluateReportQuality(report, jsonSections, mode);
    
    // If quality is acceptable or max retries reached, return
    if (quality.isAcceptable || retryCount >= RETRY_CONFIG.maxRetries) {
      return { report, finalRetryCount: retryCount };
    }
    
    // Otherwise, retry with enhanced prompt
    console.log(`Report quality insufficient (score: ${quality.score}), retrying... Issues:`, quality.issues);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return this.generateReportWithRetry(basePrompt, mode, webContext, retryCount + 1);
  }

  public async generateReport(input: ProjectInput): Promise<ResearchReport> {
    const startTime = Date.now();
    
    // Generate comprehensive queries using advanced templates
    const queries = this.generateAdvancedQueries(input);
    
    // Conduct batched search for better performance and coverage
    const allSearchResults = await this.conductBatchedSearch(queries);
    
    // Deduplicate and prioritize sources
    const uniqueSources = allSearchResults
      .filter((s, i, self) => s.url && i === self.findIndex(t => t.url === s.url))
      .sort((a, b) => {
        // Prioritize official sources and high-quality content
        const aScore = this.scoreSource(a, input.project_name);
        const bScore = this.scoreSource(b, input.project_name);
        return bScore - aScore;
      })
      .slice(0, 50); // Limit to top sources

    const webContext = uniqueSources
      .map(r => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`)
      .join('\n\n---\n\n');
    
    // Attribution block
    const attribution = uniqueSources.length
      ? "\n\n---\nSources referenced:\n" + uniqueSources.map(s => `- [${s.title}](${s.url})`).join("\n")
      : "";

    // Build comprehensive prompt
    const basePrompt = `
Project name: \`${sanitizeInput(input.project_name) || 'Not provided'}\`
Project website: \`${sanitizeInput(cleanURL(input.project_website)) || 'Not provided'}\`
Project twitter: \`${sanitizeInput(cleanURL(input.project_twitter)) || 'Not provided'}\`
Smart contract: \`${sanitizeInput(input.project_contract || '') || 'Not provided'}\`

${webContext ? `
# COMPREHENSIVE WEB RESEARCH CONTEXT
<web_context>
${webContext}
</web_context>

**CRITICAL:** You MUST leverage this extensive research context throughout your analysis. Reference specific data points, quotes, and insights from these sources.
` : ""}
${attribution}
${COMBINED_STRUCTURE_PROMPT}`;

    // Generate report with retry logic for quality assurance
    const { report, finalRetryCount } = await this.generateReportWithRetry(
      basePrompt, 
      input.mode, 
      webContext
    );
    
    const wordCount = report.split(/\s+/).length;
    const requestId = Math.random().toString(36).substring(7);
    const jsonSections = extractJsonSections(report);
    console.log('Final report processing - jsonSections:', jsonSections ? Object.keys(jsonSections) : 'none');
    console.log('Final report length:', report.length);
    
    let strictModeWarnings: string[] | undefined = undefined;
    if (input.strict_mode) {
      strictModeWarnings = validateStrictMode(report, jsonSections, input.mode);
    }
    
    const speculativeDensity = computeSpeculativeDensity(report, jsonSections);
    const sectionCoverageScore = scoreSectionCoverage(jsonSections);
    const qualityEvaluation = this.evaluateReportQuality(report, jsonSections, input.mode);

    return {
      report,
      sources: uniqueSources,
      requestId,
      confidenceScore: Math.min(95, Math.max(
        50, 
        uniqueSources.length * 3 + qualityEvaluation.score
      )),
      mode: input.mode,
      metadata: {
        createdAt: Date.now(),
        requestId,
        wordCount,
        queryTerms: queries,
        retries: finalRetryCount,
        durationMs: Date.now() - startTime,
        speculativeDensity,
        sectionCoverageScore,
        confidenceReason: `Quality score: ${qualityEvaluation.score}/100, ${uniqueSources.length} sources, ${finalRetryCount} retries`,
        ...(strictModeWarnings ? { strictModeWarnings } : {})
      },
      jsonSections
    };
  }

  private scoreSource(source: SearchSource, projectName: string): number {
    let score = 0;
    const url = source.url.toLowerCase();
    const title = source.title.toLowerCase();
    const content = source.content.toLowerCase();
    
    // Official sources get highest priority
    if (url.includes('github.com') || url.includes('docs.') || url.includes('whitepaper')) score += 10;
    if (url.includes('medium.com') || url.includes('blog.')) score += 5;
    if (url.includes('twitter.com') || url.includes('discord.')) score += 3;
    
    // Content quality indicators
    if (content.includes('tokenomics') || content.includes('roadmap')) score += 5;
    if (content.includes('audit') || content.includes('security')) score += 4;
    if (content.includes('tvl') || content.includes('volume')) score += 3;
    
    // Project name relevance
    const projectLower = projectName.toLowerCase();
    if (title.includes(projectLower)) score += 8;
    if (content.includes(projectLower)) score += 2;
    
    // Recency indicators (rough heuristic)
    if (content.includes('2024') || content.includes('2025')) score += 2;
    
    return score;
  }
}