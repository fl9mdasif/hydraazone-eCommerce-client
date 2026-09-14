import { z } from "zod";

export const orderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
]);

export const paymentStatusSchema = z.enum([
  "pending",
  "paid",
  "failed",
  "refunded",
]);

/** Only COD ships, though the server enum allows more. */
export const paymentMethodSchema = z.enum([
  "cod",
  "bkash",
  "nagad",
  "card",
  "bank",
]);

/** `items[].product` is populated as `name thumbnail slug` on read routes. */
const orderProductSchema = z
  .union([
    z.object({
      _id: z.string(),
      name: z.string(),
      slug: z.string().nullish(),
      thumbnail: z.string().nullish(),
    }),
    z.string(),
  ])
  .transform((value) =>
    typeof value === "string" ? { _id: value, name: "", slug: null, thumbnail: null } : value,
  );

/**
 * A price snapshot taken at order time. `variant.price` is the LIST price;
 * the amount actually charged for the line is `totalPrice`, computed from
 * `discountPrice ?? price`.
 */
export const orderVariantSchema = z.object({
  variantId: z.string(),
  name: z.string(),
  sku: z.string(),
  price: z.number(),
  discountPrice: z.number().nullish(),
});

export const orderItemSchema = z.object({
  _id: z.string().nullish(),
  product: orderProductSchema,
  variant: orderVariantSchema,
  quantity: z.number(),
  totalPrice: z.number(),
  isReviewed: z.boolean().default(false),
});

export const shippingAddressSchema = z.object({
  _id: z.string().nullish(),
  fullName: z.string(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  district: z.string(),
  postalCode: z.string().nullish(),
  country: z.string().default("Bangladesh"),
});

export const statusHistorySchema = z.object({
  _id: z.string().nullish(),
  status: z.string(),
  note: z.string().nullish(),
  changedAt: z.string().nullish(),
});

export const orderSchema = z.object({
  _id: z.string(),
  /** Format `ORD-YYYYMMDD-NNNN`, where NNNN is random, not sequential. */
  orderNumber: z.string(),
  user: z.unknown().nullish(),
  items: z.array(orderItemSchema).default([]),
  shippingAddress: shippingAddressSchema,
  paymentMethod: paymentMethodSchema,
  paymentStatus: paymentStatusSchema.default("pending"),
  transactionId: z.string().nullish(),
  subtotal: z.number(),
  shippingCharge: z.number().default(0),
  discount: z.number().default(0),
  totalAmount: z.number(),
  orderStatus: orderStatusSchema.default("pending"),
  statusHistory: z.array(statusHistorySchema).default([]),
  deliveredAt: z.string().nullish(),
  cancelledAt: z.string().nullish(),
  cancelReason: z.string().nullish(),
  note: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});

export const orderListSchema = z.array(orderSchema);

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

/** Only `pending` and `confirmed` orders can be cancelled, by the owner. */
export const CANCELLABLE_STATUSES: OrderStatus[] = ["pending", "confirmed"];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};
