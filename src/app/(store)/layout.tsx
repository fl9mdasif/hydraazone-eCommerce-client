import { getCategoriesSafe } from "@/lib/api/categories";
import { getPublicSettingsSafe } from "@/lib/api/settings";
import { resolveShipping } from "@/lib/api/schemas/settings";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FloatingContact } from "@/components/layout/floating-contact";

/**
 * Shell for every public storefront route.
 *
 * Categories and settings are fetched once here rather than per page, and
 * both use the `*Safe` variants: a settings outage must not be able to take
 * down the whole storefront, it just means the contact buttons do not render.
 */
export default async function StoreLayout({
  children,
}: LayoutProps<"/">) {
  const [categories, settings] = await Promise.all([
    getCategoriesSafe(),
    getPublicSettingsSafe(),
  ]);

  const { freeShippingThreshold } = resolveShipping(settings);

  return (
    <>
      <Header categories={categories} />

      <main className="flex-1">{children}</main>

      <Footer
        categories={categories}
        freeShippingThreshold={freeShippingThreshold}
        whatsappNumber={settings.whatsappNumber}
      />

      <FloatingContact
        whatsappNumber={settings.whatsappNumber}
        messengerPageId={settings.messengerPageId}
      />
    </>
  );
}
