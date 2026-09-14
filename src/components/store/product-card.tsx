"use client";

import Link from "next/link";
import { m } from "framer-motion";
import { Heart } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/api/schemas/product";
import {
  bestDiscountPercent,
  defaultVariant,
  hasDiscount,
  hoverImage,
  isInStock,
  priceRange,
} from "@/lib/utils/product";
import { formatCurrency, formatPriceRange } from "@/lib/utils/format";
import { useWishlistStore } from "@/stores/wishlist";
import { SmartImage } from "@/components/ui/smart-image";
import { Badge, StarRating } from "@/components/ui/layout-primitives";
import { cn } from "@/lib/utils/cn";
import { DURATION, EASE_OUT, LIFT } from "@/components/motion/tokens";
import { useMotionPreference } from "@/components/motion/use-motion-preference";

/**
 * The signature product card (AGENTS.md section 5): on hover the image
 * cross-fades to the second gallery shot and the whole card lifts.
 *
 * Both moves are opacity/transform only. The image box is a fixed aspect
 * ratio, so nothing here can shift layout.
 */
export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const { animate } = useMotionPreference();

  const wishlisted = useWishlistStore((state) =>
    state.productIds.includes(product._id),
  );
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const variant = defaultVariant(product);
  const range = priceRange(product);
  const secondImage = hoverImage(product);
  const inStock = isInStock(product);
  const discount = bestDiscountPercent(product);

  const showSecond = animate && hovered && Boolean(secondImage);

  return (
    <m.article
      className="group relative flex flex-col"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={animate ? { y: LIFT } : undefined}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
    >
      <Link
        href={`/product/${product.slug}`}
        className="flex flex-col gap-3"
        // The whole card is one link; the wishlist button sits above it.
        aria-label={product.name}
      >
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          <SmartImage
            src={product.thumbnail}
            alt={product.name}
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
            fallbackLabel={product.name}
          />

          {secondImage ? (
            <m.div
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: showSecond ? 1 : 0 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT }}
              aria-hidden
            >
              <SmartImage
                src={secondImage}
                alt=""
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
              />
            </m.div>
          ) : null}

          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
            {discount > 0 ? <Badge tone="sale">-{discount}%</Badge> : null}
            {!inStock ? <Badge tone="out">Sold out</Badge> : null}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm font-medium leading-snug text-ink">
            {product.name}
          </h3>

          <p className="text-sm text-ink">
            {range.hasRange ? (
              formatPriceRange(range.min, range.max)
            ) : (
              <>
                <span className={cn(variant && hasDiscount(variant) && "text-danger")}>
                  {formatCurrency(range.min)}
                </span>
                {variant && hasDiscount(variant) ? (
                  <span className="ml-2 text-ink-muted line-through">
                    {formatCurrency(variant.price)}
                  </span>
                ) : null}
              </>
            )}
          </p>

          {product.reviewCount > 0 ? (
            <StarRating rating={product.rating} count={product.reviewCount} />
          ) : (
            // Reserve the row so cards in a grid stay aligned and the
            // hover lift never nudges neighbours.
            <span className="h-4" aria-hidden />
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={() => toggleWishlist(product._id)}
        aria-label={
          wishlisted
            ? `Remove ${product.name} from your wishlist`
            : `Save ${product.name} to your wishlist`
        }
        aria-pressed={wishlisted}
        className={cn(
          "absolute right-3 top-3 grid size-9 place-items-center rounded-full",
          "bg-surface/90 backdrop-blur transition-colors duration-200",
          "hover:bg-surface",
        )}
      >
        <m.span
          initial={false}
          // A small pop on save, skipped entirely under reduced motion.
          animate={animate ? { scale: wishlisted ? [1, 1.25, 1] : 1 } : undefined}
          transition={{ duration: DURATION.fast, ease: EASE_OUT }}
          className="grid place-items-center"
        >
          <Heart
            aria-hidden
            strokeWidth={1.5}
            className={cn(
              "size-4 transition-colors",
              wishlisted ? "fill-danger text-danger" : "text-ink",
            )}
          />
        </m.span>
      </button>
    </m.article>
  );
}
