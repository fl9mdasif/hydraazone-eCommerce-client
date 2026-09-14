import {
  categoryListSchema,
  categorySchema,
  type Category,
} from "./schemas/category";
import { requestData, type RequestOptions } from "./client";
import { CATALOG_REVALIDATE } from "./products";

/**
 * `GET /categories` has no pagination and no default active filter, and its
 * server-side default sort key (`order`) does not exist on the schema. So we
 * always pass `isActive` and an explicit sort.
 */
export async function getCategories(
  options: RequestOptions = {},
): Promise<Category[]> {
  return requestData("/categories", categoryListSchema, {
    query: { isActive: true, sort: "name" },
    revalidate: CATALOG_REVALIDATE,
    ...options,
  });
}

/** A failed nav/rail should not take the page down with it. */
export async function getCategoriesSafe(
  options: RequestOptions = {},
): Promise<Category[]> {
  try {
    return await getCategories(options);
  } catch (error) {
    console.error("[api] getCategories failed, rendering empty rail:", error);
    return [];
  }
}

/** Admin listing — includes inactive categories. */
export async function getCategoriesForAdmin(
  token: string,
  options: RequestOptions = {},
): Promise<Category[]> {
  return requestData("/categories", categoryListSchema, {
    query: { sort: "name" },
    token,
    revalidate: false,
    ...options,
  });
}

/** Accepts an ObjectId or a slug. No status filter is applied server-side. */
export async function getCategory(
  idOrSlug: string,
  options: RequestOptions = {},
): Promise<Category> {
  return requestData(
    `/categories/${encodeURIComponent(idOrSlug)}`,
    categorySchema,
    { revalidate: CATALOG_REVALIDATE, ...options },
  );
}

/**
 * Resolves a category slug to its record, or null when it is missing or
 * deactivated.
 *
 * This exists because `GET /products?category=` matches an ObjectId ONLY —
 * never a slug — so `/category/[slug]` is necessarily two calls: resolve the
 * slug here, then list products by the resulting `_id`.
 */
export async function getActiveCategory(
  slug: string,
  options: RequestOptions = {},
): Promise<Category | null> {
  try {
    const category = await getCategory(slug, options);
    return category.isActive ? category : null;
  } catch {
    return null;
  }
}
