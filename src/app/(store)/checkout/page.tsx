import type { Metadata } from "next";
import { getPublicSettingsSafe } from "@/lib/api/settings";
import { resolveShipping } from "@/lib/api/schemas/settings";
import { Container } from "@/components/ui/layout-primitives";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your HydraaZone order with cash on delivery.",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const settings = await getPublicSettingsSafe();
  const { shippingRate, freeShippingThreshold } = resolveShipping(settings);

  return (
    <Container className="flex flex-col gap-6 py-8 sm:py-12">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
        Checkout
      </h1>

      <CheckoutForm
        shippingRate={shippingRate}
        freeShippingThreshold={freeShippingThreshold}
      />
    </Container>
  );
}
