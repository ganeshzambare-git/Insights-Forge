import { OSSection } from '@/components/layout/OSSection';
import { OSGrid } from '@/components/layout/OSGrid';
import { AINativeCard } from '@/components/ai/AINativeCard';

export const SimulationRunningState = () => {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <OSGrid>
        <OSSection title="Computing Scenario" description="Running forward-pass simulation...">
          <AINativeCard
            title="Processing"
            description="System Engine"
            confidenceScore={0}
            type="Prediction"
          >
            <div className="flex flex-col gap-4">
              <div className="text-slate-600">Recomputing probabilities and ROI bounds...</div>
              <div role="progressbar" aria-label="Running Simulation" className="h-2 bg-mist rounded w-full overflow-hidden">
                <div className="h-full bg-ember animate-pulse w-1/2" />
              </div>
            </div>
          </AINativeCard>
        </OSSection>
      </OSGrid>
    </div>
  );
};
