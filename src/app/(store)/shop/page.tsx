import type { Metadata } from "next";
import { Suspense } from "react";
import { getProductsSafe, type ProductSort } from "@/lib/api/products";
import { getCategoriesSafe } from "@/lib/api/categories";
import { Container, SectionHeading, Skeleton } from "@/components/ui/layout-primitives";
import { Pagination, ProductGrid } from "@/components/store/product-grid";
import { ShopToolbar } from "@/components/store/shop-toolbar";

export const metadata: Metadata = {
  title: "Shop all products",
  description:
    "Browse the full HydraaZone range. Cash on delivery across Bangladesh.",
  alternates: { canonical: "/shop" },
};

const PAGE_SIZE = 12;

export default async function ShopPage(props: PageProps<"/shop">) {
  const params = await props.searchParams;

  const page = toPositiveInt(params.page) ?? 1;
  const search = toSingle(params.search);
  const category = toSingle(params.category);
  const sort = toSort(params.sort);
  const minPrice = toPositiveInt(params.minPrice);
  const maxPrice = toPositiveInt(params.maxPrice);

  const [{ data: products, meta }, categories] = await Promise.all([
    getProductsSafe({
      page,
      limit: PAGE_SIZE,
      search,
      category,
      sort,
      minPrice,
      maxPrice,
    }),
    getCategoriesSafe(),
  ]);

  function buildHref(nextPage: number) {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (category) query.set("category", category);
    if (sort) query.set("sort", sort);
    if (minPrice) query.set("minPrice", String(minPrice));
    if (maxPrice) query.set("maxPrice", String(maxPrice));
    if (nextPage > 1) query.set("page", String(nextPage));
    const qs = query.toString();
    return qs ? `/shop?${qs}` : "/shop";
  }

  return (
    <Container className="flex flex-col gap-8 py-8 sm:py-12">
      <SectionHeading title={search ? `Results for “${search}”` : "Shop all"} />

      {/*
        `ShopToolbar` needs its own boundary because it reads
        `useSearchParams()`. `ProductGrid` below does NOT — its data is
        already resolved by the `await` above, so a boundary around it could
        never actually suspend; the real loading UI for this route is
        `shop/loading.tsx`, shown during the navigation itself.
      */}
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <ShopToolbar categories={categories} total={meta.total} />
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

/* ------------------------------------------------------------- param utils */

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

/** Never forward an arbitrary sort string — it goes straight to Mongoose. */
function toSort(value: Param): ProductSort | undefined {
  const raw = toSingle(value);
  return VALID_SORTS.find((candidate) => candidate === raw);
}
