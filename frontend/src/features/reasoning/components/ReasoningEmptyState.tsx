import React from 'react';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card } from '@/components/ui/card';
import { BrainCircuit } from 'lucide-react';

export const ReasoningEmptyState: React.FC = () => {
  return (
    <OSLayout title="AI Reasoning OS" description="Awaiting sector context">
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center bg-card border-border w-full max-w-md">
          <BrainCircuit className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <div className="text-h3 font-semibold text-foreground mb-2">No Active Context</div>
          <div className="text-muted-foreground text-body">
            Please select a tenant and sector to engage the reasoning engine.
          </div>
        </Card>
      </div>
    </OSLayout>
  );
};
