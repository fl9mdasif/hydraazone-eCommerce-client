"use client";

import { useCallback } from "react";
import { useWishlistStore } from "@/stores/wishlist";
import { useAuthStore } from "@/stores/auth";
import * as wishlistApi from "@/lib/api/wishlist";

/**
 * Merges the local guest wishlist into the server list on login — the same
 * pattern `use-cart.ts`'s `mergeGuestCartToServer` already established.
 *
 * Before this hook existed, every heart-icon click (`product-card.tsx`,
 * `product-detail.tsx`, `table-cover-calculator.tsx`) wrote straight to
 * `useWishlistStore`'s local/localStorage state and never called the
 * `/wishlist` API — so a logged-in customer's saves never reached the
 * server, and `/dashboard/user/wishlist` (which reads `GET /wishlist`)
 * always rendered empty regardless of what the heart icon showed. Fixed by
 * routing every toggle through `useWishlist()` below instead of the store
 * directly.
 */
export async function mergeGuestWishlistToServer(token: string): Promise<void> {
  const localIds = useWishlistStore.getState().productIds;
  if (localIds.length === 0) return;

  // Sequential, not Promise.all — mirrors the cart merge's reasoning: these
  // all hit the same wishlist document, and `POST /wishlist` is additive
  // and idempotent, so there's nothing to gain from racing them.
  for (const productId of localIds) {
    try {
      await wishlistApi.addToWishlist(token, productId);
    } catch (error) {
      console.error("[wishlist] merge push failed for an item:", error);
    }
  }

  try {
    const server = await wishlistApi.getWishlist(token);
    const ids = server.items
      .map((item) => item.product?._id)
      .filter((id): id is string => Boolean(id));
    useWishlistStore.getState().replaceAll(ids);
  } catch (error) {
    // The pushes above still landed server-side even if this re-fetch
    // failed — the local list just stays as it was until the next sync.
    console.error("[wishlist] merge re-fetch failed:", error);
  }
}

/**
 * Save/unsave, for guests and logged-in customers alike — same shape as
 * `useCart()`. The local store is always what the heart icon reflects
 * instantly; a session mirrors the change to the server in the background.
 */
export function useWishlist() {
  const productIds = useWishlistStore((state) => state.productIds);
  const hydrated = useWishlistStore((state) => state.hydrated);
  const toggleLocal = useWishlistStore((state) => state.toggle);

  const toggle = useCallback(
    (productId: string) => {
      const wasSaved = useWishlistStore.getState().productIds.includes(productId);
      toggleLocal(productId);

      const token = useAuthStore.getState().token;
      if (!token) return;

      const call = wasSaved
        ? wishlistApi.removeFromWishlist(token, productId)
        : wishlistApi.addToWishlist(token, productId);

      void call.catch((error) => {
        console.error("[wishlist] server sync failed on toggle:", error);
      });
    },
    [toggleLocal],
  );

  return { productIds, hydrated, toggle };
}
