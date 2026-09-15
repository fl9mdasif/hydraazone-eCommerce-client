import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "User management",
  robots: { index: false },
};

export default function SuperAdminUsersPage() {
  return (
    <>
      <Topbar title="User management" />
      <main className="flex-1 overflow-y-auto p-6">
        <ComingSoon section="User management" />
      </main>
    </>
  );
}
