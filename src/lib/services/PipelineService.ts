import OpenAI from "openai";
import { MODEL_REGISTRY, TOKEN_LIMITS, PipelineStage } from "../config/searchConfig";
import { CostTracker } from "./CostTracker";
import { SearchAnalytics } from "./SearchAnalytics";

export interface PipelineOptions {
  highDepthMode?: boolean;
  strictMode?: boolean;
  mode: 'deep-dive' | 'lite';
}

export interface StageResult {
  stage: PipelineStage;
  output: string;
  model: string;
  tokensUsed: number;
  duration: number;
  qualityGate: {
    passed: boolean;
    reason: string;
  };
}

export interface PipelineMetadata {
  modelUsed: string[];
  processingStages: PipelineStage[];
  bottlenecks: string[];
  qualityGates: { stage: string; passed: boolean; reason: string }[];
  totalTokensUsed: number;
  totalDuration: number;
  performanceGrade: string;
}

export class PipelineService {
  private openaiApiKey: string;
  private costTracker: CostTracker;
  private analytics: SearchAnalytics;

  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
    this.costTracker = CostTracker.getInstance();
    this.analytics = SearchAnalytics.getInstance();
  }

  private chooseModel(stage: PipelineStage, options: PipelineOptions): string {
    const baseModel = MODEL_REGISTRY[stage];
    
    // Use o3-deep-research for synthesis stages in deep-dive mode
    if (options.mode === 'deep-dive' && 
        ['synthesis', 'speculation', 'finalReport'].includes(stage)) {
      return 'o3-deep-research';
    }
    
    return baseModel;
  }

  private async callLLM(params: {
    model: string;
    prompt: string;
    stage: PipelineStage;
    systemPrompt?: string;
  }): Promise<{ output: string; tokensUsed: number }> {
    const openai = new OpenAI({ apiKey: this.openaiApiKey });
    const maxTokens = TOKEN_LIMITS[params.stage] || 4000;

    const messages = [
      ...(params.systemPrompt ? [{ role: "system" as const, content: params.systemPrompt }] : []),
      { role: "user" as const, content: params.prompt }
    ];

    try {
      const response = await openai.chat.completions.create({
        model: params.model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      const output = response.choices[0]?.message?.content || "";
      const tokensUsed = response.usage?.total_tokens || 0;

      // Track cost (basic tracking without specific method)
      // this.costTracker.trackOperation(tokensUsed * 0.00001); // Rough estimate

      return { output, tokensUsed };
    } catch (error) {
      console.error(`LLM call failed for stage ${params.stage}:`, error);
      throw error;
    }
  }

  async executeStage(
    stage: PipelineStage,
    input: string,
    options: PipelineOptions,
    systemPrompt?: string
  ): Promise<StageResult> {
    const startTime = Date.now();
    const model = this.chooseModel(stage, options);

    try {
      const { output, tokensUsed } = await this.callLLM({
        model,
        prompt: input,
        stage,
        systemPrompt
      });

      const duration = Date.now() - startTime;
      const qualityGate = this.validateStageOutput(stage, output);

      // Record analytics (basic tracking)
      // this.analytics.recordEvent('stage_completed', { stage, model, tokensUsed, duration, qualityPassed: qualityGate.passed });

      return {
        stage,
        output,
        model,
        tokensUsed,
        duration,
        qualityGate
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record analytics (basic tracking)
      // this.analytics.recordEvent('stage_failed', { stage, model, duration, error: error.message });

      throw new Error(`Stage ${stage} failed: ${error.message}`);
    }
  }

  private validateStageOutput(stage: PipelineStage, output: string): { passed: boolean; reason: string } {
    // Basic validation rules per stage
    const validations = {
      sourceGathering: () => output.length > 500 && output.includes('source'),
      contentExtraction: () => output.length > 300 && (output.includes('token') || output.includes('team')),
      synthesis: () => output.length > 1000 && output.includes('analysis'),
      speculation: () => output.length > 500 && (output.includes('forecast') || output.includes('prediction')),
      finalReport: () => output.length > 2000 && output.includes('#'),
      validation: () => output.length > 100
    };

    const validator = validations[stage];
    if (!validator) {
      return { passed: true, reason: 'No validation rules defined' };
    }

    const passed = validator();
    return {
      passed,
      reason: passed ? 'Quality gate passed' : `Stage ${stage} output failed validation`
    };
  }

  async executePipeline(
    data: any,
    options: PipelineOptions
  ): Promise<{ results: StageResult[]; metadata: PipelineMetadata }> {
    const startTime = Date.now();
    const results: StageResult[] = [];
    const bottlenecks: string[] = [];

    try {
      // Stage 1: Source Gathering
      const sourceResult = await this.executeStage(
        'sourceGathering',
        `Summarize and organize the following search results: ${JSON.stringify(data.sources)}`,
        options,
        'You are an expert at organizing and summarizing web search results.'
      );
      results.push(sourceResult);

      // Stage 2: Content Extraction  
      const extractionResult = await this.executeStage(
        'contentExtraction',
        `Extract key information about tokenomics, team, and project details from: ${sourceResult.output}`,
        options,
        'You are an expert at extracting structured information from unstructured text.'
      );
      results.push(extractionResult);

      // Stage 3: Synthesis
      const synthesisResult = await this.executeStage(
        'synthesis',
        `Synthesize the extracted information into coherent analysis: ${extractionResult.output}`,
        options,
        'You are an expert blockchain analyst who synthesizes complex information.'
      );
      results.push(synthesisResult);

      // Stage 4: Speculation (if deep-dive mode)
      if (options.mode === 'deep-dive') {
        const speculationResult = await this.executeStage(
          'speculation',
          `Provide forward-looking analysis and predictions based on: ${synthesisResult.output}`,
          options,
          'You are an expert at making informed predictions about blockchain projects.'
        );
        results.push(speculationResult);
      }

      // Stage 5: Final Report
      const finalInput = options.mode === 'deep-dive' ? 
        results[results.length - 1].output : synthesisResult.output;
      
      const finalResult = await this.executeStage(
        'finalReport',
        `Create a comprehensive structured report based on: ${finalInput}`,
        options,
        'You are an expert at creating professional blockchain research reports.'
      );
      results.push(finalResult);

      // Stage 6: Validation
      const validationResult = await this.executeStage(
        'validation',
        `Validate and score the quality of this report: ${finalResult.output}`,
        options,
        'You are an expert at validating research report quality.'
      );
      results.push(validationResult);

      // Identify bottlenecks
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      results.forEach(result => {
        if (result.duration > avgDuration * 2) {
          bottlenecks.push(`${result.stage} took ${result.duration}ms (bottleneck)`);
        }
      });

      const metadata: PipelineMetadata = {
        modelUsed: results.map(r => r.model),
        processingStages: results.map(r => r.stage),
        bottlenecks,
        qualityGates: results.map(r => ({
          stage: r.stage,
          passed: r.qualityGate.passed,
          reason: r.qualityGate.reason
        })),
        totalTokensUsed: results.reduce((sum, r) => sum + r.tokensUsed, 0),
        totalDuration: Date.now() - startTime,
        performanceGrade: this.calculatePerformanceGrade(results)
      };

      return { results, metadata };
    } catch (error) {
      console.error('Pipeline execution failed:', error);
      throw error;
    }
  }

  private calculatePerformanceGrade(results: StageResult[]): string {
    const qualityScore = results.filter(r => r.qualityGate.passed).length / results.length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    
    if (qualityScore >= 0.9 && avgDuration < 5000) return 'A+';
    if (qualityScore >= 0.8 && avgDuration < 10000) return 'A';
    if (qualityScore >= 0.7 && avgDuration < 15000) return 'B';
    if (qualityScore >= 0.6) return 'C';
    return 'D';
  }
}