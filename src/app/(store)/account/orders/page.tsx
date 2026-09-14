import type { Metadata } from "next";
import { AccountShell } from "@/components/account/account-shell";
import { OrdersPanel } from "@/components/account/orders-panel";

export const metadata: Metadata = {
  title: "Your orders",
  robots: { index: false },
};

export default function AccountOrdersPage() {
  return (
    <AccountShell title="Your orders">
      <OrdersPanel />
    </AccountShell>
  );
}
