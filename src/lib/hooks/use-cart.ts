"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import type { Product, Variant } from "@/lib/api/schemas/product";
import { effectivePrice } from "@/lib/utils/product";
import {
  cartCount,
  cartSubtotal,
  useCartStore,
  type CartLine,
} from "@/stores/cart";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import * as cartApi from "@/lib/api/cart";

/**
 * Add/update/remove, for guests and logged-in customers alike.
 *
 * The local store is always the source of truth for what the UI shows, so
 * the cart responds instantly and works offline-ish. When there is a session
 * we mirror the change to the server cart in the background — a failed
 * mirror is logged, not surfaced, because the local cart is still correct
 * and checkout submits `items` from the body anyway.
 */
export function useCart() {
  const lines = useCartStore((state) => state.lines);
  const hydrated = useCartStore((state) => state.hydrated);
  const addLine = useCartStore((state) => state.addLine);
  const setQuantityLocal = useCartStore((state) => state.setQuantity);
  const removeLocal = useCartStore((state) => state.removeLine);
  const clearLocal = useCartStore((state) => state.clear);
  const openCart = useUiStore((state) => state.openCart);

  const addItem = useCallback(
    (product: Product, variant: Variant, quantity = 1) => {
      const line: CartLine = {
        productId: product._id,
        variantId: variant._id,
        quantity,
        name: product.name,
        slug: product.slug,
        thumbnail: variant.images[0] || product.thumbnail,
        variantName: variant.name,
        price: effectivePrice(variant),
        listPrice: variant.price,
        stock: variant.stock,
      };

      addLine(line);
      openCart();

      const token = useAuthStore.getState().token;
      if (token) {
        void cartApi
          .addToCart(token, {
            productId: product._id,
            variantId: variant._id,
            quantity,
          })
          .catch((error) => {
            console.error("[cart] server sync failed on add:", error);
          });
      }
    },
    [addLine, openCart],
  );

  /**
   * For custom-size products (the table-cover calculator): builds a line
   * keyed on a SYNTHETIC variant id (`${variant._id}:${length}x${width}`)
   * so distinct sizes never merge with each other in the cart — the store's
   * identity is `productId + variantId` and knows nothing about "size".
   * `realVariantId` is kept alongside it so checkout can submit the true
   * server variant id (`toOrderItems` in `stores/cart.ts` substitutes it
   * back in).
   *
   * Deliberately NOT mirrored to the server cart: `POST /carts` expects a
   * real variant ObjectId, and a synthetic string would not resolve there.
   * The server cart is best-effort/display-only anyway — checkout always
   * submits from local state (`toOrderItems`), so a custom line simply
   * isn't visible if the customer inspects `GET /carts` directly, which is
   * an acceptable gap given the server has no concept of this product type.
   */
  const addCustomItem = useCallback(
    (params: {
      product: Product;
      variant: Variant;
      /** Square inches for ONE cover at the chosen size. */
      sqInPerCover: number;
      covers: number;
      /** e.g. `72" × 42" · 1.5mm` */
      customLabel: string;
    }) => {
      const { product, variant, sqInPerCover, covers, customLabel } = params;
      const quantity = sqInPerCover * covers;

      const line: CartLine = {
        productId: product._id,
        // `customLabel` already encodes the exact size/thickness, so two
        // different (length, width) pairs that happen to share an area
        // (e.g. 72"x42" and 84"x36", both 3024 sq in) still get distinct
        // keys — keying on `sqInPerCover` alone would collide them.
        variantId: `${variant._id}:${customLabel}`,
        realVariantId: variant._id,
        quantity,
        name: product.name,
        slug: product.slug,
        thumbnail: variant.images[0] || product.thumbnail,
        variantName: variant.name,
        // Per-square-inch rate — `price * quantity` (= sq in) is still the
        // correct line total, exactly as the normal per-unit case.
        price: effectivePrice(variant),
        listPrice: variant.price,
        stock: variant.stock,
        customLabel,
        sqInPerCover,
      };

      addLine(line);
      openCart();
    },
    [addLine, openCart],
  );

  const setQuantity = useCallback(
    (productId: string, variantId: string, quantity: number) => {
      setQuantityLocal(productId, variantId, quantity);

      const token = useAuthStore.getState().token;
      if (!token) return;

      const call =
        quantity <= 0
          ? cartApi.removeCartItem(token, productId, variantId)
          : cartApi.updateCartItem(token, productId, variantId, quantity);

      void call.catch((error) => {
        console.error("[cart] server sync failed on quantity change:", error);
      });
    },
    [setQuantityLocal],
  );

  const removeItem = useCallback(
    (productId: string, variantId: string) => {
      removeLocal(productId, variantId);

      const token = useAuthStore.getState().token;
      if (token) {
        void cartApi
          .removeCartItem(token, productId, variantId)
          .catch((error) => {
            console.error("[cart] server sync failed on remove:", error);
          });
      }
      toast.success("Removed from your cart");
    },
    [removeLocal],
  );

  const clear = useCallback(() => {
    clearLocal();
    const token = useAuthStore.getState().token;
    if (token) {
      void cartApi.clearCart(token).catch((error) => {
        console.error("[cart] server sync failed on clear:", error);
      });
    }
  }, [clearLocal]);

  return {
    lines,
    hydrated,
    count: hydrated ? cartCount(lines) : 0,
    subtotal: hydrated ? cartSubtotal(lines) : 0,
    addItem,
    addCustomItem,
    setQuantity,
    removeItem,
    clear,
  };
}
