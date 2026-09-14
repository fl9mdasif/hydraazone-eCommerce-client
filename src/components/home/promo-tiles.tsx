import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { offerTile, promoTiles } from "@/content/home";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

/**
 * Three editorial promo tiles plus the dark offer card, matching the
 * reference design. Content comes from `content/home.ts`; every tile links
 * to a real shop or category route.
 */
export function PromoTiles() {
  return (
    <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {promoTiles.map((tile) => (
        <StaggerItem key={tile.id}>
          <Link
            href={tile.href}
            className="group relative flex h-full min-h-[13rem] flex-col justify-between overflow-hidden rounded-lg bg-muted p-5"
          >
            {/* Image sits behind the copy, scaling on hover. Transform only. */}
            <span className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
              <span className="absolute inset-0 block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
                <SmartImage
                  src={tile.image}
                  alt={tile.imageAlt}
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
              </span>
            </span>

            <span className="relative z-10 flex flex-col gap-1.5">
              <span className="font-display text-lg font-medium leading-tight tracking-tight text-ink">
                {tile.title}
              </span>
              <span className="max-w-[10rem] text-xs leading-relaxed text-ink-secondary">
                {tile.body}
              </span>
            </span>

            <span className="relative z-10 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
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
            <span className="font-display text-2xl font-medium leading-tight tracking-tight">
              {offerTile.title}
            </span>
            <span className="text-xs leading-relaxed text-ink-inverse/70">
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
