import { Container, Skeleton } from "@/components/ui/layout-primitives";

export default function CheckoutLoading() {
  return (
    <Container className="flex flex-col gap-6 py-8 sm:py-12">
      <Skeleton className="h-8 w-32" />
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    </Container>
  );
}
