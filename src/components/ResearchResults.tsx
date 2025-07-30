import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Eye, 
  ExternalLink, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Copy,
  Download
} from 'lucide-react';

export interface ResearchReport {
  report: string;
  sources: Array<{
    title: string;
    url: string;
    content: string;
  }>;
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
}

interface ResearchResultsProps {
  results: ResearchReport;
  onNewSearch: () => void;
}

export const ResearchResults = ({ results, onNewSearch }: ResearchResultsProps) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const formatDuration = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-chart-positive';
    if (score >= 60) return 'text-warning';
    return 'text-chart-negative';
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const downloadReport = () => {
    const blob = new Blob([results.report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-report-${results.requestId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sections = results.jsonSections ? Object.entries(results.jsonSections) : [];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header Stats */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Research Report</CardTitle>
              <CardDescription className="text-base">
                Generated {formatDate(results.metadata.createdAt)}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => copyToClipboard(results.report)}
                variant="outline"
                size="sm"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button
                onClick={downloadReport}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={onNewSearch} variant="secondary" size="sm">
                New Search
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-secondary/30">
              <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{results.metadata.wordCount.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Words</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-secondary/30">
              <TrendingUp className={`w-8 h-8 mx-auto mb-2 ${getConfidenceColor(results.confidenceScore)}`} />
              <div className={`text-2xl font-bold ${getConfidenceColor(results.confidenceScore)}`}>
                {results.confidenceScore}%
              </div>
              <div className="text-sm text-muted-foreground">Confidence</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-secondary/30">
              <Clock className="w-8 h-8 mx-auto mb-2 text-info" />
              <div className="text-2xl font-bold">{formatDuration(results.metadata.durationMs)}</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-secondary/30">
              <Eye className="w-8 h-8 mx-auto mb-2 text-chart-positive" />
              <div className="text-2xl font-bold">{results.sources.length}</div>
              <div className="text-sm text-muted-foreground">Sources</div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant={results.mode === 'deep-dive' ? 'default' : 'secondary'}>
              {results.mode === 'deep-dive' ? 'Deep Dive' : 'Lite Analysis'}
            </Badge>
            {results.metadata.strictModeWarnings && (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                Strict Mode Issues
              </Badge>
            )}
            {results.metadata.speculativeDensity && (
              <Badge variant="outline">
                {(results.metadata.speculativeDensity * 100).toFixed(1)}% Speculative
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Report */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Research Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sections.length > 0 ? (
                <div className="space-y-6">
                  {sections.map(([sectionName, content], index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-primary">
                          {sectionName}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveSection(
                            activeSection === sectionName ? null : sectionName
                          )}
                        >
                          {activeSection === sectionName ? 'Collapse' : 'Expand'}
                        </Button>
                      </div>
                      {(activeSection === sectionName || activeSection === null) && (
                        <div className="prose prose-invert max-w-none">
                          <div 
                            className="text-sm leading-relaxed text-foreground whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ 
                              __html: content.replace(/\n/g, '<br />') 
                            }}
                          />
                        </div>
                      )}
                      {index < sections.length - 1 && <Separator className="mt-6" />}
                    </div>
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[600px] w-full rounded-md border border-border/30 p-4">
                  <div className="prose prose-invert max-w-none">
                    <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {results.report}
                    </div>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sources */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Sources ({results.sources.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {results.sources.map((source, index) => (
                    <div key={index} className="p-3 rounded-lg bg-secondary/30 border border-border/20">
                      <div className="font-medium text-sm mb-1 line-clamp-2">
                        {source.title}
                      </div>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {new URL(source.url).hostname}
                      </a>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Analysis Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Request ID:</span>
                <div className="font-mono text-xs bg-secondary/30 p-2 rounded mt-1">
                  {results.requestId}
                </div>
              </div>
              
              <div className="text-sm">
                <span className="text-muted-foreground">Query Terms:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {results.metadata.queryTerms.slice(0, 5).map((term, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {term.length > 20 ? term.substring(0, 20) + '...' : term}
                    </Badge>
                  ))}
                  {results.metadata.queryTerms.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{results.metadata.queryTerms.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>

              {results.metadata.strictModeWarnings && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Quality Issues:</span>
                  <div className="space-y-1 mt-1">
                    {results.metadata.strictModeWarnings.map((warning, index) => (
                      <div key={index} className="text-xs text-chart-negative bg-destructive/10 p-2 rounded">
                        {warning}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-chart-positive" />
                <span className="text-muted-foreground">
                  {results.metadata.retries} retries, {results.metadata.confidenceReason}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};