"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { cancelOrder, getMyOrders } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/client";
import {
  CANCELLABLE_STATUSES,
  ORDER_STATUS_LABEL,
  type Order,
} from "@/lib/api/schemas/order";
import { useSession } from "@/lib/hooks/use-session";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import {
  Badge,
  EmptyState,
  Skeleton,
} from "@/components/ui/layout-primitives";
import { FormError } from "@/components/ui/field";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

export function OrdersPanel() {
  const { token, user, signOut } = useSession();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      // Unpaginated server-side: this returns every order, newest first.
      setOrders(await getMyOrders(token));
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) {
        void signOut("/login");
        return;
      }
      setError(
        caught instanceof ApiError ? caught.message : "Could not load orders.",
      );
    }
  }, [token, signOut]);

  useEffect(() => {
    // `load` only calls setState after its own internal `await` — this is
    // the standard fetch-on-mount pattern React's own docs endorse, not the
    // synchronous-setState-in-effect footgun this rule targets. The rule's
    // static analysis can't see across the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleCancel(order: Order) {
    if (!token) return;
    setCancelling(order._id);
    try {
      await cancelOrder(token, order._id);
      toast.success(`Order ${order.orderNumber} cancelled`);
      await load();
    } catch (caught) {
      toast.error(
        caught instanceof ApiError
          ? caught.message
          : "Could not cancel that order.",
      );
    } finally {
      setCancelling(null);
    }
  }

  if (error) return <FormError message={error} />;
  if (!orders) return <Skeleton className="h-64 w-full" />;

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="Your orders will appear here once you've placed one."
        action={
          <Button href="/shop" size="sm">
            Start shopping
          </Button>
        }
      />
    );
  }

  return (
    <Stagger as="ul" className="flex flex-col gap-4">
      {orders.map((order) => {
        /*
         * `PATCH /orders/:id/cancel` is role `user` only — an admin account
         * gets a 401 — and only works from pending/confirmed.
         */
        const canCancel =
          user?.role === "user" &&
          CANCELLABLE_STATUSES.includes(order.orderStatus);

        return (
          <StaggerItem
            as="li"
            key={order._id}
            className="rounded-lg border border-line bg-surface p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-ink">
                  {order.orderNumber}
                </p>
                <p className="text-xs text-ink-secondary">
                  Placed {formatDate(order.createdAt)}
                </p>
              </div>

              <Badge
                tone={
                  order.orderStatus === "delivered"
                    ? "success"
                    : order.orderStatus === "cancelled"
                      ? "out"
                      : "neutral"
                }
              >
                {ORDER_STATUS_LABEL[order.orderStatus]}
              </Badge>
            </div>

            <ul className="my-4 flex flex-col gap-3">
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
                    {item.product.slug ? (
                      <Link
                        href={`/product/${item.product.slug}`}
                        className="truncate text-sm text-ink hover:underline"
                      >
                        {item.product.name}
                      </Link>
                    ) : (
                      <span className="truncate text-sm text-ink">
                        {item.product.name}
                      </span>
                    )}
                    <span className="text-xs text-ink-secondary">
                      {item.variant.name} · Qty {item.quantity}
                    </span>
                  </span>
                  {/* The amount charged, already discount-adjusted server-side. */}
                  <span className="text-sm text-ink">
                    {formatCurrency(item.totalPrice)}
                  </span>
                </li>
              ))}
            </ul>

            {order.note ? (
              // Custom-size items (e.g. the table-cover calculator) have no
              // structured dimensions field server-side — this note is where
              // the real length/width the customer entered surfaces.
              <p className="mb-4 rounded-md bg-muted px-3.5 py-2.5 text-xs text-ink-secondary">
                <span className="font-medium text-ink">Note: </span>
                {order.note}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <p className="text-sm">
                <span className="text-ink-secondary">Total </span>
                <span className="font-medium text-ink">
                  {formatCurrency(order.totalAmount)}
                </span>
              </p>

              {canCancel ? (
                <Button
                  onClick={() => void handleCancel(order)}
                  variant="outline"
                  size="sm"
                  disabled={cancelling === order._id}
                >
                  {cancelling === order._id ? "Cancelling…" : "Cancel order"}
                </Button>
              ) : null}
            </div>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
