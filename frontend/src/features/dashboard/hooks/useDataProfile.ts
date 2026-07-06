import { useQuery } from '@tanstack/react-query';
import { profileClient } from '../api/profileClient';
import { useTenantStore } from '@/store/tenantStore';
import { queryKeys } from '@/lib/queryKeys';

export const useDataProfile = () => {
  const { tenantId, sectorId } = useTenantStore();

  return useQuery({
    queryKey: queryKeys.sector.profile(tenantId!, sectorId!),
    queryFn: () => profileClient.getProfile(sectorId!),
    enabled: !!tenantId && !!sectorId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};
