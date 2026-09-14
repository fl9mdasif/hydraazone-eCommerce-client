"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Mounted once in the root layout.
 *
 * `LazyMotion` with the `domAnimation` feature set keeps the Framer bundle
 * small — roughly a quarter of the full `motion` import. The tradeoff is
 * that every animated element must use `m.*` rather than `motion.*`; a
 * `motion.div` under this provider would pull the full bundle back in and
 * defeat the point.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
