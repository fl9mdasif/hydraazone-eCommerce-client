import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getActiveCategory } from "@/lib/api/categories";
import { getProductsSafe, type ProductSort } from "@/lib/api/products";
import { Container, Skeleton } from "@/components/ui/layout-primitives";
import { Pagination, ProductGrid } from "@/components/store/product-grid";
import { ShopToolbar } from "@/components/store/shop-toolbar";

export const revalidate = 300;

const PAGE_SIZE = 12;

export async function generateMetadata(
  props: PageProps<"/category/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await getActiveCategory(slug);

  if (!category) return { title: "Category not found" };

  return {
    title: category.metaTitle || category.name,
    description:
      category.metaDescription ||
      category.description ||
      `Shop ${category.name} at HydraaZone.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage(
  props: PageProps<"/category/[slug]">,
) {
  const { slug } = await props.params;
  const params = await props.searchParams;

  /*
   * Two calls, unavoidably: `GET /products?category=` matches an ObjectId
   * only and never a slug, so the slug has to be resolved to a record first.
   */
  const category = await getActiveCategory(slug);
  if (!category) notFound();

  const page = toPositiveInt(params.page) ?? 1;
  const sort = toSort(params.sort);
  const search = toSingle(params.search);
  const minPrice = toPositiveInt(params.minPrice);
  const maxPrice = toPositiveInt(params.maxPrice);

  const { data: products, meta } = await getProductsSafe({
    category: category._id,
    page,
    limit: PAGE_SIZE,
    sort,
    search,
    minPrice,
    maxPrice,
  });

  function buildHref(nextPage: number) {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (sort) query.set("sort", sort);
    if (minPrice) query.set("minPrice", String(minPrice));
    if (maxPrice) query.set("maxPrice", String(maxPrice));
    if (nextPage > 1) query.set("page", String(nextPage));
    const qs = query.toString();
    return qs ? `/category/${category!.slug}?${qs}` : `/category/${category!.slug}`;
  }

  return (
    <Container className="flex flex-col gap-8 py-8 sm:py-12">
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
          <li aria-hidden>/</li>
          <li className="text-ink">{category.name}</li>
        </ol>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
          {category.name}
        </h1>
        {category.description ? (
          <p className="max-w-xl text-sm leading-relaxed text-ink-secondary">
            {category.description}
          </p>
        ) : null}
      </header>

      {/*
        Same toolbar as /shop, minus the category-pills row (redundant here
        — the route itself already scopes to one category). Needs its own
        Suspense boundary because it reads `useSearchParams()`.
      */}
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <ShopToolbar categories={[]} total={meta.total} showCategoryFilter={false} />
      </Suspense>

      <ProductGrid products={products} />

      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        buildHref={buildHref}
      />
    </Container>
  );
}

type Param = string | string[] | undefined;

function toSingle(value: Param): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

function toPositiveInt(value: Param): number | undefined {
  const raw = toSingle(value);
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

const VALID_SORTS: ProductSort[] = [
  "-createdAt",
  "createdAt",
  "name",
  "-name",
  "-rating",
];

function toSort(value: Param): ProductSort | undefined {
  const raw = toSingle(value);
  return VALID_SORTS.find((candidate) => candidate === raw);
}
