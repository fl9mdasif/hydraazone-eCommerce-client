"use client";

import { m, useMotionValue, useSpring } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { SPRING } from "./tokens";
import { useMotionPreference } from "./use-motion-preference";

interface MagneticProps {
  children: ReactNode;
  className?: string;
  /** Maximum travel in px. Kept small — this is a hint, not a jump. */
  strength?: number;
}

/**
 * Subtle pointer attraction for PRIMARY CTAs only.
 *
 * Overused, this reads as a gimmick, so it is reserved for the one button
 * that matters on a surface: the hero CTA, "Add to cart", "Place order".
 *
 * Pointer-driven only — it never runs on touch (there is no hover to
 * respond to) and is disabled entirely under reduced motion.
 */
export function Magnetic({
  children,
  className,
  strength = 6,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { animate } = useMotionPreference();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING);
  const springY = useSpring(y, SPRING);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    // Coarse pointers have no hover state to react to.
    if (!animate || event.pointerType !== "mouse" || !ref.current) return;

    const bounds = ref.current.getBoundingClientRect();
    const offsetX = event.clientX - (bounds.left + bounds.width / 2);
    const offsetY = event.clientY - (bounds.top + bounds.height / 2);

    x.set((offsetX / (bounds.width / 2)) * strength);
    y.set((offsetY / (bounds.height / 2)) * strength);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <m.div
      ref={ref}
      className={cn("inline-flex", className)}
      style={animate ? { x: springX, y: springY } : undefined}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      {children}
    </m.div>
  );
}
