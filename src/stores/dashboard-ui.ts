"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * The dashboard sidebar's collapsed/expanded state. Shared between
 * `<Sidebar>` and `<Topbar>` — the toggle button lives in the topbar
 * (next to the page title) but has to drive the sidebar's own width, so
 * it can't be local component state to either one.
 *
 * Persisted the same way `stores/cart.ts` is: `hydrated` starts false so
 * both components render the expanded (server-safe) layout on first paint,
 * then flip to the stored value once `onRehydrateStorage` fires — no
 * `useEffect`+`localStorage` read of our own, no hydration mismatch.
 */
interface DashboardUiState {
  collapsed: boolean;
  hydrated: boolean;
  toggleSidebar: () => void;
  setHydrated: () => void;
}

export const useDashboardUiStore = create<DashboardUiState>()(
  persist(
    (set) => ({
      collapsed: false,
      hydrated: false,
      toggleSidebar: () => set((state) => ({ collapsed: !state.collapsed })),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "hydraazone.dashboard-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ collapsed: state.collapsed }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
