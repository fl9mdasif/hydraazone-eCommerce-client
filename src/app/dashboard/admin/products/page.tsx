import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Product management",
  robots: { index: false },
};

export default function AdminProductsPage() {
  return (
    <>
      <Topbar title="Product management" />
      <main className="flex-1 overflow-y-auto p-6">
        <ComingSoon section="Product management" />
      </main>
    </>
  );
}
