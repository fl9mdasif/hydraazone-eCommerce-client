"use client";

import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  type Order,
} from "@/lib/api/schemas/order";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/layout-primitives";
import { Modal } from "@/components/ui/modal";
import { SmartImage } from "@/components/ui/smart-image";

const STATUS_TONE: Record<string, "neutral" | "sale" | "out" | "success"> = {
  delivered: "success",
  cancelled: "out",
  returned: "out",
};

/** The full record behind one row of `orders-management.tsx` — every field
 * `getAllOrders` already returns, so this never needs its own fetch. */
export function OrderDetailModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  return (
    <Modal open={order !== null} onClose={onClose} title={order?.orderNumber ?? "Order"}>
      {order ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-muted">Placed {formatDate(order.createdAt)}</p>
            <div className="flex gap-1.5">
              <Badge tone={STATUS_TONE[order.orderStatus] ?? "neutral"}>
                {ORDER_STATUS_LABEL[order.orderStatus]}
              </Badge>
              <Badge tone={order.paymentStatus === "paid" ? "success" : "neutral"}>
                {PAYMENT_STATUS_LABEL[order.paymentStatus]} · {order.paymentMethod.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* -------------------------------------------------------- items */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">Items</h3>
            <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
              {order.items.map((item, index) => (
                <li key={item._id ?? index} className="flex items-center gap-3 p-3">
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                    <SmartImage src={item.product.thumbnail} alt={item.product.name} sizes="44px" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm text-ink">{item.product.name}</span>
                    <span className="truncate text-xs text-ink-muted">
                      {item.variant.name} · SKU {item.variant.sku} · × {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-ink">{formatCurrency(item.totalPrice)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* -------------------------------------------------------- totals */}
          <section className="flex flex-col gap-1.5 rounded-md border border-line p-3 text-sm">
            <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
            <Row label="Shipping" value={formatCurrency(order.shippingCharge)} />
            {order.discount > 0 ? (
              <Row label="Discount" value={`-${formatCurrency(order.discount)}`} />
            ) : null}
            <Row
              label="Total"
              value={formatCurrency(order.totalAmount)}
              className="border-t border-line pt-1.5 font-medium text-ink"
            />
          </section>

          {/* ------------------------------------------------------ shipping */}
          <section className="flex flex-col gap-1 text-sm">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Shipping address
            </h3>
            <p className="text-ink">{order.shippingAddress.fullName}</p>
            <p className="text-ink-secondary">{order.shippingAddress.phone}</p>
            <p className="text-ink-secondary">
              {order.shippingAddress.address}, {order.shippingAddress.city},{" "}
              {order.shippingAddress.district}
              {order.shippingAddress.postalCode ? ` ${order.shippingAddress.postalCode}` : ""}
            </p>
          </section>

          {order.note ? (
            <section className="flex flex-col gap-1 text-sm">
              <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Order note
              </h3>
              <p className="text-ink-secondary">{order.note}</p>
            </section>
          ) : null}

          {/* -------------------------------------------------------- history */}
          {order.statusHistory.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Status history
              </h3>
              <ul className="flex flex-col gap-2 text-sm">
                {order.statusHistory.map((entry, index) => (
                  <li key={entry._id ?? index} className="flex items-baseline gap-2">
                    <span className="w-24 shrink-0 text-ink-muted">
                      {formatDate(entry.changedAt)}
                    </span>
                    <span className="text-ink">
                      {ORDER_STATUS_LABEL[entry.status as keyof typeof ORDER_STATUS_LABEL] ??
                        entry.status}
                    </span>
                    {entry.note ? (
                      <span className="text-ink-secondary">— {entry.note}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex justify-between ${className ?? ""}`}>
      <span className="text-ink-secondary">{label}</span>
      <span>{value}</span>
    </div>
  );
}
