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

  /* ---- custom-size lines only (e.g. the table-cover calculator) ---- */
  /**
   * Present when `variantId` is a synthetic id (`${realVariantId}:${size}`)
   * rather than a real server variant id — required so two different
   * custom sizes of the same variant become distinct cart lines instead of
   * merging (the cart's identity is `productId + variantId`). `toOrderItems`
   * substitutes this back in so the server sees a real ObjectId.
   */
  realVariantId?: string;
  /** Shown instead of `variantName` in the drawer/cart, e.g. `72" × 42" · 1.5mm`. */
  customLabel?: string;
  /**
   * How many square inches correspond to ONE cover, so the cart's quantity
   * stepper can step by whole covers (re-deriving `quantity` = sq inches)
   * instead of incrementing raw square inches by one, which would be
   * meaningless. `quantity` itself is always the true square-inch total
   * charged — `price` here is the per-square-inch rate, so
   * `price * quantity` still equals the correct line total unmodified.
   */
  sqInPerCover?: number;
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

/**
 * The exact `items` payload `POST /orders` expects.
 *
 * Custom-size lines carry a synthetic `variantId` (so distinct sizes don't
 * merge in the cart) — `realVariantId` substitutes the true server id back
 * in here, so the server always sees a real ObjectId.
 */
export function toOrderItems(lines: CartLine[]) {
  return lines.map((line) => ({
    productId: line.productId,
    variantId: line.realVariantId ?? line.variantId,
    quantity: line.quantity,
  }));
}

/**
 * The `quantity` to pass to `setQuantity` for a +/- click on this line.
 *
 * A custom-size line's `quantity` is total square inches, not a count a
 * customer should ever see incremented by 1 — that would silently change
 * what they're paying for without changing the size shown. So the step is
 * one whole cover (`sqInPerCover`) instead of one raw unit. Reaching 0
 * covers returns 0, which `setQuantity` already treats as "remove this line".
 */
export function stepQuantity(line: CartLine, direction: 1 | -1): number {
  if (!line.sqInPerCover) return line.quantity + direction;

  const covers = Math.max(1, Math.round(line.quantity / line.sqInPerCover));
  const nextCovers = Math.max(0, covers + direction);
  return nextCovers * line.sqInPerCover;
}

/** Human-readable size summary for lines that carry one, for the order note. */
export function customLineNotes(lines: CartLine[]): string[] {
  return lines
    .filter((line): line is CartLine & { customLabel: string } =>
      Boolean(line.customLabel),
    )
    .map((line) => {
      const covers = line.sqInPerCover
        ? Math.round(line.quantity / line.sqInPerCover)
        : 1;
      return `${line.name} — ${line.customLabel} (Qty ${covers})`;
    });
}
