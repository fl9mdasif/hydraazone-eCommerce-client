import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Category management",
  robots: { index: false },
};

export default function AdminCategoriesPage() {
  return (
    <>
      <Topbar title="Category management" />
      <main className="flex-1 overflow-y-auto p-6">
        <ComingSoon section="Category management" />
      </main>
    </>
  );
}
