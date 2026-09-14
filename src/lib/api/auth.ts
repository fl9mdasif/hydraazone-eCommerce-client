import { z } from "zod";
import { authResponseSchema, type AuthResponse } from "./schemas/user";
import { requestData } from "./client";

/**
 * Auth endpoints. Three deliberate omissions, each for a verified reason:
 *
 * - No `refreshToken()`. `POST /auth/refresh-token` is broken three ways:
 *   it hangs when the cookie is absent (no `else` branch), it looks the user
 *   up by username against a query that matches on email, and the token it
 *   mints omits `_id`/`email` so the auth middleware rejects it. Sessions end
 *   when the access token expires; the UI re-prompts for login.
 *
 * - `register()` never sends `role`, even though the server's zod schema
 *   accepts it. Exposing it would be a self-service privilege escalation.
 *
 * - No `changePassword()` here. Use `users.changePassword()` — the one on
 *   `/auth` double-nests its payload and returns the pre-update document.
 */

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  /** Server rule: 6–30 characters. */
  password: string;
  contactNumber: string;
}

export interface GuestCheckoutPayload {
  email: string;
  /** Accepted by the server but never stored — the real name reaches the
   *  order through `shippingAddress.fullName`. */
  fullName: string;
  phone: string;
}

/** Server rules from `validation.auth.ts`. */
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 30;

/** The password every guest-checkout account is silently created with. */
export const GUEST_DEFAULT_PASSWORD = "123456";

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return requestData("/auth/login", authResponseSchema, {
    method: "POST",
    body: payload,
    revalidate: false,
  });
}

/**
 * Returns no token — the caller must log in afterwards. The response also
 * contains the bcrypt password hash, which the schema drops on the floor.
 */
export async function register(payload: RegisterPayload): Promise<void> {
  await requestData("/auth/register", z.unknown(), {
    method: "POST",
    body: payload,
    revalidate: false,
  });
}

/**
 * A brand-new email auto-creates an account (password `123456`) and returns
 * a token. An email that already exists throws a 409 — catch
 * `error.isConflict` and swap in an inline login form on the same screen,
 * so the cart is never lost to a redirect.
 */
export async function guestCheckout(
  payload: GuestCheckoutPayload,
): Promise<AuthResponse> {
  return requestData("/auth/guest-checkout", authResponseSchema, {
    method: "POST",
    body: payload,
    revalidate: false,
  });
}

/** Clears the server cookies. The client clears its own store separately. */
export async function logout(): Promise<void> {
  try {
    await requestData("/auth/logout", z.unknown(), {
      method: "POST",
      revalidate: false,
      credentials: "include",
    });
  } catch {
    // Logging out must always succeed locally, even if the call fails.
  }
}
