import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { DashboardOverview } from "@/components/dashboard/overview";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false },
};

// Same overview component as /dashboard/admin — admin and superAdmin see
// identical dashboard content, per the confirmed ~95% permission overlap.
// Only the sidebar (Users section) and a handful of write actions differ.
export default function SuperAdminDashboardPage() {
  return (
    <>
      <Topbar title="Dashboard" />
      <main className="flex-1 overflow-y-auto p-6">
        <DashboardOverview />
      </main>
    </>
  );
}
