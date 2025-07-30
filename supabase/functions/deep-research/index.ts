import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
type ProjectInput = {
  project_name: string;
  project_website: string;
  project_twitter: string;
  project_contract?: string;
  strict_mode?: boolean;
};

type SearchSource = {
  title: string;
  url: string;
  content: string;
};

type RequestMetadata = {
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

type ResearchReport = {
  report: string;
  sources: SearchSource[];
  requestId: string;
  confidenceScore: number;
  mode: "deep-dive" | "lite";
  metadata: RequestMetadata;
  jsonSections?: Record<string, string>;
};

// Config
const MODEL_NAME = "gpt-4.1-2025-04-14";
const API_TIMEOUT = 120000; // 2 minutes for API calls
const OPENAI_TIMEOUT = 300000; // 5 minutes for OpenAI - deep research takes time
const TARGET_WORD_COUNT_MIN = 4000;
const TARGET_WORD_COUNT_LITE = 800;

const REPORT_STRUCTURE = [
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
You must organize the research report into the following exact sections:

${REPORT_STRUCTURE.map((s, i) => `${i + 1}. ${s}`).join("\n")}

For each section:
- Begin with a bold ESSENCE line (summary takeaway)
- Include a 🔮 Speculative Angle subsection (feel free to synthesize trends, future risks, and possible strategies—even if not directly stated)
  - Synthesize unseen risks, game-theoretic behaviors, or protocol design incentives.
  - Build light narratives on how the project might evolve based on current facts.
  - Mention fringe theories, KOL speculation, or future catalysts (label clearly).
- Use high-signal, crisp writing tailored for advanced crypto market participants
- Prioritize clarity, but it's okay to elaborate when the content offers strategic insight
- Cite sources inline where appropriate

After the full formatted report, output a valid JSON object with the following exact keys:
${REPORT_STRUCTURE.map(s => `- "${s}"`).join("\n")}
Each key's value should be the full text of the corresponding section.

Return **both** the formatted report and the JSON object in your output.
`;

// Utility functions
function sanitizeInput(input: string): string {
  if (!input) return "";
  return input.replace(/[<>]/g, "").trim();
}

function cleanURL(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^[\s@]+/, "");
  }
}

function cleanWebContent(content: string): string {
  return content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

let recentRequests: { [ip: string]: number[] } = {};
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 20;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (!recentRequests[ip]) recentRequests[ip] = [];
  recentRequests[ip] = recentRequests[ip].filter(ts => now - ts < RATE_LIMIT_WINDOW);
  if (recentRequests[ip].length >= RATE_LIMIT_MAX) return true;
  recentRequests[ip].push(now);
  return false;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), ms)
  );
  return Promise.race([promise, timeout]);
}

async function retry<T>(fn: () => Promise<T>, retries = 2, debug = false): Promise<{result: T, retries: number}> {
  let count = 0;
  for (; count <= retries; count++) {
    try {
      const val = await fn();
      return {result: val, retries: count};
    } catch (e) {
      if (count === retries) throw e;
      if (debug) console.log(`[DEBUG] Retry #${count+1} error:`, e);
    }
  }
  throw new Error("Max retries exceeded.");
}

