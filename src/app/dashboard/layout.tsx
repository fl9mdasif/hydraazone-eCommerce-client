"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/hooks/use-session";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Skeleton } from "@/components/ui/layout-primitives";

/**
 * Shared shell for every `/dashboard/**` route — user, admin and superAdmin
 * alike. Completely separate from `(store)/layout.tsx`: no storefront
 * header/footer/cart drawer here, this is the operator/account surface.
 *
 * This guard is a UX convenience only, same posture as the account area it
 * replaces (`components/account/account-shell.tsx`) — the server remains
 * the real authorization boundary on every API call underneath it.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrated, isAuthenticated } = useSession();

  const isAdminArea = pathname.startsWith("/dashboard/admin");
  const isSuperAdminArea = pathname.startsWith("/dashboard/superadmin");

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const role = user?.role;

    // Role-scoping: a customer can't reach the operator areas, and a plain
    // admin can't reach the superAdmin-exclusive area. Bounced back to
    // their own landing page rather than shown a dead end.
    if (isAdminArea && role === "user") {
      router.replace("/dashboard/user");
    } else if (isSuperAdminArea && role !== "superAdmin") {
      router.replace(role === "admin" ? "/dashboard/admin" : "/dashboard/user");
    }
  }, [hydrated, isAuthenticated, user, pathname, isAdminArea, isSuperAdminArea, router]);

  if (!hydrated || !isAuthenticated || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-base">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  // The green admin palette (tokens.css `[data-surface="admin"]`) applies
  // only to the operator areas — /dashboard/user and /dashboard/profile
  // stay on the neutral customer-facing palette, since they're self-service
  // surfaces regardless of who's logged in.
  const isOperatorArea = isAdminArea || isSuperAdminArea;

  return (
    <div
      data-surface={isOperatorArea ? "admin" : undefined}
      className="flex min-h-dvh bg-base"
    >
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
