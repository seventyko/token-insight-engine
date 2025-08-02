import React, { useState } from 'react';
import { ResearchForm } from '@/components/ResearchForm';
import { ResearchResults, ResearchReport } from '@/components/ResearchResults';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TrendingUp, Shield, Zap } from 'lucide-react';


interface ProjectInput {
  project_name: string;
  project_website: string;
  project_twitter: string;
  project_contract?: string;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ResearchReport | null>(null);
  const { toast } = useToast();

  const handleResearch = async (data: ProjectInput) => {
    setIsLoading(true);
    try {
      // Call the secure API endpoint instead of direct API calls
      const response = await fetch('/api/deep-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_name: data.project_name,
          project_website: data.project_website,
          project_twitter: data.project_twitter,
          project_contract: data.project_contract,
          mode: 'deep-dive'
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const results = await response.json();
      setResults(results);
      
      toast({
        title: "Research Complete",
        description: `Generated comprehensive analysis for ${data.project_name}`,
      });
    } catch (error) {
      console.error('Research failed:', error);
      let errorMessage = "Unable to generate research report. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('API key') || error.message.includes('401')) {
          errorMessage = "Invalid API keys. Please check your OpenAI and Tavily API keys.";
        } else if (error.message.includes('Rate limit') || error.message.includes('429')) {
          errorMessage = "API rate limit exceeded. Please try again in a few minutes.";
        } else if (error.message.includes('timeout') || error.message.includes('504')) {
          errorMessage = "Request timed out. Please try again - this process can take 5-10 minutes.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Research Failed",
        description: errorMessage,
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