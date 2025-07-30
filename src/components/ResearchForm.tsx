import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles } from 'lucide-react';

interface ProjectInput {
  project_name: string;
  project_website: string;
  project_twitter: string;
  project_contract?: string;
  strict_mode?: boolean;
}

interface ResearchFormProps {
  onSubmit: (data: ProjectInput, mode: 'deep-dive' | 'lite') => void;
  isLoading: boolean;
}

export const ResearchForm = ({ onSubmit, isLoading }: ResearchFormProps) => {
  const [formData, setFormData] = useState<ProjectInput>({
    project_name: '',
    project_website: '',
    project_twitter: '',
    project_contract: '',
    strict_mode: false
  });

  const handleSubmit = (e: React.FormEvent, mode: 'deep-dive' | 'lite') => {
    e.preventDefault();
    onSubmit(formData, mode);
  };

  const handleInputChange = (field: keyof ProjectInput, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = formData.project_name && (formData.project_website || formData.project_twitter);

  return (
    <Card className="w-full max-w-2xl mx-auto border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="text-center pb-8">
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-chart-positive bg-clip-text text-transparent">
          Token Insight Engine
        </CardTitle>
        <CardDescription className="text-lg text-muted-foreground">
          Generate comprehensive crypto research reports with AI-powered analysis
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project_name" className="text-foreground font-medium">
              Project Name *
            </Label>
            <Input
              id="project_name"
              value={formData.project_name}
              onChange={(e) => handleInputChange('project_name', e.target.value)}
              placeholder="e.g., Ethereum, Uniswap, Chainlink"
              className="bg-secondary/50 border-border/50 focus:border-primary"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_website" className="text-foreground font-medium">
                Website
              </Label>
              <Input
                id="project_website"
                value={formData.project_website}
                onChange={(e) => handleInputChange('project_website', e.target.value)}
                placeholder="https://project.com"
                className="bg-secondary/50 border-border/50 focus:border-primary"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="project_twitter" className="text-foreground font-medium">
                Twitter/X
              </Label>
              <Input
                id="project_twitter"
                value={formData.project_twitter}
                onChange={(e) => handleInputChange('project_twitter', e.target.value)}
                placeholder="https://twitter.com/project"
                className="bg-secondary/50 border-border/50 focus:border-primary"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_contract" className="text-foreground font-medium">
              Smart Contract Address
              <Badge variant="secondary" className="ml-2 text-xs">Optional</Badge>
            </Label>
            <Input
              id="project_contract"
              value={formData.project_contract}
              onChange={(e) => handleInputChange('project_contract', e.target.value)}
              placeholder="0x..."
              className="bg-secondary/50 border-border/50 focus:border-primary font-mono text-sm"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center space-x-2 p-4 rounded-lg bg-secondary/30 border border-border/30">
            <Checkbox
              id="strict_mode"
              checked={formData.strict_mode}
              onCheckedChange={(checked) => handleInputChange('strict_mode', checked as boolean)}
              disabled={isLoading}
            />
            <Label 
              htmlFor="strict_mode" 
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              Strict Mode
              <span className="block text-xs text-muted-foreground">
                Enhanced validation and quality checks
              </span>
            </Label>
          </div>
        </form>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={(e) => handleSubmit(e, 'lite')}
            disabled={!isFormValid || isLoading}
            variant="secondary"
            size="lg"
            className="flex-1 h-14"
          >
            <Search className="w-5 h-5 mr-2" />
            Quick Analysis
            <Badge variant="outline" className="ml-2">~800 words</Badge>
          </Button>
          
          <Button
            onClick={(e) => handleSubmit(e, 'deep-dive')}
            disabled={!isFormValid || isLoading}
            size="lg"
            className="flex-1 h-14 bg-gradient-to-r from-primary to-chart-positive hover:opacity-90 animate-glow"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Deep Research
            <Badge variant="outline" className="ml-2 bg-primary-foreground/10">4000+ words</Badge>
          </Button>
        </div>

        {!isFormValid && (
          <p className="text-warning text-sm text-center">
            Please provide at least a project name and either a website or Twitter URL
          </p>
        )}
      </CardContent>
    </Card>
  );
};