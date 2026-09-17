import type { Metadata } from "next";
import { Topbar } from "@/components/dashboard/topbar";
import { UsersManagement } from "@/components/dashboard/users-management";

export const metadata: Metadata = {
  title: "User management",
  robots: { index: false },
};

export default function SuperAdminUsersPage() {
  return (
    <>
      <Topbar title="Users" />
      <main className="flex-1 overflow-y-auto p-6">
        <UsersManagement />
      </main>
    </>
  );
}
