import type { Metadata } from "next";
import { getPublicSettingsSafe } from "@/lib/api/settings";
import { resolveShipping } from "@/lib/api/schemas/settings";
import { Container } from "@/components/ui/layout-primitives";
import { CartView } from "@/components/store/cart-view";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review the items in your HydraaZone cart.",
  alternates: { canonical: "/cart" },
  robots: { index: false },
};

export default async function CartPage() {
  const settings = await getPublicSettingsSafe();
  const { shippingRate, freeShippingThreshold } = resolveShipping(settings);

  return (
    <Container className="flex flex-col gap-6 py-8 sm:py-12">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
        Your cart
      </h1>

      <CartView
        shippingRate={shippingRate}
        freeShippingThreshold={freeShippingThreshold}
      />
    </Container>
  );
}
