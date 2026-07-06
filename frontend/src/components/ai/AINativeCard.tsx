import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AIBaseCardProps {
  title: string;
  confidenceScore: number;
  type: 'Prediction' | 'Anomaly' | 'Recommendation';
  description: string;
  children?: React.ReactNode;
  className?: string;
}

export const AINativeCard: React.FC<AIBaseCardProps> = ({ title, confidenceScore, type, description, children, className }) => {
  const typeColors = {
    Prediction: 'bg-ai-prediction text-primary-foreground',
    Anomaly: 'bg-ai-anomaly text-primary-foreground',
    Recommendation: 'bg-ai-recommendation text-primary-foreground'
  };

  return (
    <Card className={cn("border-0 bg-card", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <Badge className={cn("mb-2", typeColors[type])}>{type}</Badge>
          <CardTitle className="text-h3 font-bold">{title}</CardTitle>
        </div>
        <div className="text-right">
          <div className="text-h1 font-bold text-ai-confidence">{confidenceScore}%</div>
          <div className="text-caption text-muted-foreground uppercase tracking-wider">Confidence</div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-body text-muted-foreground mb-4">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
};
