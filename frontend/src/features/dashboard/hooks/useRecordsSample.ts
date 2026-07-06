import { useQuery } from '@tanstack/react-query';
import { recordsClient } from '@/features/dataset/api/recordsClient';
import { useTenantStore } from '@/store/tenantStore';
import { queryKeys } from '@/lib/queryKeys';

// A capped sample of raw records powering the overview table + client-side
// filters. Read-only reuse of the existing GET /sectors/{sector}/records.
export const useRecordsSample = (limit = 200) => {
  const { tenantId, sectorId } = useTenantStore();

  return useQuery({
    queryKey: [...queryKeys.sector.records(tenantId!, sectorId!), 'sample', limit],
    queryFn: () => recordsClient.list(sectorId!, limit, 0),
    enabled: !!tenantId && !!sectorId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};
