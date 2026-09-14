"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/hooks/use-session";
import { Container, Skeleton } from "@/components/ui/layout-primitives";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/account", label: "Profile" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/wishlist", label: "Wishlist" },
];

/**
 * Guard + nav for the account area.
 *
 * The token lives in localStorage, so nothing can be decided until the auth
 * store rehydrates — redirecting before then would bounce a logged-in
 * customer straight back to login.
 *
 * This is a convenience boundary only. The server is the real one: every
 * `/users`, `/orders` and `/wishlist` route authorises on its own.
 */
export function AccountShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, hydrated, user, signOut } = useSession();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, isAuthenticated, router, pathname]);

  if (!hydrated || !isAuthenticated) {
    return (
      <Container className="flex flex-col gap-4 py-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
            {title}
          </h1>
          {user ? (
            <p className="text-sm text-ink-secondary">
              Signed in as {user.email}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:bg-muted"
        >
          <LogOut aria-hidden className="size-4" />
          Sign out
        </button>
      </div>

      <nav aria-label="Account">
        <ul className="flex gap-1 border-b border-line">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "-mb-px inline-block border-b-2 px-4 py-2.5 text-sm transition-colors",
                    active
                      ? "border-accent text-ink"
                      : "border-transparent text-ink-secondary hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {children}
    </Container>
  );
}
