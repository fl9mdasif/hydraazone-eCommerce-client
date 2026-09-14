"use client";

import Link from "next/link";
import { m } from "framer-motion";
import { useEffect, useState } from "react";
import { getOrder } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/client";
import { ORDER_STATUS_LABEL, type Order } from "@/lib/api/schemas/order";
import { GUEST_DEFAULT_PASSWORD } from "@/lib/api/auth";
import { useSession } from "@/lib/hooks/use-session";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/layout-primitives";
import { FormError } from "@/components/ui/field";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { DURATION, EASE_OUT } from "@/components/motion/tokens";
import { useMotionPreference } from "@/components/motion/use-motion-preference";

/**
 * Order confirmation.
 *
 * Every figure here comes from the ORDER as the server created it — never
 * from the local cart estimate. The server recomputes shipping and totals at
 * order time and its numbers are what the customer will actually pay.
 *
 * The signature moment (AGENTS.md section 5): a checkmark draws itself in,
 * then the summary staggers in beneath it.
 */
export function OrderConfirmation({ orderId }: { orderId: string }) {
  const { token, hydrated } = useSession();
  const { animate } = useMotionPreference();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      setError("Please sign in to view this order.");
      return;
    }

    let cancelled = false;
    getOrder(token, orderId)
      .then((result) => {
        if (!cancelled) setOrder(result);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Could not load this order.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [token, orderId, hydrated]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <FormError message={error} />
        <Button href="/login">Sign in</Button>
      </div>
    );
  }

  if (!order) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8">
      {/* Checkmark draw-in. */}
      <div className="flex flex-col items-center gap-3 text-center">
        <m.span
          className="grid size-16 place-items-center rounded-full bg-success-soft"
          initial={animate ? { scale: 0.8, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: DURATION.base, ease: EASE_OUT }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="size-8 text-success"
            aria-hidden
          >
            <m.path
              d="M4 12.5l5 5L20 7"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={animate ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={{
                duration: DURATION.slow,
                ease: EASE_OUT,
                delay: animate ? 0.15 : 0,
              }}
            />
          </svg>
        </m.span>

        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
          Thank you — your order is placed
        </h1>
        <p className="text-sm text-ink-secondary">
          Order <span className="text-ink">{order.orderNumber}</span> ·{" "}
          {formatDate(order.createdAt)} ·{" "}
          {ORDER_STATUS_LABEL[order.orderStatus]}
        </p>
      </div>

      <Stagger className="flex w-full flex-col gap-4" delay={0.3}>
        <StaggerItem className="rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-4 font-display text-base font-medium text-ink">
            What you ordered
          </h2>

          <ul className="flex flex-col gap-3">
            {order.items.map((item, index) => (
              <li key={item._id ?? index} className="flex items-center gap-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  <SmartImage
                    src={item.product.thumbnail}
                    alt={item.product.name}
                    sizes="56px"
                  />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-ink">
                    {item.product.name}
                  </span>
                  <span className="text-xs text-ink-secondary">
                    {item.variant.name} · Qty {item.quantity}
                  </span>
                </span>
                <span className="text-sm text-ink">
                  {formatCurrency(item.totalPrice)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-secondary">Subtotal</dt>
              <dd className="text-ink">{formatCurrency(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-secondary">Shipping</dt>
              <dd className="text-ink">
                {order.shippingCharge === 0
                  ? "Free"
                  : formatCurrency(order.shippingCharge)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base">
              <dt className="font-medium text-ink">Total to pay on delivery</dt>
              <dd className="font-medium text-ink">
                {formatCurrency(order.totalAmount)}
              </dd>
            </div>
          </dl>
        </StaggerItem>

        <StaggerItem className="rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-3 font-display text-base font-medium text-ink">
            Delivering to
          </h2>
          <address className="text-sm not-italic leading-relaxed text-ink-secondary">
            <span className="block text-ink">{order.shippingAddress.fullName}</span>
            {order.shippingAddress.phone}
            <br />
            {order.shippingAddress.address}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.district}
            {order.shippingAddress.postalCode
              ? ` ${order.shippingAddress.postalCode}`
              : ""}
            <br />
            {order.shippingAddress.country}
          </address>
        </StaggerItem>

        {/*
          Guest accounts are created with a known default password, so the
          customer is prompted to replace it. Prompted, not forced — a hard
          block here would be a second signup wall right after checkout.
        */}
        <StaggerItem className="rounded-lg border border-warm bg-warm-soft p-5">
          <h2 className="mb-1.5 font-display text-base font-medium text-ink">
            Secure your account
          </h2>
          <p className="mb-3 text-sm text-ink-secondary">
            If we created your account at checkout, its temporary password is{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 text-xs">
              {GUEST_DEFAULT_PASSWORD}
            </code>
            . Set your own password so only you can see your orders.
          </p>
          <Button href="/account" size="sm">
            Set a password
          </Button>
        </StaggerItem>

        <StaggerItem className="flex flex-wrap justify-center gap-3 pt-2">
          <Button href="/account/orders" variant="outline">
            View your orders
          </Button>
          <Link
            href="/shop"
            className="inline-flex items-center px-4 py-2 text-sm text-ink-secondary hover:text-ink"
          >
            Continue shopping
          </Link>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
