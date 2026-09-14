"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { changePassword, getProfile } from "@/lib/api/users";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import type { Profile } from "@/lib/api/schemas/user";
import { useSession } from "@/lib/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/layout-primitives";
import { formatDate } from "@/lib/utils/format";

export function ProfilePanel() {
  const { token, signOut } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    getProfile(token)
      .then((result) => {
        if (!cancelled) setProfile(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // An expired token cannot be refreshed (the server route is broken),
        // so the only correct response is to end the session.
        if (error instanceof ApiError && error.isUnauthorized) {
          void signOut("/login");
          return;
        }
        setLoadError(
          error instanceof ApiError ? error.message : "Could not load profile.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [token, signOut]);

  if (loadError) return <FormError message={loadError} />;
  if (!profile) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-medium text-ink">Details</h2>
        <dl className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 text-sm">
          <Row label="Username" value={profile.username} />
          <Row label="Email" value={profile.email} />
          <Row label="Phone" value={profile.contactNumber || "—"} />
          <Row label="Member since" value={formatDate(profile.createdAt)} />
        </dl>
      </section>

      <ChangePasswordForm />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}

/**
 * Changing the password sets `passwordChangedAt` server-side, which
 * immediately invalidates the token that made the call — so a success here
 * MUST end the session and send the customer back to login. Anything else
 * leaves them clicking around with a dead token.
 */
function ChangePasswordForm() {
  const { token, signOut } = useSession();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token || pending) return;

    setError(null);

    if (newPassword.length < PASSWORD_MIN || newPassword.length > PASSWORD_MAX) {
      setError(`New password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters.`);
      return;
    }

    setPending(true);
    try {
      await changePassword(token, { oldPassword, newPassword });
      toast.success("Password changed. Please sign in again.");
      await signOut("/login");
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(
          caught.status === 401
            ? "Your current password is not correct."
            : caught.message,
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-medium text-ink">
        Change password
      </h2>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5"
        noValidate
      >
        <FormError message={error} />

        <Field label="Current password" required>
          {(props) => (
            <TextInput
              {...props}
              type="password"
              autoComplete="current-password"
              required
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
            />
          )}
        </Field>

        <Field
          label="New password"
          required
          hint={`${PASSWORD_MIN}–${PASSWORD_MAX} characters. You'll be signed out afterwards.`}
        >
          {(props) => (
            <TextInput
              {...props}
              type="password"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          )}
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </section>
  );
}
