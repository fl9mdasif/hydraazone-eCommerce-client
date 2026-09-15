"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/lib/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/ui/field";

/**
 * Login.
 *
 * Error mapping matters here because the server is inconsistent:
 * a wrong password returns 403 (not 401), and an unknown email returns 404
 * with an EMPTY message. Both are shown as one neutral "check your details"
 * message — which is also the right thing to do for account enumeration.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Send the customer back where they were, e.g. /login?next=/checkout
  const next = searchParams.get("next") ?? "/dashboard";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;

    setError(null);
    setPending(true);

    try {
      const session = await login({ email: email.trim(), password });
      setSession(session.user, session.accessToken);
      toast.success(`Welcome back, ${session.user.username}`);
      router.push(next);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.status === 403 || caught.status === 404) {
          setError("That email and password do not match an account.");
        } else if (caught.isRateLimited) {
          // 20 requests / 15 min on auth routes. Never auto-retry.
          setError(caught.message);
        } else {
          setError(caught.message);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <FormError message={error} />

      <Field label="Email" required>
        {(props) => (
          <TextInput
            {...props}
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        )}
      </Field>

      <Field label="Password" required>
        {(props) => (
          <TextInput
            {...props}
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
          />
        )}
      </Field>

      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-ink-secondary">
        New to HydraaZone?{" "}
        <Link href="/register" className="font-medium text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}
