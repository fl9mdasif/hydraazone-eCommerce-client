"use client";

import { m } from "framer-motion";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { SalesPoint } from "@/lib/api/orders";
import { formatCurrency } from "@/lib/utils/format";
import { Skeleton } from "@/components/ui/layout-primitives";
import { DURATION, EASE_OUT } from "@/components/motion/tokens";
import { useMotionPreference } from "@/components/motion/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * Hand-built inline SVG area chart — no charting library is approved for
 * this project (AGENTS.md §2's dependency list doesn't include one, and
 * none exists anywhere in the codebase today). Every value plotted comes
 * straight from `GET /orders/analytics/sales` (delivered orders only, the
 * server's own definition of "revenue").
 */

const PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

export type Period = (typeof PERIODS)[number]["value"];

const WIDTH = 640;
const HEIGHT = 220;
// Left padding fits the revenue-value axis labels, bottom fits the date
// labels — both were previously reserved but never actually drawn.
const PADDING = { top: 16, right: 8, bottom: 28, left: 44 };

/** `date` comes as `YYYY-MM-DD` / `YYYY-MM` / `YYYY` depending on `period`. */
function formatAxisDate(date: string, period: Period): string {
  if (period === "yearly") return date;

  if (period === "monthly") {
    const [year, month] = date.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }

  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** A compact axis label — formatCurrency's BDT symbol is too wide for this. */
function formatAxisValue(value: number): string {
  if (value >= 100000) return `${Math.round(value / 1000)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return String(Math.round(value));
}

export function RevenueChart({
  data,
  period,
  onPeriodChange,
  trend,
  loading,
}: {
  data: SalesPoint[];
  period: Period;
  onPeriodChange: (period: Period) => void;
  /** A real week/month-over-period comparison, not an invented one — see overview.tsx. */
  trend?: { percent: number; label: string } | null;
  loading?: boolean;
}) {
  const { animate } = useMotionPreference();
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { linePath, areaPath, points, maxRevenue } = useMemo(
    () => buildPaths(data),
    [data],
  );

  // Default to the most recent bucket (today, for `daily`) so "what's
  // today's sales" is visible on load — hovering just moves the same panel
  // to whichever point the cursor is over, it never has to be discovered.
  const defaultIndex = data.length > 0 ? data.length - 1 : null;
  const active = activeIndex !== null ? data[activeIndex] : defaultIndex !== null ? data[defaultIndex] : null;
  const highlightedIndex = activeIndex !== null ? activeIndex : defaultIndex;
  const totalRevenue = data.reduce((sum, point) => sum + point.revenue, 0);
  const positive = trend ? trend.percent >= 0 : null;

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-medium text-ink">
            Revenue overview
          </h2>
          {loading ? (
            <Skeleton className="mt-1.5 h-7 w-32" />
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <span className="font-display text-2xl font-medium text-ink">
                {formatCurrency(totalRevenue)}
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
          )}
          <p className="text-xs text-ink-secondary">Delivered orders only</p>
        </div>

        {/* The one real control from the reference mockup's topbar date
            picker — here it actually drives something. */}
        <div
          role="radiogroup"
          aria-label="Chart period"
          className="flex gap-1 rounded-full border border-line p-1"
        >
          {PERIODS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={period === option.value}
              onClick={() => onPeriodChange(option.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                period === option.value
                  ? "bg-accent text-on-accent"
                  : "text-ink-secondary hover:bg-muted",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : data.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-ink-muted">
          No delivered orders in this period yet.
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full"
            role="img"
            aria-label={`Revenue chart, ${period}, peak ${formatCurrency(maxRevenue)}`}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Gridlines + Y-axis value labels */}
            {[0, 1, 2, 3].map((row) => {
              const y = PADDING.top + (row * (HEIGHT - PADDING.top - PADDING.bottom)) / 3;
              const value = maxRevenue * (1 - row / 3);
              return (
                <g key={row}>
                  <text
                    x={PADDING.left - 8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-ink-muted text-[0.6rem]"
                  >
                    {formatAxisValue(value)}
                  </text>
                  <line
                    x1={PADDING.left}
                    x2={WIDTH - PADDING.right}
                    y1={y}
                    y2={y}
                    stroke="var(--line-subtle)"
                    strokeWidth={1}
                  />
                </g>
              );
            })}

            <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />

            <m.path
              d={linePath}
              fill="none"
              stroke="var(--accent)"
              strokeOpacity={0.55}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={animate ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={{ duration: DURATION.slow, ease: EASE_OUT }}
            />

            {/*
              Every bucket's point stays visible, not just the hovered one —
              a daily/yearly point shouldn't require a hover to be seen.
              The active point (hovered, or today's by default) stands out
              larger and full opacity; the rest sit smaller and faded.
            */}
            {points.map((point, index) => (
              <circle
                key={point.date}
                cx={point.x}
                cy={point.y}
                r={highlightedIndex === index ? 6 : 3}
                fill="var(--accent)"
                fillOpacity={highlightedIndex === index ? 1 : 0.45}
                stroke="var(--bg-surface)"
                strokeWidth={highlightedIndex === index ? 2 : 1}
                className="transition-[r] duration-150"
              />
            ))}

            {/* Invisible hit targets, one per bucket, wider than the dot itself. */}
            {points.map((point, index) => (
              <rect
                key={`hit-${point.date}`}
                x={point.x - (WIDTH / Math.max(points.length, 1)) / 2}
                y={0}
                width={WIDTH / Math.max(points.length, 1)}
                height={HEIGHT}
                fill="transparent"
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                tabIndex={0}
                aria-label={`${point.date}: ${formatCurrency(data[index].revenue)}`}
              />
            ))}

            {/* X-axis date labels — a handful evenly spaced, not one per
                bucket (30 daily points would overlap into an unreadable
                smear), always including the first and last. */}
            {axisLabelIndices(points.length).map((index) => (
              <text
                key={`axis-${points[index].date}`}
                x={points[index].x}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-ink-muted text-[0.6rem]"
              >
                {formatAxisDate(data[index].date, period)}
              </text>
            ))}
          </svg>

          {active ? (
            <div className="pointer-events-none absolute left-2 top-0 rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-lift">
              <p className="font-medium text-ink">{formatCurrency(active.revenue)}</p>
              <p className="text-ink-secondary">
                {formatAxisDate(active.date, period)} · {active.orders}{" "}
                {active.orders === 1 ? "order" : "orders"}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** At most 6 evenly-spaced indices, always including the first and last. */
function axisLabelIndices(count: number): number[] {
  if (count <= 1) return count === 1 ? [0] : [];

  const maxLabels = Math.min(6, count);
  const step = (count - 1) / (maxLabels - 1);
  const indices = new Set<number>();
  for (let i = 0; i < maxLabels; i += 1) {
    indices.add(Math.round(i * step));
  }
  return Array.from(indices).sort((a, b) => a - b);
}

function buildPaths(data: SalesPoint[]) {
  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const maxRevenue = Math.max(1, ...data.map((point) => point.revenue));

  const points = data.map((point, index) => {
    const x =
      data.length <= 1
        ? PADDING.left + innerWidth / 2
        : PADDING.left + (index / (data.length - 1)) * innerWidth;
    const y = PADDING.top + innerHeight - (point.revenue / maxRevenue) * innerHeight;
    return { x, y, date: point.date };
  });

  if (points.length === 0) {
    return { linePath: "", areaPath: "", points: [], maxRevenue };
  }

  const linePath = smoothPath(points);

  const areaPath =
    `${linePath} ` +
    `L ${points[points.length - 1].x} ${HEIGHT - PADDING.bottom} ` +
    `L ${points[0].x} ${HEIGHT - PADDING.bottom} Z`;

  return { linePath, areaPath, points, maxRevenue };
}

/**
 * A smooth spline through the points, not a straight-segment polyline —
 * matching the soft, rounded "wave" reference Asif shared, rather than the
 * sharp angular line a plain `L` polyline produces. Cubic Bézier segments
 * with the control points' x fixed at each pair's horizontal midpoint and
 * y matching the segment's own endpoints: a standard, cheap way to get a
 * naturally smooth curve without pulling in a spline library.
 */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const midX = (previous.x + current.x) / 2;
    path += ` C ${midX} ${previous.y}, ${midX} ${current.y}, ${current.x} ${current.y}`;
  }

  return path;
}
