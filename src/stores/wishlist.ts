"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Guest wishlist. `/wishlist` is auth-only server-side, so an anonymous
 * shopper's saved items live here until they log in, then merge up.
 */

interface WishlistState {
  productIds: string[];
  hydrated: boolean;
  toggle: (productId: string) => void;
  add: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
  replaceAll: (productIds: string[]) => void;
  setHydrated: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      productIds: [],
      hydrated: false,

      toggle: (productId) =>
        set((state) => ({
          productIds: state.productIds.includes(productId)
            ? state.productIds.filter((id) => id !== productId)
            : [...state.productIds, productId],
        })),

      // Idempotent, matching the server's `POST /wishlist`.
      add: (productId) =>
        set((state) =>
          state.productIds.includes(productId)
            ? state
            : { productIds: [...state.productIds, productId] },
        ),

      remove: (productId) =>
        set((state) => ({
          productIds: state.productIds.filter((id) => id !== productId),
        })),

      clear: () => set({ productIds: [] }),
      replaceAll: (productIds) => set({ productIds }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "hydraazone.wishlist",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ productIds: state.productIds }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
