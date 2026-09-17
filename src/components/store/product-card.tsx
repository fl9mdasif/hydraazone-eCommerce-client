"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import { Check, Heart, Plus, ShoppingBasket } from "lucide-react";
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
import { useCart } from "@/lib/hooks/use-cart";
import { useWishlist } from "@/lib/hooks/use-wishlist";
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
  const [buying, setBuying] = useState(false);
  const [added, setAdded] = useState(false);
  const { animate } = useMotionPreference();
  const { addItem } = useCart();
  const router = useRouter();

  const wishlisted = useWishlistStore((state) =>
    state.productIds.includes(product._id),
  );
  const { toggle: toggleWishlist } = useWishlist();

  const variant = defaultVariant(product);
  const range = priceRange(product);
  const secondImage = hoverImage(product);
  const inStock = isInStock(product);
  const discount = bestDiscountPercent(product);

  const showSecond = animate && hovered && Boolean(secondImage);

  // No variant picker on a grid card — buy now with whatever variant
  // renders as the card's own price (the same one `defaultVariant` chose).
  function handleBuyNow(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!variant || !inStock || buying) return;
    setBuying(true);
    addItem(product, variant, 1, { openDrawer: false });
    router.push("/checkout");
  }

  function handleAddToCart(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!variant || !inStock) return;
    addItem(product, variant, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <m.article
      className="group relative flex flex-col"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={animate ? { y: LIFT } : undefined}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
    >
      <Link href={`/product/${product.slug}`} aria-label={product.name}>
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
      </Link>

      {/* Name/price/rating sits beside the wishlist + cart icons, rather
          than the icons floating over the product photo. */}
      <div className="mt-3 flex items-start justify-between gap-2">
        <Link
          href={`/product/${product.slug}`}
          className="flex min-w-0 flex-1 flex-col gap-1.5"
        >
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
        </Link>

        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={() => toggleWishlist(product._id)}
            aria-label={
              wishlisted
                ? `Remove ${product.name} from your wishlist`
                : `Save ${product.name} to your wishlist`
            }
            aria-pressed={wishlisted}
            className="grid size-9 place-items-center rounded-full border border-line transition-colors duration-200 hover:bg-muted"
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

          {inStock ? (
            <button
              type="button"
              onClick={handleAddToCart}
              aria-label={`Add ${product.name} to cart`}
              className="grid size-9 place-items-center rounded-full border border-line transition-colors duration-200 hover:bg-muted"
            >
              <AnimatePresence mode="wait" initial={false}>
                {added ? (
                  <m.span
                    key="added"
                    initial={animate ? { opacity: 0, scale: 0.9 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={animate ? { opacity: 0, scale: 0.9 } : undefined}
                    transition={{ duration: DURATION.instant, ease: EASE_OUT }}
                    className="grid place-items-center"
                  >
                    <Check aria-hidden className="size-4 text-success" />
                  </m.span>
                ) : (
                  <m.span
                    key="add"
                    initial={animate ? { opacity: 0, scale: 0.9 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={animate ? { opacity: 0, scale: 0.9 } : undefined}
                    transition={{ duration: DURATION.instant, ease: EASE_OUT }}
                    className="relative grid place-items-center"
                  >
                    <ShoppingBasket aria-hidden className="size-4 text-ink" />
                    <Plus
                      aria-hidden
                      strokeWidth={3}
                      className="absolute -right-1 -top-1 size-2.5 rounded-full bg-accent text-on-accent"
                    />
                  </m.span>
                )}
              </AnimatePresence>
            </button>
          ) : null}
        </div>
      </div>

      {inStock ? (
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={buying}
          className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-full bg-accent text-xs font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          Buy now
        </button>
      ) : null}
    </m.article>
  );
}
