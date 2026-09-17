import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { SettingsManagement } from "@/components/dashboard/settings-management";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false },
};

export default function AdminSettingsPage() {
  return (
    <>
      <Topbar title="Settings" />
      <main className="flex-1 overflow-y-auto p-6">
        <SettingsManagement />
      </main>
    </>
  );
}
