"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import * as authApi from "@/lib/api/auth";
import { isAdminRole } from "@/lib/api/schemas/user";

/**
 * The one place a session starts and ends.
 *
 * Logging out clears the local guest carts too, so one customer's items can
 * never appear in the next person's session on a shared device.
 */
export function useSession() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const clearCart = useCartStore((state) => state.clear);
  const clearWishlist = useWishlistStore((state) => state.clear);

  const signOut = useCallback(
    async (redirectTo = "/") => {
      await authApi.logout();
      clearSession();
      clearCart();
      clearWishlist();
      router.push(redirectTo);
      router.refresh();
    },
    [clearSession, clearCart, clearWishlist, router],
  );

  return {
    user,
    token,
    hydrated,
    isAuthenticated: Boolean(token),
    isAdmin: isAdminRole(user?.role),
    setSession,
    signOut,
  };
}
