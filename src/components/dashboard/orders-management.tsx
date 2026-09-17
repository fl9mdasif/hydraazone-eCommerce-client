"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
} from "@/lib/api/orders";
import { ApiError } from "@/lib/api/client";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_OPTIONS,
  type Order,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/api/schemas/order";
import { useSession } from "@/lib/hooks/use-session";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Badge, EmptyState, Skeleton } from "@/components/ui/layout-primitives";
import { FormError } from "@/components/ui/field";
import { OrderDetailModal } from "@/components/dashboard/order-detail-modal";

const STATUS_TONE: Record<string, "neutral" | "sale" | "out" | "success"> = {
  delivered: "success",
  cancelled: "out",
  returned: "out",
};

const PAGE_SIZE = 15;

/**
 * Order management. Both admin and superAdmin can update order and payment
 * status (`PATCH /orders/:id/status`, `PATCH /orders/:id/payment-status`
 * both require just `admin`/`superAdmin` â no superAdmin-only gate here).
 */
export function OrdersManagement() {
  const { token } = useSession();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "">("");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 400);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const result = await getAllOrders(token, {
        status: statusFilter || undefined,
        paymentStatus: paymentFilter || undefined,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setOrders(result.orders);
      setTotal(result.meta?.total ?? result.orders.length);
      setError(null);
    } catch (caught) {
      console.error("[orders] load failed:", caught);
      setOrders([]);
      setError(caught instanceof ApiError ? caught.message : "Could not load orders.");
    }
  }, [token, statusFilter, paymentFilter, search, page]);

  useEffect(() => {
    // `load` only calls setState after its own internal `await` calls —
    // the standard fetch-on-mount pattern, not the synchronous-setState
    // footgun this rule targets. It cannot see across the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleStatusChange(order: Order, status: OrderStatus) {
    if (!token || status === order.orderStatus) return;
    setUpdatingId(order._id);
    try {
      await updateOrderStatus(token, order._id, status);
      toast.success(`${order.orderNumber} marked ${ORDER_STATUS_LABEL[status]}`);
      await load();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not update status.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handlePaymentChange(order: Order, paymentStatus: PaymentStatus) {
    if (!token || paymentStatus === order.paymentStatus) return;
    setUpdatingId(order._id);
    try {
      await updatePaymentStatus(token, order._id, paymentStatus);
      toast.success(`${order.orderNumber} payment marked ${PAYMENT_STATUS_LABEL[paymentStatus]}`);
      await load();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not update payment status.");
    } finally {
      setUpdatingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => {
            setPage(1);
            setSearchInput(event.target.value);
          }}
          placeholder="Search order #, name or phone"
          className="h-10 min-w-56 flex-1 rounded-full border border-line bg-surface px-4 text-sm text-ink placeholder:text-ink-muted focus:border-line-strong focus:outline-none"
        />

        <select
          value={statusFilter}
          onChange={(event) => {
            setPage(1);
            setStatusFilter(event.target.value as OrderStatus | "");
          }}
          className="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink focus:border-line-strong focus:outline-none"
        >
          <option value="">All statuses</option>
          {ORDER_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABEL[status]}
            </option>
          ))}
        </select>

        <select
          value={paymentFilter}
          onChange={(event) => {
            setPage(1);
            setPaymentFilter(event.target.value as PaymentStatus | "");
          }}
          className="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink focus:border-line-strong focus:outline-none"
        >
          <option value="">All payments</option>
          {PAYMENT_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {PAYMENT_STATUS_LABEL[status]}
            </option>
          ))}
        </select>

        <p className="ml-auto text-sm text-ink-secondary">{total} orders</p>
      </div>

      <FormError message={error} />

      {!orders ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState title="No orders match these filters" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-secondary">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Payment</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setViewingOrder(order)}
                      className="block font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {order.orderNumber}
                    </button>
                    <span className="text-xs text-ink-muted">{formatDate(order.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">
                    <span className="block">{order.shippingAddress.fullName}</span>
                    <span className="text-xs text-ink-muted">{order.shippingAddress.phone}</span>
                  </td>
                  <td className="px-4 py-3 text-ink">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[order.orderStatus] ?? "neutral"}>
                        {ORDER_STATUS_LABEL[order.orderStatus]}
                      </Badge>
                      <select
                        aria-label={`Change status for ${order.orderNumber}`}
                        value={order.orderStatus}
                        disabled={updatingId === order._id}
                        onChange={(event) =>
                          void handleStatusChange(order, event.target.value as OrderStatus)
                        }
                        className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink disabled:opacity-50"
                      >
                        {ORDER_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {ORDER_STATUS_LABEL[status]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Change payment status for ${order.orderNumber}`}
                      value={order.paymentStatus}
                      disabled={updatingId === order._id}
                      onChange={(event) =>
                        void handlePaymentChange(order, event.target.value as PaymentStatus)
                      }
                      className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink disabled:opacity-50"
                    >
                      {PAYMENT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {PAYMENT_STATUS_LABEL[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-full px-3.5 py-2 text-sm text-ink transition-colors hover:bg-muted disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-2 py-2 text-sm text-ink-secondary">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-full px-3.5 py-2 text-sm text-ink transition-colors hover:bg-muted disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}

      <OrderDetailModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
    </div>
  );
}
