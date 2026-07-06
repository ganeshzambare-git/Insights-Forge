import React from 'react';
import type { EChartsOption } from 'echarts';
import { BaseChart } from '@/components/charts/BaseChart';
import { useDataProfile } from '../hooks/useDataProfile';
import type { ProfileChart } from '@/types/profile';

// Ventriloc palette — charts read like a printed report.
const EMBER = '#ff682c';
const BRASS = '#816729';
const GRAPHITE = '#202020';
const STEEL = '#4d4d4d';
const SLATE = '#828282';
const MIST = '#e8e8e8';
const ASH = '#efefef';

const AXIS = {
  axisLine: { lineStyle: { color: MIST } },
  axisTick: { show: false },
  axisLabel: { color: SLATE, fontSize: 11 },
  splitLine: { lineStyle: { color: ASH } },
} as const;

// One option builder per chart_type coming from the profile endpoint.
const buildOption = (chart: ProfileChart): EChartsOption => {
  const grid = { left: 48, right: 16, top: 18, bottom: 42 };
  switch (chart.chartType) {
    case 'line':
      return {
        grid,
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: chart.labels, ...AXIS },
        yAxis: { type: 'value', ...AXIS },
        series: chart.series.map((s) => ({
          name: s.name,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: s.values,
          lineStyle: { width: 3, color: EMBER },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255,104,44,0.18)' },
                { offset: 1, color: 'rgba(255,104,44,0)' },
              ],
            },
          },
        })),
      };
    case 'histogram':
    case 'bar':
      return {
        grid: { ...grid, bottom: 64 },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: chart.labels,
          ...AXIS,
          axisLabel: { color: SLATE, fontSize: 10, rotate: chart.labels.length > 6 ? 32 : 0 },
        },
        yAxis: { type: 'value', ...AXIS },
        series: chart.series.map((s) => ({
          name: s.name,
          type: 'bar',
          data: s.values,
          barMaxWidth: 34,
          itemStyle: {
            color: chart.chartType === 'histogram' ? EMBER : GRAPHITE,
            borderRadius: [3, 3, 0, 0],
          },
        })),
      };
    case 'donut':
      return {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0, textStyle: { color: STEEL, fontSize: 11 }, icon: 'circle' },
        color: [EMBER, GRAPHITE, BRASS, STEEL, SLATE, MIST],
        series: [
          {
            type: 'pie',
            radius: ['52%', '74%'],
            center: ['50%', '44%'],
            label: { show: false },
            itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
            data: chart.labels.map((label, i) => ({
              name: label,
              value: chart.series[0]?.values[i] ?? 0,
            })),
          },
        ],
      };
    case 'scatter':
      return {
        grid,
        tooltip: { trigger: 'item' },
        xAxis: { type: 'value', ...AXIS, scale: true },
        yAxis: { type: 'value', ...AXIS, scale: true },
        series: [
          {
            type: 'scatter',
            data: chart.points,
            symbolSize: 8,
            itemStyle: { color: EMBER, opacity: 0.55 },
          },
        ],
      };
    default:
      return {};
  }
};

// Compact stat chips shown between chart and description.
const StatRow: React.FC<{ stats: Record<string, number | string> }> = ({ stats }) => {
  const entries = Object.entries(stats).filter(([k]) => k !== 'count').slice(0, 4);
  if (entries.length === 0) return null;
  return (
    <div className="sd-obs-stats">
      {entries.map(([k, v]) => (
        <span key={k} className="sd-obs-stat">
          <span className="sd-obs-stat-k">{k.replace(/_/g, ' ')}</span>
          <span className="sd-obs-stat-v">
            {typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v}
          </span>
        </span>
      ))}
    </div>
  );
};

export const DataObservatory: React.FC = () => {
  const { data, isLoading, isError } = useDataProfile();

  if (isLoading) {
    return <div className="sd-note">Profiling your dataset…</div>;
  }
  if (isError || !data) {
    return null; // additive section — never break the page if the endpoint is absent
  }
  if (data.recordCount === 0 || data.charts.length === 0) {
    return (
      <div className="sd-card">
        <p className="sd-note" style={{ padding: 0 }}>{data.summary}</p>
      </div>
    );
  }

  return (
    <>
      <p className="sd-obs-summary">{data.summary}</p>
      <div className="sd-obs-grid">
        {data.charts.map((chart, i) => (
          <article
            key={chart.key}
            className="sd-card sd-obs-card sd-rise"
            style={{ ['--d' as string]: i } as React.CSSProperties}
          >
            <h3 className="sd-obs-title">{chart.title}</h3>
            <div className="sd-obs-chart">
              <BaseChart option={buildOption(chart)} style={{ height: '260px', minHeight: '260px' }} />
            </div>
            <StatRow stats={chart.stats} />
            <p className="sd-obs-desc">{chart.description}</p>
          </article>
        ))}
      </div>
    </>
  );
};
