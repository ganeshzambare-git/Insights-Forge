import type { DataProfile, DataProfileDTO, ProfileChartDTO, ProfileChart } from '@/types/profile';

const mapChart = (dto: ProfileChartDTO): ProfileChart => ({
  key: dto.key,
  title: dto.title,
  chartType: dto.chart_type,
  labels: dto.labels ?? [],
  series: (dto.series ?? []).map((s) => ({ name: s.name, values: s.values ?? [] })),
  points: dto.points ?? [],
  description: dto.description,
  stats: dto.stats ?? {},
});

export const mapDataProfile = (dto: DataProfileDTO): DataProfile => ({
  sector: dto.sector,
  recordCount: dto.record_count,
  columnCount: dto.column_count,
  numericColumns: dto.numeric_columns ?? [],
  categoricalColumns: dto.categorical_columns ?? [],
  summary: dto.summary,
  charts: (dto.charts ?? []).map(mapChart),
});
