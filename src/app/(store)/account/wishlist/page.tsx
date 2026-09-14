import type { Metadata } from "next";
import { AccountShell } from "@/components/account/account-shell";
import { WishlistPanel } from "@/components/account/wishlist-panel";

export const metadata: Metadata = {
  title: "Your wishlist",
  robots: { index: false },
};

export default function AccountWishlistPage() {
  return (
    <AccountShell title="Your wishlist">
      <WishlistPanel />
    </AccountShell>
  );
}
