import React from 'react';
import { BaseChart } from '@/components/charts/BaseChart';
import type { Forecast } from '@/types/dashboard';

interface ForecastPanelProps {
  forecasts: Forecast[];
}

export const ForecastPanel: React.FC<ForecastPanelProps> = ({ forecasts }) => {
  if (forecasts.length === 0) {
    return <div className="p-4 text-muted-foreground text-center border border-border rounded-lg bg-card">No forecast data available.</div>;
  }

  // Simplified chart mapping for the first forecast metric
  const dates = forecasts.map(f => new Date(f.targetDate).toLocaleDateString());
  const predicted = forecasts.map(f => f.predictedValue);
  const lower = forecasts.map(f => f.confidenceLower);
  const upper = forecasts.map(f => f.confidenceUpper);
  
  const metricName = forecasts[0]?.metric || 'Forecast';

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: dates },
    yAxis: { type: 'value' as const },
    series: [
      {
        name: 'Lower Confidence',
        type: 'line' as const,
        data: lower,
        lineStyle: { opacity: 0 },
        stack: 'confidence-band',
        symbol: 'none'
      },
      {
        name: 'Upper Confidence',
        type: 'line' as const,
        data: upper.map((u, i) => u - lower[i]),
        lineStyle: { opacity: 0 },
        areaStyle: { color: '#ff682c', opacity: 0.08 },
        stack: 'confidence-band',
        symbol: 'none'
      },
      {
        name: metricName,
        type: 'line' as const,
        data: predicted,
        itemStyle: { color: '#ff682c' },
        smooth: true
      }
    ]
  };

  return (
    <div className="h-[300px] border border-border rounded-lg bg-card p-4">
      <h3 className="text-h4 font-medium mb-4">{metricName} Forecast</h3>
      <BaseChart option={option} />
    </div>
  );
};
