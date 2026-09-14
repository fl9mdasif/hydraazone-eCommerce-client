import type { Metadata } from "next";
import { AccountShell } from "@/components/account/account-shell";
import { ProfilePanel } from "@/components/account/profile-panel";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <AccountShell title="Your account">
      <ProfilePanel />
    </AccountShell>
  );
}
