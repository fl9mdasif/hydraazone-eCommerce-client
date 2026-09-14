import { Container, Skeleton } from "@/components/ui/layout-primitives";
import { ProductGridSkeleton } from "@/components/store/product-grid";

export default function CategoryLoading() {
  return (
    <Container className="flex flex-col gap-8 py-8 sm:py-12">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-56" />
      <ProductGridSkeleton />
    </Container>
  );
}
