"use client";

import { m } from "framer-motion";
import { Skeleton } from "@/components/ui/layout-primitives";
import { DURATION, EASE_OUT } from "@/components/motion/tokens";
import { useMotionPreference } from "@/components/motion/use-motion-preference";

/**
 * Stock health, computed genuinely from the full catalog fetch shared with
 * the "Stock Health" stat card (see overview.tsx) — not a fabricated
 * percentage. In stock / low stock / out of stock counts all trace back to
 * real variant data.
 */
export function WarehousePanel({
  inStock,
  lowStock,
  outOfStock,
  loading,
}: {
  inStock: number;
  lowStock: number;
  outOfStock: number;
  loading?: boolean;
}) {
  const { animate } = useMotionPreference();
  const total = inStock + lowStock + outOfStock;
  const healthPercent = total > 0 ? Math.round((inStock / total) * 100) : 0;

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <h2 className="mb-4 font-display text-base font-medium text-ink">
        Warehouse overview
      </h2>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : (
        <>
          <p className="font-display text-3xl font-medium text-ink">
            {healthPercent}%
          </p>
          <p className="mb-3 text-xs text-ink-secondary">
            {healthPercent >= 80 ? "Healthy" : healthPercent >= 50 ? "Fair" : "Needs attention"}
          </p>

          <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
            <m.div
              className="h-full rounded-full bg-accent"
              initial={animate ? { width: 0 } : false}
              animate={{ width: `${healthPercent}%` }}
              transition={{ duration: DURATION.slow, ease: EASE_OUT }}
            />
          </div>

          <ul className="flex flex-col gap-2 text-sm">
            <Row color="var(--success)" label="In stock" value={inStock} />
            <Row color="var(--warning)" label="Low stock" value={lowStock} />
            <Row color="var(--danger)" label="Out of stock" value={outOfStock} />
          </ul>
        </>
      )}
    </div>
  );
}

function Row({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-2.5">
      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-ink-secondary">{label}</span>
      <span className="ml-auto font-medium text-ink">{value}</span>
    </li>
  );
}
