"use client";

import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { LogOut, Package, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/hooks/use-session";
import { DURATION, EASE_OUT } from "@/components/motion/tokens";
import { useMotionPreference } from "@/components/motion/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * The header's account icon.
 *
 * Signed out, it is a plain link to `/login`. Signed in, it becomes a toggle
 * that opens a small menu with the account link and Sign out — the same
 * click-to-open pattern as the header's Categories dropdown, so the two
 * read as one system rather than two different affordances.
 */
export function AccountMenu() {
  const { user, hydrated, signOut } = useSession();
  const { animate } = useMotionPreference();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click and Escape, same as any menu.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Before hydration we don't yet know if there is a session — render the
  // signed-out link so server and first client render agree, same rule the
  // header already follows for the cart and wishlist counts.
  if (!hydrated || !user) {
    return (
      <Link
        href="/login"
        className="hidden size-10 place-items-center rounded-full text-ink transition-colors hover:bg-muted sm:grid"
        aria-label="Log in"
      >
        <User aria-hidden strokeWidth={1.5} className="size-5" />
      </Link>
    );
  }

  async function handleSignOut() {
    setOpen(false);
    await signOut("/");
  }

  return (
    <div ref={rootRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.username}`}
        className="grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-muted"
      >
        <User aria-hidden strokeWidth={1.5} className="size-5" />
      </button>

      <AnimatePresence>
        {open ? (
          <m.div
            role="menu"
            initial={animate ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={animate ? { opacity: 0, y: 6 } : undefined}
            transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            className="absolute right-0 top-full w-52 pt-3"
          >
            <div className="overflow-hidden rounded-lg border border-line bg-surface py-2 shadow-lift">
              <p className="truncate border-b border-line px-4 pb-2.5 pt-1 text-xs text-ink-secondary">
                Signed in as <span className="text-ink">{user.email}</span>
              </p>

              <MenuLink href="/account" onClick={() => setOpen(false)}>
                <User aria-hidden className="size-4" />
                Your account
              </MenuLink>
              <MenuLink href="/account/orders" onClick={() => setOpen(false)}>
                <Package aria-hidden className="size-4" />
                Your orders
              </MenuLink>

              <button
                type="button"
                role="menuitem"
                onClick={() => void handleSignOut()}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-soft"
              >
                <LogOut aria-hidden className="size-4" />
                Sign out
              </button>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-4 py-2 text-sm text-ink-secondary transition-colors",
        "hover:bg-muted hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
