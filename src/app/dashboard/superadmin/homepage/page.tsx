import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { HomepageManagement } from "@/components/dashboard/homepage-management";

export const metadata: Metadata = {
  title: "Homepage",
  robots: { index: false },
};

export default function SuperAdminHomepagePage() {
  return (
    <>
      <Topbar title="Homepage" />
      <main className="flex-1 overflow-y-auto p-6">
        <HomepageManagement />
      </main>
    </>
  );
}
