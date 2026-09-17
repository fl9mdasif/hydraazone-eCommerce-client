import { z } from "zod";

export const reviewStatusSchema = z.enum(["pending", "approved", "rejected"]);

/** `GET /reviews/product/:id` populates `user` only — product/order stay ids. */
export const reviewAuthorSchema = z
  .union([
    z.object({
      _id: z.string(),
      username: z.string(),
      profilePicture: z.string().nullish(),
    }),
    z.string(),
  ])
  .nullish()
  .transform((value) =>
    value == null || typeof value === "string" ? null : value,
  );

/**
 * `GET /reviews/product/:id` (public) leaves `product` unpopulated — just
 * the id string. `GET /reviews` (admin) populates it as `name slug
 * thumbnail`. Normalise both to the same shape so callers never branch on
 * which endpoint they came from — the same fix already needed for orders'
 * `items[].product`.
 */
export const reviewProductRefSchema = z
  .union([
    z.object({
      _id: z.string(),
      name: z.string(),
      slug: z.string().nullish(),
      thumbnail: z.string().nullish(),
    }),
    z.string(),
    z.null(),
  ])
  .transform((value) => {
    if (value === null) return null;
    return typeof value === "string" ? { _id: value, name: "", slug: null, thumbnail: null } : value;
  });

export const reviewSchema = z.object({
  _id: z.string(),
  user: reviewAuthorSchema,
  product: reviewProductRefSchema,
  order: z.string().nullish(),
  variantId: z.string().nullish(),
  rating: z.number(),
  comment: z.string().nullish(),
  photos: z.array(z.string()).default([]),
  status: reviewStatusSchema.default("pending"),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});

export const reviewListSchema = z.array(reviewSchema);

export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type Review = z.infer<typeof reviewSchema>;

/** Server rules from `validation.review.ts`. */
export const REVIEW_COMMENT_MAX = 2000;
export const REVIEW_PHOTOS_MAX = 6;
