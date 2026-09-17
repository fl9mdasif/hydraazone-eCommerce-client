"use client";

import { m, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { DURATION, EASE_OUT, SPRING } from "@/components/motion/tokens";
import { useMotionPreference } from "@/components/motion/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * A centered dialog — the counterpart to `CartDrawer`'s slide-over for
 * content that isn't a persistent side panel (an order's full detail, a
 * confirmation). Same real-modal behaviour as the cart drawer: focus is
 * trapped inside while open, Escape and a backdrop click close it, the
 * page behind doesn't scroll, and focus returns to whatever opened it.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const { animate } = useMotionPreference();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function getFocusable(): HTMLElement[] {
      if (!panelRef.current) return [];
      return Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const withinPanel = active instanceof Node && panelRef.current?.contains(active);

      if (event.shiftKey) {
        if (!withinPanel || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!withinPanel || active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.fast, ease: EASE_OUT }}
        >
          <div
            className="absolute inset-0 bg-ink/50"
            onClick={onClose}
            aria-hidden
          />

          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={cn(
              "relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-surface shadow-lift",
              className,
            )}
            initial={animate ? { opacity: 0, scale: 0.96, y: 8 } : false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={animate ? { opacity: 0, scale: 0.96, y: 8 } : undefined}
            transition={SPRING}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
              <h2 id="modal-title" className="font-display text-base font-medium text-ink">
                {title}
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-full text-ink-secondary transition-colors hover:bg-muted hover:text-ink"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">{children}</div>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
