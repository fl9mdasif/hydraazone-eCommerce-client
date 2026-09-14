import { ArrowRight } from "lucide-react";
import { featureStrip, qualityBanner } from "@/content/home";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

export function QualityBanner() {
  return (
    <Reveal>
      <section className="relative overflow-hidden rounded-lg bg-muted">
        <span className="absolute inset-0">
          <SmartImage
            src={qualityBanner.image}
            alt={qualityBanner.imageAlt}
            sizes="100vw"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-[var(--bg-muted)] via-[var(--bg-muted)]/85 to-[var(--bg-muted)]/30"
          />
        </span>

        <div className="relative z-10 flex max-w-xl flex-col gap-3 px-6 py-12 sm:px-10 sm:py-16">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-ink-secondary">
            {qualityBanner.eyebrow}
          </p>
          <h2 className="font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-3xl">
            {qualityBanner.title}
          </h2>
          <p className="text-sm leading-relaxed text-ink-secondary">
            {qualityBanner.body}
          </p>
          <div className="mt-2">
            <Button href={qualityBanner.href} variant="outline" size="sm">
              {qualityBanner.cta}
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

/** The four-up value strip that closes the page body. */
export function FeatureStrip() {
  return (
    <Stagger
      as="ul"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4"
    >
      {featureStrip.map((feature) => (
        <StaggerItem
          as="li"
          key={feature.id}
          className="flex flex-col items-center gap-2 bg-surface px-4 py-8 text-center"
        >
          <span className="grid size-11 place-items-center rounded-full bg-muted">
            <Icon name={feature.icon} className="size-5 text-ink" />
          </span>
          <span className="text-sm font-medium text-ink">{feature.title}</span>
          <span className="max-w-[14rem] text-xs leading-relaxed text-ink-secondary">
            {feature.body}
          </span>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
