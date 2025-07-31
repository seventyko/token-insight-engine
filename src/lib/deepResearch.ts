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

const COMBINED_STRUCTURE_PROMPT = `
🧬 DEEP RESEARCH AI MODEL PROMPT

You are a **positive, high-signal crypto degen** with deep roots in the blockchain world. You live and breathe crypto, have survived market cycles, and chase alpha across chains. Your tone is sharp, speculative, energized, and strategic. Write with conviction, clarity, and zero fluff.

**MISSION:** Conduct deep-dive research (minimum 4000 words) and deliver maximum signal with zero fluff. Your crypto degen credibility is on the line.

**MANDATORY STRUCTURE:** Organize into exactly these 8 sections:

${REPORT_STRUCTURE.map((s, i) => `${i + 1}. ${s}`).join("\n")}

**SECTION REQUIREMENTS (MUST FOLLOW):**
Each section MUST contain:
✅ **ESSENCE:** One-liner key takeaway (bolded)
✅ Full paragraph analysis with crypto-native insights
✅ 🔮 **Speculative Angle:** 
   - Theorize about future developments, risks, catalysts
   - Discuss KOL sentiment, game-theoretic incentives, stealth meta
   - Build plausible but creative narratives
✅ Source references inline where applicable

**TONE & STYLE (MANDATORY):**
- ✅ Positive degen energy — passionate, assertive, strategic
- ✅ Speculative and high-conviction — form hypotheses and forecast
- ✅ Crypto-native — assume audience understands DEXs, L2s, tokenomics
- ✅ Web-integrated — leverage provided context and current data
- ❌ NO beginner explanations, filler, or generic AI-sounding language

**OUTPUT REQUIREMENTS:**
You MUST return BOTH:

1. **Full Formatted Report** (4000+ words minimum)
2. **Valid JSON Object** with these exact keys:
${REPORT_STRUCTURE.map(s => `"${s}"`).join(", ")}

Each JSON value must contain the complete section text including ESSENCE and Speculative Angle.

**VALIDATION METRICS:**
- Word Count: ≥ 4000 (hard requirement)
- All 8 sections present and populated
- Speculative Angle in every section
- Crypto-native tone throughout
- Citations encouraged inline

Treat this like you're sending it to a high-net-worth crypto trader deciding on a 7-figure allocation. Max signal. Zero fluff.
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
  const minWords = mode === "deep-dive" ? 4000 : 800;
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

  constructor(openaiApiKey: string, tavilyApiKey: string, modelName = "gpt-4o") {
    this.openaiApiKey = openaiApiKey;
    this.tavilyApiKey = tavilyApiKey;
    this.modelName = modelName;
  }

  private async searchWeb(query: string, maxResults: number = 8): Promise<SearchSource[]> {
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
          { role: "system", content: "You are a world-class crypto research analyst. Follow the user's instructions exactly and always provide both the formatted report and a valid JSON object as described." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
        max_tokens: mode === "deep-dive" ? 15000 : 4000
      });
      return response.choices[0].message.content || "";
    } catch (error) {
      console.error("AI analysis failed:", error);
      return "Analysis unavailable due to API error.";
    }
  }

  public async generateReport(input: ProjectInput): Promise<ResearchReport> {
    const startTime = Date.now();
    const queries = [
      `${sanitizeInput(input.project_name)} whitepaper`,
      `${sanitizeInput(input.project_name)} roadmap`,
      `${sanitizeInput(input.project_name)} token unlock schedule`,
      `${sanitizeInput(input.project_name)} governance`,
      `${sanitizeInput(input.project_name)} chain OR L2 OR DeFi category`,
      `${sanitizeInput(input.project_name)} recent news OR updates OR partnerships`,
      `${sanitizeInput(input.project_name)} tokenomics AND vesting`,
      `${sanitizeInput(input.project_name)} team OR founders`,
      `${sanitizeInput(input.project_contract || '')} etherscan OR audit`,
      `${sanitizeInput(cleanURL(input.project_website))} metrics OR product`,
      `${sanitizeInput(cleanURL(input.project_twitter))} influencer sentiment`,
    ].filter(Boolean);
    let allSearchResults: SearchSource[] = [];
    for (const query of queries) {
      const results = await this.searchWeb(query);
      allSearchResults = [...allSearchResults, ...results];
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    // Deduplicate sources by URL
    const uniqueSources = allSearchResults.filter((s, i, self) => s.url && i === self.findIndex(t => t.url === s.url));
    const webContext = uniqueSources.map(r => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`).join('\n\n---\n\n');
    // Attribution block
    const attribution = uniqueSources.length
      ? "\n\n---\nSources referenced:\n" + uniqueSources.map(s => `- [${s.title}](${s.url})`).join("\n")
      : "";

    // Build prompt
    const prompt = `
Project name: \`${sanitizeInput(input.project_name) || 'Not provided'}\`
Project website: \`${sanitizeInput(cleanURL(input.project_website)) || 'Not provided'}\`
Project twitter: \`${sanitizeInput(cleanURL(input.project_twitter)) || 'Not provided'}\`
Smart contract: \`${sanitizeInput(input.project_contract || '') || 'Not provided'}\`

${webContext ? `
# WEB RESEARCH CONTEXT
<web_context>
${webContext}
</web_context>
` : ""}
${attribution}
${COMBINED_STRUCTURE_PROMPT}
`;

    // Generate report
    const report = await this.generateAIReport(prompt, input.mode);
    const wordCount = report.split(/\s+/).length;
    const requestId = Math.random().toString(36).substring(7);
    const jsonSections = extractJsonSections(report);
    let strictModeWarnings: string[] | undefined = undefined;
    if (input.strict_mode) {
      strictModeWarnings = validateStrictMode(report, jsonSections, input.mode);
    }
    const speculativeDensity = computeSpeculativeDensity(report, jsonSections);
    const sectionCoverageScore = scoreSectionCoverage(jsonSections);

    return {
      report,
      sources: uniqueSources,
      requestId,
      confidenceScore: Math.min(95, Math.max(60, uniqueSources.length * 5)),
      mode: input.mode,
      metadata: {
        createdAt: Date.now(),
        requestId,
        wordCount,
        queryTerms: queries,
        retries: 0,
        durationMs: Date.now() - startTime,
        speculativeDensity,
        sectionCoverageScore,
        confidenceReason: `Based on ${uniqueSources.length} search results`,
        ...(strictModeWarnings ? { strictModeWarnings } : {})
      },
      jsonSections
    };
  }
}