import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { ProductsManagement } from "@/components/dashboard/products-management";

export const metadata: Metadata = {
  title: "Product management",
  robots: { index: false },
};

export default function AdminProductsPage() {
  return (
    <>
      <Topbar title="Products" />
      <main className="flex-1 overflow-y-auto p-6">
        <ProductsManagement />
      </main>
    </>
  );
}
