"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import * as authApi from "@/lib/api/auth";
import { isAdminRole, type AuthUser } from "@/lib/api/schemas/user";
import { mergeGuestCartToServer } from "@/lib/hooks/use-cart";
import { mergeGuestWishlistToServer } from "@/lib/hooks/use-wishlist";

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
  const setSessionRaw = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const clearCart = useCartStore((state) => state.clear);
  const clearWishlist = useWishlistStore((state) => state.clear);

  /*
   * Every login path — normal sign-in, register→login, and both branches
   * of the checkout guest flow — funnels through this single function, so
   * the guest cart → server cart merge (§3.4: "On login or successful
   * guest checkout, merge the local cart into the server cart, then treat
   * the server as the source of truth") happens exactly once, in exactly
   * one place, rather than needing to be remembered at every call site.
   * Fire-and-forget: never blocks the redirect/submit that follows it.
   */
  const setSession = useCallback(
    (nextUser: AuthUser, nextToken: string) => {
      setSessionRaw(nextUser, nextToken);
      void mergeGuestCartToServer(nextToken);
      void mergeGuestWishlistToServer(nextToken);
    },
    [setSessionRaw],
  );

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
