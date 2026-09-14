import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { Container } from "@/components/ui/layout-primitives";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create a HydraaZone account to check out faster and track your orders.",
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  return (
    <Container className="flex justify-center py-14 sm:py-20">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col gap-2 text-center">
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
            Create your account
          </h1>
          <p className="text-sm text-ink-secondary">
            You can also check out as a guest — no account needed.
          </p>
        </div>

        <RegisterForm />
      </div>
    </Container>
  );
}
