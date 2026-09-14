import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveProduct, getProducts } from "@/lib/api/products";
import { getProductReviewsSafe } from "@/lib/api/reviews";
import { defaultVariant, effectivePrice, isInStock } from "@/lib/utils/product";
import { Container, SectionHeading } from "@/components/ui/layout-primitives";
import { ProductDetail } from "@/components/store/product-detail";
import { ProductReviews } from "@/components/store/product-reviews";
import { ProductCard } from "@/components/store/product-card";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Reveal } from "@/components/motion/reveal";

export const revalidate = 300;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.hydraazone.com";

export async function generateMetadata(
  props: PageProps<"/product/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getActiveProduct(slug);

  if (!product) return { title: "Product not found" };

  const title = product.metaTitle || product.name;
  const description =
    product.metaDescription || product.description.slice(0, 155);

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: product.thumbnail ? [{ url: product.thumbnail }] : undefined,
    },
  };
}

export default async function ProductPage(props: PageProps<"/product/[slug]">) {
  const { slug } = await props.params;

  /*
   * `getActiveProduct` returns null for a missing product AND for one that
   * is not `active` — the server applies no status filter on this route, so
   * a draft would otherwise be publicly reachable by slug.
   */
  const product = await getActiveProduct(slug);
  if (!product) notFound();

  const [{ reviews }, related] = await Promise.all([
    getProductReviewsSafe(product._id, { limit: 10 }),
    product.category
      ? getProducts({ category: product.category._id, limit: 6 }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const relatedProducts =
    related?.data.filter((candidate) => candidate._id !== product._id).slice(0, 5) ??
    [];

  const variant = defaultVariant(product);

  /* Product JSON-LD. Price comes from the variant, never the product. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: [product.thumbnail, ...product.gallery].filter(Boolean),
    sku: variant?.sku,
    category: product.category?.name,
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/product/${product.slug}`,
      priceCurrency: "BDT",
      price: variant ? effectivePrice(variant) : 0,
      availability: isInStock(product)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Server-rendered from our own validated data, not user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container className="flex flex-col gap-12 py-6 sm:gap-16 sm:py-10">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-secondary">
            <li>
              <Link href="/" className="hover:text-ink">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/shop" className="hover:text-ink">
                Shop
              </Link>
            </li>
            {product.category ? (
              <>
                <li aria-hidden>/</li>
                <li>
                  <Link
                    href={`/category/${product.category.slug}`}
                    className="hover:text-ink"
                  >
                    {product.category.name}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden>/</li>
            <li className="text-ink">{product.name}</li>
          </ol>
        </nav>

        <ProductDetail product={product} />

        <section className="flex flex-col gap-5">
          <Reveal>
            <SectionHeading title="Reviews" />
          </Reveal>
          <ProductReviews
            reviews={reviews}
            rating={product.rating}
            reviewCount={product.reviewCount}
          />
        </section>

        {relatedProducts.length > 0 ? (
          <section className="flex flex-col gap-6">
            <Reveal>
              <SectionHeading
                title="You might also like"
                action={
                  product.category
                    ? {
                        href: `/category/${product.category.slug}`,
                        label: "View category",
                      }
                    : undefined
                }
              />
            </Reveal>
            <Stagger className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
              {relatedProducts.map((related) => (
                <StaggerItem key={related._id}>
                  <ProductCard product={related} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        ) : null}
      </Container>
    </>
  );
}
