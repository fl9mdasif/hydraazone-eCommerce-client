import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Order management",
  robots: { index: false },
};

export default function SuperAdminOrdersPage() {
  return (
    <>
      <Topbar title="Order management" />
      <main className="flex-1 overflow-y-auto p-6">
        <ComingSoon section="Order management" />
      </main>
    </>
  );
}
