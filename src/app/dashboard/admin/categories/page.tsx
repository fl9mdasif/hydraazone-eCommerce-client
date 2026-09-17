import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { CategoriesManagement } from "@/components/dashboard/categories-management";

export const metadata: Metadata = {
  title: "Category management",
  robots: { index: false },
};

export default function AdminCategoriesPage() {
  return (
    <>
      <Topbar title="Categories" />
      <main className="flex-1 overflow-y-auto p-6">
        <CategoriesManagement />
      </main>
    </>
  );
}