async function tavilySearchBatch(queries: string[], apiKey: string, debug = false): Promise<{ content: string; sources: SearchSource[] }[]> {
  return Promise.all(queries.map(async (query) => {
    try {
      const {result} = await retry(() =>
        withTimeout(fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            query,
            search_depth: "advanced",
            max_results: 8 // Back to 8 for full quality
          })
        }), API_TIMEOUT), 2, debug
      );
      
      const data = await result.json();
      const results = data.results || [];
      const content = results.map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${cleanWebContent(r.content)}`).join('\n\n---\n\n');
      return { content, sources: results.map((r: any) => ({ title: r.title, url: r.url, content: cleanWebContent(r.content) })) };
    } catch (e) {
      if (debug) console.log(`[Tavily error for query "${query}"]:`, e);
      return { content: "", sources: [] };
    }
  }));
}

function buildPrompt(
  input: ProjectInput,
  webContext: string,
  sources: SearchSource[],
  noSources: boolean,
  mode: "deep-dive" | "lite"
) {
  const attribution = sources.length
    ? "\n\n---\nSources referenced:\n" + sources.map(s => `- [${s.title}](${s.url})`).join("\n")
    : "";
  let reflectionBlock = "";
  if (noSources) {
    reflectionBlock = `
---
⚠️ Reflection Section (No valid external sources found):
- Please identify which sections lack source material.
- Explain what missing data would have helped extend the analysis.
- Do not pad or repeat content just to meet word count.
`;
  }
  return `
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
${reflectionBlock}
${COMBINED_STRUCTURE_PROMPT}
`;
}

function extractConfidenceScore(report: string): {score: number, reason: string} {
  const match = report.match(/confidence score.*?(\d{1,3})/i);
  if (match) {
    let score = parseInt(match[1], 10);
    score = Math.max(0, Math.min(score, 100));
    return { score, reason: "Explicit confidence score extracted from report." };
  }
  const wordCount = report ? report.split(/\s+/).length : 0;
  if (wordCount > 3000) return { score: 80, reason: "Based on high word count (>3000 words)." };
  if (wordCount > 800) return { score: 60, reason: "Based on moderate word count (>800 words)." };
  return { score: 40, reason: "Low word count (<800 words), no explicit score found." };
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

function validateStrictMode(
  report: string,
  jsonSections: Record<string, string> | undefined,
  mode: "deep-dive" | "lite"
): string[] {
  const warnings: string[] = [];
  const wordCount = report.split(/\s+/).length;
  const minWords = mode === "deep-dive" ? TARGET_WORD_COUNT_MIN : TARGET_WORD_COUNT_LITE;

  if (wordCount < minWords) {
    warnings.push(`Report word count (${wordCount}) is below the minimum required (${minWords})`);
  }

  if (!jsonSections) {
    warnings.push("No valid JSON sections extracted from the report.");
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

function generateRequestId(): string {
  return crypto.randomUUID();
}

async function performDeepResearch(
  input: ProjectInput,
  ip: string = "unknown",
  mode: "deep-dive" | "lite" = "deep-dive",
  debug: boolean = false,
  openaiApiKey: string,
  tavilyApiKey: string
): Promise<ResearchReport> {
  const start = Date.now();
  const requestId = generateRequestId();
  
  console.log(`[${requestId}] Starting ${mode} research for: ${input.project_name}`);

  const strict_mode = !!input.strict_mode;

  const queries = [
    `${sanitizeInput(input.project_name)} whitepaper`,
    `${sanitizeInput(input.project_name)} roadmap`,
    `${sanitizeInput(input.project_name)} token unlock schedule`,
    `${sanitizeInput(input.project_name)} governance`,
    `${sanitizeInput(input.project_name)} chain OR L2 OR DeFi category`,
    `${sanitizeInput(input.project_name)} recent news OR updates OR partnerships`,
    `${sanitizeInput(input.project_name)} tokenomics AND vesting`,
    `${sanitizeInput(input.project_name)} team OR founders`,
    `${sanitizeInput(input.project_name)} dune dashboard OR github`,
    `${sanitizeInput(input.project_contract || '')} etherscan OR audit`,
    `${sanitizeInput(cleanURL(input.project_website))} metrics OR product`,
    `${sanitizeInput(cleanURL(input.project_twitter))} influencer sentiment`,
  ].filter(Boolean);
  const uniqueQueries = [...new Set(queries)];

  if (isRateLimited(ip)) throw new Error("Rate limit exceeded. Please wait before retrying.");

  const searchResults = mode === "lite" ? [] : await tavilySearchBatch(uniqueQueries, tavilyApiKey, debug);

  const webContext = searchResults.map(r => r.content).filter(Boolean).join('\n\n');
  const sources = searchResults.flatMap(r => r.sources);
  const uniqueSources = sources.filter((s, i, self) => s.url && i === self.findIndex(t => t.url === s.url));

  const noSources = mode === "lite" ? false : uniqueSources.length === 0;

  const systemPrompt = "You are a world-class crypto research analyst. Follow the user's instructions exactly and always provide both the formatted report and a valid JSON object as described.";

  const prompt = buildPrompt(input, webContext, uniqueSources, noSources, mode);

  console.log(`[${requestId}] Generated ${uniqueQueries.length} search queries, found ${uniqueSources.length} unique sources`);

  const { result: response, retries: retriesUsed } = await retry(() =>
    withTimeout(fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
        max_tokens: mode === "deep-dive" ? 15000 : 4000
      })
    }), OPENAI_TIMEOUT), 2, debug // Use longer timeout for OpenAI
  );

  const data = await response.json();
  const report = data.choices?.[0]?.message?.content || "";
  const wordCount = report.split(/\s+/).length;

  console.log(`[${requestId}] Generated report with ${wordCount} words after ${retriesUsed} retries`);

  const { score: confidenceScore, reason: confidenceReason } = extractConfidenceScore(report);
  const durationMs = Date.now() - start;
  const jsonSections = extractJsonSections(report);

  let strictModeWarnings: string[] | undefined = undefined;
  if (strict_mode) {
    strictModeWarnings = validateStrictMode(report, jsonSections, mode);
  }

  const speculativeDensity = computeSpeculativeDensity(report, jsonSections);
  const sectionCoverageScore = scoreSectionCoverage(jsonSections);

  const metadata: RequestMetadata = {
    createdAt: Date.now(),
    requestId,
    wordCount,
    queryTerms: uniqueQueries,
    retries: retriesUsed,
    durationMs,
    confidenceReason,
    speculativeDensity,
    sectionCoverageScore,
    ...(strictModeWarnings ? { strictModeWarnings } : {})
  };

  const researchReport: ResearchReport = {
    report,
    sources: uniqueSources,
    requestId,
    confidenceScore,
    mode,
    metadata,
    jsonSections
  };

  console.log(`[${requestId}] Research completed in ${durationMs}ms with confidence score ${confidenceScore}`);

  return researchReport;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_name, project_website, project_twitter, project_contract, strict_mode, mode = 'deep-dive', debug = false } = await req.json();

    if (!project_name) {
      return new Response(JSON.stringify({ error: 'Project name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const tavilyApiKey = Deno.env.get('TAVILY_API_KEY');

    if (!openaiApiKey || !tavilyApiKey) {
      return new Response(JSON.stringify({ error: 'API keys not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';

    const result = await performDeepResearch(
      { project_name, project_website, project_twitter, project_contract, strict_mode },
      ip,
      mode,
      debug,
      openaiApiKey,
      tavilyApiKey
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in deep-research function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});