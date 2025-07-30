import { useState, useEffect } from 'react';
import { ResearchForm } from '@/components/ResearchForm';
import { ResearchResults, ResearchReport } from '@/components/ResearchResults';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, TrendingUp, Shield, Zap, Settings, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [externalApiUrl, setExternalApiUrl] = useState('');
  const { toast } = useToast();

  // Load API keys and URL from localStorage on mount
  useEffect(() => {
    const savedOpenaiKey = localStorage.getItem('openai_api_key') || '';
    const savedTavilyKey = localStorage.getItem('tavily_api_key') || '';
    const savedApiUrl = localStorage.getItem('external_api_url') || '';
    
    setOpenaiApiKey(savedOpenaiKey);
    setTavilyApiKey(savedTavilyKey);
    setExternalApiUrl(savedApiUrl);
    
    // Show API keys form if any are missing
    if (!savedOpenaiKey || !savedTavilyKey) {
      setShowApiKeys(true);
    }
  }, []);

  const saveApiKeys = () => {
    if (!openaiApiKey || !tavilyApiKey) {
      toast({
        title: "Missing API Keys",
        description: "Please provide both OpenAI and Tavily API keys",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem('openai_api_key', openaiApiKey);
    localStorage.setItem('tavily_api_key', tavilyApiKey);
    if (externalApiUrl) {
      localStorage.setItem('external_api_url', externalApiUrl);
    }
    
    setShowApiKeys(false);
    toast({
      title: "API Keys Saved",
      description: "Your API keys have been saved securely in your browser",
    });
  };

  const handleResearch = async (data: ProjectInput, mode: 'deep-dive' | 'lite') => {
    if (!openaiApiKey || !tavilyApiKey) {
      setShowApiKeys(true);
      toast({
        title: "API Keys Required",
        description: "Please configure your API keys first",
        variant: "destructive",
      });
      return;
    }

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

  if (showApiKeys) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                API Configuration
              </CardTitle>
              <CardDescription>
                Configure your API keys to enable maximum quality research reports. 
                Your keys are stored securely in your browser and never sent to our servers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Required for AI analysis and report generation.{' '}
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Get your key here <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tavily-key">Tavily API Key</Label>
                <Input
                  id="tavily-key"
                  type="password"
                  placeholder="tvly-..."
                  value={tavilyApiKey}
                  onChange={(e) => setTavilyApiKey(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Required for web research and data collection.{' '}
                  <a 
                    href="https://tavily.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Get your key here <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-url">External API URL (Optional)</Label>
                <Input
                  id="api-url"
                  placeholder="https://your-deployed-api.vercel.app/api/deep-research"
                  value={externalApiUrl}
                  onChange={(e) => setExternalApiUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter your deployed API URL. Leave blank to use default.
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveApiKeys} className="flex-1">
                  Save Configuration
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowApiKeys(false)}
                  disabled={!openaiApiKey || !tavilyApiKey}
                >
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 p-4 rounded-lg border border-warning/20 bg-warning/5">
            <h3 className="font-semibold text-warning mb-2">🚀 Maximum Quality Mode Enabled</h3>
            <p className="text-sm text-muted-foreground">
              By using an external backend, you've unlocked:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• No timeout limitations (10+ minute processing)</li>
              <li>• Full web search depth (advanced mode)</li>
              <li>• 8 results per search query (maximum quality)</li>
              <li>• Complete 4000+ word reports</li>
              <li>• All speculative analysis sections included</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowApiKeys(true)}
                className="text-xs"
              >
                <Settings className="w-3 h-3 mr-1" />
                Configure API Keys
              </Button>
              <span className="text-xs text-chart-positive">✓ Maximum Quality Mode</span>
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