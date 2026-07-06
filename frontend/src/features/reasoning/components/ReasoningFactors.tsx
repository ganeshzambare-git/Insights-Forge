import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ReasoningFactor } from '@/types/reasoning';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ReasoningFactorsProps {
  factors: ReasoningFactor[];
}

export const ReasoningFactors: React.FC<ReasoningFactorsProps> = ({ factors }) => {
  const getTrendIcon = (trend: string) => {
    switch(trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-brand-error" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-brand-success" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {factors.map(factor => (
        <Card key={factor.id} className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-caption font-semibold">{factor.name}</CardTitle>
            {getTrendIcon(factor.trend)}
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-h2 font-bold">{Math.round(factor.contributionWeight * 100)}%</div>
                <div className="text-caption text-muted-foreground">Contribution Weight</div>
              </div>
              <Badge variant="outline" className="capitalize text-xs">{factor.trend}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
