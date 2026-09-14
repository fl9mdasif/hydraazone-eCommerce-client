import type { Product, Variant } from "@/lib/api/schemas/product";

/**
 * Price and stock live on the VARIANT, never on the product. Every price a
 * customer sees is derived here so a card, a PDP and a cart line can never
 * disagree about what something costs.
 */

/** `discountPrice` present means it IS the live price; `price` is struck through. */
export function effectivePrice(variant: Variant): number {
  return variant.discountPrice ?? variant.price;
}

export function hasDiscount(variant: Variant): boolean {
  return (
    variant.discountPrice !== null &&
    variant.discountPrice !== undefined &&
    variant.discountPrice < variant.price
  );
}

export function discountPercent(variant: Variant): number {
  if (!hasDiscount(variant) || variant.price <= 0) return 0;
  return Math.round(((variant.price - variant.discountPrice!) / variant.price) * 100);
}

export function variantInStock(variant: Variant): boolean {
  return variant.isAvailable && variant.stock > 0;
}

/**
 * The variant a product page or card should show first: the cheapest one
 * that is actually buyable, falling back to the cheapest overall so an
 * out-of-stock product still renders a sensible price.
 */
export function defaultVariant(product: Product): Variant | null {
  if (product.variants.length === 0) return null;

  const buyable = product.variants.filter(variantInStock);
  const pool = buyable.length > 0 ? buyable : product.variants;

  return pool.reduce((cheapest, variant) =>
    effectivePrice(variant) < effectivePrice(cheapest) ? variant : cheapest,
  );
}

export function findVariant(
  product: Product,
  variantId: string,
): Variant | null {
  return product.variants.find((variant) => variant._id === variantId) ?? null;
}

export interface PriceRange {
  min: number;
  max: number;
  hasRange: boolean;
}

/** Cards show a range when variants are priced differently. */
export function priceRange(product: Product): PriceRange {
  if (product.variants.length === 0) {
    return { min: 0, max: 0, hasRange: false };
  }

  const prices = product.variants.map(effectivePrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return { min, max, hasRange: min !== max };
}

export function isInStock(product: Product): boolean {
  return product.variants.some(variantInStock);
}

export function totalStock(product: Product): number {
  return product.variants.reduce(
    (sum, variant) => sum + (variant.isAvailable ? variant.stock : 0),
    0,
  );
}

/**
 * The best single discount across a product's variants, for the card badge.
 * Returns 0 when nothing is discounted.
 */
export function bestDiscountPercent(product: Product): number {
  return product.variants.reduce(
    (best, variant) => Math.max(best, discountPercent(variant)),
    0,
  );
}

/**
 * The second image to cross-fade to on card hover. Prefers the product
 * gallery, then the default variant's own images, and returns null when
 * there is nothing to fade to (the card then just lifts).
 */
export function hoverImage(product: Product): string | null {
  const fromGallery = product.gallery.find((src) => src && src !== product.thumbnail);
  if (fromGallery) return fromGallery;

  const variantImage = product.variants
    .flatMap((variant) => variant.images)
    .find((src) => src && src !== product.thumbnail);

  return variantImage ?? null;
}
