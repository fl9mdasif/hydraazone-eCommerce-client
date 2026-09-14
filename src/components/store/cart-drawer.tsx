"use client";

import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect } from "react";
import { useCart } from "@/lib/hooks/use-cart";
import { estimateShipping, lineKey } from "@/stores/cart";
import { useUiStore } from "@/stores/ui";
import { formatCurrency } from "@/lib/utils/format";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/motion/count-up";
import { DURATION, EASE_OUT, SPRING } from "@/components/motion/tokens";
import { useMotionPreference } from "@/components/motion/use-motion-preference";

/**
 * Slide-over cart.
 *
 * Line removal collapses the row's height while fading, and the total counts
 * to its new value rather than snapping — the two signature cart moments
 * from AGENTS.md section 5.
 *
 * The height collapse is the one deliberate exception to "transform and
 * opacity only": it is on an exiting element, driven by Framer's own
 * animation of a fixed height to 0, and affects nothing below the fold.
 */
export function CartDrawer({
  shippingRate,
  freeShippingThreshold,
}: {
  shippingRate: number;
  freeShippingThreshold: number;
}) {
  const open = useUiStore((state) => state.cartOpen);
  const closeCart = useUiStore((state) => state.closeCart);
  const { lines, subtotal, count, setQuantity, removeItem } = useCart();
  const { animate } = useMotionPreference();

  const shipping = estimateShipping(
    subtotal,
    shippingRate,
    freeShippingThreshold,
  );
  const remaining = Math.max(0, freeShippingThreshold - subtotal);
  const progress = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  // Escape closes, and the page behind must not scroll while it is open.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, closeCart]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <m.div
            className="fixed inset-0 z-50 bg-inverse/40"
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={animate ? { opacity: 0 } : undefined}
            transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            onClick={closeCart}
            aria-hidden
          />

          <m.aside
            role="dialog"
            aria-modal="true"
            aria-label="Your cart"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-overlay"
            initial={animate ? { x: "100%" } : false}
            animate={{ x: 0 }}
            exit={animate ? { x: "100%" } : undefined}
            transition={SPRING}
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-medium text-ink">
                Your cart{count > 0 ? ` (${count})` : ""}
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="grid size-9 place-items-center rounded-full text-ink transition-colors hover:bg-muted"
              >
                <X aria-hidden className="size-5" />
              </button>
            </header>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <span className="grid size-14 place-items-center rounded-full bg-muted">
                  <ShoppingBag aria-hidden className="size-6 text-ink-muted" />
                </span>
                <p className="font-display text-lg text-ink">
                  Your cart is empty
                </p>
                <p className="text-sm text-ink-secondary">
                  Browse the shop and add something you like.
                </p>
                <Button href="/shop" onClick={closeCart} variant="outline" size="sm">
                  Start shopping
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5">
                  {/* Free-shipping progress. */}
                  <div className="py-4">
                    {remaining > 0 ? (
                      <p className="mb-2 text-xs text-ink-secondary">
                        Add {formatCurrency(remaining)} more for free shipping
                      </p>
                    ) : (
                      <p className="mb-2 text-xs text-success">
                        You have free shipping
                      </p>
                    )}
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <m.div
                        className="h-full rounded-full bg-accent"
                        initial={false}
                        animate={{ width: `${progress}%` }}
                        transition={
                          animate
                            ? { duration: DURATION.base, ease: EASE_OUT }
                            : { duration: 0 }
                        }
                      />
                    </div>
                  </div>

                  <ul className="flex flex-col">
                    <AnimatePresence initial={false}>
                      {lines.map((line) => (
                        <m.li
                          key={lineKey(line)}
                          layout={animate}
                          initial={false}
                          exit={
                            animate
                              ? { opacity: 0, height: 0, marginBottom: 0 }
                              : undefined
                          }
                          transition={{
                            duration: DURATION.base,
                            ease: EASE_OUT,
                          }}
                          className="overflow-hidden border-b border-line last:border-b-0"
                        >
                          <div className="flex gap-3 py-4">
                            <Link
                              href={`/product/${line.slug}`}
                              onClick={closeCart}
                              className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted"
                            >
                              <SmartImage
                                src={line.thumbnail}
                                alt={line.name}
                                sizes="80px"
                              />
                            </Link>

                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                              <Link
                                href={`/product/${line.slug}`}
                                onClick={closeCart}
                                className="line-clamp-2 text-sm font-medium text-ink"
                              >
                                {line.name}
                              </Link>
                              <p className="text-xs text-ink-secondary">
                                {line.variantName}
                              </p>
                              <p className="text-sm text-ink">
                                {formatCurrency(line.price * line.quantity)}
                              </p>

                              <div className="mt-auto flex items-center gap-2">
                                <div className="flex items-center rounded-full border border-line">
                                  <StepButton
                                    label="Decrease quantity"
                                    onClick={() =>
                                      setQuantity(
                                        line.productId,
                                        line.variantId,
                                        line.quantity - 1,
                                      )
                                    }
                                  >
                                    <Minus aria-hidden className="size-3.5" />
                                  </StepButton>
                                  <span className="w-7 text-center text-xs tabular-nums text-ink">
                                    {line.quantity}
                                  </span>
                                  <StepButton
                                    label="Increase quantity"
                                    disabled={line.quantity >= line.stock}
                                    onClick={() =>
                                      setQuantity(
                                        line.productId,
                                        line.variantId,
                                        line.quantity + 1,
                                      )
                                    }
                                  >
                                    <Plus aria-hidden className="size-3.5" />
                                  </StepButton>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeItem(line.productId, line.variantId)
                                  }
                                  aria-label={`Remove ${line.name} from cart`}
                                  className="ml-auto grid size-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-muted hover:text-danger"
                                >
                                  <Trash2 aria-hidden className="size-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </m.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>

                <footer className="border-t border-line px-5 py-4">
                  <dl className="mb-3 flex flex-col gap-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-ink-secondary">Subtotal</dt>
                      <dd className="text-ink">
                        <CountUp value={subtotal} format={formatCurrency} />
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-secondary">Shipping (est.)</dt>
                      <dd className="text-ink">
                        {shipping === 0 ? "Free" : formatCurrency(shipping)}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-line pt-2 text-base">
                      <dt className="font-medium text-ink">Total</dt>
                      <dd className="font-medium text-ink">
                        <CountUp
                          value={subtotal + shipping}
                          format={formatCurrency}
                        />
                      </dd>
                    </div>
                  </dl>

                  <p className="mb-3 text-xs text-ink-muted">
                    Final total is confirmed at checkout.
                  </p>

                  <div className="flex flex-col gap-2">
                    <Button href="/checkout" onClick={closeCart} size="lg" fullWidth>
                      Checkout
                    </Button>
                    <Button
                      href="/cart"
                      onClick={closeCart}
                      variant="outline"
                      size="md"
                      fullWidth
                    >
                      View cart
                    </Button>
                  </div>
                </footer>
              </>
            )}
          </m.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function StepButton({
  onClick,
  label,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-8 place-items-center rounded-full text-ink transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
