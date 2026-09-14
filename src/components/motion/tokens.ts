import type { Transition, Variants } from "framer-motion";

/**
 * The JS mirror of the motion tokens in `src/styles/tokens.css`.
 *
 * Framer needs numbers where CSS needs strings, so the values exist twice —
 * but they are defined once conceptually and must be changed together. Every
 * animation in the app references these; nothing improvises a duration.
 */

export const DURATION = {
  instant: 0.12,
  fast: 0.2,
  base: 0.32,
  slow: 0.52,
} as const;

export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

/** The signature spring: used for drawers, the cart bump, floating buttons. */
export const SPRING: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 24,
};

/** A softer spring for larger surfaces that would otherwise feel twitchy. */
export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 180,
  damping: 26,
};

export const TRANSITION = {
  instant: { duration: DURATION.instant, ease: EASE_OUT },
  fast: { duration: DURATION.fast, ease: EASE_OUT },
  base: { duration: DURATION.base, ease: EASE_OUT },
  slow: { duration: DURATION.slow, ease: EASE_OUT },
} satisfies Record<string, Transition>;

/** Card / tile hover lift. Matches `--lift` in tokens.css. */
export const LIFT = -4;

/** Children in a list settle 40–60ms apart, per AGENTS.md section 5. */
export const STAGGER_STEP = 0.05;

/**
 * Shared entrance used by `<Reveal>` and `<StaggerItem>`.
 * Transform and opacity only — never a layout property.
 */
export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: TRANSITION.base },
};

/** The reduced-motion counterpart: state changes, but instantly. */
export const instantVariants: Variants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0 } },
};
