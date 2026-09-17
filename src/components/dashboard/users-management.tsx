"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldOff, Trash2 } from "lucide-react";
import { deleteUser, getUsers, toggleUserBlocked, updateUserRole } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import type { Profile, UserRole } from "@/lib/api/schemas/user";
import { useSession } from "@/lib/hooks/use-session";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { formatDate } from "@/lib/utils/format";
import { Badge, EmptyState, Skeleton } from "@/components/ui/layout-primitives";
import { FormError } from "@/components/ui/field";

const ROLE_OPTIONS: UserRole[] = ["user", "admin", "superAdmin"];
const ROLE_LABEL: Record<UserRole, string> = {
  user: "Customer",
  admin: "Admin",
  superAdmin: "Super Admin",
};

const PAGE_SIZE = 20;

/**
 * SuperAdmin-only, per the server: `PATCH /users/:id/role`,
 * `PATCH /users/:id/block` and `DELETE /users/:id` all require superAdmin â
 * the sidebar only ever links here for that role, but every mutation below
 * would still 401 for a plain admin regardless, matching the server as the
 * real boundary.
 */
export function UsersManagement() {
  const { token, user: currentUser } = useSession();
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 400);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const result = await getUsers(token, { search: search || undefined, page, limit: PAGE_SIZE });
      setUsers(result.users);
      setTotal(result.total);
      setError(null);
    } catch (caught) {
      console.error("[users] load failed:", caught);
      setUsers([]);
      setError(caught instanceof ApiError ? caught.message : "Could not load users.");
    }
  }, [token, search, page]);

  useEffect(() => {
    // `load` only calls setState after its own internal `await` calls —
    // the standard fetch-on-mount pattern, not the synchronous-setState
    // footgun this rule targets. It cannot see across the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleRoleChange(target: Profile, role: UserRole) {
    if (!token || role === target.role) return;
    setBusyId(target._id);
    try {
      await updateUserRole(token, target._id, role);
      toast.success(`${target.username} is now ${ROLE_LABEL[role]}`);
      await load();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not change role.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleBlock(target: Profile) {
    if (!token) return;
    setBusyId(target._id);
    try {
      const updated = await toggleUserBlocked(token, target._id);
      toast.success(`${target.username} ${updated.isBlocked ? "blocked" : "unblocked"}`);
      await load();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not update this user.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(target: Profile) {
    if (!token) return;
    if (!window.confirm(`Delete ${target.username}? This cannot be undone.`)) return;
    setBusyId(target._id);
    try {
      await deleteUser(token, target._id);
      toast.success(`${target.username} deleted`);
      await load();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not delete this user.");
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => {
            setPage(1);
            setSearchInput(event.target.value);
          }}
          placeholder="Search username, email or phone"
          className="h-10 min-w-56 flex-1 rounded-full border border-line bg-surface px-4 text-sm text-ink placeholder:text-ink-muted focus:border-line-strong focus:outline-none"
        />
        <p className="text-sm text-ink-secondary">{total} users</p>
      </div>

      <FormError message={error} />

      {!users ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState title="No users match this search" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-secondary">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {users.map((target) => {
                const isSelf = target._id === currentUser?._id;
                return (
                  <tr key={target._id} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3">
                      <span className="block text-ink">{target.username}</span>
                      <span className="text-xs text-ink-muted">{target.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`Change role for ${target.username}`}
                        value={target.role}
                        disabled={isSelf || busyId === target._id}
                        onChange={(event) => void handleRoleChange(target, event.target.value as UserRole)}
                        className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={target.isBlocked ? "out" : "success"}>
                        {target.isBlocked ? "Blocked" : "Active"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">{formatDate(target.createdAt)}</td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <span className="text-xs text-ink-muted">You</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleToggleBlock(target)}
                            disabled={busyId === target._id}
                            aria-label={target.isBlocked ? `Unblock ${target.username}` : `Block ${target.username}`}
                            className="grid size-8 place-items-center rounded-full text-ink-secondary transition-colors hover:bg-muted hover:text-ink disabled:opacity-50"
                          >
                            <ShieldOff aria-hidden className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(target)}
                            disabled={busyId === target._id}
                            aria-label={`Delete ${target.username}`}
                            className="grid size-8 place-items-center rounded-full text-ink-secondary transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                          >
                            <Trash2 aria-hidden className="size-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-full px-3.5 py-2 text-sm text-ink transition-colors hover:bg-muted disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-2 py-2 text-sm text-ink-secondary">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-full px-3.5 py-2 text-sm text-ink transition-colors hover:bg-muted disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
