import { z } from "zod";

/**
 * Mirrors `server/src/app/modules/product/model.product.ts`.
 *
 * Deliberately lenient where the server is inconsistent:
 * - `attributes` is a Mongoose Map and is omitted entirely when never set.
 * - `category` comes back populated as `{ _id, name, slug }` on the catalog
 *   endpoints, but is a bare ObjectId string anywhere it was not populated.
 * - `thumbnail` is required by the schema but seed/legacy rows can miss it,
 *   so we tolerate an empty string and let `<ProductImage>` show a fallback.
 */

export const variantSchema = z.object({
  _id: z.string(),
  name: z.string(),
  sku: z.string(),
  price: z.number(),
  discountPrice: z.number().nullish(),
  stock: z.number().default(0),
  weight: z.number().nullish(),
  images: z.array(z.string()).default([]),
  isAvailable: z.boolean().default(true),
  attributes: z.record(z.string(), z.string()).default({}),
});

export const categoryRefSchema = z
  .union([
    z.object({ _id: z.string(), name: z.string(), slug: z.string() }),
    z.string(),
  ])
  .nullish()
  // A non-populated category is only an id, which is useless for rendering.
  // Normalise it to null so callers have one shape to handle.
  .transform((value) =>
    value == null || typeof value === "string" ? null : value,
  );

export const productStatusSchema = z.enum(["active", "draft", "archived"]);

export const productSchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().default(""),
  category: categoryRefSchema,
  tags: z.array(z.string()).default([]),
  thumbnail: z.string().default(""),
  gallery: z.array(z.string()).default([]),
  variants: z.array(variantSchema).default([]),
  rating: z.number().default(0),
  reviewCount: z.number().default(0),
  status: productStatusSchema.default("draft"),
  isFeatured: z.boolean().default(false),
  metaTitle: z.string().nullish(),
  metaDescription: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});

/**
 * `GET /products` is the one endpoint whose payload is double-nested:
 * `json.data.data` is the array and `json.data.meta` the pagination.
 * Unlike the `getSendResponse` endpoints, this meta DOES carry `totalPages`.
 */
export const productListSchema = z.object({
  data: z.array(productSchema).default([]),
  meta: z
    .object({
      total: z.number().default(0),
      page: z.number().default(1),
      limit: z.number().default(12),
      totalPages: z.number().default(0),
    })
    .default({ total: 0, page: 1, limit: 12, totalPages: 0 }),
});

export type Variant = z.infer<typeof variantSchema>;
export type CategoryRef = z.infer<typeof categoryRefSchema>;
export type ProductStatus = z.infer<typeof productStatusSchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductList = z.infer<typeof productListSchema>;
