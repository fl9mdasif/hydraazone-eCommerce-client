/**
 * Homepage editorial content.
 *
 * The API has no CMS for hero slides, promo tiles or collection banners, so
 * they live here as typed data. Edit this file to change the homepage; no
 * component needs touching.
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

export interface HeroSlide {
  id: string;
  eyebrow: string;
  /** Split across two lines in the design; keep each line short. */
  headline: string;
  body: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  image: string;
  /** Describes the photograph, not the product. */
  imageAlt: string;
}

export interface PromoTile {
  id: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  image: string;
  imageAlt: string;
}

export interface OfferTile {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}

export interface CollectionTile {
  id: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  image: string;
  imageAlt: string;
}

export type IconName =
  | "truck"
  | "refresh"
  | "wallet"
  | "headset"
  | "award"
  | "tag"
  | "trending"
  | "users";

export interface FeatureItem {
  id: string;
  icon: IconName;
  title: string;
  body: string;
}

const img = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

/* ------------------------------------------------------------------- hero */

export const heroSlides: HeroSlide[] = [
  {
    id: "live-beautifully",
    eyebrow: "New collection",
    headline: "Live Beautifully.\nEvery Day.",
    body: "Curated products for a better lifestyle. Quality, comfort and elegance — all in one place.",
    primary: { href: "/shop", label: "Shop now" },
    secondary: { href: "/category/home-living", label: "Explore collection" },
    image: img("hz-hero-living", 1200, 900),
    imageAlt: "A styled living room corner with a ceramic vase and soft throw",
  },
  {
    id: "made-for-real-life",
    eyebrow: "Home & living",
    headline: "Made for\nReal Life.",
    body: "Hard-wearing pieces that look better with use. Chosen to last, priced to be used.",
    primary: { href: "/category/home-living", label: "Shop home" },
    secondary: { href: "/shop", label: "Browse everything" },
    image: img("hz-hero-kitchen", 1200, 900),
    imageAlt: "Cast iron cookware resting on a warm stone kitchen counter",
  },
  {
    id: "small-upgrades",
    eyebrow: "Beauty & care",
    headline: "Small Upgrades.\nBig Difference.",
    body: "Clean formulations and honest labels, from daily skincare to the details that finish a routine.",
    primary: { href: "/category/beauty-care", label: "Shop beauty" },
    secondary: { href: "/category/health-wellness", label: "Wellness" },
    image: img("hz-hero-beauty", 1200, 900),
    imageAlt: "Amber glass skincare bottles arranged on a neutral surface",
  },
];

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

/* ------------------------------------------------------------ promo tiles */

export const promoTiles: PromoTile[] = [
  {
    id: "new-arrivals",
    title: "New Arrivals",
    body: "The latest pieces to land, fresh off the shelf.",
    href: "/shop?sort=-createdAt",
    cta: "Shop now",
    image: img("hz-promo-new", 600, 700),
    imageAlt: "A leather handbag photographed against a warm neutral backdrop",
  },
  {
    id: "trending",
    title: "Trending Now",
    body: "What everyone has been reaching for this month.",
    href: "/shop?sort=-rating",
    cta: "Shop now",
    image: img("hz-promo-trending", 600, 700),
    imageAlt: "A pair of over-ear headphones on a textured surface",
  },
  {
    id: "best-sellers",
    title: "Best Sellers",
    body: "Customer favourites, rated and reviewed.",
    href: "/shop?sort=-rating",
    cta: "Shop now",
    image: img("hz-promo-best", 600, 700),
    imageAlt: "A glass fragrance bottle catching soft daylight",
  },
];

/** The dark card in the reference design. */
export const offerTile: OfferTile = {
  eyebrow: "Limited time",
  title: "Up to 40% Off",
  body: "On selected items across home, beauty and kitchen.",
  href: "/shop",
  cta: "Shop the sale",
};

/* ------------------------------------------------------------ collections */

export const collections: CollectionTile[] = [
  {
    id: "effortless-essentials",
    title: "Effortless Essentials",
    body: "Light, breathable and made for everyday use.",
    href: "/category/home-living",
    cta: "Shop now",
    image: img("hz-col-essentials", 1000, 800),
    imageAlt: "A low table with a vase and stacked linen in warm daylight",
  },
  {
    id: "home-living",
    title: "Home & Living",
    body: "Designed for the way you live.",
    href: "/category/home-living",
    cta: "Shop now",
    image: img("hz-col-home", 700, 400),
    imageAlt: "Two stoneware vases on a pale shelf",
  },
  {
    id: "beauty-care",
    title: "Beauty & Care",
    body: "Clean, conscious, crafted for you.",
    href: "/category/beauty-care",
    cta: "Shop now",
    image: img("hz-col-beauty", 700, 400),
    imageAlt: "Skincare bottles beside a folded towel",
  },
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
];

export const footerNav = {
  help: [
    { href: "/shop", label: "All products" },
    { href: "/account/orders", label: "Track your order" },
    { href: "/account", label: "Your account" },
  ],
};
