import type { Metadata } from "next";
import { Container } from "@/components/ui/layout-primitives";
import { OrderConfirmation } from "@/components/store/order-confirmation";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false },
};

/*
 * The server's `GET /orders/:orderId` resolves by Mongoose `_id` only (no
 * slug/orderNumber lookup, unlike products and categories) — so this route
 * is keyed on the Mongo id, with the human-readable `orderNumber` shown as
 * page content instead.
 */
export default async function OrderConfirmationPage(
  props: PageProps<"/order/[id]">,
) {
  const { id } = await props.params;

  return (
    <Container className="py-10 sm:py-16">
      <OrderConfirmation orderId={id} />
    </Container>
  );
}
