"use client";

import { LogOut } from "lucide-react";
import { useSession } from "@/lib/hooks/use-session";

const ROLE_LABEL: Record<string, string> = {
  user: "Customer",
  admin: "Admin",
  superAdmin: "Super Admin",
};

/**
 * The dashboard header: page context, the signed-in identity, sign out.
 *
 * Deliberately NOT the reference mockup's global search bar, date-range
 * picker or notification bell — none of those are backed by anything real
 * (no server-side global search, no notification system exists), and
 * building them as decoration would be exactly the kind of fabrication
 * AGENTS.md rule 4 forbids. The one real per-page control (the revenue
 * chart's period selector) lives on the chart itself, where it actually
 * does something.
 */
export function Topbar({ title }: { title: string }) {
  const { user, signOut } = useSession();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-6">
      <h1 className="font-display text-lg font-medium text-ink">{title}</h1>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex flex-col items-end leading-tight">
            <span className="text-sm font-medium text-ink">{user.username}</span>
            <span className="text-xs text-ink-secondary">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void signOut("/login")}
          aria-label="Sign out"
          className="grid size-9 place-items-center rounded-full text-ink-secondary transition-colors hover:bg-muted hover:text-ink"
        >
          <LogOut aria-hidden className="size-5" />
        </button>
      </div>
    </header>
  );
}
