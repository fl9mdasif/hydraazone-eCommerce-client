import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false },
};

export default function SuperAdminSettingsPage() {
  return (
    <>
      <Topbar title="Settings" />
      <main className="flex-1 overflow-y-auto p-6">
        <ComingSoon section="Settings" />
      </main>
    </>
  );
}
