import { z } from "zod";
import {
  profileSchema,
  savedAddressListSchema,
  userListResponseSchema,
  type Profile,
  type SavedAddress,
  type UserListResponse,
  type UserRole,
} from "./schemas/user";
import { requestData } from "./client";

/**
 * `/users` routes. All require a raw token.
 *
 * `GET /users/me` deliberately excludes `savedAddresses` — the address book
 * is a separate call.
 */

export async function getProfile(token: string): Promise<Profile> {
  return requestData("/users/me", profileSchema, {
    token,
    revalidate: false,
  });
}

export interface UpdateProfilePayload {
  username?: string;
  contactNumber?: string;
  address?: string;
  profilePicture?: string;
}

/**
 * The server has no zod schema on this route and `$set`s whatever it is
 * given, so only these four fields are ever sent. A duplicate username
 * returns 409.
 */
export async function updateProfile(
  token: string,
  payload: UpdateProfilePayload,
): Promise<Profile> {
  return requestData("/users/me", profileSchema, {
    method: "PATCH",
    body: payload,
    token,
    revalidate: false,
  });
}

/**
 * IMPORTANT: succeeding here sets `passwordChangedAt`, which immediately
 * invalidates the token that made the call. Callers must clear the auth
 * store and send the user back to login.
 */
export async function changePassword(
  token: string,
  payload: { oldPassword: string; newPassword: string },
): Promise<void> {
  await requestData("/users/me/change-password", z.unknown(), {
    method: "POST",
    body: payload,
    token,
    revalidate: false,
  });
}

/* ------------------------------------------------------------- addresses */

export interface AddressPayload {
  label?: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
}

export async function getAddresses(token: string): Promise<SavedAddress[]> {
  return requestData("/users/addresses", savedAddressListSchema, {
    token,
    revalidate: false,
  });
}

/** Every address write returns the FULL updated array, not the one address. */
export async function addAddress(
  token: string,
  payload: AddressPayload,
): Promise<SavedAddress[]> {
  return requestData("/users/addresses", savedAddressListSchema, {
    method: "POST",
    body: payload,
    token,
    revalidate: false,
  });
}

export async function updateAddress(
  token: string,
  addressId: string,
  payload: Partial<AddressPayload>,
): Promise<SavedAddress[]> {
  return requestData(
    `/users/addresses/${encodeURIComponent(addressId)}`,
    savedAddressListSchema,
    { method: "PATCH", body: payload, token, revalidate: false },
  );
}

export async function setDefaultAddress(
  token: string,
  addressId: string,
): Promise<SavedAddress[]> {
  return requestData(
    `/users/addresses/${encodeURIComponent(addressId)}/default`,
    savedAddressListSchema,
    { method: "PATCH", token, revalidate: false },
  );
}

export async function deleteAddress(
  token: string,
  addressId: string,
): Promise<SavedAddress[]> {
  return requestData(
    `/users/addresses/${encodeURIComponent(addressId)}`,
    savedAddressListSchema,
    { method: "DELETE", token, revalidate: false },
  );
}

/* ---------------------------------------------------------- admin/superAdmin */

/**
 * `GET /users` — both `admin` and `superAdmin` can call this (a server code
 * comment claims superAdmin-only, but the actual `auth()` call allows both;
 * verified against the route source directly).
 */
export async function getUsers(
  token: string,
  query: {
    search?: string;
    role?: UserRole;
    isBlocked?: boolean;
    page?: number;
    limit?: number;
  } = {},
): Promise<UserListResponse> {
  return requestData("/users", userListResponseSchema, {
    query,
    token,
    revalidate: false,
  });
}

/**
 * `PATCH /users/:id/role` — superAdmin only. The server blocks changing
 * your own role (403), and blocks it whether or not this ever gets called
 * on the caller's own id — a UI should never show this action on yourself.
 */
export async function updateUserRole(
  token: string,
  userId: string,
  role: UserRole,
): Promise<Profile> {
  return requestData(`/users/${encodeURIComponent(userId)}/role`, profileSchema, {
    method: "PATCH",
    body: { role },
    token,
    revalidate: false,
  });
}

/**
 * `PATCH /users/:id/block` — superAdmin only. Takes NO body — the server
 * reads the user's current `isBlocked` and flips it, so this is a toggle,
 * not a set-to-value call.
 */
export async function toggleUserBlocked(
  token: string,
  userId: string,
): Promise<Profile> {
  return requestData(`/users/${encodeURIComponent(userId)}/block`, profileSchema, {
    method: "PATCH",
    token,
    revalidate: false,
  });
}

/** `DELETE /users/:id` — superAdmin only. Self-deletion is blocked (403). */
export async function deleteUser(
  token: string,
  userId: string,
): Promise<{ deleted: boolean; userId: string }> {
  return requestData(
    `/users/${encodeURIComponent(userId)}`,
    z.object({ deleted: z.boolean(), userId: z.string() }),
    { method: "DELETE", token, revalidate: false },
  );
}
