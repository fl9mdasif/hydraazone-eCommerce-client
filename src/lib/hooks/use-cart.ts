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
    setQuantity,
    removeItem,
    clear,
  };
}
