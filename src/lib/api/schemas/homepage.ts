import { z } from "zod";

/**
 * The homepage's admin-editable content — hero carousel, the 3-card
 * "quick links" grid + its dark offer card, and the "Featured Collections"
 * grid. Canonical shapes now live here (moved out of `content/home.ts`,
 * which used to hardcode all of this) — mirrors
 * `server/src/app/modules/homepage/interface.homepage.ts` exactly.
 */

export const linkRefSchema = z.object({
  href: z.string(),
  label: z.string(),
});

/** Hex strings from `COLOR_PALETTE` below — unset means "use the section's own default colour". */
const colorFields = {
  headingColor: z.string().nullish(),
  bodyColor: z.string().nullish(),
};

export const heroSlideSchema = z.object({
  id: z.string(),
  eyebrow: z.string(),
  headline: z.string(),
  body: z.string(),
  primary: linkRefSchema,
  secondary: linkRefSchema.nullish(),
  image: z.string(),
  imageAlt: z.string(),
  ...colorFields,
});

export const promoTileSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  href: z.string(),
  cta: z.string(),
  image: z.string(),
  imageAlt: z.string(),
  ...colorFields,
});

export const offerTileSchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  body: z.string(),
  href: z.string(),
  cta: z.string(),
  ...colorFields,
});

export const collectionTileSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  href: z.string(),
  cta: z.string(),
  image: z.string(),
  imageAlt: z.string(),
  ...colorFields,
});

export const homepageContentSchema = z.object({
  heroSlides: z.array(heroSlideSchema).default([]),
  promoTiles: z.array(promoTileSchema).default([]),
  offerTile: offerTileSchema,
  collections: z.array(collectionTileSchema).default([]),
});

export type LinkRef = z.infer<typeof linkRefSchema>;
export type HeroSlide = z.infer<typeof heroSlideSchema>;
export type PromoTile = z.infer<typeof promoTileSchema>;
export type OfferTile = z.infer<typeof offerTileSchema>;
export type CollectionTile = z.infer<typeof collectionTileSchema>;
export type HomepageContent = z.infer<typeof homepageContentSchema>;

/**
 * A practical palette for heading/description text — dark neutrals and
 * white for plain legibility, plus the site's own accent and a few common
 * brand-safe tones. Not a full color wheel: these are colors that actually
 * read well as text, not decoration.
 */
export const COLOR_PALETTE: { value: string; label: string }[] = [
  { value: "#111111", label: "Near black" },
  { value: "#3F3F46", label: "Dark gray" },
  { value: "#71717A", label: "Gray" },
  { value: "#FFFFFF", label: "White" },
  { value: "#16A34A", label: "Brand green" },
  { value: "#1E3A5F", label: "Navy" },
  { value: "#7C2D12", label: "Brown" },
  { value: "#9D174D", label: "Maroon" },
  { value: "#B45309", label: "Amber" },
  { value: "#0F766E", label: "Teal" },
];
