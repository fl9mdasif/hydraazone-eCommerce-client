import {
  reviewListSchema,
  reviewSchema,
  type Review,
  type ReviewStatus,
} from "./schemas/review";
import { request, requestData, type PageMeta } from "./client";

/**
 * `GET /reviews/product/:id` is public, approved-only, and one of the three
 * endpoints with a TOP-LEVEL `meta` (page/limit/total, `totalPages` stripped).
 */
export async function getProductReviews(
  productId: string,
  query: { page?: number; limit?: number } = {},
): Promise<{ reviews: Review[]; meta: PageMeta | null }> {
  const { data, meta } = await request(
    `/reviews/product/${encodeURIComponent(productId)}`,
    reviewListSchema,
    { query, revalidate: 120 },
  );
  return { reviews: data, meta };
}

export async function getProductReviewsSafe(
  productId: string,
  query: { page?: number; limit?: number } = {},
): Promise<{ reviews: Review[]; meta: PageMeta | null }> {
  try {
    return await getProductReviews(productId, query);
  } catch (error) {
    console.error("[api] getProductReviews failed:", error);
    return { reviews: [], meta: null };
  }
}

export interface CreateReviewPayload {
  productId: string;
  orderId: string;
  variantId: string;
  /** Integer 1–5. */
  rating: number;
  comment?: string;
  /** Absolute URLs from the upload flow. Max 6. */
  photos?: string[];
}

/**
 * The server accepts this only if the order belongs to the caller, is
 * `delivered`, and contains that product/variant. It returns status
 * `pending`, so the caller must show an "awaiting approval" state rather
 * than optimistically rendering the review.
 */
export async function createReview(
  token: string,
  payload: CreateReviewPayload,
): Promise<Review> {
  return requestData("/reviews", reviewSchema, {
    method: "POST",
    body: payload,
    token,
    revalidate: false,
  });
}

/* ------------------------------------------------------------------ admin */

export async function getReviewQueue(
  token: string,
  query: { status?: ReviewStatus; page?: number; limit?: number } = {},
): Promise<{ reviews: Review[]; meta: PageMeta | null }> {
  const { data, meta } = await request("/reviews", reviewListSchema, {
    query,
    token,
    revalidate: false,
  });
  return { reviews: data, meta };
}

/** Approving recalculates the product's rating from the full approved set. */
export async function setReviewStatus(
  token: string,
  reviewId: string,
  status: ReviewStatus,
): Promise<Review> {
  return requestData(
    `/reviews/${encodeURIComponent(reviewId)}/status`,
    reviewSchema,
    { method: "PATCH", body: { status }, token, revalidate: false },
  );
}
