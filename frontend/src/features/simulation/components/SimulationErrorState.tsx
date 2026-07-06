import { OSSection } from '@/components/layout/OSSection';
import { OSGrid } from '@/components/layout/OSGrid';
import { AINativeCard } from '@/components/ai/AINativeCard';

interface Props {
  error: Error;
}

export const SimulationErrorState = ({ error }: Props) => {
  return (
    <div role="alert" aria-live="assertive">
      <OSGrid>
        <OSSection title="Simulation Analysis Failed" description="An error occurred while computing scenarios.">
          <AINativeCard
            title="Error"
            description="System"
            confidenceScore={0}
            type="Anomaly"
          >
            <div className="text-brand-error">{error.message}</div>
          </AINativeCard>
        </OSSection>
      </OSGrid>
    </div>
  );
};
