import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { ReviewsManagement } from "@/components/dashboard/reviews-management";

export const metadata: Metadata = {
  title: "Review moderation",
  robots: { index: false },
};

export default function AdminReviewsPage() {
  return (
    <>
      <Topbar title="Reviews" />
      <main className="flex-1 overflow-y-auto p-6">
        <ReviewsManagement />
      </main>
    </>
  );
}
