import { z } from "zod";
import {
  orderListSchema,
  orderSchema,
  type Order,
  type OrderStatus,
  type PaymentStatus,
} from "./schemas/order";
import { request, requestData, type PageMeta } from "./client";

export interface PlaceOrderPayload {
  items: { productId: string; variantId: string; quantity: number }[];
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    postalCode?: string;
    country?: string;
  };
  paymentMethod: "cod";
  note?: string;
}

/**
 * The server takes `items` from the BODY, ignores the saved cart, then
 * clears the cart unconditionally — so this must be sent exactly the current
 * cart contents, never a subset.
 *
 * `discount` is deliberately not in the payload type: the server subtracts
 * it verbatim with no coupon validation, so it is always 0 from this client.
 */
export async function placeOrder(
  token: string,
  payload: PlaceOrderPayload,
): Promise<Order> {
  return requestData("/orders", orderSchema, {
    method: "POST",
    body: { ...payload, discount: 0, shippingAddress: { country: "Bangladesh", ...payload.shippingAddress } },
    token,
    revalidate: false,
  });
}

/** Unpaginated — returns every order, newest first, with no `meta`. */
export async function getMyOrders(token: string): Promise<Order[]> {
  return requestData("/orders/my-orders", orderListSchema, {
    token,
    revalidate: false,
  });
}

export async function getOrder(token: string, orderId: string): Promise<Order> {
  return requestData(`/orders/${encodeURIComponent(orderId)}`, orderSchema, {
    token,
    revalidate: false,
  });
}

/**
 * Role `user` ONLY — an admin account gets a 401 here — and only from
 * `pending` or `confirmed`.
 */
export async function cancelOrder(
  token: string,
  orderId: string,
  reason?: string,
): Promise<Order> {
  return requestData(
    `/orders/${encodeURIComponent(orderId)}/cancel`,
    orderSchema,
    { method: "PATCH", body: { reason }, token, revalidate: false },
  );
}

/* ------------------------------------------------------------------ admin */

export async function getAllOrders(
  token: string,
  query: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<{ orders: Order[]; meta: PageMeta | null }> {
  const { data, meta } = await request("/orders", orderListSchema, {
    query,
    token,
    revalidate: false,
  });
  return { orders: data, meta };
}

export async function updateOrderStatus(
  token: string,
  orderId: string,
  status: OrderStatus,
  note?: string,
): Promise<Order> {
  return requestData(
    `/orders/${encodeURIComponent(orderId)}/status`,
    orderSchema,
    { method: "PATCH", body: { status, note }, token, revalidate: false },
  );
}

export async function updatePaymentStatus(
  token: string,
  orderId: string,
  paymentStatus: PaymentStatus,
  transactionId?: string,
): Promise<Order> {
  return requestData(
    `/orders/${encodeURIComponent(orderId)}/payment-status`,
    orderSchema,
    {
      method: "PATCH",
      body: { paymentStatus, transactionId },
      token,
      revalidate: false,
    },
  );
}

export const dashboardSummarySchema = z.object({
  totalOrders: z.number().default(0),
  pendingOrders: z.number().default(0),
  totalRevenue: z.number().default(0),
  lowStockThreshold: z.number().default(5),
  lowStockVariants: z
    .array(
      z.object({
        productId: z.string(),
        productName: z.string(),
        variantId: z.string(),
        variantName: z.string(),
        sku: z.string(),
        stock: z.number(),
      }),
    )
    .default([]),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

/** `totalRevenue` counts DELIVERED orders only. */
export async function getDashboardSummary(
  token: string,
): Promise<DashboardSummary> {
  return requestData("/orders/analytics/dashboard", dashboardSummarySchema, {
    token,
    revalidate: false,
  });
}

export const salesPointSchema = z.object({
  date: z.string(),
  revenue: z.number(),
  orders: z.number(),
});

export type SalesPoint = z.infer<typeof salesPointSchema>;

/** Delivered orders only; empty buckets are absent and must be filled in. */
export async function getSalesAnalytics(
  token: string,
  period: "daily" | "monthly" | "yearly" = "monthly",
): Promise<SalesPoint[]> {
  return requestData("/orders/analytics/sales", z.array(salesPointSchema), {
    query: { period },
    token,
    revalidate: false,
  });
}
