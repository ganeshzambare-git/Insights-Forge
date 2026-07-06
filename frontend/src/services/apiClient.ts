import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api';
import { useAuthStore } from '@/store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Silent token refresh.
// Access tokens expire after 15 minutes; without this every API call starts
// 401-ing and the dashboard looks like the data vanished. On a 401 we redeem
// the 7-day refresh token once (single-flight across concurrent requests),
// store the rotated pair, and replay the original request.
// ---------------------------------------------------------------------------
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, role } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    // Raw axios (not apiClient) to avoid interceptor recursion.
    const { data } = await axios.post(
      `${BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 },
    );
    useAuthStore.getState().login(data.access_token, data.refresh_token, role);
    return data.access_token as string;
  } catch {
    // Refresh token itself is dead — the session is genuinely over.
    useAuthStore.getState().clearAuth();
    return null;
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<unknown>) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const isAuthCall = (config?.url || '').includes('/auth/');

    if (status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true;
      refreshInFlight ??= refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
      const newToken = await refreshInFlight;
      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(config);
      }
    }

    // Backend standard error shape: { "error": { "code": "...", "message": "..." } }
    const data = error.response?.data as Record<string, unknown> | undefined;
    const errorEnvelope = (data?.error as Record<string, unknown> | undefined) ?? undefined;
    const apiError: ApiErrorResponse = {
      code: (errorEnvelope?.code as string) || 'UNKNOWN_ERROR',
      message:
        (errorEnvelope?.message as string) ||
        error.message ||
        'An unexpected error occurred',
      details: (errorEnvelope?.details as Record<string, unknown>) || {},
      status: error.response?.status,
      timestamp: new Date().toISOString(),
    };
    return Promise.reject(apiError);
  }
);
