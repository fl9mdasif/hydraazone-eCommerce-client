import { Container, Skeleton } from "@/components/ui/layout-primitives";
import { ProductGridSkeleton } from "@/components/store/product-grid";

export default function ShopLoading() {
  return (
    <Container className="flex flex-col gap-8 py-8 sm:py-12">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full" />
      <ProductGridSkeleton />
    </Container>
  );
}
