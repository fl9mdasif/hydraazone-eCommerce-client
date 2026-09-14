"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import { ChevronDown, Heart, Menu, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { Category } from "@/lib/api/schemas/category";
import { primaryNav } from "@/content/home";
import { cartCount, useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import { useUiStore } from "@/stores/ui";
import { Container } from "@/components/ui/layout-primitives";
import { AccountMenu } from "@/components/layout/account-menu";
import { DURATION, EASE_OUT, SPRING } from "@/components/motion/tokens";
import { useMotionPreference } from "@/components/motion/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * Storefront header.
 *
 * The scroll "condense" is a border + shadow fade, NOT a height change —
 * animating height would trigger layout on every scroll frame and is banned
 * by AGENTS.md section 5. The bar keeps one height throughout.
 *
 * Cart and wishlist counts render only after the persisted stores rehydrate,
 * so the server HTML and the first client render always agree.
 */
export function Header({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { animate } = useMotionPreference();

  const lines = useCartStore((state) => state.lines);
  const cartHydrated = useCartStore((state) => state.hydrated);
  const wishlistIds = useWishlistStore((state) => state.productIds);
  const wishlistHydrated = useWishlistStore((state) => state.hydrated);

  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen);
  const toggleMobileNav = useUiStore((state) => state.toggleMobileNav);
  const closeMobileNav = useUiStore((state) => state.closeMobileNav);
  const openCart = useUiStore((state) => state.openCart);

  const itemCount = cartHydrated ? cartCount(lines) : 0;
  const savedCount = wishlistHydrated ? wishlistIds.length : 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    closeMobileNav();
    router.push(`/shop?search=${encodeURIComponent(trimmed)}`);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-base/90 backdrop-blur",
        "transition-[box-shadow,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "border-b",
        scrolled ? "border-line shadow-card" : "border-transparent",
      )}
    >
      <Container>
        <div className="flex h-[var(--header-h)] items-center gap-3 sm:gap-6">
          <button
            type="button"
            onClick={toggleMobileNav}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
            className="-ml-2 grid size-10 place-items-center rounded-full text-ink lg:hidden"
          >
            {mobileNavOpen ? (
              <X aria-hidden className="size-5" />
            ) : (
              <Menu aria-hidden className="size-5" />
            )}
          </button>

          <Link
            href="/"
            className="font-display text-lg font-semibold uppercase tracking-[0.2em] text-ink"
          >
            HydraaZone
          </Link>

          {/* ------------------------------------------ desktop navigation */}
          <nav
            aria-label="Primary"
            className="hidden items-center gap-6 lg:flex"
          >
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-ink-secondary transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ))}

            {categories.length > 0 ? (
              <div
                className="relative"
                onMouseEnter={() => setCategoriesOpen(true)}
                onMouseLeave={() => setCategoriesOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setCategoriesOpen((open) => !open)}
                  aria-expanded={categoriesOpen}
                  className="inline-flex items-center gap-1 text-sm text-ink-secondary transition-colors hover:text-ink"
                >
                  Categories
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-4 transition-transform duration-200",
                      categoriesOpen && "rotate-180",
                    )}
                  />
                </button>

                <AnimatePresence>
                  {categoriesOpen ? (
                    <m.div
                      initial={animate ? { opacity: 0, y: 6 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      exit={animate ? { opacity: 0, y: 6 } : undefined}
                      transition={{ duration: DURATION.fast, ease: EASE_OUT }}
                      className="absolute left-0 top-full w-56 pt-3"
                    >
                      <ul className="overflow-hidden rounded-lg border border-line bg-surface py-2 shadow-lift">
                        {categories.map((category) => (
                          <li key={category._id}>
                            <Link
                              href={`/category/${category.slug}`}
                              className="block px-4 py-2 text-sm text-ink-secondary transition-colors hover:bg-muted hover:text-ink"
                              onClick={() => setCategoriesOpen(false)}
                            >
                              {category.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </m.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}
          </nav>

          {/* ----------------------------------------------------- search */}
          <form
            onSubmit={handleSearch}
            role="search"
            className="ml-auto hidden min-w-0 flex-1 max-w-xs md:block lg:max-w-sm"
          >
            <label htmlFor="header-search" className="sr-only">
              Search products
            </label>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
              />
              <input
                id="header-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, brands and more"
                className="h-10 w-full rounded-full border border-line bg-surface pl-9 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-line-strong focus:outline-none"
              />
            </div>
          </form>

          {/* ---------------------------------------------------- actions */}
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <AccountMenu />

            <Link
              href="/account/wishlist"
              className="relative grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-muted"
              aria-label={`Wishlist, ${savedCount} ${savedCount === 1 ? "item" : "items"}`}
            >
              <Heart aria-hidden strokeWidth={1.5} className="size-5" />
              <CountBadge value={savedCount} />
            </Link>

            <button
              type="button"
              onClick={openCart}
              className="relative grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-muted"
              aria-label={`Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            >
              <m.span
                key={itemCount}
                // The "weight bump" when something lands in the cart.
                initial={animate && itemCount > 0 ? { scale: 0.8 } : false}
                animate={{ scale: 1 }}
                transition={SPRING}
                className="grid place-items-center"
              >
                <ShoppingBag aria-hidden strokeWidth={1.5} className="size-5" />
              </m.span>
              <CountBadge value={itemCount} />
            </button>
          </div>
        </div>
      </Container>

      {/* ------------------------------------------------- mobile drawer */}
      <AnimatePresence>
        {mobileNavOpen ? (
          <m.nav
            aria-label="Mobile"
            initial={animate ? { opacity: 0, y: -8 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={animate ? { opacity: 0, y: -8 } : undefined}
            transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            className="border-t border-line bg-surface lg:hidden"
          >
            <Container>
              <form onSubmit={handleSearch} role="search" className="py-4 md:hidden">
                <label htmlFor="mobile-search" className="sr-only">
                  Search products
                </label>
                <div className="relative">
                  <Search
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
                  />
                  <input
                    id="mobile-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search products"
                    className="h-11 w-full rounded-full border border-line bg-base pl-9 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-line-strong focus:outline-none"
                  />
                </div>
              </form>

              <ul className="flex flex-col pb-4">
                {primaryNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeMobileNav}
                      className="block py-3 text-sm text-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                {categories.map((category) => (
                  <li key={category._id}>
                    <Link
                      href={`/category/${category.slug}`}
                      onClick={closeMobileNav}
                      className="block py-3 text-sm text-ink-secondary"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Container>
          </m.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function CountBadge({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span
      aria-hidden
      className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.6rem] font-medium leading-4 text-on-accent"
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}
