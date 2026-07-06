import React from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { X, BrainCircuit, Lightbulb, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const IntelligencePanel: React.FC = () => {
  const { isIntelligencePanelOpen, setIntelligencePanelOpen } = useUIStore();

  if (!isIntelligencePanelOpen) return null;

  return (
    <div className={cn(
      "fixed right-0 top-16 bottom-0 w-80 bg-card border-l border-border z-40 transition-transform duration-300",
      "flex flex-col overflow-hidden"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-brand-primary" />
          <h2 className="text-h4 font-semibold tracking-tight">AI Command Center</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIntelligencePanelOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content Scaffolding (OS-AI-01) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Recommendation Panel */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-ai-recommendation" />
            <h3 className="text-caption font-bold text-muted-foreground uppercase">Top Recommendation</h3>
          </div>
          <div className="bg-muted p-3 rounded-md border border-border">
            <p className="text-body text-foreground mb-2">
              Optimize logistics route to distribution center Alpha to save 12% in operational costs.
            </p>
            <Button size="sm" className="w-full text-caption">Review Strategy</Button>
          </div>
        </section>

        {/* Anomaly Detection Panel */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-ai-anomaly" />
            <h3 className="text-caption font-bold text-muted-foreground uppercase">Active Anomalies</h3>
          </div>
          <div className="border-l-2 border-ai-anomaly pl-3">
            <p className="text-body font-medium">Checkout Flow Dropout</p>
            <p className="text-caption text-muted-foreground">Deviation +4.2σ detected 10m ago.</p>
          </div>
        </section>

        {/* Evidence & Reasoning Panel Scaffold */}
        <section>
          <h3 className="text-caption font-bold text-muted-foreground uppercase mb-3">System Context</h3>
          <div className="space-y-2 text-caption text-muted-foreground bg-muted/20 p-3 rounded-md">
            <div className="flex justify-between"><span>Confidence Threshold:</span> <span className="font-medium text-foreground">85%</span></div>
            <div className="flex justify-between"><span>Active Models:</span> <span className="font-medium text-foreground">3</span></div>
          </div>
        </section>

      </div>
    </div>
  );
};
