import {
  productListSchema,
  productSchema,
  type Product,
  type ProductList,
  type ProductStatus,
} from "./schemas/product";
import { requestData, type RequestOptions } from "./client";

/** Seconds. Catalog data changes rarely; the admin UI revalidates on write. */
export const CATALOG_REVALIDATE = 300;

export interface ProductQuery {
  search?: string;
  /** ObjectId ONLY — the server does not match a category slug here. */
  category?: string;
  status?: ProductStatus;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}

/**
 * `sort` is handed straight to Mongoose. Price lives inside `variants`, so
 * there is no server-side price sort — offering one here would silently sort
 * by nothing. Raised as a server change in the root CLAUDE.md.
 */
export type ProductSort =
  | "-createdAt"
  | "createdAt"
  | "name"
  | "-name"
  | "-rating";

export const PRODUCT_SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "-createdAt", label: "Newest first" },
  { value: "createdAt", label: "Oldest first" },
  { value: "-rating", label: "Top rated" },
  { value: "name", label: "Name (A–Z)" },
  { value: "-name", label: "Name (Z–A)" },
];

const EMPTY_LIST: ProductList = {
  data: [],
  meta: { total: 0, page: 1, limit: 12, totalPages: 0 },
};

function toQuery(query: ProductQuery) {
  return {
    search: query.search,
    category: query.category,
    status: query.status,
    isFeatured: query.isFeatured,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    sort: query.sort,
    page: query.page,
    limit: query.limit,
  };
}

/**
 * Storefront listing. `status: 'active'` is forced because `GET /products`
 * applies NO default status filter — without it, drafts and archived
 * products appear in the shop.
 */
export async function getProducts(
  query: Omit<ProductQuery, "status"> = {},
  options: RequestOptions = {},
): Promise<ProductList> {
  return requestData("/products", productListSchema, {
    query: toQuery({ ...query, status: "active" }),
    revalidate: CATALOG_REVALIDATE,
    ...options,
  });
}

/** Same call, but a failure renders an empty grid instead of killing the page. */
export async function getProductsSafe(
  query: Omit<ProductQuery, "status"> = {},
  options: RequestOptions = {},
): Promise<ProductList> {
  try {
    return await getProducts(query, options);
  } catch (error) {
    console.error("[api] getProducts failed, rendering empty list:", error);
    return EMPTY_LIST;
  }
}

/**
 * Admin listing — may legitimately omit `status` to see drafts and archived.
 * Never call this from a storefront route.
 */
export async function getProductsForAdmin(
  query: ProductQuery,
  token: string,
  options: RequestOptions = {},
): Promise<ProductList> {
  return requestData("/products", productListSchema, {
    query: toQuery(query),
    token,
    revalidate: false,
    ...options,
  });
}

/**
 * Accepts an ObjectId or a slug. Note the server applies no status filter
 * here either, so a draft is publicly fetchable by slug — callers rendering
 * a public page must check `status === 'active'` themselves.
 */
export async function getProduct(
  idOrSlug: string,
  options: RequestOptions = {},
): Promise<Product> {
  return requestData(`/products/${encodeURIComponent(idOrSlug)}`, productSchema, {
    revalidate: CATALOG_REVALIDATE,
    ...options,
  });
}

/** Returns null for a missing product OR one that is not publicly visible. */
export async function getActiveProduct(
  slug: string,
  options: RequestOptions = {},
): Promise<Product | null> {
  try {
    const product = await getProduct(slug, options);
    return product.status === "active" ? product : null;
  } catch {
    return null;
  }
}

/**
 * Homepage "Best Sellers". Prefers admin-flagged featured products and tops
 * the row up with the highest-rated active products when fewer than `limit`
 * are flagged, so the section is never half-empty.
 */
export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  const [featured, topRated] = await Promise.allSettled([
    getProducts({ isFeatured: true, limit }),
    getProducts({ sort: "-rating", limit }),
  ]);

  const primary = featured.status === "fulfilled" ? featured.value.data : [];
  if (primary.length >= limit) return primary.slice(0, limit);

  const filler = topRated.status === "fulfilled" ? topRated.value.data : [];
  const seen = new Set(primary.map((product) => product._id));
  const merged = [...primary];

  for (const product of filler) {
    if (merged.length >= limit) break;
    if (seen.has(product._id)) continue;
    seen.add(product._id);
    merged.push(product);
  }

  return merged;
}
