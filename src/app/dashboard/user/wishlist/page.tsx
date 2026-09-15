import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { WishlistPanel } from "@/components/dashboard/wishlist-panel";

export const metadata: Metadata = {
  title: "Your wishlist",
  robots: { index: false },
};

export default function DashboardWishlistPage() {
  return (
    <>
      <Topbar title="Wishlist" />
      <main className="flex-1 overflow-y-auto p-6">
        <WishlistPanel />
      </main>
    </>
  );
}
