import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { ProfilePanel } from "@/components/dashboard/profile-panel";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false },
};

export default function DashboardProfilePage() {
  return (
    <>
      <Topbar title="Profile" />
      <main className="flex-1 overflow-y-auto p-6">
        <ProfilePanel />
      </main>
    </>
  );
}
