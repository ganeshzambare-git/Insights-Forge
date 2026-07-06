import React, { useMemo } from 'react';
import { AlertTriangle, TrendingUp, Database, Lightbulb, Activity } from 'lucide-react';
import RadialOrbitalTimeline, { type TimelineItem } from '@/components/ui/radial-orbital-timeline';
import type {
  ReasoningInsight,
  ReasoningFactor,
  ReasoningEvidence,
  ReasoningRecommendation,
} from '@/types/reasoning';

interface ReasoningOrbitProps {
  insights: ReasoningInsight[];
  factors: ReasoningFactor[];
  evidence: ReasoningEvidence[];
  recommendations: ReasoningRecommendation[];
}

// Maps the reasoning analysis into orbital nodes:
// insights (anomalies/trends) → factors (drivers) → evidence (sources) →
// recommendations (actions). Relations chain each ring to the next so
// clicking a node pulses its causal neighbours.
export const ReasoningOrbit: React.FC<ReasoningOrbitProps> = ({
  insights,
  factors,
  evidence,
  recommendations,
}) => {
  const items = useMemo<TimelineItem[]>(() => {
    const out: TimelineItem[] = [];
    let id = 1;

    const insightIds: number[] = [];
    const factorIds: number[] = [];
    const evidenceIds: number[] = [];
    const recIds: number[] = [];

    for (const ins of insights) {
      insightIds.push(id);
      out.push({
        id: id++,
        title: ins.title,
        date: ins.category.toUpperCase(),
        content: ins.description,
        category: 'Insight',
        icon: ins.category === 'anomaly' ? AlertTriangle : TrendingUp,
        relatedIds: [],
        status: ins.severity === 'high' || ins.severity === 'critical' ? 'in-progress' : 'completed',
        energy:
          ins.severity === 'critical' ? 95 : ins.severity === 'high' ? 85 : ins.severity === 'medium' ? 60 : 40,
      });
    }
    for (const f of factors) {
      factorIds.push(id);
      out.push({
        id: id++,
        title: f.name,
        date: `TREND: ${f.trend.toUpperCase()}`,
        content: `Contributes ${Math.round(f.contributionWeight * 100)}% weight to the current analysis; trend is ${f.trend}.`,
        category: 'Factor',
        icon: Activity,
        relatedIds: [],
        status: f.trend === 'increasing' ? 'in-progress' : 'completed',
        energy: Math.round(f.contributionWeight * 100),
      });
    }
    for (const e of evidence) {
      evidenceIds.push(id);
      out.push({
        id: id++,
        title: e.source,
        date: 'EVIDENCE',
        content: e.description,
        category: 'Evidence',
        icon: Database,
        relatedIds: [],
        status: 'completed',
        energy: Math.round(e.reliability * 100),
      });
    }
    for (const r of recommendations) {
      recIds.push(id);
      out.push({
        id: id++,
        title: r.title,
        date: `${r.actionType.toUpperCase()} · EFFORT ${r.effortLevel.toUpperCase()}`,
        content: r.description,
        category: 'Action',
        icon: Lightbulb,
        relatedIds: [],
        status: 'pending',
        energy: Math.round(r.impactScore * 100),
      });
    }

    // Chain the causal rings: insight ↔ factor ↔ evidence ↔ action.
    const link = (a: number[], b: number[]) => {
      for (const x of a) {
        const item = out.find((i) => i.id === x);
        if (item) item.relatedIds.push(...b);
      }
    };
    link(insightIds, factorIds);
    link(factorIds, [...insightIds, ...evidenceIds]);
    link(evidenceIds, [...factorIds, ...recIds]);
    link(recIds, evidenceIds);

    return out;
  }, [insights, factors, evidence, recommendations]);

  if (items.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No reasoning nodes yet — upload data to generate the causal orbit.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <RadialOrbitalTimeline
        timelineData={items}
        energyLabel="Confidence / weight"
        statusLabels={{ 'in-progress': 'ATTENTION', pending: 'ACTION', completed: 'STABLE' }}
      />
      <p className="text-xs text-muted-foreground text-center">
        Click a node to inspect it — connected causal nodes pulse. Click the background to resume orbit.
      </p>
    </div>
  );
};
