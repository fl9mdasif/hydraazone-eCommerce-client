"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * The guest cart.
 *
 * There is no guest cart on the server — `/carts` requires auth — so an
 * anonymous shopper's cart lives here, persisted to localStorage, and is
 * merged into the server cart on login (Phase 4).
 *
 * Each line carries a denormalised snapshot so the drawer and the header
 * badge render instantly without a round trip. That snapshot is display-only:
 * `POST /carts` does not check stock and prices can move, so quantities and
 * availability are revalidated against the API before checkout unlocks.
 */

export interface CartLine {
  productId: string;
  variantId: string;
  quantity: number;
  /* ---- display snapshot, revalidated before checkout ---- */
  name: string;
  slug: string;
  thumbnail: string;
  variantName: string;
  /** `discountPrice ?? price` at the time it was added. */
  price: number;
  /** The list price, for the struck-through comparison. */
  listPrice: number;
  /** Stock as last seen, used to bound the quantity stepper. */
  stock: number;
}

export function lineKey(line: Pick<CartLine, "productId" | "variantId">) {
  // Cart items have no `_id` server-side, so this pair is the identity.
  return `${line.productId}-${line.variantId}`;
}

interface CartState {
  lines: CartLine[];
  hydrated: boolean;
  addLine: (line: CartLine) => void;
  setQuantity: (productId: string, variantId: string, quantity: number) => void;
  removeLine: (productId: string, variantId: string) => void;
  clear: () => void;
  replaceAll: (lines: CartLine[]) => void;
  setHydrated: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      hydrated: false,

      addLine: (line) =>
        set((state) => {
          const existing = state.lines.find(
            (candidate) =>
              candidate.productId === line.productId &&
              candidate.variantId === line.variantId,
          );

          if (!existing) return { lines: [...state.lines, line] };

          // Adding an item already in the cart increases it, matching the
          // server's additive `POST /carts` behaviour. Never exceed stock.
          const quantity = Math.min(
            existing.quantity + line.quantity,
            Math.max(line.stock, 1),
          );

          return {
            lines: state.lines.map((candidate) =>
              candidate === existing
                ? { ...candidate, ...line, quantity }
                : candidate,
            ),
          };
        }),

      setQuantity: (productId, variantId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter(
                  (line) =>
                    !(line.productId === productId && line.variantId === variantId),
                )
              : state.lines.map((line) =>
                  line.productId === productId && line.variantId === variantId
                    ? { ...line, quantity }
                    : line,
                ),
        })),

      removeLine: (productId, variantId) =>
        set((state) => ({
          lines: state.lines.filter(
            (line) =>
              !(line.productId === productId && line.variantId === variantId),
          ),
        })),

      clear: () => set({ lines: [] }),
      replaceAll: (lines) => set({ lines }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "hydraazone.cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

/* ------------------------------------------------------------- selectors */

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.price * line.quantity, 0);
}

/**
 * Mirrors `placeOrder`: flat rate, free above the threshold. Display only —
 * the server recomputes the real total and its number is what is charged.
 */
export function estimateShipping(
  subtotal: number,
  shippingRate: number,
  freeShippingThreshold: number,
): number {
  return subtotal >= freeShippingThreshold ? 0 : shippingRate;
}

/** The exact `items` payload `POST /orders` expects. */
export function toOrderItems(lines: CartLine[]) {
  return lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    quantity: line.quantity,
  }));
}
