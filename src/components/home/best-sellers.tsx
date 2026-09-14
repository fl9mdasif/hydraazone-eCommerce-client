import type { Product } from "@/lib/api/schemas/product";
import { ProductCard } from "@/components/store/product-card";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { EmptyState } from "@/components/ui/layout-primitives";
import { Button } from "@/components/ui/button";

/**
 * The best-sellers grid. Live products only — never placeholder cards.
 *
 * An empty catalogue says so plainly rather than rendering a blank grid,
 * per the Definition of Done.
 */
export function BestSellers({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="No products yet"
        description="Products will appear here as soon as the catalogue is published."
        action={
          <Button href="/shop" variant="outline" size="sm">
            Browse the shop
          </Button>
        }
      />
    );
  }

  return (
    <Stagger className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
      {products.map((product) => (
        <StaggerItem key={product._id}>
          <ProductCard product={product} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
