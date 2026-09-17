"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

interface SmartImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  /** Set on the LCP image only (the first hero slide). */
  priority?: boolean;
  /** Rendered when there is no src, or the src fails to load. */
  fallbackLabel?: string;
}

/**
 * Every catalogue image goes through here.
 *
 * The brief was to render exactly what the API returns and show a designed
 * placeholder where a record has no image — never a broken image icon, and
 * never an invented stock photo standing in for a real product.
 *
 * Always fills its parent, which must be `relative` and carry the aspect
 * ratio. Reserving the box in the parent is what keeps CLS at zero.
 */
/**
 * imgbb already serves a CDN-hosted, appropriately-sized image — routing it
 * through Next's own optimizer too just adds a second upstream fetch that
 * can time out (`upstream image response timed out`), especially when
 * several of these render at once (a gallery, a variant's image grid).
 * Skipping optimization for this one known-safe host sidesteps that
 * failure mode entirely rather than working around a timeout symptom.
 */
function isPreOptimized(src: string): boolean {
  return src.includes("i.ibb.co");
}

export function SmartImage({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority = false,
  fallbackLabel,
}: SmartImageProps) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  if (showFallback) {
    return (
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-2",
          "bg-muted text-ink-muted select-none",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <span
          aria-hidden
          className="font-display text-2xl font-medium tracking-tight text-warm"
        >
          HZ
        </span>
        {fallbackLabel ? (
          <span className="px-3 text-center text-[0.7rem] leading-tight">
            {fallbackLabel}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={isPreOptimized(src)}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
