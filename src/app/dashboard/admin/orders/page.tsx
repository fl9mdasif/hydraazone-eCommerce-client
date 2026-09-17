import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { OrdersManagement } from "@/components/dashboard/orders-management";

export const metadata: Metadata = {
  title: "Order management",
  robots: { index: false },
};

export default function AdminOrdersPage() {
  return (
    <>
      <Topbar title="Orders" />
      <main className="flex-1 overflow-y-auto p-6">
        <OrdersManagement />
      </main>
    </>
  );
}
