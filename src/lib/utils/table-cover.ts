import type { Variant } from "@/lib/api/schemas/product";
import { effectivePrice } from "./product";

/**
 * Pricing for the Transparent Table Cover custom-size calculator.
 *
 * The server has no concept of an area-priced product: `POST /orders`
 * computes every line as `variant.price * quantity`, full stop (see
 * `server/src/app/modules/order/service.order.ts`). So each thickness
 * variant is seeded with `price` = rate PER SQUARE INCH
 * (`ratePerSqFt / 144`), and this module treats `quantity` as square inches.
 * `variant.price * squareInches` then reproduces the intended per-square-foot
 * price exactly — the server recomputes the identical figure independently,
 * so there is no trust gap and no rounding drift on any whole-inch size.
 *
 * `attributes.ratePerSqFt` (a human-readable string on the variant) is
 * display-only, read here just to render the per-sqft rate on the thickness
 * cards. It has no bearing on what is actually charged — that is always
 * `variant.price`, kept in lockstep with it at seed/admin time.
 */

export const MAX_WIDTH_IN = 48;

/** Whole inches only, matching the calculator's integer inputs. */
export function squareInches(lengthIn: number, widthIn: number): number {
  return Math.round(lengthIn) * Math.round(widthIn);
}

export function squareFeet(lengthIn: number, widthIn: number): number {
  return squareInches(lengthIn, widthIn) / 144;
}

/** The total price for one cover at this size, in this thickness. */
export function priceForVariant(variant: Variant, sqIn: number): number {
  return effectivePrice(variant) * sqIn;
}

/** The human-readable per-square-foot rate from `attributes.ratePerSqFt`. */
export function ratePerSqFt(variant: Variant): number | null {
  const raw = variant.attributes.ratePerSqFt;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isMostPopular(variant: Variant): boolean {
  return variant.attributes.mostPopular === "true";
}

export function thicknessLabel(variant: Variant): string | null {
  return variant.attributes.label ?? null;
}

/** Required, positive, integer-ish, and within the 48" roll width. */
export function validateDimensions(
  lengthIn: number,
  widthIn: number,
): string | null {
  if (!Number.isFinite(lengthIn) || !Number.isFinite(widthIn)) {
    return "Enter a length and width.";
  }
  if (lengthIn <= 0 || widthIn <= 0) {
    return "Length and width must be greater than 0.";
  }
  if (widthIn > MAX_WIDTH_IN) {
    return `Maximum width is ${MAX_WIDTH_IN} inches.`;
  }
  return null;
}

/** A short, human-readable size string for cart lines and order notes. */
export function sizeLabel(
  lengthIn: number,
  widthIn: number,
  variant: Variant,
): string {
  return `${Math.round(lengthIn)}" × ${Math.round(widthIn)}" · ${variant.name}`;
}
