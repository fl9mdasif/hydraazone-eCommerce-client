"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  login,
  register,
  PASSWORD_MAX,
  PASSWORD_MIN,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/lib/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/ui/field";

/**
 * Registration.
 *
 * `POST /auth/register` issues NO token, so a successful registration is
 * immediately followed by a login call to start the session. `role` is never
 * sent — the server would accept it, which would be self-service privilege
 * escalation.
 */
export function RegisterForm() {
  const router = useRouter();
  const { setSession } = useSession();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  function validate() {
    const errors: Record<string, string> = {};
    if (username.trim().length < 1) errors.username = "Choose a username.";
    if (!email.includes("@")) errors.email = "Enter a valid email address.";
    if (contactNumber.trim().length < 1)
      errors.contactNumber = "We need a phone number for delivery.";
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
      errors.password = `Password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters.`;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;

    setError(null);
    if (!validate()) return;

    setPending(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        contactNumber: contactNumber.trim(),
        password,
      });

      // Register returns no token, so sign in to start the session.
      const session = await login({ email: email.trim(), password });
      setSession(session.user, session.accessToken);
      toast.success("Account created. Welcome to HydraaZone.");
      // Registration always creates role `user` (never sent by this form),
      // so /dashboard's own fan-out lands them at /dashboard/user.
      router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(
          caught.status === 409
            ? "That username or email is already taken."
            : caught.message,
        );
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

      <Field label="Username" required error={fieldErrors.username}>
        {(props) => (
          <TextInput
            {...props}
            name="username"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="yourname"
          />
        )}
      </Field>

      <Field label="Email" required error={fieldErrors.email}>
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

      <Field label="Phone number" required error={fieldErrors.contactNumber}>
        {(props) => (
          <TextInput
            {...props}
            type="tel"
            name="contactNumber"
            autoComplete="tel"
            required
            value={contactNumber}
            onChange={(event) => setContactNumber(event.target.value)}
            placeholder="01XXXXXXXXX"
          />
        )}
      </Field>

      <Field
        label="Password"
        required
        error={fieldErrors.password}
        hint={`${PASSWORD_MIN}–${PASSWORD_MAX} characters.`}
      >
        {(props) => (
          <TextInput
            {...props}
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN}
            maxLength={PASSWORD_MAX}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </Field>

      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-ink-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
