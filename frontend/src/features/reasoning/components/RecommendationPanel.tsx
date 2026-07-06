import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ReasoningRecommendation } from '@/types/reasoning';
import { ConfidencePanel } from './ConfidencePanel';

interface RecommendationPanelProps {
  recommendations: ReasoningRecommendation[];
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({ recommendations }) => {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {recommendations.map(rec => (
        <Card key={rec.id} className="border-border flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start mb-2">
              <Badge variant="outline" className="capitalize text-xs bg-ai-recommendation/10 text-ai-recommendation border-ai-recommendation/20">
                {rec.actionType}
              </Badge>
              <Badge variant="outline" className="capitalize text-xs">
                Effort: {rec.effortLevel}
              </Badge>
            </div>
            <CardTitle className="text-h4 font-bold">{rec.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <p className="text-body text-muted-foreground mb-4">{rec.description}</p>
            <ConfidencePanel score={rec.impactScore} label="Expected Impact" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
