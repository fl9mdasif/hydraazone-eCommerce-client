import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Container, Skeleton } from "@/components/ui/layout-primitives";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your HydraaZone account to track orders and save items.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return (
    <Container className="flex justify-center py-14 sm:py-20">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col gap-2 text-center">
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
            Welcome back
          </h1>
          <p className="text-sm text-ink-secondary">
            Sign in to track your orders and see your saved items.
          </p>
        </div>

        {/*
          `useSearchParams` (for the post-login redirect) needs a Suspense
          boundary or the whole route opts out of prerendering.
        */}
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <LoginForm />
        </Suspense>
      </div>
    </Container>
  );
}
