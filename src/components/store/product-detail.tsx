"use client";

import { m, AnimatePresence } from "framer-motion";
import { Check, Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/api/schemas/product";
import {
  defaultVariant,
  discountPercent,
  effectivePrice,
  hasDiscount,
  variantInStock,
} from "@/lib/utils/product";
import { formatCurrency, titleCase } from "@/lib/utils/format";
import { useCart } from "@/lib/hooks/use-cart";
import { useWishlistStore } from "@/stores/wishlist";
import { SmartImage } from "@/components/ui/smart-image";
import { Badge, StarRating } from "@/components/ui/layout-primitives";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";
import { DURATION, EASE_OUT, SPRING } from "@/components/motion/tokens";
import { useMotionPreference } from "@/components/motion/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * Product detail: gallery, variant picker, quantity, add to cart.
 *
 * Variant selection drives everything — price, stock, SKU and images — so it
 * is held here rather than split across components. Price and stock live on
 * the variant, never on the product.
 *
 * Signature motion (AGENTS.md section 5): the selected variant pill animates
 * its background between options via a shared `layoutId`, and the add-to-cart
 * button morphs into a checkmark on success.
 */
export function ProductDetail({ product }: { product: Product }) {
  const { animate } = useMotionPreference();
  const { addItem } = useCart();

  const [variantId, setVariantId] = useState(
    () => defaultVariant(product)?._id ?? product.variants[0]?._id ?? "",
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const wishlisted = useWishlistStore((state) =>
    state.productIds.includes(product._id),
  );
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const variant = useMemo(
    () => product.variants.find((candidate) => candidate._id === variantId) ?? null,
    [product.variants, variantId],
  );

  // Variant images take precedence, falling back to the product gallery.
  const images = useMemo(() => {
    const pool = [
      ...(variant?.images ?? []),
      product.thumbnail,
      ...product.gallery,
    ].filter(Boolean);
    return Array.from(new Set(pool));
  }, [variant, product.thumbnail, product.gallery]);

  const [activeImage, setActiveImage] = useState(0);
  const inStock = variant ? variantInStock(variant) : false;
  const maxQuantity = Math.max(1, variant?.stock ?? 1);

  function handleAdd() {
    if (!variant || !inStock) return;
    addItem(product, variant, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  function selectVariant(nextId: string) {
    setVariantId(nextId);
    setQuantity(1);
    setActiveImage(0);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* ---------------------------------------------------------- gallery */}
      <div className="flex flex-col gap-3">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          <AnimatePresence mode="wait">
            <m.div
              key={images[activeImage] ?? "empty"}
              className="absolute inset-0"
              initial={animate ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              exit={animate ? { opacity: 0 } : undefined}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            >
              <SmartImage
                src={images[activeImage]}
                alt={product.name}
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                fallbackLabel={product.name}
              />
            </m.div>
          </AnimatePresence>

          {variant && hasDiscount(variant) ? (
            <div className="absolute left-4 top-4">
              <Badge tone="sale">-{discountPercent(variant)}%</Badge>
            </div>
          ) : null}
        </div>

        {images.length > 1 ? (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <li key={image}>
                <button
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                  aria-current={index === activeImage}
                  className={cn(
                    "relative size-16 shrink-0 overflow-hidden rounded-md bg-muted transition-all duration-200",
                    index === activeImage
                      ? "ring-2 ring-accent"
                      : "ring-1 ring-line hover:ring-line-strong",
                  )}
                >
                  <SmartImage src={image} alt="" sizes="64px" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* ----------------------------------------------------------- detail */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          {product.category ? (
            <p className="text-xs uppercase tracking-[0.16em] text-ink-secondary">
              {product.category.name}
            </p>
          ) : null}

          <h1 className="font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-3xl">
            {product.name}
          </h1>

          {product.reviewCount > 0 ? (
            <StarRating
              rating={product.rating}
              count={product.reviewCount}
              size="md"
            />
          ) : (
            <p className="text-xs text-ink-muted">No reviews yet</p>
          )}
        </div>

        {/* Price rolls rather than swaps when the variant changes. */}
        <div className="flex items-baseline gap-3">
          <AnimatePresence mode="wait">
            <m.span
              key={variant?._id ?? "none"}
              initial={animate ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={animate ? { opacity: 0, y: -6 } : undefined}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
              className="font-display text-2xl font-medium text-ink"
            >
              {variant ? formatCurrency(effectivePrice(variant)) : "—"}
            </m.span>
          </AnimatePresence>

          {variant && hasDiscount(variant) ? (
            <span className="text-base text-ink-muted line-through">
              {formatCurrency(variant.price)}
            </span>
          ) : null}
        </div>

        {/* -------------------------------------------------- variant picker */}
        {product.variants.length > 1 ? (
          <fieldset className="flex flex-col gap-2.5">
            <legend className="text-sm font-medium text-ink">
              Select option
            </legend>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((candidate) => {
                const selected = candidate._id === variantId;
                const available = variantInStock(candidate);

                return (
                  <button
                    key={candidate._id}
                    type="button"
                    onClick={() => selectVariant(candidate._id)}
                    aria-pressed={selected}
                    className={cn(
                      "relative rounded-full px-4 py-2 text-sm transition-colors duration-200",
                      "border",
                      selected
                        ? "border-accent text-on-accent"
                        : "border-line text-ink hover:border-line-strong",
                      !available && "opacity-50",
                    )}
                  >
                    {/*
                      The moving background: one shared layoutId means the
                      pill slides between options instead of popping.
                    */}
                    {selected ? (
                      <m.span
                        layoutId={animate ? "variant-pill" : undefined}
                        className="absolute inset-0 rounded-full bg-accent"
                        transition={SPRING}
                      />
                    ) : null}
                    <span className="relative z-10">
                      {candidate.name}
                      {!available ? " · sold out" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {/* ------------------------------------------------ stock + quantity */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center rounded-full border border-line">
            <QuantityButton
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1}
              label="Decrease quantity"
            >
              <Minus aria-hidden className="size-4" />
            </QuantityButton>

            <span
              className="w-10 text-center text-sm tabular-nums text-ink"
              aria-live="polite"
            >
              {quantity}
            </span>

            <QuantityButton
              onClick={() =>
                setQuantity((value) => Math.min(maxQuantity, value + 1))
              }
              disabled={quantity >= maxQuantity}
              label="Increase quantity"
            >
              <Plus aria-hidden className="size-4" />
            </QuantityButton>
          </div>

          <p className="text-sm text-ink-secondary" aria-live="polite">
            {!variant
              ? "Unavailable"
              : inStock
                ? variant.stock <= 5
                  ? `Only ${variant.stock} left`
                  : "In stock"
                : "Sold out"}
          </p>
        </div>

        {/* -------------------------------------------------- add to cart */}
        <div className="flex gap-3">
          <Magnetic className="flex-1">
            <Button
              onClick={handleAdd}
              size="lg"
              fullWidth
              disabled={!inStock}
              aria-label={`Add ${product.name} to cart`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {added ? (
                  <m.span
                    key="added"
                    initial={animate ? { opacity: 0, scale: 0.9 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={animate ? { opacity: 0, scale: 0.9 } : undefined}
                    transition={{ duration: DURATION.instant, ease: EASE_OUT }}
                    className="inline-flex items-center gap-2"
                  >
                    <Check aria-hidden className="size-4" />
                    Added
                  </m.span>
                ) : (
                  <m.span
                    key="add"
                    initial={animate ? { opacity: 0, scale: 0.9 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={animate ? { opacity: 0, scale: 0.9 } : undefined}
                    transition={{ duration: DURATION.instant, ease: EASE_OUT }}
                    className="inline-flex items-center gap-2"
                  >
                    <ShoppingBag aria-hidden className="size-4" />
                    {inStock ? "Add to cart" : "Sold out"}
                  </m.span>
                )}
              </AnimatePresence>
            </Button>
          </Magnetic>

          <Button
            onClick={() => toggleWishlist(product._id)}
            variant="outline"
            size="lg"
            aria-pressed={wishlisted}
            aria-label={
              wishlisted ? "Remove from wishlist" : "Save to wishlist"
            }
          >
            <Heart
              aria-hidden
              className={cn(
                "size-4 transition-colors",
                wishlisted && "fill-danger text-danger",
              )}
            />
          </Button>
        </div>

        {/* ------------------------------------------------------- details */}
        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <h2 className="text-sm font-medium text-ink">Product details</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-secondary">
            {product.description}
          </p>

          {variant ? (
            <dl className="mt-1 flex flex-col gap-1.5 text-sm">
              <div className="flex gap-2">
                <dt className="text-ink-muted">SKU</dt>
                <dd className="text-ink-secondary">{variant.sku}</dd>
              </div>
              {Object.entries(variant.attributes).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <dt className="text-ink-muted">{titleCase(key)}</dt>
                  <dd className="text-ink-secondary">{value}</dd>
                </div>
              ))}
              {variant.weight ? (
                <div className="flex gap-2">
                  <dt className="text-ink-muted">Weight</dt>
                  <dd className="text-ink-secondary">{variant.weight}g</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function QuantityButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
