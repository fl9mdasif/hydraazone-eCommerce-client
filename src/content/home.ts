/**
 * Homepage editorial content that is NOT admin-editable: the trust strip,
 * quality banner and feature strip. Edit this file to change any of those;
 * no component needs touching.
 *
 * The hero carousel, the "quick links" promo grid (+ its offer card) and
 * the "Featured Collections" grid used to live here too, but are now
 * admin-editable from the dashboard (Homepage) and served from
 * `GET /homepage` — see `lib/api/homepage.ts` and
 * `lib/api/schemas/homepage.ts` for their shapes and `server/src/app/modules/homepage/`
 * for the storage/defaults.
 *
 * Two rules for anything added here:
 *  1. Every `href` must point at a route that really exists — a seeded
 *     category slug, `/shop`, or a filtered shop URL. A tile linking to a
 *     category that is not in the database is a broken promise.
 *  2. Nothing here invents a product. Products always come from the API.
 *
 * The `image` values are picsum.photos placeholders: obviously disposable
 * development imagery, to be swapped for real photography before go-live.
 */

export type IconName =
  | "truck"
  | "refresh"
  | "wallet"
  | "headset"
  | "award"
  | "tag"
  | "trending"
  | "users"
  // Table-cover calculator feature row.
  | "ruler"
  | "maximize"
  | "gem"
  | "droplet"
  | "thermometer"
  | "sparkles";

export interface FeatureItem {
  id: string;
  icon: IconName;
  title: string;
  body: string;
}

const img = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

/* ------------------------------------------------------------ trust strip */

/**
 * The free-shipping figure is NOT hardcoded — the trust bar reads
 * `freeShippingThreshold` from `GET /settings` and formats it at render time.
 */
export interface TrustItem {
  id: string;
  icon: IconName;
  title: string;
  /** Omitted where the copy is derived from live settings at render time. */
  body?: string;
}

export const trustItems: TrustItem[] = [
  { id: "shipping", icon: "truck", title: "Free shipping" },
  { id: "returns", icon: "refresh", title: "Easy returns", body: "30-day return policy" },
  { id: "cod", icon: "wallet", title: "Cash on delivery", body: "Pay when it arrives" },
  { id: "support", icon: "headset", title: "7 days a week", body: "We're here to help" },
];

/* ------------------------------------------------------- quality + strip */

export const qualityBanner = {
  eyebrow: "About us",
  title: "Quality You Can Trust.",
  body: "We believe in thoughtful design, premium materials, and products that make a real difference to your day.",
  href: "/shop",
  cta: "Learn more",
  image: img("hz-quality", 1400, 500),
  imageAlt: "A calm arrangement of ceramics and folded textiles",
};

export const featureStrip: FeatureItem[] = [
  {
    id: "premium",
    icon: "award",
    title: "Premium Quality",
    body: "Carefully curated premium products.",
  },
  {
    id: "offers",
    icon: "tag",
    title: "Exclusive Offers",
    body: "Deals you don't want to miss.",
  },
  {
    id: "trending",
    icon: "trending",
    title: "Trending Now",
    body: "Stay ahead with what's in demand.",
  },
  {
    id: "customers",
    icon: "users",
    title: "Happy Customers",
    body: "Join thousands of satisfied shoppers.",
  },
];

/* -------------------------------------------------------------- navigation */

/**
 * "Brands" and "Sale" from the reference design are deliberately absent:
 * the server has no brand model, and `discountPrice` is a variant field the
 * list endpoint cannot filter on. Both would need a server change; neither
 * is faked here. Raised in the root CLAUDE.md.
 */
export const primaryNav = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?sort=-createdAt", label: "New in" },
  { href: "/category/home-living", label: "Home & Living" },
  { href: "/category/beauty-care", label: "Beauty" },
  { href: "/category/tableware-collection", label: "Tableware Collection" },
];

export const footerNav = {
  help: [
    { href: "/shop", label: "All products" },
    { href: "/account/orders", label: "Track your order" },
    { href: "/account", label: "Your account" },
  ],
};
