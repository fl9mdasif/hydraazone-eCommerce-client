import { Container, Skeleton } from "@/components/ui/layout-primitives";

export default function ProductLoading() {
  return (
    <Container className="flex flex-col gap-12 py-6 sm:py-10">
      <Skeleton className="h-4 w-48" />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </Container>
  );
}
