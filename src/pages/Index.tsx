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

  const handleResearch = async (data: ProjectInput, mode: 'deep-dive' | 'lite') => {
    setIsLoading(true);
    try {
      // For demo purposes, we'll simulate the API call
      // In production, this would call your Supabase Edge Function
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate API delay
      
      // Mock response for demonstration
      const mockReport: ResearchReport = {
        report: `# ${data.project_name} Research Report

## TLDR
**ESSENCE**: ${data.project_name} represents a significant player in the crypto ecosystem with strong fundamentals and growth potential.

🔮 **Speculative Angle**: Based on current market trends and development patterns, ${data.project_name} is positioned for potential significant growth in the next 12-18 months, particularly if the broader DeFi ecosystem continues expanding.

## Project Information & Competition
**ESSENCE**: ${data.project_name} operates in a competitive but growing market sector with clear differentiation.

🔮 **Speculative Angle**: The competitive landscape suggests consolidation may occur, potentially benefiting established players like ${data.project_name} who have achieved product-market fit.

## Team, Venture Funds, CEO and Key Members
**ESSENCE**: Strong technical team with proven track record in blockchain development.

🔮 **Speculative Angle**: The team's previous experience at major tech companies provides strategic advantages in scaling and partnerships that may not be fully reflected in current valuations.

## Tokenomics
**ESSENCE**: Well-structured token distribution with reasonable vesting schedules.

🔮 **Speculative Angle**: The tokenomics design appears to incentivize long-term holding, which could create supply pressure during bull markets.

## Airdrops and Incentive Programs
**ESSENCE**: Strategic use of incentive mechanisms to drive adoption and engagement.

🔮 **Speculative Angle**: Future airdrop expectations may be driving current usage patterns, creating potential volatility once programs conclude.

## Social Media & Community Analysis
**ESSENCE**: Active and engaged community across major platforms.

🔮 **Speculative Angle**: Community sentiment indicators suggest building momentum that historically precedes major price movements.

## On-Chain Overview
**ESSENCE**: Strong on-chain metrics indicating healthy protocol usage.

🔮 **Speculative Angle**: TVL growth patterns suggest institutional adoption may be accelerating faster than publicly disclosed.

## Conclusion
**ESSENCE**: ${data.project_name} demonstrates strong fundamentals with potential for significant growth.

🔮 **Speculative Angle**: Multiple convergence factors suggest ${data.project_name} may outperform sector averages in upcoming market cycles.`,
        sources: [
          {
            title: `${data.project_name} Official Documentation`,
            url: data.project_website || 'https://example.com',
            content: 'Official project documentation and whitepaper'
          },
          {
            title: `${data.project_name} Twitter Analysis`,
            url: data.project_twitter || 'https://twitter.com',
            content: 'Social media sentiment and community engagement metrics'
          }
        ],
        requestId: `req_${Date.now()}`,
        confidenceScore: 85,
        mode,
        metadata: {
          createdAt: Date.now(),
          requestId: `req_${Date.now()}`,
          wordCount: mode === 'deep-dive' ? 4250 : 850,
          queryTerms: [
            `${data.project_name} whitepaper`,
            `${data.project_name} tokenomics`,
            `${data.project_name} team`,
            `${data.project_name} partnerships`
          ],
          retries: 0,
          durationMs: 2800,
          confidenceReason: 'High confidence based on comprehensive source analysis',
          strictModeWarnings: data.strict_mode ? [] : undefined,
          speculativeDensity: 0.15,
          sectionCoverageScore: 0.95
        },
        jsonSections: {
          "TLDR": `**ESSENCE**: ${data.project_name} represents a significant player in the crypto ecosystem with strong fundamentals and growth potential.\n\n🔮 **Speculative Angle**: Based on current market trends and development patterns, ${data.project_name} is positioned for potential significant growth in the next 12-18 months, particularly if the broader DeFi ecosystem continues expanding.`,
          "Project Information & Competition": `**ESSENCE**: ${data.project_name} operates in a competitive but growing market sector with clear differentiation.\n\n🔮 **Speculative Angle**: The competitive landscape suggests consolidation may occur, potentially benefiting established players like ${data.project_name} who have achieved product-market fit.`,
          "Team, Venture Funds, CEO and Key Members": `**ESSENCE**: Strong technical team with proven track record in blockchain development.\n\n🔮 **Speculative Angle**: The team's previous experience at major tech companies provides strategic advantages in scaling and partnerships that may not be fully reflected in current valuations.`,
          "Tokenomics": `**ESSENCE**: Well-structured token distribution with reasonable vesting schedules.\n\n🔮 **Speculative Angle**: The tokenomics design appears to incentivize long-term holding, which could create supply pressure during bull markets.`,
          "Airdrops and Incentive Programs": `**ESSENCE**: Strategic use of incentive mechanisms to drive adoption and engagement.\n\n🔮 **Speculative Angle**: Future airdrop expectations may be driving current usage patterns, creating potential volatility once programs conclude.`,
          "Social Media & Community Analysis": `**ESSENCE**: Active and engaged community across major platforms.\n\n🔮 **Speculative Angle**: Community sentiment indicators suggest building momentum that historically precedes major price movements.`,
          "On-Chain Overview": `**ESSENCE**: Strong on-chain metrics indicating healthy protocol usage.\n\n🔮 **Speculative Angle**: TVL growth patterns suggest institutional adoption may be accelerating faster than publicly disclosed.`,
          "Conclusion": `**ESSENCE**: ${data.project_name} demonstrates strong fundamentals with potential for significant growth.\n\n🔮 **Speculative Angle**: Multiple convergence factors suggest ${data.project_name} may outperform sector averages in upcoming market cycles.`
        }
      };

      setResults(mockReport);
      toast({
        title: "Research Complete",
        description: `Generated ${mode === 'deep-dive' ? 'comprehensive' : 'quick'} analysis for ${data.project_name}`,
      });
    } catch (error) {
      toast({
        title: "Research Failed",
        description: "Unable to generate research report. Please try again.",
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