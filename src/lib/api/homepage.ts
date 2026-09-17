import { requestData } from "./client";
import {
  homepageContentSchema,
  type HeroSlide,
  type OfferTile,
  type PromoTile,
  type CollectionTile,
  type HomepageContent,
} from "./schemas/homepage";

/** Matches `products.ts`'s catalog cache window — this changes about as often. */
const HOMEPAGE_REVALIDATE = 300;

export async function getHomepageContent(): Promise<HomepageContent> {
  return requestData("/homepage", homepageContentSchema, {
    revalidate: HOMEPAGE_REVALIDATE,
  });
}

/**
 * Last-known-good content, matching the server model's own schema
 * defaults — used only if `GET /homepage` is completely unreachable, so
 * the homepage degrades to what it looked like before this went
 * database-backed rather than rendering blank.
 */
const FALLBACK_CONTENT: HomepageContent = {
  heroSlides: [
    {
      id: "live-beautifully",
      eyebrow: "New collection",
      headline: "Live Beautifully.\nEvery Day.",
      body: "Curated products for a better lifestyle. Quality, comfort and elegance — all in one place.",
      primary: { href: "/shop", label: "Shop now" },
      secondary: { href: "/category/home-living", label: "Explore collection" },
      image:
        "https://www.morty.com/resources/wp-content/uploads/2020/02/spacejoy-YI2YkyaREHk-unsplash-scaled-e1695671185895.webp",
      imageAlt: "A styled living room corner with a ceramic vase and soft throw",
    },
  ],
  promoTiles: [],
  offerTile: {
    eyebrow: "Limited time",
    title: "Up to 40% Off",
    body: "On selected items across home, beauty and kitchen.",
    href: "/shop",
    cta: "Shop the sale",
  },
  collections: [],
};

/** Same call, but a failure renders the fallback content instead of killing the page. */
export async function getHomepageContentSafe(): Promise<HomepageContent> {
  try {
    return await getHomepageContent();
  } catch (error) {
    console.error("[api] getHomepageContent failed, rendering fallback content:", error);
    return FALLBACK_CONTENT;
  }
}

/**
 * Every field here is a whole-array/whole-object replacement, never a
 * partial array-element patch — matches how `products-management.tsx`
 * already resends the full `gallery`/`variants` arrays on any edit.
 */
export interface UpdateHomepagePayload {
  heroSlides?: HeroSlide[];
  promoTiles?: PromoTile[];
  offerTile?: OfferTile;
  collections?: CollectionTile[];
}

export async function updateHomepageContent(
  token: string,
  payload: UpdateHomepagePayload,
): Promise<HomepageContent> {
  return requestData("/homepage", homepageContentSchema, {
    method: "PATCH",
    body: payload,
    token,
    revalidate: false,
  });
}
