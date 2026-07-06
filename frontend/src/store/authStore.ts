import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserRole } from '@/types/auth'

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  // `token` holds the access token; apiClient reads it from persisted state.token
  token: string | null;
  refreshToken: string | null;
  login: (token: string, refreshToken: string, role?: UserRole | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      role: null,
      token: null,
      refreshToken: null,
      login: (token, refreshToken, role = null) =>
        set({ isAuthenticated: true, token, refreshToken, role }),
      clearAuth: () =>
        set({ isAuthenticated: false, token: null, refreshToken: null, role: null }),
    }),
    {
      name: 'insight-auth-storage',
      // localStorage (not sessionStorage) so the session survives page
      // reloads, new tabs and browser restarts. The access token silently
      // refreshes via the 7-day rotating refresh token (see apiClient).
      storage: createJSONStorage(() => localStorage),
    }
  )
)
