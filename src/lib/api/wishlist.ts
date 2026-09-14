import { z } from "zod";
import { variantSchema } from "./schemas/product";
import { requestData } from "./client";

/**
 * `GET /wishlist` populates `items[].product` with
 * `name slug thumbnail variants status` — note it includes `status`, unlike
 * the cart populate, so a product archived after being saved can be hidden.
 *
 * Unlike the cart, this endpoint never returns null: with no document the
 * server falls back to `{ user, items: [] }`.
 */
const wishlistProductSchema = z
  .union([
    z.object({
      _id: z.string(),
      name: z.string(),
      slug: z.string(),
      thumbnail: z.string().default(""),
      variants: z.array(variantSchema).default([]),
      status: z.enum(["active", "draft", "archived"]).default("active"),
    }),
    z.string(),
  ])
  .transform((value) => (typeof value === "string" ? null : value));

const wishlistSchema = z.object({
  _id: z.string().nullish(),
  user: z.string().nullish(),
  items: z
    .array(
      z.object({
        product: wishlistProductSchema,
        addedAt: z.string().nullish(),
      }),
    )
    .default([]),
});

export type Wishlist = z.infer<typeof wishlistSchema>;
export type WishlistProduct = NonNullable<
  z.infer<typeof wishlistProductSchema>
>;

export async function getWishlist(token: string): Promise<Wishlist> {
  return requestData("/wishlist", wishlistSchema, {
    token,
    revalidate: false,
  });
}

/** Idempotent server-side — re-adding an existing product is a no-op 200. */
export async function addToWishlist(
  token: string,
  productId: string,
): Promise<void> {
  await requestData("/wishlist", z.unknown(), {
    method: "POST",
    body: { productId },
    token,
    revalidate: false,
  });
}

export async function removeFromWishlist(
  token: string,
  productId: string,
): Promise<void> {
  await requestData(`/wishlist/${encodeURIComponent(productId)}`, z.unknown(), {
    method: "DELETE",
    token,
    revalidate: false,
  });
}
