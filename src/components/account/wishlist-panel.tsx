"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getWishlist, removeFromWishlist } from "@/lib/api/wishlist";
import { getProduct } from "@/lib/api/products";
import { ApiError } from "@/lib/api/client";
import type { Product } from "@/lib/api/schemas/product";
import { useSession } from "@/lib/hooks/use-session";
import { useWishlistStore } from "@/stores/wishlist";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/layout-primitives";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

/**
 * Saved items.
 *
 * `/wishlist` is auth-only, so a guest's saves live in localStorage. Both
 * cases are rendered here: a signed-in customer reads the server list, a
 * guest's local ids are resolved to products individually.
 */
export function WishlistPanel() {
  const { token, isAuthenticated, hydrated } = useSession();
  const localIds = useWishlistStore((state) => state.productIds);
  const removeLocal = useWishlistStore((state) => state.remove);

  const [products, setProducts] = useState<Product[] | null>(null);

  const load = useCallback(async () => {
    if (!hydrated) return;

    if (isAuthenticated && token) {
      try {
        const wishlist = await getWishlist(token);
        // The populate includes `status`, so archived saves are filtered out
        // rather than linking to a page that will 404.
        const items = wishlist.items
          .map((item) => item.product)
          .filter((product) => product && product.status === "active");

        // Resolve to full products so the card can price them properly.
        const resolved = await Promise.all(
          items.map((item) => getProduct(item!.slug).catch(() => null)),
        );
        setProducts(resolved.filter((item): item is Product => item !== null));
        return;
      } catch (error) {
        if (!(error instanceof ApiError && error.isUnauthorized)) {
          console.error("[wishlist] load failed:", error);
        }
      }
    }

    const resolved = await Promise.all(
      localIds.map((id) => getProduct(id).catch(() => null)),
    );
    setProducts(resolved.filter((item): item is Product => item !== null));
  }, [hydrated, isAuthenticated, token, localIds]);

  useEffect(() => {
    // `load` only calls setState after its own internal `await` calls —
    // the standard fetch-on-mount pattern, not the synchronous-setState
    // footgun this rule targets. It can't see across the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleRemove(productId: string) {
    removeLocal(productId);
    setProducts((current) =>
      current ? current.filter((product) => product._id !== productId) : current,
    );

    if (token) {
      try {
        await removeFromWishlist(token, productId);
      } catch (error) {
        console.error("[wishlist] server remove failed:", error);
      }
    }
  }

  if (!products) return <Skeleton className="h-64 w-full" />;

  if (products.length === 0) {
    return (
      <EmptyState
        title="Nothing saved yet"
        description="Tap the heart on any product to save it here for later."
        action={
          <Button href="/shop" size="sm">
            Browse the shop
          </Button>
        }
      />
    );
  }

  return (
    <Stagger className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <StaggerItem key={product._id} className="flex flex-col gap-2">
          <ProductCard product={product} />
          <button
            type="button"
            onClick={() => void handleRemove(product._id)}
            className="inline-flex items-center gap-1.5 self-start text-xs text-ink-muted transition-colors hover:text-danger"
          >
            <Trash2 aria-hidden className="size-3.5" />
            Remove
          </button>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
