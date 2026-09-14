"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthUser } from "@/lib/api/schemas/user";

/**
 * Session state.
 *
 * The token lives in localStorage rather than an httpOnly cookie. That is
 * forced by the server: `middlewares/auth.ts` authorises from the
 * `Authorization` header only, so a cookie the JS cannot read could never
 * authorise a request. Accepted tradeoff, recorded here so it is a decision
 * rather than an oversight.
 *
 * There is no refresh flow — `POST /auth/refresh-token` is broken server-side
 * (see lib/api/auth.ts). When a call returns 401 we clear the session and
 * send the user to login.
 */

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  /** False until the persisted store has rehydrated on the client. */
  hydrated: boolean;
  setSession: (user: AuthUser, token: string) => void;
  clearSession: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hydrated: false,
      setSession: (user, token) => set({ user, token }),
      clearSession: () => set({ user: null, token: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "hydraazone.auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

/** Reads the token outside React (API calls in event handlers). */
export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}

export function isAuthenticated(): boolean {
  return Boolean(useAuthStore.getState().token);
}
