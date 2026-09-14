import { cartResponseSchema, cartSchema, type Cart } from "./schemas/cart";
import { ApiError, requestData } from "./client";

/**
 * Server cart. Logged-in users only — there is no guest cart server-side,
 * so an anonymous cart lives in the Zustand store and merges up on login.
 *
 * Two quirks handled here:
 *  - `GET /carts` returns `data: null` before the first add.
 *  - Every mutating route 404s with "Cart not found" until a cart document
 *    exists, so removals/clears tolerate a 404 as "already empty".
 */

export async function getCart(token: string): Promise<Cart> {
  return requestData("/carts", cartResponseSchema, {
    token,
    revalidate: false,
  }) as Promise<Cart>;
}

/** Quantity is ADDITIVE server-side, and stock is NOT checked here. */
export async function addToCart(
  token: string,
  payload: { productId: string; variantId: string; quantity: number },
): Promise<Cart> {
  return requestData("/carts", cartSchema, {
    method: "POST",
    body: payload,
    token,
    revalidate: false,
  });
}

/** Quantity is SET, not added. */
export async function updateCartItem(
  token: string,
  productId: string,
  variantId: string,
  quantity: number,
): Promise<Cart> {
  return requestData(
    `/carts/${encodeURIComponent(productId)}/${encodeURIComponent(variantId)}`,
    cartSchema,
    { method: "PATCH", body: { quantity }, token, revalidate: false },
  );
}

export async function removeCartItem(
  token: string,
  productId: string,
  variantId: string,
): Promise<Cart | null> {
  try {
    return await requestData(
      `/carts/${encodeURIComponent(productId)}/${encodeURIComponent(variantId)}`,
      cartSchema,
      { method: "DELETE", token, revalidate: false },
    );
  } catch (error) {
    // No cart document yet means there is nothing to remove.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function clearCart(token: string): Promise<Cart | null> {
  try {
    return await requestData("/carts", cartSchema, {
      method: "DELETE",
      token,
      revalidate: false,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
