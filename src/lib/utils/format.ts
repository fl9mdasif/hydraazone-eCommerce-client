/**
 * All currency and date rendering goes through these two helpers so the
 * storefront, the account area and the dashboard never drift apart.
 *
 * The store is COD-only and Bangladesh-only, so the locale is fixed rather
 * than read from the browser — a price must read identically on every device.
 */

const BDT = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Formats BDT with no decimals — Bangladeshi retail prices are whole taka. */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return BDT.format(0);
  }
  return BDT.format(amount);
}

/** A price range for a product whose variants are priced differently. */
export function formatPriceRange(min: number, max: number): string {
  return min === max
    ? formatCurrency(min)
    : `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? DATE.format(date) : "—";
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? DATE_TIME.format(date) : "—";
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "SUMMER SALE" -> "Summer Sale". Used for attribute keys from the API. */
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s\-_])(\w)/g, (_, prefix, char) => prefix + char.toUpperCase())
    .replace(/[_-]/g, " ");
}

/**
 * Product and category slugs are NEVER generated server-side — `slug` is
 * required on create and must match this exact pattern, or the API rejects
 * it. The admin forms in Phase 9 use this to suggest a slug from the name.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Matches the server's slug validation exactly. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}
