import { apiClient } from '@/services/apiClient';
import type { DataProfile, DataProfileDTO } from '@/types/profile';
import { mapDataProfile } from './profileMapper';

export const profileClient = {
  async getProfile(sectorId: string): Promise<DataProfile> {
    const { data } = await apiClient.get<DataProfileDTO>(
      `/sectors/${sectorId}/analytics/profile`
    );
    return mapDataProfile(data);
  },
};
