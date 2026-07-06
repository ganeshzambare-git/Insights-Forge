import React from 'react';
import { OSLayout } from '@/components/layout/OSLayout';
import { OSSection } from '@/components/layout/OSSection';
import { useReasoning } from '../hooks/useReasoning';
import { useTenantStore } from '@/store/tenantStore';
import { ReasoningLoadingState } from '../components/ReasoningLoadingState';
import { ReasoningErrorState } from '../components/ReasoningErrorState';
import { ReasoningEmptyState } from '../components/ReasoningEmptyState';
import { ReasoningSummary } from '../components/ReasoningSummary';
import { ReasoningOrbit } from '../components/ReasoningOrbit';

export const ReasoningPage: React.FC = () => {
  const { tenantId, sectorId } = useTenantStore();
  const { data, isLoading, isError } = useReasoning(tenantId, sectorId);

  if (!tenantId || !sectorId) {
    return <ReasoningEmptyState />;
  }

  if (isLoading) {
    return <ReasoningLoadingState />;
  }

  if (isError || !data) {
    return <ReasoningErrorState />;
  }

  return (
    <OSLayout title="AI Reasoning OS" description={`Causal intelligence for ${sectorId}`}>
      {/* SUMMARY SECTION */}
      <OSSection title="Executive Overview" description="High-level reasoning summary">
        <ReasoningSummary summary={data.summary} confidenceScore={data.confidence.overallScore} />
      </OSSection>

      {/* CAUSAL ORBIT — insights, factors, evidence and actions as an
          interactive orbital map. Click a node for its detail card;
          related causal nodes pulse. */}
      <OSSection
        title="Causal Intelligence Orbit"
        description="Insights → factors → evidence → actions, in one interactive view"
      >
        <ReasoningOrbit
          insights={data.insights}
          factors={data.factors}
          evidence={data.evidenceNodes}
          recommendations={data.recommendations}
        />
      </OSSection>
    </OSLayout>
  );
};
