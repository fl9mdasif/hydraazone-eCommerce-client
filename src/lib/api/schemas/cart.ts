import { z } from "zod";
import { variantSchema } from "./product";

/**
 * `GET /carts` populates `items[].product` with `name thumbnail variants slug`
 * — the FULL variants array, so the matching variant (and therefore the
 * price) has to be looked up client-side from `items[].variantId`.
 *
 * Cart items have no `_id` (`{ _id: false }` on the sub-schema), so lists are
 * keyed on the product/variant pair instead.
 */
export const cartProductSchema = z
  .union([
    z.object({
      _id: z.string(),
      name: z.string(),
      slug: z.string(),
      thumbnail: z.string().default(""),
      variants: z.array(variantSchema).default([]),
    }),
    z.string(),
  ])
  .transform((value) => (typeof value === "string" ? null : value));

export const cartItemSchema = z.object({
  product: cartProductSchema,
  variantId: z.string(),
  quantity: z.number(),
});

export const cartSchema = z.object({
  _id: z.string().nullish(),
  user: z.string().nullish(),
  items: z.array(cartItemSchema).default([]),
});

/**
 * `GET /carts` returns `data: null` when the user has never added anything —
 * there is no auto-created empty cart. Normalise that to an empty cart so
 * callers have one shape.
 */
export const cartResponseSchema = cartSchema
  .nullable()
  .transform((cart) => cart ?? { items: [] });

export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = z.infer<typeof cartSchema>;
