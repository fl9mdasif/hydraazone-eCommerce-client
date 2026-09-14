import Link from "next/link";
import type { Product } from "@/lib/api/schemas/product";
import { ProductCard } from "./product-card";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { EmptyState, Skeleton } from "@/components/ui/layout-primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="No products match your filters"
        description="Try removing a filter or widening the price range."
        action={
          <Button href="/shop" variant="outline" size="sm">
            Clear all filters
          </Button>
        }
      />
    );
  }

  return (
    <Stagger className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <StaggerItem key={product._id}>
          {/* The first row is above the fold on most viewports. */}
          <ProductCard product={product} priority={index < 4} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/**
 * Pagination as links, so a page is shareable and works without JS.
 * `buildHref` keeps every other active filter in the URL.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      <PageLink
        href={buildHref(page - 1)}
        disabled={page <= 1}
        label="Previous page"
      >
        Previous
      </PageLink>

      {pages.map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-ink-muted">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={buildHref(entry)}
            aria-current={entry === page ? "page" : undefined}
            className={cn(
              "grid size-9 place-items-center rounded-full text-sm transition-colors",
              entry === page
                ? "bg-accent text-on-accent"
                : "text-ink hover:bg-muted",
            )}
          >
            {entry}
          </Link>
        ),
      )}

      <PageLink
        href={buildHref(page + 1)}
        disabled={page >= totalPages}
        label="Next page"
      >
        Next
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const classes =
    "rounded-full px-3.5 py-2 text-sm transition-colors text-ink hover:bg-muted";

  if (disabled) {
    return (
      <span aria-disabled className={cn(classes, "opacity-40")}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={classes}>
      {children}
    </Link>
  );
}

/** 1 … 4 [5] 6 … 20 */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const window = new Set<number>([1, totalPages, page]);
  if (page - 1 > 1) window.add(page - 1);
  if (page + 1 < totalPages) window.add(page + 1);

  const sorted = [...window].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  let previous = 0;
  for (const current of sorted) {
    if (previous && current - previous > 1) result.push("gap");
    result.push(current);
    previous = current;
  }
  return result;
}
