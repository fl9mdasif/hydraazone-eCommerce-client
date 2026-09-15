import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Review moderation",
  robots: { index: false },
};

export default function SuperAdminReviewsPage() {
  return (
    <>
      <Topbar title="Review moderation" />
      <main className="flex-1 overflow-y-auto p-6">
        <ComingSoon section="Review moderation" />
      </main>
    </>
  );
}
