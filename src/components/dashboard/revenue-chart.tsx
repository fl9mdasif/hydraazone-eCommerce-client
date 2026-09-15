"use client";

import { m } from "framer-motion";
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
const PADDING = { top: 16, right: 8, bottom: 24, left: 8 };

export function RevenueChart({
  data,
  period,
  onPeriodChange,
  loading,
}: {
  data: SalesPoint[];
  period: Period;
  onPeriodChange: (period: Period) => void;
  loading?: boolean;
}) {
  const { animate } = useMotionPreference();
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { linePath, areaPath, points, maxRevenue } = useMemo(
    () => buildPaths(data),
    [data],
  );

  const active = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-medium text-ink">
            Revenue overview
          </h2>
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

            {/* Gridlines */}
            {[0, 1, 2, 3].map((row) => {
              const y = PADDING.top + (row * (HEIGHT - PADDING.top - PADDING.bottom)) / 3;
              return (
                <line
                  key={row}
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={y}
                  y2={y}
                  stroke="var(--line-subtle)"
                  strokeWidth={1}
                />
              );
            })}

            <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />

            <m.path
              d={linePath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={animate ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={{ duration: DURATION.slow, ease: EASE_OUT }}
            />

            {/*
              Dots stay hidden at rest, matching the clean reference curve —
              except a single-bucket period, whose path is just one
              "moveto" with zero length: nothing to stroke, so the dot is
              the only thing that renders anything at all there.
            */}
            {points.map((point, index) => (
              <circle
                key={point.date}
                cx={point.x}
                cy={point.y}
                r={activeIndex === index ? 5 : points.length === 1 ? 4 : 0}
                fill="var(--accent)"
                stroke="var(--bg-surface)"
                strokeWidth={activeIndex === index || points.length === 1 ? 2 : 0}
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
          </svg>

          {active ? (
            <div className="pointer-events-none absolute left-2 top-0 rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-lift">
              <p className="font-medium text-ink">{formatCurrency(active.revenue)}</p>
              <p className="text-ink-secondary">
                {active.date} · {active.orders} {active.orders === 1 ? "order" : "orders"}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
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
