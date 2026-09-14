import { Container } from "@/components/ui/layout-primitives";
import { Button } from "@/components/ui/button";

/**
 * Not-found boundary for storefront routes, so a missing product or category
 * still renders inside the shell with the header, nav and footer intact
 * rather than dropping the customer onto a bare page.
 */
export default function StoreNotFound() {
  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="font-display text-5xl font-medium tracking-tight text-ink">
        404
      </p>
      <h1 className="font-display text-xl font-medium text-ink">
        We couldn&apos;t find that page
      </h1>
      <p className="max-w-sm text-sm text-ink-secondary">
        The product or page you were looking for may have been removed, or the
        link might be out of date.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Button href="/shop">Browse the shop</Button>
        <Button href="/" variant="outline">
          Go home
        </Button>
      </div>
    </Container>
  );
}
