// Backend DTOs (snake_case) + mapped domain models (camelCase) for the
// Data Observatory profile endpoint (GET /sectors/{sector}/analytics/profile).

export interface ProfileSeriesDTO {
  name: string;
  values: number[];
}

export interface ProfileChartDTO {
  key: string;
  title: string;
  chart_type: 'histogram' | 'bar' | 'donut' | 'line' | 'scatter';
  labels: string[];
  series: ProfileSeriesDTO[];
  points: number[][];
  description: string;
  stats: Record<string, number | string>;
}

export interface DataProfileDTO {
  sector: string;
  record_count: number;
  column_count: number;
  numeric_columns: string[];
  categorical_columns: string[];
  summary: string;
  charts: ProfileChartDTO[];
}

// ---- domain (camelCase) ----

export interface ProfileSeries {
  name: string;
  values: number[];
}

export interface ProfileChart {
  key: string;
  title: string;
  chartType: 'histogram' | 'bar' | 'donut' | 'line' | 'scatter';
  labels: string[];
  series: ProfileSeries[];
  points: number[][];
  description: string;
  stats: Record<string, number | string>;
}

export interface DataProfile {
  sector: string;
  recordCount: number;
  columnCount: number;
  numericColumns: string[];
  categoricalColumns: string[];
  summary: string;
  charts: ProfileChart[];
}
