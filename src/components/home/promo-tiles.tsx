import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { OfferTile, PromoTile } from "@/lib/api/schemas/homepage";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

/**
 * Three editorial promo tiles plus the dark offer card, matching the
 * reference design. Content comes from `GET /homepage`, admin-editable
 * from the dashboard's Homepage section — every tile links to a real shop
 * or category route.
 */
export function PromoTiles({
  promoTiles,
  offerTile,
}: {
  promoTiles: PromoTile[];
  offerTile: OfferTile;
}) {
  return (
    <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {promoTiles.map((tile) => (
        <StaggerItem key={tile.id}>
          <Link
            href={tile.href}
            className="group relative flex h-full min-h-[13rem] flex-col justify-between overflow-hidden rounded-lg bg-muted p-5"
          >
            {/* Full-bleed background photo, not the old half-width split —
                the scrim is what keeps the (now white) copy legible over it. */}
            <span className="absolute inset-0 overflow-hidden">
              <span className="absolute inset-0 block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
                <SmartImage
                  src={tile.image}
                  alt={tile.imageAlt}
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
              </span>
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"
              />
            </span>

            <span className="relative z-10 flex flex-col gap-1.5">
              <span
                className="font-display text-lg font-medium leading-tight tracking-tight text-white"
                style={tile.headingColor ? { color: tile.headingColor } : undefined}
              >
                {tile.title}
              </span>
              <span
                className="max-w-[10rem] text-xs leading-relaxed text-white/80"
                style={tile.bodyColor ? { color: tile.bodyColor } : undefined}
              >
                {tile.body}
              </span>
            </span>

            <span className="relative z-10 inline-flex items-center gap-1.5 text-sm font-medium text-white">
              {tile.cta}
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        </StaggerItem>
      ))}

      <StaggerItem>
        <div className="flex h-full min-h-[13rem] flex-col justify-between gap-4 rounded-lg bg-inverse p-5 text-ink-inverse">
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-warm">
              {offerTile.eyebrow}
            </span>
            <span
              className="font-display text-2xl font-medium leading-tight tracking-tight"
              style={offerTile.headingColor ? { color: offerTile.headingColor } : undefined}
            >
              {offerTile.title}
            </span>
            <span
              className="text-xs leading-relaxed text-ink-inverse/70"
              style={offerTile.bodyColor ? { color: offerTile.bodyColor } : undefined}
            >
              {offerTile.body}
            </span>
          </div>

          <Button href={offerTile.href} variant="inverse" size="sm">
            {offerTile.cta}
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        </div>
      </StaggerItem>
    </Stagger>
  );
}
