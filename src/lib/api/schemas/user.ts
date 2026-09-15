import { z } from "zod";

export const userRoleSchema = z.enum(["user", "admin", "superAdmin"]);

/**
 * The identity carried in the JWT and returned by login / guest-checkout.
 * Note this is NOT the full user document — it is the `jwtPayload` the server
 * builds in `service.auth.ts`.
 */
export const authUserSchema = z.object({
  _id: z.string(),
  username: z.string(),
  email: z.string(),
  role: userRoleSchema,
});

export const authResponseSchema = z.object({
  user: authUserSchema,
  accessToken: z.string(),
});

/**
 * `GET /users/me` — the server projects out `-password -savedAddresses`.
 *
 * `password` is stripped here as a second line of defence: `POST /auth/register`
 * returns the bcrypt hash because `select: 0` is commented out on the model,
 * and a zod object drops unknown keys, so a hash can never reach React state
 * or a log line through this schema.
 */
export const profileSchema = z.object({
  _id: z.string(),
  username: z.string(),
  email: z.string(),
  contactNumber: z.string().nullish(),
  address: z.string().nullish(),
  profilePicture: z.string().nullish(),
  role: userRoleSchema,
  isBlocked: z.boolean().default(false),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});

/** Sub-document on the user. Every address write returns the FULL array. */
export const savedAddressSchema = z.object({
  _id: z.string(),
  label: z.string().nullish(),
  fullName: z.string(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  district: z.string(),
  postalCode: z.string().nullish(),
  country: z.string().default("Bangladesh"),
  isDefault: z.boolean().default(false),
});

export const savedAddressListSchema = z.array(savedAddressSchema);

/** The server caps saved addresses at 5 and rejects the 6th with a 400. */
export const MAX_SAVED_ADDRESSES = 5;

/**
 * `GET /users` (admin/superAdmin — both roles, despite a stale code comment
 * on the server claiming superAdmin-only). Same `-password -savedAddresses`
 * projection as `profileSchema`, so it's reused as-is for each list item.
 * The envelope is unusual: it uses `createSendResponse`, so pagination sits
 * INSIDE `data`, not in a top-level `meta` like the orders/reviews admin
 * lists.
 */
export const userListResponseSchema = z.object({
  users: z.array(profileSchema).default([]),
  total: z.number().default(0),
  page: z.number().default(1),
  limit: z.number().default(20),
  totalPages: z.number().default(0),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type SavedAddress = z.infer<typeof savedAddressSchema>;
export type UserListResponse = z.infer<typeof userListResponseSchema>;

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "superAdmin";
}
