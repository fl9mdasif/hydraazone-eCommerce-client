"use client";

import { m } from "framer-motion";
import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import {
  DURATION,
  EASE_OUT,
  instantVariants,
  revealVariants,
} from "./tokens";
import { useMotionPreference } from "./use-motion-preference";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds to wait before this element starts. */
  delay?: number;
  /** Render as something other than a div (e.g. "section", "li"). */
  as?: ElementType;
  /**
   * How far into the viewport the element must be before it animates.
   * Negative values mean "wait until it is properly on screen".
   */
  margin?: string;
}

/**
 * Viewport entrance. The default motion of the whole site.
 *
 * Animates opacity and transform only, and fires once, so scrolling back up
 * does not re-trigger it. The element occupies its final space from the
 * start — nothing here can contribute to layout shift.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  margin = "-80px",
}: RevealProps) {
  const { animate } = useMotionPreference();
  const Component = m[as as keyof typeof m] as typeof m.div;

  return (
    <Component
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin }}
      variants={animate ? revealVariants : instantVariants}
      transition={
        animate
          ? { duration: DURATION.base, ease: EASE_OUT, delay }
          : { duration: 0 }
      }
    >
      {children}
    </Component>
  );
}
