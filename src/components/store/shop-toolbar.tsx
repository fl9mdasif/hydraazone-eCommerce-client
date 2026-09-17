"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { PRODUCT_SORT_OPTIONS } from "@/lib/api/products";
import type { Category } from "@/lib/api/schemas/category";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Filters and sort, all reflected into the URL so a filtered view is
 * shareable and the back button works.
 *
 * There is deliberately no "price: low to high" sort. Price lives inside
 * `variants`, and the server hands `sort` straight to Mongoose, so a price
 * sort would silently do nothing. Flagged as a server change rather than
 * faked client-side over a single page of results.
 */
export function ShopToolbar({
  categories,
  total,
  showCategoryFilter = true,
}: {
  categories: Category[];
  total: number;
  showCategoryFilter?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") ?? "";
  const currentCategory = searchParams.get("category") ?? "";
  const currentSort = searchParams.get("sort") ?? "-createdAt";
  const currentMin = searchParams.get("minPrice") ?? "";
  const currentMax = searchParams.get("maxPrice") ?? "";

  const [search, setSearch] = useState(currentSearch);
  const [minPrice, setMinPrice] = useState(currentMin);
  const [maxPrice, setMaxPrice] = useState(currentMax);
  const debouncedSearch = useDebouncedValue(search.trim(), 400);

  function apply(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    // Any filter change returns to the first page.
    params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  // "Type and it fetches" — Enter/submit below still applies instantly, this
  // just catches the common case of someone who stops typing and never
  // hits Enter. `router.push` isn't a React state setter, so nothing here
  // needs to worry about the synchronous-setState-in-effect lint rule.
  useEffect(() => {
    if (debouncedSearch !== currentSearch) {
      apply({ search: debouncedSearch || null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    apply({ search: search.trim() || null });
  }

  function handlePriceSubmit(event: FormEvent) {
    event.preventDefault();
    apply({ minPrice: minPrice || null, maxPrice: maxPrice || null });
  }

  const hasFilters = Boolean(
    currentSearch || currentCategory || currentMin || currentMax,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} role="search" className="min-w-0 flex-1">
          <label htmlFor="shop-search" className="sr-only">
            Search products
          </label>
          <input
            id="shop-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products"
            className="h-10 w-full rounded-full border border-line bg-surface px-4 text-sm text-ink placeholder:text-ink-muted focus:border-line-strong focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2">
          <label htmlFor="shop-sort" className="sr-only">
            Sort products
          </label>
          <select
            id="shop-sort"
            value={currentSort}
            onChange={(event) => apply({ sort: event.target.value })}
            className="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink focus:border-line-strong focus:outline-none"
          >
            {PRODUCT_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form
        onSubmit={handlePriceSubmit}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="min-price" className="text-xs text-ink-secondary">
              Min price
            </label>
            <input
              id="min-price"
              type="number"
              min={0}
              inputMode="numeric"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="0"
              className="h-10 w-24 rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-line-strong focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="max-price" className="text-xs text-ink-secondary">
              Max price
            </label>
            <input
              id="max-price"
              type="number"
              min={0}
              inputMode="numeric"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="Any"
              className="h-10 w-24 rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-line-strong focus:outline-none"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Apply
          </Button>
        </div>

        {hasFilters ? (
          <Button
            onClick={() =>
              apply({
                search: null,
                category: null,
                minPrice: null,
                maxPrice: null,
              })
            }
            variant="ghost"
            size="sm"
          >
            <X aria-hidden className="size-4" />
            Clear filters
          </Button>
        ) : null}

        <p className="ml-auto text-sm text-ink-secondary" aria-live="polite">
          {total} {total === 1 ? "product" : "products"}
        </p>
      </form>

      {showCategoryFilter && categories.length > 0 ? (
        <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <li>
            <button
              type="button"
              onClick={() => apply({ category: null })}
              aria-pressed={!currentCategory}
              className={cn(
                "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-colors",
                !currentCategory
                  ? "border-accent bg-accent text-on-accent"
                  : "border-line text-ink hover:border-line-strong",
              )}
            >
              All
            </button>
          </li>
          {categories.map((category) => (
            <li key={category._id}>
              <button
                type="button"
                onClick={() => apply({ category: category._id })}
                aria-pressed={currentCategory === category._id}
                className={cn(
                  "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-colors",
                  currentCategory === category._id
                    ? "border-accent bg-accent text-on-accent"
                    : "border-line text-ink hover:border-line-strong",
                )}
              >
                {category.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
