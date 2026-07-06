import { BaseChart } from '@/components/charts/BaseChart';
import { ExecutiveTable } from '@/components/tables/ExecutiveTable';
import type { SimulationForecast } from '@/types/simulation';
import type { LineSeriesOption } from 'echarts';

interface Props {
  forecasts: SimulationForecast[];
}

export const SimulationForecastChart = ({ forecasts }: Props) => {
  // Safety limit
  if (forecasts.length > 1000) {
    return (
      <div className="p-4 bg-ivory border border-mist rounded-lg text-brass">
        Forecast data points exceed safety limit (1000). Chart rendering bypassed to preserve performance. Please refer to the table below.
      </div>
    );
  }

  const series: LineSeriesOption[] = [
    {
      name: 'Projected Value',
      type: 'line',
      data: forecasts.map(f => [f.targetDate, f.predictedValue]),
      smooth: true,
      lineStyle: { width: 2, color: '#ff682c' },
      itemStyle: { color: '#ff682c' }
    },
    {
      name: 'Lower Bound',
      type: 'line',
      data: forecasts.map(f => [f.targetDate, f.confidenceLower]),
      lineStyle: { opacity: 0 },
      stack: 'confidence-band',
      symbol: 'none',
      itemStyle: { color: 'transparent' }
    },
    {
      name: 'Upper Bound',
      type: 'line',
      data: forecasts.map(f => [f.targetDate, f.confidenceUpper - f.confidenceLower]),
      lineStyle: { opacity: 0 },
      areaStyle: { color: '#ff682c', opacity: 0.08 },
      stack: 'confidence-band',
      symbol: 'none',
      itemStyle: { color: 'transparent' }
    }
  ];

  const chartOptions = {
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const },
    yAxis: { type: 'value' as const },
    series
  };

  const tableColumns = [
    { accessorKey: 'targetDate', header: 'Date' },
    { accessorKey: 'predictedValue', header: 'Forecast' },
    { accessorKey: 'confidenceLower', header: 'Lower Bound' },
    { accessorKey: 'confidenceUpper', header: 'Upper Bound' },
  ];

  const tableData = forecasts.map((f, index) => ({
    id: String(index),
    targetDate: f.targetDate,
    predictedValue: f.predictedValue.toFixed(2),
    confidenceLower: f.confidenceLower.toFixed(2),
    confidenceUpper: f.confidenceUpper.toFixed(2),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div aria-hidden="true" className="h-64 w-full">
        <BaseChart option={chartOptions} />
      </div>
      <div role="table" aria-label="Forecast Details">
        <ExecutiveTable data={tableData} columns={tableColumns as any} />
      </div>
    </div>
  );
};
