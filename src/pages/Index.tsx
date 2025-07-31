import { useState } from 'react';
import { ResearchForm } from '@/components/ResearchForm';
import { ResearchResults, ResearchReport } from '@/components/ResearchResults';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, TrendingUp, Shield, Zap } from 'lucide-react';

interface ProjectInput {
  project_name: string;
  project_website: string;
  project_twitter: string;
  project_contract?: string;
  strict_mode?: boolean;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ResearchReport | null>(null);
  const { toast } = useToast();

  // Hardcoded API keys
  const openaiApiKey = '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';
  const tavilyApiKey = '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';
  const externalApiUrl = 'https://token-insight-engine.vercel.app/api/deep-research';

  const handleResearch = async (data: ProjectInput, mode: 'deep-dive' | 'lite') => {

    setIsLoading(true);
    try {
      // Use external API URL if provided, otherwise use a default (you'll need to deploy to get this URL)
      const apiUrl = externalApiUrl || 'YOUR_DEPLOYED_API_URL/api/deep-research';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_name: data.project_name,
          project_website: data.project_website,
          project_twitter: data.project_twitter,
          project_contract: data.project_contract,
          strict_mode: data.strict_mode,
          mode: mode,
          openai_api_key: openaiApiKey,
          tavily_api_key: tavilyApiKey
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const results = await response.json();
      setResults(results);
      
      toast({
        title: "Research Complete",
        description: `Generated ${mode === 'deep-dive' ? 'comprehensive' : 'quick'} analysis for ${data.project_name}`,
      });
    } catch (error) {
      console.error('Research failed:', error);
      toast({
        title: "Research Failed",
        description: error instanceof Error ? error.message : "Unable to generate research report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSearch = () => {
    setResults(null);
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Analyzing Project</h2>
            <p className="text-muted-foreground">
              Gathering data from multiple sources and generating insights...
            </p>
            <p className="text-sm text-warning">
              Maximum quality mode: This may take 5-10 minutes for thorough analysis
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Web Research
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                AI Analysis
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Report Generation
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 py-8 px-4">
      {results ? (
        <ResearchResults results={results} onNewSearch={handleNewSearch} />
      ) : (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-foreground via-primary to-chart-positive bg-clip-text text-transparent">
              Token Insight Engine
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Generate comprehensive crypto research reports with AI-powered analysis of tokenomics, 
              team backgrounds, market dynamics, and strategic insights.
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-chart-positive">✓ Maximum Quality Mode - Ready to Research</span>
            </div>
          </div>
          
          <ResearchForm onSubmit={handleResearch} isLoading={isLoading} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16">
            <div className="text-center space-y-3 p-6 rounded-lg border border-border/50 bg-card/30">
              <TrendingUp className="w-10 h-10 mx-auto text-primary" />
              <h3 className="font-semibold">Deep Market Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Comprehensive tokenomics, competitive landscape, and growth potential assessment
              </p>
            </div>
            
            <div className="text-center space-y-3 p-6 rounded-lg border border-border/50 bg-card/30">
              <Shield className="w-10 h-10 mx-auto text-chart-positive" />
              <h3 className="font-semibold">Team & Funding Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Background checks on founders, VCs, and key stakeholders with strategic insights
              </p>
            </div>
            
            <div className="text-center space-y-3 p-6 rounded-lg border border-border/50 bg-card/30">
              <Zap className="w-10 h-10 mx-auto text-warning" />
              <h3 className="font-semibold">Speculative Intelligence</h3>
              <p className="text-sm text-muted-foreground">
                Forward-looking analysis with market trends, risks, and opportunity identification
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;