import type { Review } from "@/lib/api/schemas/review";
import { formatDate } from "@/lib/utils/format";
import { SmartImage } from "@/components/ui/smart-image";
import { StarRating } from "@/components/ui/layout-primitives";
import { Reveal } from "@/components/motion/reveal";

/**
 * Approved reviews only — that is all `GET /reviews/product/:id` returns.
 *
 * Every review here is a verified purchase by construction: the server only
 * accepts a review for a delivered order the reviewer actually owns.
 */
export function ProductReviews({
  reviews,
  rating,
  reviewCount,
}: {
  reviews: Review[];
  rating: number;
  reviewCount: number;
}) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-ink-secondary">
        No reviews yet. Reviews can be left once an order has been delivered.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 rounded-lg bg-muted px-5 py-4">
        <span className="font-display text-3xl font-medium text-ink">
          {rating.toFixed(1)}
        </span>
        <span className="flex flex-col gap-1">
          <StarRating rating={rating} size="md" />
          <span className="text-xs text-ink-secondary">
            Based on {reviewCount} verified{" "}
            {reviewCount === 1 ? "review" : "reviews"}
          </span>
        </span>
      </div>

      <ul className="flex flex-col divide-y divide-line">
        {reviews.map((review, index) => (
          <li key={review._id} className="py-5 first:pt-0">
            <Reveal delay={Math.min(index, 4) * 0.05}>
              <article className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-muted text-xs font-medium text-ink">
                    {(review.user?.username ?? "?").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-ink">
                      {review.user?.username ?? "Verified buyer"}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {formatDate(review.createdAt)}
                    </span>
                  </span>
                  <span className="ml-auto">
                    <StarRating rating={review.rating} />
                  </span>
                </div>

                {review.comment ? (
                  <p className="text-sm leading-relaxed text-ink-secondary">
                    {review.comment}
                  </p>
                ) : null}

                {review.photos.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {review.photos.map((photo) => (
                      <li
                        key={photo}
                        className="relative size-20 overflow-hidden rounded-md bg-muted"
                      >
                        <SmartImage
                          src={photo}
                          alt="Customer photo"
                          sizes="80px"
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            </Reveal>
          </li>
        ))}
      </ul>
    </div>
  );
}
