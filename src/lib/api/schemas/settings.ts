import { z } from "zod";

/**
 * The PUBLIC projection from `settings/service.settings.ts::getPublicSettings`.
 *
 * Two things to know:
 * 1. `fbConversionApiToken` and `lowStockThreshold` are deliberately withheld
 *    from this endpoint. They must never appear in a client bundle.
 * 2. On a fresh install every field is unset, so `GET /settings` legitimately
 *    returns `data: {}`. Every field here is optional by design — treat a
 *    missing value as "not configured", never as an error.
 */
export const publicSettingsSchema = z.object({
  fbPixelId: z.string().nullish(),
  gaId: z.string().nullish(),
  gtmId: z.string().nullish(),
  searchConsoleTag: z.string().nullish(),
  whatsappNumber: z.string().nullish(),
  messengerPageId: z.string().nullish(),
  shippingRate: z.number().nullish(),
  freeShippingThreshold: z.number().nullish(),
});

export type PublicSettings = z.infer<typeof publicSettingsSchema>;

/**
 * Display-only fallbacks, matching `order/const.order.ts`. The server
 * recomputes the real total at order time and its number always wins — these
 * exist purely so the cart can show an estimate before checkout.
 */
export const SHIPPING_CHARGE_FALLBACK = 60;
export const FREE_SHIPPING_THRESHOLD_FALLBACK = 10000;

export function resolveShipping(settings: PublicSettings | null | undefined) {
  return {
    shippingRate: settings?.shippingRate ?? SHIPPING_CHARGE_FALLBACK,
    freeShippingThreshold:
      settings?.freeShippingThreshold ?? FREE_SHIPPING_THRESHOLD_FALLBACK,
  };
}
