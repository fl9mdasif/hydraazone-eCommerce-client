"use client";

import { useEffect } from "react";
import { Container } from "@/components/ui/layout-primitives";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary for the storefront.
 *
 * Shows neutral copy only — never `errorDetails` or a stack, which the API
 * does return on failures.
 */
export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[store] route error:", error);
  }, [error]);

  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="font-display text-xl font-medium text-ink">
        Something went wrong
      </h1>
      <p className="max-w-sm text-sm text-ink-secondary">
        We couldn&apos;t load this page. This is usually temporary — please try
        again.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button href="/" variant="outline">
          Go home
        </Button>
      </div>
    </Container>
  );
}
