import { apiClient } from '@/services/apiClient';
import type { RecommendationAnalysisDTO } from '@/types/recommendation';

export const recommendationClient = {
  getAnalysis: async (
    _tenantId: string,
    sectorId: string,
  ): Promise<RecommendationAnalysisDTO> => {
    const response = await apiClient.get<RecommendationAnalysisDTO>(
      `/sectors/${sectorId}/recommendation`,
    );
    return response.data;
  },
};
