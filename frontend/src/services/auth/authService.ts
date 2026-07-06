import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import { useUIStore } from '@/store/uiStore';
import { QueryClient } from '@tanstack/react-query';
import { authClient } from '@/services/authClient';

export const authService = {
  logout: async (queryClient: QueryClient) => {
    // 0. Revoke the session server-side (POST /api/v1/auth/logout). Best-effort:
    //    local teardown must still happen even if the network call fails.
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      try {
        await authClient.logout(refreshToken);
      } catch {
        // ignore: proceed with local logout regardless
      }
    }

    // 1. Clear Zustand React States purely
    useAuthStore.getState().clearAuth();
    useTenantStore.getState().reset();
    useUIStore.getState().reset();

    // 2. Explicitly clear persisted storages (prevent hydration leaks)
    localStorage.removeItem('insight-auth-storage');
    sessionStorage.removeItem('insight-auth-storage'); // legacy location
    localStorage.removeItem('insight-tenant-storage');
    localStorage.removeItem('insight-ui-storage');

    // 3. Nuke React Query Cache globally
    queryClient.clear();
  }
};
