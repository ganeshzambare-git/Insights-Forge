import React from 'react';
import { cn } from '@/lib/utils';
import { X, BrainCircuit, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReasoningEvidence } from '@/types/reasoning';
import { ConfidencePanel } from './ConfidencePanel';

interface EvidenceInspectorProps {
  evidence: ReasoningEvidence | null;
  onClose: () => void;
}

export const EvidenceInspector: React.FC<EvidenceInspectorProps> = ({ evidence, onClose }) => {
  if (!evidence) return null;

  return (
    <div className={cn(
      "fixed right-0 top-16 bottom-0 w-80 bg-card border-l border-border z-40 transition-transform duration-300 flex flex-col overflow-hidden"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-brand-primary" />
          <h2 className="text-h4 font-semibold tracking-tight">Evidence Trace</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close Inspector">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-ai-recommendation" />
            <h3 className="text-caption font-bold text-muted-foreground uppercase">Raw Evidence</h3>
          </div>
          <div className="bg-muted p-3 rounded-md border border-border">
            <p className="text-body font-medium mb-2">{evidence.source}</p>
            <p className="text-body text-muted-foreground mb-4">{evidence.description}</p>
            <ConfidencePanel score={evidence.reliability} label="Node Reliability" />
          </div>
        </section>
      </div>
    </div>
  );
};
