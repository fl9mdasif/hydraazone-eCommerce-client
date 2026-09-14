"use client";

import { create } from "zustand";

/** Transient UI state. Never persisted — a reload should close everything. */

interface UiState {
  cartOpen: boolean;
  mobileNavOpen: boolean;
  searchOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;
  setSearchOpen: (open: boolean) => void;
  closeAll: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  cartOpen: false,
  mobileNavOpen: false,
  searchOpen: false,

  openCart: () => set({ cartOpen: true, mobileNavOpen: false }),
  closeCart: () => set({ cartOpen: false }),
  toggleMobileNav: () =>
    set((state) => ({ mobileNavOpen: !state.mobileNavOpen, cartOpen: false })),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  closeAll: () =>
    set({ cartOpen: false, mobileNavOpen: false, searchOpen: false }),
}));
