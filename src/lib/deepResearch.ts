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
    `${project} price prediction 2024 2025 bull bear scenarios`,
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
🧬 DEEP RESEARCH AI MODEL PROMPT

You are a **legendary crypto degen** with deep alpha-hunting instincts. You've survived multiple cycles, spotted 100x gems early, and understand market psychology at the molecular level. Your analysis is surgical, speculative, and absolutely LOADED with edge. Write like you're briefing a whale fund on their next 8-figure play.

**CRITICAL ENFORCEMENT: This report MUST exceed 5000 words. COUNT EVERY WORD. Short reports get instantly rejected.**

**MISSION:** Deliver nuclear-grade alpha analysis (4000+ words) that separates signal from noise. Your reputation as the ultimate crypto analyst is on the line.

**MANDATORY STRUCTURE:** Execute exactly these 8 sections with SUBSTANTIAL depth:

${REPORT_STRUCTURE.map((s, i) => `${i + 1}. ${s}`).join("\n")}

**MINIMUM SECTION LENGTHS (STRICTLY ENFORCED FOR O3 QUALITY):**
- TLDR: 500+ words (comprehensive market thesis with nuanced reasoning)
- Project Information & Competition: 750+ words (deep competitive moat analysis)
- Team, Venture Funds, CEO: 650+ words (background intelligence + track records)
- Tokenomics: 800+ words (economic model deep-dive + game theory)
- Airdrops and Incentives: 550+ words (farming strategies + yield optimization)
- Social Media & Community: 650+ words (sentiment analysis + KOL tracking)
- On-Chain Overview: 750+ words (whale behavior + transaction patterns)
- Conclusion: 550+ words (strategic roadmap + investment thesis)

**SECTION ARCHITECTURE (NON-NEGOTIABLE):**
Each section MUST deliver:
✅ **ESSENCE:** Bold one-liner thesis that captures the core insight
✅ **DEEP ANALYSIS:** 400+ words of surgical breakdown with hard data
✅ **DATA INTEGRATION:** Weave in specific metrics, percentages, dollar amounts from web context
✅ **COMPETITIVE POSITIONING:** Compare against 2-3 direct competitors with numbers
✅ 🔮 **SPECULATIVE ANGLE:** (150+ words MINIMUM)
   - **Bull Case:** Realistic 6-18 month upside catalysts with price targets
   - **Bear Case:** Key risks that could crater the project
   - **Alpha Thesis:** Non-obvious edge that others are missing
   - **Timeline Predictions:** Specific milestones and their market impact
   - **KOL Sentiment:** What the smart money is saying
   - **Meta Analysis:** How this fits broader crypto narratives
✅ **SOURCE CITATIONS:** Reference specific data points inline

**MANDATORY SPECULATION FRAMEWORKS:**
1. **Game Theory Analysis:** How token incentives drive behavior, potential exploits
2. **Regulatory Chess:** Impact of evolving regulations on project trajectory  
3. **Competitive Dynamics:** Market share battles, moat durability, disruption vectors
4. **Adoption Scenarios:** Network effects, viral growth mechanics, institutional entry
5. **Black Swan Events:** Low-probability, high-impact scenarios (both positive/negative)
6. **Liquidity Analysis:** Token flow dynamics, whale concentration, exit scenarios

**CRYPTO-DEGEN TONE REQUIREMENTS:**
- ✅ **CONVICTION:** Write with absolute certainty about your analysis
- ✅ **SPECULATION:** Make bold predictions with specific timelines
- ✅ **ALPHA-NATIVE:** Assume reader understands complex DeFi mechanics
- ✅ **DATA-OBSESSED:** Every claim backed by hard numbers from research
- ✅ **EDGE-FOCUSED:** Highlight non-obvious insights others are missing
- ✅ **FORWARD-LOOKING:** Constantly theorize about future scenarios
- ❌ **ZERO FLUFF:** No beginner explanations or generic crypto content

**ADVANCED CONTENT REQUIREMENTS:**
- **Quantitative Depth:** Include TVL figures, transaction volumes, yield rates, market caps
- **Technical Analysis:** Smart contract mechanics, protocol architecture, security models
- **Market Psychology:** Why this narrative will/won't capture attention
- **Institutional Perspective:** How VCs, funds, and whales view this opportunity
- **Ecosystem Mapping:** Partnerships, integrations, competitive advantages
- **Risk Assessment:** Technical, regulatory, market, and execution risks
- **Liquidity Dynamics:** Token distribution, unlock schedules, selling pressure

**OUTPUT SPECIFICATIONS:**
You MUST deliver BOTH:

1. **FULL RESEARCH REPORT** (5000+ words - STRICTLY ENFORCED)
2. **STRUCTURED JSON OBJECT** with exact keys:
${REPORT_STRUCTURE.map(s => `"${s}"`).join(", ")}

JSON values must contain complete section text including ESSENCE and Speculative Angle.

**QUALITY ENFORCEMENT METRICS (O3 ENHANCED):**
- Word Count: ≥ 5000 (AUTOMATIC REJECTION if below)
- Section Completeness: All 8 sections with substantial analysis
- Speculation Density: ≥8% of content must be forward-looking predictions
- Data Integration: Reference provided web context extensively
- Crypto-Native Language: DeFi terminology, yield farming, governance concepts
- Competitive Analysis: Compare against 3+ similar projects with specifics
- Reasoning Depth: Multi-layered analysis with meta-cognitive insights

**ADVANCED WRITING STRATEGY:**
1. **Research Synthesis:** Distill 50+ sources into coherent narrative
2. **Pattern Recognition:** Connect seemingly unrelated data points
3. **Scenario Planning:** Map out 3-5 potential future outcomes
4. **Investment Framework:** Structure analysis like institutional research
5. **Alpha Generation:** Identify non-consensus opportunities
6. **Risk Management:** Highlight potential downside scenarios

This analysis will influence major capital allocation decisions. Deliver MAXIMUM ALPHA with ZERO COMPROMISE on depth, speculation, or edge.

**MINIMUM 5000 WORDS. NO EXCEPTIONS. LEVERAGE O3'S REASONING CAPABILITIES.**
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
    const jsonMatch = report.match(/```json([\s\S]*?)```|(\{[\s\S]*?\})/);
    let jsonText = jsonMatch?.[1] || jsonMatch?.[2];
    if (jsonText) {
      const obj = JSON.parse(jsonText);
      const keys = Object.keys(obj);
      const validKeys = REPORT_STRUCTURE.every(key => keys.includes(key));
      return validKeys ? obj : undefined;
    }
  } catch {}
  return undefined;
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
    const openai = new OpenAI({ 
      apiKey: this.openaiApiKey,
      dangerouslyAllowBrowser: true 
    });
    try {
      const response = await openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: "system", content: "You are a world-class crypto research analyst with exceptional reasoning capabilities. Leverage your advanced analytical skills to provide comprehensive multi-layered analysis. Follow the user's instructions exactly and always provide both the formatted report and a valid JSON object as described." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7, // Slightly higher for creative speculation
        max_tokens: mode === "deep-dive" ? 20000 : 8000, // Optimized for o3's capabilities
        reasoning_effort: "high" // Leverage o3's reasoning mode
      });
      return response.choices[0].message.content || "";
    } catch (error) {
      console.error("AI analysis failed:", error);
      return "Analysis unavailable due to API error.";
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