import React, { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { BaseChart } from '@/components/charts/BaseChart';
import { useDashboard } from '../hooks/useDashboard';
import { useDataProfile } from '../hooks/useDataProfile';
import { useRecordsSample } from '../hooks/useRecordsSample';

// ---------------------------------------------------------------------------
// Performance Overview — the screenshot layout: filters rail on the left;
// KPI cards with delta chips, trend & forecast chart, category mix bars and a
// live records table on the right. Works for every sector: everything is
// derived from the generic scorecard / timeseries / profile / records data.
// ---------------------------------------------------------------------------

const EMBER = '#ff682c';
const GRAPHITE = '#202020';
const SLATE = '#828282';
const MIST = '#e8e8e8';
const ASH = '#efefef';

const AXIS = {
  axisLine: { lineStyle: { color: MIST } },
  axisTick: { show: false },
  axisLabel: { color: SLATE, fontSize: 11 },
  splitLine: { lineStyle: { color: ASH } },
} as const;

type Row = Record<string, unknown>;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const toNum = (v: unknown): number | null => {
  if (isNum(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

// Simple least-squares projection of the next `steps` points.
const linearForecast = (values: number[], steps: number): number[] => {
  const n = values.length;
  if (n < 2) return [];
  const mx = (n - 1) / 2;
  const my = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - mx) * (values[i] - my);
    den += (i - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  return Array.from({ length: steps }, (_, k) => {
    const v = intercept + slope * (n + k);
    return Math.max(0, Math.round(v * 100) / 100);
  });
};

export const OverviewPanel: React.FC<{ sectorTitle: string }> = ({ sectorTitle }) => {
  const { data: dash } = useDashboard();
  const { data: profile } = useDataProfile();
  const { data: recordsPage } = useRecordsSample(200);

  const rows: Row[] = useMemo(
    () => (recordsPage?.items ?? []).map((r) => r.data as Row).filter((d) => d && typeof d === 'object'),
    [recordsPage],
  );

  // ---- filter rail: one select per categorical column (from the profile) ----
  const filterColumns = useMemo(() => {
    const cols = profile?.categoricalColumns ?? [];
    const skip = ['email', 'date', 'invoice', 'phone', 'address', 'name'];
    return cols.filter((c) => !skip.some((tok) => c.toLowerCase().includes(tok))).slice(0, 5);
  }, [profile]);

  const [filters, setFilters] = useState<Record<string, string>>({});

  const filterOptions = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const col of filterColumns) {
      const seen = new Set<string>();
      for (const row of rows) {
        const v = row[col];
        if (typeof v === 'string' && v.trim()) seen.add(v.trim());
        if (seen.size >= 24) break;
      }
      out[col] = [...seen].sort();
    }
    return out;
  }, [filterColumns, rows]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        Object.entries(filters).every(([col, val]) => !val || String(row[col] ?? '').trim() === val),
      ),
    [rows, filters],
  );

  // ---- table shape: name column + up to two numeric columns + status ----
  const nameCol = useMemo(() => {
    const preferred = ['product', 'item', 'name', 'title', 'category', 'city'];
    const cats = profile?.categoricalColumns ?? [];
    return (
      cats.find((c) => preferred.some((p) => c.toLowerCase().includes(p))) ?? cats[0] ?? null
    );
  }, [profile]);

  const numCols = useMemo(() => (profile?.numericColumns ?? []).slice(0, 2), [profile]);

  const tableRows = useMemo(() => {
    if (!nameCol || numCols.length === 0) return [];
    const rowsOut = filteredRows
      .map((row) => ({
        name: String(row[nameCol] ?? '—'),
        a: toNum(row[numCols[0]]),
        b: numCols[1] ? toNum(row[numCols[1]]) : null,
      }))
      .filter((r) => r.a !== null)
      .slice(0, 8);
    const values = rowsOut.map((r) => r.a as number).sort((x, y) => x - y);
    const q = (p: number) => values[Math.min(values.length - 1, Math.floor(p * values.length))] ?? 0;
    const critical = q(0.15);
    const low = q(0.4);
    return rowsOut.map((r) => ({
      ...r,
      status: (r.a as number) <= critical ? 'Critical' : (r.a as number) <= low ? 'Low' : 'Healthy',
    }));
  }, [filteredRows, nameCol, numCols]);

  // ---- KPI cards (top 4 from the scorecard) + trend delta from timeseries ----
  // Identifier averages ("Avg CustomerId") are meaningless — drop them.
  const kpis = (dash?.kpis ?? [])
    .filter((k) => !/\bid\b|customerid|_id/i.test(k.title))
    .slice(0, 4);
  const ts = dash?.timeseries;
  const trendDelta = useMemo(() => {
    const vals = ts?.series?.[0]?.values ?? [];
    if (vals.length < 2) return null;
    const prev = vals[vals.length - 2];
    const last = vals[vals.length - 1];
    if (prev === 0) return null;
    return ((last - prev) / prev) * 100;
  }, [ts]);

  // ---- trend & forecast chart ----
  const forecastOption: EChartsOption | null = useMemo(() => {
    const labels = ts?.labels ?? [];
    const values = ts?.series?.[0]?.values ?? [];
    if (labels.length < 2) return null;
    const fc = linearForecast(values, 3);
    const fcLabels = fc.map((_, i) => `+${i + 1}`);
    const actual = [...values, ...fc.map(() => null)];
    const forecast = [...values.map((_, i) => (i === values.length - 1 ? values[i] : null)), ...fc];
    return {
      grid: { left: 44, right: 18, top: 16, bottom: 30 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: [...labels, ...fcLabels], ...AXIS },
      yAxis: { type: 'value', ...AXIS },
      series: [
        {
          name: 'Actual',
          type: 'line',
          data: actual,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: GRAPHITE },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255,104,44,0.14)' },
                { offset: 1, color: 'rgba(255,104,44,0)' },
              ],
            },
          },
        },
        {
          name: 'AI projection',
          type: 'line',
          data: forecast,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: EMBER, type: 'dashed' },
        },
      ],
    };
  }, [ts]);

  // ---- category mix (funnel-style descending bars) ----
  const mixChart = useMemo(() => {
    const cat = (profile?.charts ?? []).find((c) => c.chartType === 'bar' || c.chartType === 'donut');
    if (!cat) return null;
    const pairs = cat.labels
      .map((label, i) => ({ label, value: cat.series[0]?.values[i] ?? 0 }))
      .filter((p) => p.label !== 'Other')
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
    if (pairs.length === 0) return null;
    const shades = ['#ff682c', '#ff8a5c', '#ffb08c', '#ffd4bf'];
    const option: EChartsOption = {
      grid: { left: 8, right: 8, top: 10, bottom: 46 },
      tooltip: { trigger: 'item' },
      xAxis: {
        type: 'category',
        data: pairs.map((p) => p.label),
        ...AXIS,
        axisLabel: { color: SLATE, fontSize: 10, interval: 0, width: 70, overflow: 'truncate' },
      },
      yAxis: { type: 'value', show: false },
      series: [
        {
          type: 'bar',
          data: pairs.map((p, i) => ({ value: p.value, itemStyle: { color: shades[i] } })),
          barCategoryGap: '28%',
          itemStyle: { borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
    return { option, title: cat.title.replace(' — breakdown', ' mix') };
  }, [profile]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="sd-ov">
      {/* ---- Filters rail ---- */}
      <aside className="sd-ov-filters sd-card sd-rise" aria-label="Filters">
        <p className="sd-ov-filters-title">Filters</p>
        {ts && ts.labels.length > 0 && (
          <label className="sd-ov-field">
            <span>Date</span>
            <span className="sd-ov-daterange">
              {ts.labels[0]} – {ts.labels[ts.labels.length - 1]}
            </span>
          </label>
        )}
        {filterColumns.map((col) => (
          <label key={col} className="sd-ov-field">
            <span>{col.replace(/_/g, ' ')}</span>
            <select
              value={filters[col] ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, [col]: e.target.value }))}
            >
              <option value="">All</option>
              {(filterOptions[col] ?? []).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
        ))}
        {filterColumns.length === 0 && (
          <p className="sd-note" style={{ padding: 0, fontSize: 13 }}>
            Upload data to enable filters.
          </p>
        )}
      </aside>

      {/* ---- Main column ---- */}
      <div className="sd-ov-main">
        <div className="sd-ov-head">
          <div>
            <h2 className="sd-ov-title">{sectorTitle} Performance Overview</h2>
            <p className="sd-ov-sub">Live signals computed from your ingested workspace data.</p>
          </div>
          <span className="sd-ov-live"><span className="sd-ov-live-dot" /> Live</span>
        </div>

        {/* KPI cards */}
        <div className="sd-ov-kpis">
          {kpis.map((kpi, i) => (
            <div
              key={kpi.id}
              className={`sd-ov-kpi sd-rise${i === kpis.length - 1 ? ' is-accent' : ''}`}
              style={{ ['--d' as string]: i + 1 } as React.CSSProperties}
            >
              <p className="sd-ov-kpi-label">{kpi.title}</p>
              <p className="sd-ov-kpi-value">
                {kpi.unit === '$' ? '$' : ''}
                {kpi.value.toLocaleString()}
                {kpi.unit && kpi.unit !== '$' ? kpi.unit : ''}
              </p>
              {i === 0 && trendDelta !== null ? (
                <p className={`sd-ov-kpi-delta ${trendDelta >= 0 ? 'is-up' : 'is-down'}`}>
                  {trendDelta >= 0 ? '▲' : '▼'} {Math.abs(trendDelta).toFixed(1)}% vs previous period
                </p>
              ) : (
                <p className="sd-ov-kpi-delta is-flat">— current snapshot</p>
              )}
            </div>
          ))}
          {kpis.length === 0 && <div className="sd-note">Upload data to populate metrics.</div>}
        </div>

        {/* Charts row */}
        <div className="sd-ov-charts">
          <div className="sd-card sd-ov-chartcard sd-rise" style={{ ['--d' as string]: 5 } as React.CSSProperties}>
            <p className="sd-ov-card-title">Trend &amp; forecast</p>
            <p className="sd-ov-card-sub">Actual vs AI projection</p>
            {forecastOption ? (
              <BaseChart option={forecastOption} style={{ height: '240px', minHeight: '240px' }} />
            ) : (
              <p className="sd-note">Not enough history yet.</p>
            )}
          </div>
          <div className="sd-card sd-ov-chartcard sd-rise" style={{ ['--d' as string]: 6 } as React.CSSProperties}>
            <p className="sd-ov-card-title">{mixChart ? mixChart.title : 'Category mix'}</p>
            <p className="sd-ov-card-sub">Largest segments first</p>
            {mixChart ? (
              <BaseChart option={mixChart.option} style={{ height: '240px', minHeight: '240px' }} />
            ) : (
              <p className="sd-note">No categorical data yet.</p>
            )}
          </div>
        </div>

        {/* Records table */}
        {tableRows.length > 0 && nameCol && (
          <div className="sd-card sd-ov-tablecard sd-rise" style={{ ['--d' as string]: 7 } as React.CSSProperties}>
            <table className="sd-ov-table">
              <thead>
                <tr>
                  <th>{nameCol.replace(/_/g, ' ')}</th>
                  <th>{numCols[0]?.replace(/_/g, ' ')}</th>
                  {numCols[1] && <th>{numCols[1].replace(/_/g, ' ')}</th>}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td>{(r.a as number).toLocaleString()}</td>
                    {numCols[1] && <td>{r.b !== null ? r.b.toLocaleString() : '—'}</td>}
                    <td>
                      <span className={`sd-ov-pill is-${r.status.toLowerCase()}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="sd-ov-tablenote">
              Showing {tableRows.length} of {filteredRows.length} filtered record(s)
              {activeFilterCount > 0 ? ` · ${activeFilterCount} filter(s) applied` : ''}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
