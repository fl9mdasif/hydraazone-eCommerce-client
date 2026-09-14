"use client";

import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/hooks/use-cart";
import { estimateShipping, lineKey, stepQuantity } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils/format";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/layout-primitives";
import { CountUp } from "@/components/motion/count-up";
import { DURATION, EASE_OUT } from "@/components/motion/tokens";
import { useMotionPreference } from "@/components/motion/use-motion-preference";

export function CartView({
  shippingRate,
  freeShippingThreshold,
}: {
  shippingRate: number;
  freeShippingThreshold: number;
}) {
  const { lines, subtotal, hydrated, setQuantity, removeItem } = useCart();
  const { animate } = useMotionPreference();

  // The cart lives in localStorage, so nothing is known until rehydration.
  // Showing a skeleton avoids flashing "empty" at someone who has items.
  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Once you add something, it will appear here."
        action={
          <Button href="/shop" size="sm">
            Start shopping
          </Button>
        }
      />
    );
  }

  const shipping = estimateShipping(
    subtotal,
    shippingRate,
    freeShippingThreshold,
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <m.li
              key={lineKey(line)}
              layout={animate}
              initial={false}
              exit={animate ? { opacity: 0, height: 0 } : undefined}
              transition={{ duration: DURATION.base, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="flex gap-4 py-5">
                <Link
                  href={`/product/${line.slug}`}
                  className="relative size-24 shrink-0 overflow-hidden rounded-md bg-muted sm:size-28"
                >
                  <SmartImage src={line.thumbnail} alt={line.name} sizes="112px" />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    href={`/product/${line.slug}`}
                    className="text-sm font-medium text-ink"
                  >
                    {line.name}
                  </Link>
                  <p className="text-xs text-ink-secondary">
                    {line.customLabel ?? line.variantName}
                  </p>
                  <p className="text-sm text-ink">
                    {/* A custom line's `price` is a per-sq-inch rate, not a
                        useful unit price to display — show the per-cover
                        price instead, the same role this figure plays for
                        a normal product. */}
                    {formatCurrency(
                      line.sqInPerCover ? line.price * line.sqInPerCover : line.price,
                    )}
                  </p>

                  <div className="mt-auto flex items-center gap-3 pt-2">
                    <div className="flex items-center rounded-full border border-line">
                      <StepButton
                        label="Decrease quantity"
                        onClick={() =>
                          setQuantity(
                            line.productId,
                            line.variantId,
                            stepQuantity(line, -1),
                          )
                        }
                      >
                        <Minus aria-hidden className="size-3.5" />
                      </StepButton>
                      <span className="w-8 text-center text-sm tabular-nums text-ink">
                        {line.sqInPerCover
                          ? Math.round(line.quantity / line.sqInPerCover)
                          : line.quantity}
                      </span>
                      <StepButton
                        label="Increase quantity"
                        disabled={line.quantity >= line.stock}
                        onClick={() =>
                          setQuantity(
                            line.productId,
                            line.variantId,
                            stepQuantity(line, 1),
                          )
                        }
                      >
                        <Plus aria-hidden className="size-3.5" />
                      </StepButton>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(line.productId, line.variantId)}
                      aria-label={`Remove ${line.name} from cart`}
                      className="inline-flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-danger"
                    >
                      <Trash2 aria-hidden className="size-4" />
                      Remove
                    </button>
                  </div>
                </div>

                <p className="shrink-0 text-sm font-medium text-ink">
                  {formatCurrency(line.price * line.quantity)}
                </p>
              </div>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>

      <aside className="h-fit rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-medium text-ink">
          Order summary
        </h2>

        <dl className="my-4 flex flex-col gap-2 text-sm">
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
          <div className="flex justify-between border-t border-line pt-3 text-base">
            <dt className="font-medium text-ink">Total</dt>
            <dd className="font-medium text-ink">
              <CountUp value={subtotal + shipping} format={formatCurrency} />
            </dd>
          </div>
        </dl>

        <p className="mb-4 text-xs text-ink-muted">
          Shipping is an estimate. The final total is confirmed by the server
          when you place the order.
        </p>

        <Button href="/checkout" size="lg" fullWidth>
          Proceed to checkout
        </Button>
      </aside>
    </div>
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
