"use client";

import { useReducedMotion } from "framer-motion";

/**
 * The one place the app asks whether it is allowed to animate.
 *
 * Every primitive in `components/motion/` calls this. Reduced motion means
 * an instant state change — the element still appears, it just does not
 * travel. It must never mean a missing or broken UI.
 *
 * Framer's hook returns `boolean | null` (null before the media query is
 * read); we treat null as "motion allowed" so the first paint is not
 * needlessly flattened.
 */
export function useMotionPreference(): { animate: boolean; reduced: boolean } {
  const reduced = useReducedMotion() ?? false;
  return { animate: !reduced, reduced };
}
