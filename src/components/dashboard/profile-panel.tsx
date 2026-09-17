"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ChevronDown, Pencil } from "lucide-react";
import { changePassword, getProfile, updateProfile } from "@/lib/api/users";
import { uploadImage } from "@/lib/api/uploads";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import type { Profile } from "@/lib/api/schemas/user";
import { useSession } from "@/lib/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextArea, TextInput } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/layout-primitives";
import { SmartImage } from "@/components/ui/smart-image";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

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
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <ProfileCard profile={profile} token={token} onSaved={setProfile} />
      <PersonalInfoCard profile={profile} token={token} onSaved={setProfile} />
      <SecurityCard />
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  user: "Customer",
  admin: "Admin",
  superAdmin: "Super Admin",
};

/** The avatar + name summary at the top — a display surface, not a form. */
function ProfileCard({
  profile,
  token,
  onSaved,
}: {
  profile: Profile;
  token: string;
  onSaved: (profile: Profile) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image is too large — please use a file under 5MB.");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadImage(file, token);
      const updated = await updateProfile(token, { profilePicture: url });
      onSaved(updated);
      toast.success("Profile picture updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your picture.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-8">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Change profile picture"
        className="group relative size-28 shrink-0 overflow-hidden rounded-full border border-line bg-muted disabled:opacity-70"
      >
        <SmartImage src={profile.profilePicture} alt={profile.username} sizes="112px" />
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-ink/50 text-white transition-opacity",
            uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <Pencil aria-hidden className="size-5" />
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      <div className="flex flex-col items-center gap-0.5 text-center">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-medium text-ink">{profile.username}</span>
          <span className="text-sm text-ink-secondary">{ROLE_LABEL[profile.role] ?? profile.role}</span>
        </div>
        {profile.address ? (
          <span className="text-sm text-ink-muted">{profile.address}</span>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Display-only by default — click Edit to reveal the form. `username`/
 * `contactNumber`/`address` initialise from `profile` only when edit mode
 * opens (not on every render), so a later picture-only update to `profile`
 * never clobbers text the admin is mid-typing.
 */
function PersonalInfoCard({
  profile,
  token,
  onSaved,
}: {
  profile: Profile;
  token: string;
  onSaved: (profile: Profile) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-medium text-ink">Personal Information</h2>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil aria-hidden className="size-3.5" />
            Edit
          </Button>
        ) : null}
      </div>

      {editing ? (
        <PersonalInfoForm
          profile={profile}
          token={token}
          onSaved={(updated) => {
            onSaved(updated);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
          <Row label="Username" value={profile.username} />
          <Row label="Phone" value={profile.contactNumber || "—"} />
          <Row label="Address" value={profile.address || "—"} />
          <Row label="Email" value={profile.email} />
          <Row label="Role" value={ROLE_LABEL[profile.role] ?? profile.role} />
          <Row label="Member since" value={formatDate(profile.createdAt)} />
        </dl>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="truncate text-sm text-ink">{value}</dd>
    </div>
  );
}

function PersonalInfoForm({
  profile,
  token,
  onSaved,
  onCancel,
}: {
  profile: Profile;
  token: string;
  onSaved: (profile: Profile) => void;
  onCancel: () => void;
}) {
  const [username, setUsername] = useState(profile.username);
  const [contactNumber, setContactNumber] = useState(profile.contactNumber ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <FormError message={error} />

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <Field label="Address">
        {(props) => (
          <TextArea {...props} value={address} onChange={(event) => setAddress(event.target.value)} />
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

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Collapsed by default — click "Change password" to reveal the fields.
 * Changing the password sets `passwordChangedAt` server-side, which
 * immediately invalidates the token that made the call — so a success here
 * MUST end the session and send the customer back to login. Anything else
 * leaves them clicking around with a dead token.
 */
function SecurityCard() {
  const { token, signOut } = useSession();
  const [open, setOpen] = useState(false);
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
    <section className="rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <h2 className="font-display text-base font-medium text-ink">Change password</h2>
        <ChevronDown
          aria-hidden
          className={cn("size-4 text-ink-secondary transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-line p-5" noValidate>
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

          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "Updating…" : "Update password"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
