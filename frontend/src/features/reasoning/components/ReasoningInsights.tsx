import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, AlertTriangle, AlertCircle, Info, Activity } from 'lucide-react';
import type { ReasoningInsight } from '@/types/reasoning';
import { cn } from '@/lib/utils';

interface ReasoningInsightsProps {
  insights: ReasoningInsight[];
}

export const ReasoningInsights: React.FC<ReasoningInsightsProps> = ({ insights }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-brand-error" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-ai-anomaly" />;
      case 'medium': return <Activity className="h-4 w-4 text-brand-warning" />;
      default: return <Info className="h-4 w-4 text-brand-info" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'critical': return 'bg-brand-error/10 text-brand-error border-brand-error/20';
      case 'high': return 'bg-ai-anomaly/10 text-ai-anomaly border-ai-anomaly/20';
      case 'medium': return 'bg-brand-warning/10 text-brand-warning border-brand-warning/20';
      default: return 'bg-brand-info/10 text-brand-info border-brand-info/20';
    }
  };

  return (
    <div role="tree" aria-label="Root Cause Insights">
      {insights.map(insight => {
        const isExpanded = expandedId === insight.id;
        return (
          <Card 
            key={insight.id} 
            role="treeitem" 
            aria-expanded={isExpanded} 
            className="mb-2 border-border overflow-hidden"
          >
            <button
              className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={() => setExpandedId(isExpanded ? null : insight.id)}
              aria-controls={`insight-content-${insight.id}`}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                {getSeverityIcon(insight.severity)}
                <span className="font-medium text-body">{insight.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize text-xs">{insight.category}</Badge>
                <Badge variant="outline" className={cn("capitalize text-xs", getSeverityColor(insight.severity))}>{insight.severity}</Badge>
              </div>
            </button>
            {isExpanded && (
              <CardContent id={`insight-content-${insight.id}`} className="pt-0 pb-4 px-11">
                <p className="text-body text-muted-foreground">{insight.description}</p>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};
