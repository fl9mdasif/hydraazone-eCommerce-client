"use client";

import { m } from "framer-motion";
import { Skeleton } from "@/components/ui/layout-primitives";
import { DURATION, EASE_OUT } from "@/components/motion/tokens";
import { useMotionPreference } from "@/components/motion/use-motion-preference";

/**
 * Hand-built inline SVG donut — same reasoning as the revenue chart (no
 * charting library approved). Built from PAYMENT status, the real enum the
 * server has (pending/paid/failed/refunded), rather than the reference
 * mockup's mixed order/payment labels — each leg is a real `meta.total`
 * from `GET /orders?paymentStatus=X&limit=1`, not an estimate.
 */

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

const SIZE = 160;
const STROKE = 20;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function StatusDonut({
  segments,
  loading,
}: {
  segments: DonutSegment[];
  loading?: boolean;
}) {
  const { animate } = useMotionPreference();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <h2 className="mb-4 font-display text-base font-medium text-ink">
        Order overview
      </h2>

      {loading ? (
        <div className="grid grid-cols-2 items-center gap-6">
          <Skeleton className="size-40 rounded-full justify-self-center" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ) : total === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">No orders yet.</p>
      ) : (
        // Explicit two columns — circle, status list, side by side — not a
        // flex row that would stack/wrap at narrower widths.
        <div className="grid grid-cols-2 items-center gap-6">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            className="justify-self-center"
            role="img"
            aria-label={`${total} total orders by payment status`}
          >
            <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="var(--line-subtle)"
                strokeWidth={STROKE}
              />
              {(() => {
                let offset = 0;
                return segments
                  .filter((segment) => segment.value > 0)
                  .map((segment) => {
                    const fraction = segment.value / total;
                    const dash = fraction * CIRCUMFERENCE;
                    const segmentOffset = offset;
                    offset += dash;

                    return (
                      <m.circle
                        key={segment.label}
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        fill="none"
                        stroke={segment.color}
                        strokeWidth={STROKE}
                        strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                        strokeDashoffset={-segmentOffset}
                        initial={
                          animate
                            ? { strokeDasharray: `0 ${CIRCUMFERENCE}` }
                            : false
                        }
                        animate={{
                          strokeDasharray: `${dash} ${CIRCUMFERENCE - dash}`,
                        }}
                        transition={{ duration: DURATION.slow, ease: EASE_OUT }}
                      />
                    );
                  });
              })()}
            </g>

            <text
              x={SIZE / 2}
              y={SIZE / 2 - 4}
              textAnchor="middle"
              className="fill-ink font-display text-2xl font-medium"
            >
              {total}
            </text>
            <text
              x={SIZE / 2}
              y={SIZE / 2 + 16}
              textAnchor="middle"
              className="fill-ink-muted text-[0.7rem]"
            >
              Total orders
            </text>
          </svg>

          <ul className="flex flex-1 flex-col gap-2.5">
            {segments.map((segment) => (
              <li key={segment.label} className="flex items-center gap-2.5 text-sm">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-ink-secondary">{segment.label}</span>
                <span className="ml-auto font-medium text-ink">{segment.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
