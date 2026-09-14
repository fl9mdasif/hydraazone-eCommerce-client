"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { DURATION } from "./tokens";
import { useMotionPreference } from "./use-motion-preference";

interface CountUpProps {
  value: number;
  /** Wraps the final number, e.g. `formatCurrency`. */
  format?: (value: number) => string;
  className?: string;
  durationMs?: number;
}

/**
 * Rolls a number to its value rather than snapping to it. Used for dashboard
 * stat cards and cart totals, where a changing number is the point.
 *
 * Renders the FINAL value on the server and as the initial client state, so
 * there is no hydration mismatch and no layout shift as digits are added —
 * the animation only starts once the element is actually on screen.
 */
export function CountUp({
  value,
  format = (n) => String(Math.round(n)),
  className,
  durationMs = DURATION.slow * 1000,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const { animate } = useMotionPreference();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    // Reduced motion needs no RAF loop at all — `shown` below reads `value`
    // directly in that case, so the effect has nothing to synchronise and
    // exits without calling setState.
    if (!animate || !inView) return;

    let frame = 0;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      // Matches --ease-out: decelerating, settles rather than stops.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, inView, value, durationMs]);

  const shown = animate ? display : value;

  return (
    <span ref={ref} className={className}>
      {format(shown)}
    </span>
  );
}
