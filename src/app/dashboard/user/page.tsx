import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { OrdersPanel } from "@/components/dashboard/orders-panel";

export const metadata: Metadata = {
  title: "Your orders",
  robots: { index: false },
};

export default function DashboardUserPage() {
  return (
    <>
      <Topbar title="Orders" />
      <main className="flex-1 overflow-y-auto p-6">
        <OrdersPanel />
      </main>
    </>
  );
}
