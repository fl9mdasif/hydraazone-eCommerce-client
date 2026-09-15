import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { DashboardOverview } from "@/components/dashboard/overview";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false },
};

export default function AdminDashboardPage() {
  return (
    <>
      <Topbar title="Dashboard" />
      <main className="flex-1 overflow-y-auto p-6">
        <DashboardOverview />
      </main>
    </>
  );
}
