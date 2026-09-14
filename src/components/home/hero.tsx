"use client";

import { m } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HeroSlide } from "@/content/home";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { Magnetic } from "@/components/motion/magnetic";
import { DURATION, EASE_OUT } from "@/components/motion/tokens";
import { useMotionPreference } from "@/components/motion/use-motion-preference";
import { cn } from "@/lib/utils/cn";

const AUTOPLAY_MS = 7000;

/**
 * The hero carousel.
 *
 * Three constraints from AGENTS.md section 5 shape this:
 *  - The LCP image must not be delayed. Slide 0's image is `priority` and
 *    starts fully opaque; only *subsequent* slides cross-fade.
 *  - Slides are stacked absolutely and cross-faded on opacity, so the box
 *    never resizes and CLS stays at zero.
 *  - Autoplay stops on hover and on keyboard focus, and never starts at all
 *    under reduced motion — an animation the user cannot pause is a trap.
 */
export function Hero({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const { animate } = useMotionPreference();
  const hasMounted = useRef(false);

  const count = slides.length;

  const goTo = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const previous = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  useEffect(() => {
    if (!animate || paused || count < 2) return;
    const timer = setTimeout(next, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [animate, paused, index, next, count]);

  if (count === 0) return null;

  const active = slides[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collections"
      className="relative overflow-hidden rounded-xl bg-muted"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="grid min-h-[26rem] grid-cols-1 md:min-h-[30rem] md:grid-cols-2">
        {/* ------------------------------------------------------- copy */}
        <div className="relative z-10 flex flex-col justify-center gap-5 px-6 py-10 sm:px-10 md:py-14 lg:px-14">
          {/*
            `key` restarts the entrance on each slide change so the copy
            re-enters rather than swapping silently.
          */}
          <m.div
            key={active.id}
            className="flex flex-col gap-5"
            initial={
              animate && hasMounted.current ? { opacity: 0, y: 12 } : false
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
          >
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-secondary">
              {active.eyebrow}
            </p>

            <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              {active.headline.split("\n").map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>

            <p className="max-w-md text-sm leading-relaxed text-ink-secondary sm:text-base">
              {active.body}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <Magnetic>
                <Button href={active.primary.href} size="lg">
                  {active.primary.label}
                  <ArrowRight aria-hidden className="size-4" />
                </Button>
              </Magnetic>

              {active.secondary ? (
                <Button href={active.secondary.href} variant="outline" size="lg">
                  {active.secondary.label}
                </Button>
              ) : null}
            </div>
          </m.div>
        </div>

        {/* ------------------------------------------------------ image */}
        <div className="relative min-h-[16rem] md:min-h-full">
          {slides.map((slide, slideIndex) => {
            const isActive = slideIndex === index;
            const isFirst = slideIndex === 0;

            return (
              <m.div
                key={slide.id}
                className="absolute inset-0"
                // The first slide is the LCP element: it starts visible and
                // is never faded in.
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0,
                  scale: animate && isActive ? 1 : 1.03,
                }}
                transition={
                  animate
                    ? { duration: DURATION.slow, ease: EASE_OUT }
                    : { duration: 0 }
                }
                aria-hidden={!isActive}
              >
                <SmartImage
                  src={slide.image}
                  alt={isActive ? slide.imageAlt : ""}
                  priority={isFirst}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </m.div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------ controls */}
      {count > 1 ? (
        <>
          <CarouselButton
            onClick={previous}
            label="Previous slide"
            className="left-3"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </CarouselButton>

          <CarouselButton onClick={next} label="Next slide" className="right-3">
            <ChevronRight aria-hidden className="size-5" />
          </CarouselButton>

          <div className="absolute bottom-5 left-6 z-20 flex items-center gap-2 sm:left-10 lg:left-14">
            {slides.map((slide, slideIndex) => {
              const isActive = slideIndex === index;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(slideIndex)}
                  aria-label={`Go to slide ${slideIndex + 1}`}
                  aria-current={isActive}
                  className="group grid h-4 place-items-center"
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      isActive
                        ? "w-6 bg-accent"
                        : "w-1.5 bg-line-strong group-hover:bg-ink-muted",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {/* Announce slide changes to screen readers without stealing focus. */}
      <p className="sr-only" aria-live="polite">
        Slide {index + 1} of {count}: {active.eyebrow}
      </p>
    </section>
  );
}

function CarouselButton({
  onClick,
  label,
  className,
  children,
}: {
  onClick: () => void;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full",
        "bg-surface/90 text-ink shadow-card backdrop-blur",
        "transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:scale-105 active:scale-95",
        className,
      )}
    >
      {children}
    </button>
  );
}
