import Link from "next/link";
import type { Order } from "@/lib/api/schemas/order";
import { ORDER_STATUS_LABEL } from "@/lib/api/schemas/order";
import type { Product } from "@/lib/api/schemas/product";
import { defaultVariant, effectivePrice } from "@/lib/utils/product";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Badge, EmptyState, StarRating, Skeleton } from "@/components/ui/layout-primitives";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils/cn";

const STATUS_TONE: Record<string, "neutral" | "sale" | "out" | "success"> = {
  delivered: "success",
  cancelled: "out",
  returned: "out",
};

/**
 * Recent orders. Customer name comes from `shippingAddress.fullName`, not
 * the populated `user` field — the server's own `.populate('user', 'name
 * email phone')` select names fields (`name`, `phone`) that don't exist on
 * the User schema (it's `username`/`contactNumber`), so that populate only
 * ever resolves `{_id, email}` in practice. The shipping address is the
 * reliable source for a display name.
 */
export function RecentOrdersTable({
  orders,
  loading,
  viewAllHref,
}: {
  orders: Order[];
  loading?: boolean;
  viewAllHref: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-medium text-ink">
          Recent orders
        </h2>
        <Link href={viewAllHref} className="text-xs text-ink-secondary hover:text-ink">
          View all orders
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState title="No orders yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-secondary">
                <th className="py-2 pr-3 font-medium">Order</th>
                <th className="py-2 pr-3 font-medium">Customer</th>
                <th className="py-2 pr-3 font-medium">Amount</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-b border-line last:border-b-0">
                  <td className="py-3 pr-3">
                    <span className="block font-medium text-ink">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {formatDate(order.createdAt)}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-ink-secondary">
                    {order.shippingAddress.fullName}
                  </td>
                  <td className="py-3 pr-3 text-ink">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td className="py-3">
                    <Badge tone={STATUS_TONE[order.orderStatus] ?? "neutral"}>
                      {ORDER_STATUS_LABEL[order.orderStatus]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Top products. The reference mockup shows a "units sold" column — no such
 * field exists anywhere on the server (verified: zero hits for sold/
 * unitsSold/salesCount in the whole codebase), so Rating fills that slot
 * instead: genuinely available data, same visual role (a popularity
 * signal), honestly labelled rather than invented.
 */
export function TopProductsTable({
  products,
  loading,
  viewAllHref,
}: {
  products: Product[];
  loading?: boolean;
  viewAllHref: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-medium text-ink">
          Top products
        </h2>
        <Link href={viewAllHref} className="text-xs text-ink-secondary hover:text-ink">
          View all products
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState title="No products yet" />
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {products.map((product) => {
            const variant = defaultVariant(product);
            const stock = product.variants.reduce(
              (sum, candidate) => sum + (candidate.isAvailable ? candidate.stock : 0),
              0,
            );

            return (
              <li key={product._id} className="flex items-center gap-3 py-3">
                <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                  <SmartImage src={product.thumbnail} alt={product.name} sizes="44px" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-ink">{product.name}</span>
                  <span
                    className={cn(
                      "text-xs",
                      stock === 0 ? "text-danger" : "text-ink-secondary",
                    )}
                  >
                    {stock} in stock
                  </span>
                </span>
                <span className="shrink-0 text-sm text-ink">
                  {variant ? formatCurrency(effectivePrice(variant)) : "—"}
                </span>
                <span className="w-20 shrink-0">
                  {product.reviewCount > 0 ? (
                    <StarRating rating={product.rating} size="sm" />
                  ) : (
                    <span className="text-xs text-ink-muted">No reviews</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
