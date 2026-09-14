import { z } from "zod";

/**
 * Mirrors `server/src/app/modules/category/model.category.ts`.
 *
 * `GET /categories` returns a FLAT array at `json.data` — no pagination and
 * no meta — and applies no default active filter, so every storefront call
 * must pass `?isActive=true&sort=name`. The server's own default sort key
 * (`order`) refers to a field that is commented out of the schema.
 */
export const categorySchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullish(),
  isActive: z.boolean().default(true),
  thumbnail: z.string().nullish(),
  metaTitle: z.string().nullish(),
  metaDescription: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});

export const categoryListSchema = z.array(categorySchema);

export type Category = z.infer<typeof categorySchema>;
