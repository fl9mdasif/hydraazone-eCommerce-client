import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { CountUp } from "@/components/motion/count-up";
import { Skeleton } from "@/components/ui/layout-primitives";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: number;
  format?: (value: number) => string;
  icon: LucideIcon;
  /**
   * Only pass this where a real, historically-grounded comparison exists
   * (see the revenue card's week/month-over-period trend in overview.tsx).
   * Every other card omits it rather than show an invented trend — there is
   * no period-over-period baseline for order counts or stock health on the
   * server today.
   */
  trend?: { percent: number; label: string } | null;
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  format = (n) => String(Math.round(n)),
  icon: Icon,
  trend,
  loading,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-24" />
      </div>
    );
  }

  const positive = trend ? trend.percent >= 0 : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-full bg-warm-soft text-accent">
          <Icon aria-hidden className="size-5" />
        </span>

        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
              positive ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            )}
          >
            {positive ? (
              <ArrowUp aria-hidden className="size-3" />
            ) : (
              <ArrowDown aria-hidden className="size-3" />
            )}
            {Math.abs(trend.percent).toFixed(1)}%
          </span>
        ) : null}
      </div>

      <span className="text-xs text-ink-secondary">{label}</span>
      <span className="font-display text-2xl font-medium text-ink">
        <CountUp value={value} format={format} />
      </span>

      {trend ? (
        <span className="text-xs text-ink-muted">{trend.label}</span>
      ) : null}
    </div>
  );
}
