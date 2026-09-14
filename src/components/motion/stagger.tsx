"use client";

import { m } from "framer-motion";
import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { instantVariants, revealVariants, STAGGER_STEP } from "./tokens";
import { useMotionPreference } from "./use-motion-preference";

interface StaggerProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** Seconds between children. Defaults to the 50ms system step. */
  step?: number;
  delay?: number;
  margin?: string;
}

/**
 * Parent for a list whose children settle in sequence — product grids,
 * category rails, feature strips, dashboard tables.
 *
 * Pair with `<StaggerItem>`. The parent orchestrates timing only; the item
 * carries the actual entrance, so the two stay in step automatically.
 */
export function Stagger({
  children,
  className,
  as = "div",
  step = STAGGER_STEP,
  delay = 0,
  margin = "-60px",
}: StaggerProps) {
  const { animate } = useMotionPreference();
  const Component = m[as as keyof typeof m] as typeof m.div;

  return (
    <Component
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin }}
      variants={{
        hidden: {},
        visible: {
          transition: animate
            ? { staggerChildren: step, delayChildren: delay }
            : { staggerChildren: 0, delayChildren: 0 },
        },
      }}
    >
      {children}
    </Component>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: StaggerItemProps) {
  const { animate } = useMotionPreference();
  const Component = m[as as keyof typeof m] as typeof m.div;

  return (
    <Component
      className={cn(className)}
      variants={animate ? revealVariants : instantVariants}
    >
      {children}
    </Component>
  );
}
