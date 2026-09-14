import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Page gutter. One definition so every section lines up vertically. */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

interface SectionHeadingProps {
  title: string;
  /** Optional "View all" affordance on the right, as in the reference design. */
  action?: { href: string; label: string };
  className?: string;
  as?: "h2" | "h3";
}

export function SectionHeading({
  title,
  action,
  className,
  as: Tag = "h2",
}: SectionHeadingProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <Tag className="font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
        {title}
      </Tag>
      {action ? (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm text-ink-secondary transition-colors hover:text-ink"
        >
          {action.label}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5"
          />
        </Link>
      ) : null}
    </div>
  );
}

/** Neutral skeleton block. Pulses via opacity only. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "sale" | "out" | "success";
  className?: string;
}) {
  const TONE = {
    neutral: "bg-surface/90 text-ink",
    sale: "bg-accent text-on-accent",
    out: "bg-inverse/80 text-ink-inverse",
    success: "bg-success-soft text-success",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[0.7rem] font-medium tracking-wide",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Product rating. `rating` is a 0–5 float maintained server-side from the
 * approved review set, so a half-filled star is meaningful and we render it
 * with a clipped overlay rather than rounding.
 */
export function StarRating({
  rating,
  count,
  className,
  size = "sm",
}: {
  rating: number;
  count?: number;
  className?: string;
  size?: "sm" | "md";
}) {
  const clamped = Math.max(0, Math.min(5, rating));
  const percent = (clamped / 5) * 100;
  const starSize = size === "sm" ? "text-xs" : "text-base";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn("relative inline-block leading-none", starSize)}
        role="img"
        aria-label={`Rated ${clamped.toFixed(1)} out of 5`}
      >
        <span aria-hidden className="text-line-strong tracking-[0.1em]">
          ★★★★★
        </span>
        <span
          aria-hidden
          className="absolute inset-0 overflow-hidden text-warm tracking-[0.1em]"
          style={{ width: `${percent}%` }}
        >
          ★★★★★
        </span>
      </span>
      {count !== undefined ? (
        <span className="text-xs text-ink-muted">({count})</span>
      ) : null}
    </div>
  );
}

/** Shown wherever a list legitimately has nothing in it. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line px-6 py-16 text-center",
        className,
      )}
    >
      <p className="font-display text-lg font-medium text-ink">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-ink-secondary">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
