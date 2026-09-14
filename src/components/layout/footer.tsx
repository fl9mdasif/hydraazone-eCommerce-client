import Link from "next/link";
import type { Category } from "@/lib/api/schemas/category";
import { footerNav } from "@/content/home";
import { Container } from "@/components/ui/layout-primitives";
import { formatCurrency } from "@/lib/utils/format";

export function Footer({
  categories,
  freeShippingThreshold,
  whatsappNumber,
}: {
  categories: Category[];
  freeShippingThreshold: number;
  whatsappNumber?: string | null;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 bg-inverse text-ink-inverse">
      <Container>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <p className="font-display text-lg font-semibold uppercase tracking-[0.2em]">
              HydraaZone
            </p>
            <p className="max-w-xs text-sm leading-relaxed text-ink-inverse/70">
              Curated products for a better lifestyle. Cash on delivery across
              Bangladesh, with free shipping over{" "}
              {formatCurrency(freeShippingThreshold)}.
            </p>
          </div>

          <FooterColumn title="Shop">
            {categories.slice(0, 6).map((category) => (
              <FooterLink
                key={category._id}
                href={`/category/${category.slug}`}
                label={category.name}
              />
            ))}
          </FooterColumn>

          <FooterColumn title="Help">
            {footerNav.help.map((item) => (
              <FooterLink key={item.href} href={item.href} label={item.label} />
            ))}
          </FooterColumn>

          <FooterColumn title="Contact">
            {whatsappNumber ? (
              <li>
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ink-inverse/70 transition-colors hover:text-ink-inverse"
                >
                  WhatsApp us
                </a>
              </li>
            ) : null}
            <li className="text-sm text-ink-inverse/70">
              Payment on delivery only
            </li>
          </FooterColumn>
        </div>

        <div className="flex flex-col gap-2 border-t border-ink-inverse/15 py-6 text-xs text-ink-inverse/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} HydraaZone. All rights reserved.</p>
          <p>Cash on delivery · Bangladesh</p>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-ink-inverse/50">
        {title}
      </h2>
      <ul className="flex flex-col gap-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-ink-inverse/70 transition-colors hover:text-ink-inverse"
      >
        {label}
      </Link>
    </li>
  );
}
