export const queryKeys = {
  auth: {
    session: ['auth', 'session'] as const,
  },
  tenant: {
    all: ['tenants'] as const,
    details: (tenantId: string) => ['tenants', tenantId] as const,
  },
  sector: {
    all: (tenantId: string) => ['sectors', tenantId] as const,
    dashboard: (tenantId: string, sectorId: string) => [tenantId, sectorId, 'dashboard'] as const,
    datasets: (tenantId: string, sectorId: string) => [tenantId, sectorId, 'datasets'] as const,
    reasoning: (tenantId: string, sectorId: string) => [tenantId, sectorId, 'reasoning'] as const,
    simulations: (tenantId: string, sectorId: string) => [tenantId, sectorId, 'simulations'] as const,
    reports: (tenantId: string, sectorId: string) => [tenantId, sectorId, 'reports'] as const,
    recommendation: (tenantId: string, sectorId: string) => [tenantId, sectorId, 'recommendation'] as const,
    records: (tenantId: string, sectorId: string) => [tenantId, sectorId, 'records'] as const,
    record: (tenantId: string, sectorId: string, recordId: string) => [tenantId, sectorId, 'records', recordId] as const,
    geo: (tenantId: string, sectorId: string) => [tenantId, sectorId, 'geo'] as const,
    profile: (tenantId: string, sectorId: string) => [tenantId, sectorId, 'profile'] as const,
  },
  // Contract endpoints scoped by the caller's JWT (not by a path param).
  datasets: {
    list: (tenantId: string) => [tenantId, 'datasets'] as const,
    detail: (tenantId: string, datasetId: string) => [tenantId, 'datasets', datasetId] as const,
  },
  decisionCards: {
    list: (tenantId: string, status?: string) => [tenantId, 'decision-cards', status ?? 'all'] as const,
  },
  reports: {
    detail: (tenantId: string, reportId: string) => [tenantId, 'reports', reportId] as const,
  },
  thresholds: {
    list: (tenantId: string) => [tenantId, 'thresholds'] as const,
  },
  users: {
    list: (tenantId: string) => [tenantId, 'users'] as const,
  },
  admin: {
    users: (tenantId: string, role: string, sessionId: string) => ['admin', tenantId, 'users', role, sessionId] as const,
    audit: (tenantId: string, role: string, filters: string) => ['admin', tenantId, 'audit', role, filters] as const,
    permissions: (tenantId: string, role: string) => ['admin', tenantId, 'permissions', role] as const,
    health: (tenantId: string) => ['admin', tenantId, 'health'] as const,
    policies: (tenantId: string) => ['admin', tenantId, 'policies'] as const,
    analysis: (tenantId: string, role: string) => ['admin', tenantId, 'analysis', role] as const,
  }
};
