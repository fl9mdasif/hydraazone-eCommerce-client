"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/hooks/use-session";
import { Skeleton } from "@/components/ui/layout-primitives";

/**
 * The single post-login landing target for every role. Centralizes the
 * RBAC fan-out here instead of branching inside login-form.tsx/
 * register-form.tsx, which only need to know "go to /dashboard".
 *
 * The parent layout's own guard already handles the unauthenticated case,
 * so this only needs to handle "authenticated, which way do they go".
 */
export default function DashboardIndexPage() {
  const router = useRouter();
  const { user, hydrated } = useSession();

  useEffect(() => {
    if (!hydrated || !user) return;

    if (user.role === "superAdmin") router.replace("/dashboard/superadmin");
    else if (user.role === "admin") router.replace("/dashboard/admin");
    else router.replace("/dashboard/user");
  }, [hydrated, user, router]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Skeleton className="h-8 w-48" />
    </div>
  );
}
