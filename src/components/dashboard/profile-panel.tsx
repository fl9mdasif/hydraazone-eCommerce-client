"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { changePassword, getProfile, updateProfile } from "@/lib/api/users";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import type { Profile } from "@/lib/api/schemas/user";
import { useSession } from "@/lib/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextArea, TextInput } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/layout-primitives";
import { ImageUploader } from "@/components/ui/image-uploader";
import { formatDate } from "@/lib/utils/format";

/**
 * Shared across every role's sidebar (user/admin/superAdmin) — "my account"
 * is the same concept and the same server calls regardless of who's signed
 * in, so this is one component, not three.
 */
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
  if (!profile || !token) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <ProfileForm profile={profile} token={token} onSaved={setProfile} />
      <ChangePasswordForm />
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  user: "Customer",
  admin: "Admin",
  superAdmin: "Super Admin",
};

/**
 * `username`/`contactNumber`/`address` initialise once from `profile` at
 * mount (a plain `useState` initializer, not an effect) — this component
 * only mounts once `profile` has actually loaded, so there's no derived-
 * state-in-an-effect footgun, and a later picture-only update to `profile`
 * (see `ImageUploader`'s `onSaved`) won't clobber whatever the admin is
 * mid-typing here.
 */
function ProfileForm({
  profile,
  token,
  onSaved,
}: {
  profile: Profile;
  token: string;
  onSaved: (profile: Profile) => void;
}) {
  const [username, setUsername] = useState(profile.username);
  const [contactNumber, setContactNumber] = useState(profile.contactNumber ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const dirty =
    username !== profile.username ||
    contactNumber !== (profile.contactNumber ?? "") ||
    address !== (profile.address ?? "");

  function reset() {
    setUsername(profile.username);
    setContactNumber(profile.contactNumber ?? "");
    setAddress(profile.address ?? "");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending || !dirty) return;

    if (!username.trim()) {
      setError("Username can't be empty.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const updated = await updateProfile(token, {
        username: username.trim(),
        contactNumber: contactNumber.trim(),
        address: address.trim(),
      });
      onSaved(updated);
      toast.success("Profile updated");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.status === 409
            ? "That username is already taken."
            : caught.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-medium text-ink">Details</h2>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-5"
        noValidate
      >
        <FormError message={error} />

        <ImageUploader
          label="Profile picture"
          value={profile.profilePicture ?? ""}
          token={token}
          onChange={async (url) => {
            try {
              const updated = await updateProfile(token, { profilePicture: url });
              onSaved(updated);
              toast.success("Profile picture updated");
            } catch (caught) {
              toast.error(
                caught instanceof ApiError ? caught.message : "Could not save your picture.",
              );
            }
          }}
        />

        <Field label="Username" required>
          {(props) => (
            <TextInput
              {...props}
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          )}
        </Field>

        <Field label="Phone">
          {(props) => (
            <TextInput
              {...props}
              type="tel"
              value={contactNumber}
              onChange={(event) => setContactNumber(event.target.value)}
            />
          )}
        </Field>

        <Field label="Address">
          {(props) => (
            <TextArea
              {...props}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          )}
        </Field>

        {/* Email has no update route server-side — `PATCH /users/me` only
            ever accepts username/contactNumber/address/profilePicture — so
            it stays read-only rather than a button with nothing behind it. */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Email</span>
          <p className="text-sm text-ink-secondary">{profile.email}</p>
          <p className="text-xs text-ink-muted">Used to log in to your account</p>
        </div>

        <dl className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-secondary">Role</dt>
            <dd className="text-ink">{ROLE_LABEL[profile.role] ?? profile.role}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-secondary">Member since</dt>
            <dd className="text-ink">{formatDate(profile.createdAt)}</dd>
          </div>
        </dl>

        <div className="flex gap-2 border-t border-line pt-4">
          <Button type="submit" disabled={pending || !dirty}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="outline" disabled={pending || !dirty} onClick={reset}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
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
