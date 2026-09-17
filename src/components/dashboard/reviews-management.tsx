"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { getReviewQueue, setReviewStatus } from "@/lib/api/reviews";
import { ApiError } from "@/lib/api/client";
import type { Review, ReviewStatus } from "@/lib/api/schemas/review";
import { useSession } from "@/lib/hooks/use-session";
import { formatDate } from "@/lib/utils/format";
import { Badge, EmptyState, Skeleton, StarRating } from "@/components/ui/layout-primitives";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { SmartImage } from "@/components/ui/smart-image";

const TABS: { value: ReviewStatus | ""; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All" },
];

const STATUS_TONE: Record<ReviewStatus, "neutral" | "sale" | "out" | "success"> = {
  pending: "sale",
  approved: "success",
  rejected: "out",
};

export function ReviewsManagement() {
  const { token } = useSession();
  const [tab, setTab] = useState<ReviewStatus | "">("pending");
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const result = await getReviewQueue(token, {
        status: tab || undefined,
        limit: 50,
      });
      setReviews(result.reviews);
      setError(null);
    } catch (caught) {
      console.error("[reviews] load failed:", caught);
      setReviews([]);
      setError(caught instanceof ApiError ? caught.message : "Could not load reviews.");
    }
  }, [token, tab]);

  useEffect(() => {
    // `load` only calls setState after its own internal `await` calls —
    // the standard fetch-on-mount pattern, not the synchronous-setState
    // footgun this rule targets. It cannot see across the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleModerate(review: Review, status: ReviewStatus) {
    if (!token) return;
    setBusyId(review._id);
    try {
      await setReviewStatus(token, review._id, status);
      toast.success(status === "approved" ? "Review approved" : "Review rejected");
      await load();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not update the review.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 rounded-full border border-line p-1" role="tablist">
        {TABS.map((option) => (
          <button
            key={option.value || "all"}
            type="button"
            role="tab"
            aria-selected={tab === option.value}
            onClick={() => setTab(option.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === option.value ? "bg-accent text-on-accent" : "text-ink-secondary hover:bg-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {!reviews ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : error ? (
        <FormError message={error} />
      ) : reviews.length === 0 ? (
        <EmptyState title="No reviews here" />
      ) : (
        <ul className="flex flex-col gap-4">
          {reviews.map((review) => (
            <li key={review._id} className="rounded-lg border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {review.product?.thumbnail ? (
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                      <SmartImage
                        src={review.product.thumbnail}
                        alt={review.product.name}
                        sizes="44px"
                      />
                    </span>
                  ) : null}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-ink">
                      {review.product?.name || "Product"}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {review.user?.username ?? "Customer"} Â· {formatDate(review.createdAt)}
                    </span>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[review.status]}>{review.status}</Badge>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <StarRating rating={review.rating} size="sm" />
              </div>

              {review.comment ? (
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {review.comment}
                </p>
              ) : null}

              {review.photos.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {review.photos.map((photo) => (
                    <li key={photo} className="relative size-16 overflow-hidden rounded-md bg-muted">
                      <SmartImage src={photo} alt="Review photo" sizes="64px" />
                    </li>
                  ))}
                </ul>
              ) : null}

              {review.status === "pending" ? (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === review._id}
                    onClick={() => void handleModerate(review, "approved")}
                  >
                    <Check aria-hidden className="size-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === review._id}
                    onClick={() => void handleModerate(review, "rejected")}
                  >
                    <X aria-hidden className="size-4" />
                    Reject
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
