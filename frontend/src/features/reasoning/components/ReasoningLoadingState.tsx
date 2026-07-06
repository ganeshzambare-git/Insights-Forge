import React from 'react';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card } from '@/components/ui/card';

export const ReasoningLoadingState: React.FC = () => {
  return (
    <OSLayout title="AI Reasoning OS" description="Analyzing causal patterns...">
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center bg-card border-border animate-pulse w-full max-w-md">
          <div className="text-h3 font-semibold mb-2">Analyzing Evidence</div>
          <div className="text-muted-foreground text-body">
            Please wait while the AI reasoning engine processes sector intelligence...
          </div>
        </Card>
      </div>
    </OSLayout>
  );
};
