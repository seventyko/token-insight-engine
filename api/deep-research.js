// External API endpoint for deep research - can be deployed to Vercel/Railway/Render
// This bypasses Supabase timeout limitations and allows for maximum quality reports

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Types (same as original)
const MODEL_NAME = "gpt-4.1-2025-04-14";
const API_TIMEOUT = 300000; // 5 minutes for API calls
const OPENAI_TIMEOUT = 600000; // 10 minutes for OpenAI - no Supabase limits!
const TARGET_WORD_COUNT_MIN = 4000;

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
**🚨 CRITICAL INSTRUCTION: YOU MUST GENERATE A COMPLETE 4000+ WORD REPORT 🚨**

**ABSOLUTE NON-NEGOTIABLE REQUIREMENTS:**
1. MINIMUM 4000 words total - COUNT WORDS AS YOU WRITE
2. DO NOT STOP OR TRUNCATE - COMPLETE ALL 8 SECTIONS IN FULL
3. Each section must be 500-800 words MINIMUM
4. IGNORE TOKEN LIMITS - WRITE THE COMPLETE REPORT
5. IF YOU START TO HIT LIMITS, PRIORITIZE COMPLETING ALL SECTIONS

**WRITE ALL 8 SECTIONS - NO EXCEPTIONS:**
${REPORT_STRUCTURE.map((s, i) => `${i + 1}. ${s} - MINIMUM 500 WORDS`).join("\n")}

**SECTION FORMAT - FOLLOW EXACTLY:**

# [SECTION NAME]

**ESSENCE:** Single sentence summary

**DETAILED ANALYSIS:** (400-500 words)
[Write comprehensive analysis with specific data, metrics, financials, technical details, market context, competitive landscape, regulatory considerations, historical background]

**🔮 SPECULATIVE ANGLE:** (300-400 words)
[Future scenarios, bull/bear cases, strategic partnerships, regulatory evolution, technical roadmap, token economics, community growth, competitive threats, black swan events, timeline predictions]

**WORD COUNT REQUIREMENTS PER SECTION:**
- ESSENCE: 20-30 words
- DETAILED ANALYSIS: 400-500 words
- SPECULATIVE ANGLE: 300-400 words
- TOTAL PER SECTION: 720-930 words
- TOTAL REPORT: 5760-7440 words

**CRITICAL WRITING RULES:**
- Use sophisticated crypto analysis terminology
- Include specific numbers, dates, percentages, market caps
- Reference competitors extensively
- Cite sources as [Title](URL)
- Write substantial paragraphs (100+ words each)
- NO generic statements or placeholders
- NO truncation or summarization

**🚨 DO NOT STOP WRITING UNTIL ALL 8 SECTIONS ARE COMPLETE 🚨**

After completing the FULL report, add JSON:
{
${REPORT_STRUCTURE.map(s => `"${s}": "[complete section text here]"`).join(",\n")}
}
`;

// Utility functions
function sanitizeInput(input) {
  if (!input) return "";
  return input.replace(/[<>]/g, "").trim();
}

function cleanURL(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^[\s@]+/, "");
  }
}

function cleanWebContent(content) {
  return content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), ms)
  );
  return Promise.race([promise, timeout]);
}

async function retry(fn, retries = 2) {
  let count = 0;
  for (; count <= retries; count++) {
    try {
      const val = await fn();
      return {result: val, retries: count};
    } catch (e) {
      if (count === retries) throw e;
      console.log(`Retry #${count+1} error:`, e.message);
    }
  }
  throw new Error("Max retries exceeded.");
}

async function tavilySearchBatch(queries, apiKey) {
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
            search_depth: "advanced", // Full quality restored!
            max_results: 8 // Back to 8 for maximum quality
          })
        }), API_TIMEOUT), 2
      );
      
      const data = await result.json();
      const results = data.results || [];
      const content = results.map((r) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${cleanWebContent(r.content)}`).join('\n\n---\n\n');
      return { content, sources: results.map((r) => ({ title: r.title, url: r.url, content: cleanWebContent(r.content) })) };
    } catch (e) {
      console.log(`Tavily error for query "${query}":`, e.message);
      return { content: "", sources: [] };
    }
  }));
}

function buildPrompt(input, webContext, sources, noSources, mode) {
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

function extractConfidenceScore(report) {
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

function extractJsonSections(report) {
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

function generateRequestId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function performDeepResearch(input, mode = "deep-dive", openaiApiKey, tavilyApiKey) {
  const start = Date.now();
  const requestId = generateRequestId();
  
  console.log(`[${requestId}] Starting ${mode} research for: ${input.project_name}`);

  const strict_mode = !!input.strict_mode;

  // Full 12 queries restored for maximum quality
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

  const searchResults = mode === "lite" ? [] : await tavilySearchBatch(uniqueQueries, tavilyApiKey);

  const webContext = searchResults.map(r => r.content).filter(Boolean).join('\n\n');
  const sources = searchResults.flatMap(r => r.sources);
  const uniqueSources = sources.filter((s, i, self) => s.url && i === self.findIndex(t => t.url === s.url));

  const noSources = mode === "lite" ? false : uniqueSources.length === 0;

  const systemPrompt = "You are a world-class crypto research analyst. Follow the user's instructions exactly and always provide both the formatted report and a valid JSON object as described.";

  const prompt = buildPrompt(input, webContext, uniqueSources, noSources, mode);

  console.log(`[${requestId}] Generated ${uniqueQueries.length} search queries, found ${uniqueSources.length} unique sources`);

  try {
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
          max_tokens: mode === "deep-dive" ? 32000 : 4000 // Full token limit restored
        })
      }), OPENAI_TIMEOUT), 2 // Full retries restored
    );

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OpenAI API error: ${data.error.message}`);
    }
    
    const report = data.choices?.[0]?.message?.content || "";
    const wordCount = report.split(/\s+/).length;

    console.log(`[${requestId}] Generated report with ${wordCount} words after ${retriesUsed} retries`);

    const { score: confidenceScore, reason: confidenceReason } = extractConfidenceScore(report);
    const durationMs = Date.now() - start;
    const jsonSections = extractJsonSections(report);

    const metadata = {
      createdAt: Date.now(),
      requestId,
      wordCount,
      queryTerms: uniqueQueries,
      retries: retriesUsed,
      durationMs,
      confidenceReason
    };

    const researchReport = {
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
    
  } catch (error) {
    console.error(`[${requestId}] OpenAI request failed:`, error);
    throw new Error(`OpenAI request failed: ${error.message}`);
  }
}

// Main handler function
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      project_name, 
      project_website, 
      project_twitter, 
      project_contract, 
      strict_mode, 
      mode = 'deep-dive',
      openai_api_key,
      tavily_api_key
    } = req.body;

    if (!project_name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    if (!openai_api_key || !tavily_api_key) {
      return res.status(400).json({ error: 'OpenAI and Tavily API keys are required' });
    }

    const result = await performDeepResearch(
      { project_name, project_website, project_twitter, project_contract, strict_mode },
      mode,
      openai_api_key,
      tavily_api_key
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in deep-research function:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.stack 
    });
  }
}