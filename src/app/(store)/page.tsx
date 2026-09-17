import type { Metadata } from "next";
import { getCategoriesSafe } from "@/lib/api/categories";
import { getFeaturedProducts } from "@/lib/api/products";
import { getPublicSettingsSafe } from "@/lib/api/settings";
import { getHomepageContentSafe } from "@/lib/api/homepage";
import { resolveShipping } from "@/lib/api/schemas/settings";
import { Container, SectionHeading } from "@/components/ui/layout-primitives";
import { Hero } from "@/components/home/hero";
import { TrustBar } from "@/components/home/trust-bar";
import { CategoryRail } from "@/components/home/category-rail";
import { PromoTiles } from "@/components/home/promo-tiles";
import { FeaturedCollections } from "@/components/home/featured-collections";
import { BestSellers } from "@/components/home/best-sellers";
import { QualityBanner, FeatureStrip } from "@/components/home/quality-banner";
import { Reveal } from "@/components/motion/reveal";

/** Catalogue-backed and public, so it is prerendered and revalidated. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "HydraaZone — Curated products for a better lifestyle",
  description:
    "Quality, comfort and elegance in one place. Free shipping on larger orders and cash on delivery across Bangladesh.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  /*
   * Three independent fetches in parallel. Each uses a `*Safe` variant, so a
   * failure degrades its own section rather than taking the page down —
   * an empty category rail is survivable, a 500 on the homepage is not.
   */
  const [categories, products, settings, homepage] = await Promise.all([
    getCategoriesSafe(),
    getFeaturedProducts(6),
    getPublicSettingsSafe(),
    getHomepageContentSafe(),
  ]);

  const { freeShippingThreshold } = resolveShipping(settings);

  return (
    <div className="flex flex-col gap-12 pb-4 pt-4 sm:gap-16 sm:pt-6">
      <Container>
        <Hero slides={homepage.heroSlides} />
      </Container>

      <Container>
        <TrustBar freeShippingThreshold={freeShippingThreshold} />
      </Container>

      <Container>
        <CategoryRail categories={categories} />
      </Container>

      <Container>
        <PromoTiles promoTiles={homepage.promoTiles} offerTile={homepage.offerTile} />
      </Container>

      <Container className="flex flex-col gap-5">
        <Reveal>
          <SectionHeading
            title="Featured Collections"
            action={{ href: "/shop", label: "View all collections" }}
          />
        </Reveal>
        <FeaturedCollections collections={homepage.collections} />
      </Container>

      <Container className="flex flex-col gap-6">
        <Reveal>
          <SectionHeading
            title="Best Sellers"
            action={{ href: "/shop", label: "View all products" }}
          />
        </Reveal>
        <BestSellers products={products} />
      </Container>

      <Container>
        <QualityBanner />
      </Container>

      <Container>
        <FeatureStrip />
      </Container>
    </div>
  );
}
