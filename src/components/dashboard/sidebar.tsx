"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  Package,
  Tags,
  Star,
  Settings,
  Users,
  UserCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { UserRole } from "@/lib/api/schemas/user";
import { useDashboardUiStore } from "@/stores/dashboard-ui";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * One role-aware sidebar, not three separate components — the nav content
 * differs per role but the shell/motion/active-state logic doesn't.
 *
 * Every role's list ends with Profile — the one item Asif specifically
 * called out as common across all three, not just the customer role.
 */
function navFor(role: UserRole): NavItem[] {
  if (role === "user") {
    return [
      { href: "/dashboard/user", label: "Orders", icon: ShoppingBag },
      { href: "/dashboard/user/wishlist", label: "Wishlist", icon: Heart },
      { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
    ];
  }

  const base = role === "superAdmin" ? "/dashboard/superadmin" : "/dashboard/admin";

  const shared: NavItem[] = [
    { href: base, label: "Dashboard", icon: LayoutDashboard },
    { href: `${base}/orders`, label: "Orders", icon: ShoppingBag },
    { href: `${base}/products`, label: "Products", icon: Package },
    { href: `${base}/categories`, label: "Categories", icon: Tags },
    { href: `${base}/reviews`, label: "Reviews", icon: Star },
  ];

  if (role === "superAdmin") {
    shared.push({ href: `${base}/users`, label: "Users", icon: Users });
  }

  shared.push({ href: `${base}/settings`, label: "Settings", icon: Settings });
  shared.push({ href: "/dashboard/profile", label: "Profile", icon: UserCircle });

  return shared;
}

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = navFor(role);

  const collapsed = useDashboardUiStore((state) => state.collapsed);
  const toggleSidebar = useDashboardUiStore((state) => state.toggleSidebar);

  return (
    <nav
      aria-label="Dashboard"
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200",
        collapsed ? "w-[4.5rem]" : "w-[var(--sidebar-w)]",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-line",
          collapsed ? "justify-center px-2" : "justify-between px-5",
        )}
      >
        {!collapsed ? (
          <span className="truncate font-display text-base font-semibold uppercase tracking-[0.14em] text-ink">
            HydraaZone
          </span>
        ) : null}

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          className="grid size-9 shrink-0 place-items-center rounded-md text-ink-secondary transition-colors hover:bg-muted hover:text-ink"
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden className="size-5" />
          ) : (
            <PanelLeftClose aria-hidden className="size-5" />
          )}
        </button>
      </div>

      <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {items.map((item) => {
          // Exact match for the dashboard root of each role; prefix match
          // for everything else, so /dashboard/admin/orders/123 still
          // highlights "Orders".
          const isRoot = item.href === "/dashboard/admin" || item.href === "/dashboard/superadmin";
          const active = isRoot
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          const ItemIcon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-200",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-accent text-on-accent"
                    : "text-ink-secondary hover:bg-muted hover:text-ink",
                )}
              >
                <ItemIcon className="size-5 shrink-0" />
                {!collapsed ? item.label : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
