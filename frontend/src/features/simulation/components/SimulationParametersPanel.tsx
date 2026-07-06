import { useState, useEffect } from 'react';
import type { SimulationParameter } from '@/types/simulation';
import { AINativeCard } from '@/components/ai/AINativeCard';

interface Props {
  parameters: SimulationParameter[];
  onParametersChange: (paramId: string, value: number) => void;
}

export const SimulationParametersPanel = ({ parameters, onParametersChange }: Props) => {
  const [localParams, setLocalParams] = useState<SimulationParameter[]>(parameters);

  // Sync prop changes if external
  useEffect(() => {
    setLocalParams(parameters);
  }, [parameters]);

  const handleChange = (id: string, value: number) => {
    const updated = localParams.map(p => p.id === id ? { ...p, proposedValue: value } : p);
    setLocalParams(updated);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const changedParam = localParams.find((p, i) => p.proposedValue !== parameters[i].proposedValue);
      if (changedParam) {
        onParametersChange(changedParam.id, changedParam.proposedValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localParams, parameters, onParametersChange]);

  if (!parameters.length) return null;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-slate-800">Scenario Parameters</h3>
      {localParams.map(param => (
        <AINativeCard
          key={param.id}
          title={param.name}
          description="Parameter bounds adjustment"
          confidenceScore={100}
          type="Prediction"
        >
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>{param.bounds[0]} {param.unit}</span>
              <span className="font-medium text-ember">{param.proposedValue} {param.unit}</span>
              <span>{param.bounds[1]} {param.unit}</span>
            </div>
            <input
              type="range"
              min={param.bounds[0]}
              max={param.bounds[1]}
              value={param.proposedValue}
              onChange={(e) => handleChange(param.id, Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              aria-valuemin={param.bounds[0]}
              aria-valuemax={param.bounds[1]}
              aria-valuenow={param.proposedValue}
              aria-label={`Adjust ${param.name}`}
            />
            <div className="text-xs text-slate-500 mt-1">
              Baseline: {param.currentValue} {param.unit}
            </div>
          </div>
        </AINativeCard>
      ))}
    </div>
  );
};
