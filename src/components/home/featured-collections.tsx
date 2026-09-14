import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { collections } from "@/content/home";
import { SmartImage } from "@/components/ui/smart-image";
import { Reveal } from "@/components/motion/reveal";

/**
 * One large collection card beside two stacked cards, as in the reference
 * design. Each links to a real category slug.
 */
export function FeaturedCollections() {
  const [lead, ...rest] = collections;
  if (!lead) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Reveal className="h-full">
        <CollectionCard
          href={lead.href}
          title={lead.title}
          body={lead.body}
          cta={lead.cta}
          image={lead.image}
          imageAlt={lead.imageAlt}
          className="min-h-[22rem] lg:min-h-[26rem]"
          titleClassName="text-3xl sm:text-4xl"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </Reveal>

      <div className="grid gap-4">
        {rest.map((collection, index) => (
          <Reveal key={collection.id} delay={0.08 * (index + 1)} className="h-full">
            <CollectionCard
              href={collection.href}
              title={collection.title}
              body={collection.body}
              cta={collection.cta}
              image={collection.image}
              imageAlt={collection.imageAlt}
              className="min-h-[10.5rem] lg:min-h-[12.5rem]"
              titleClassName="text-xl sm:text-2xl"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function CollectionCard({
  href,
  title,
  body,
  cta,
  image,
  imageAlt,
  className,
  titleClassName,
  sizes,
}: {
  href: string;
  title: string;
  body: string;
  cta: string;
  image: string;
  imageAlt: string;
  className?: string;
  titleClassName?: string;
  sizes: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex h-full overflow-hidden rounded-lg bg-muted ${className ?? ""}`}
    >
      <span className="absolute inset-y-0 right-0 w-3/5 overflow-hidden">
        <span className="absolute inset-0 block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
          <SmartImage src={image} alt={imageAlt} sizes={sizes} />
        </span>
        {/* Keeps the copy readable where the photo runs behind it. */}
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-[var(--bg-muted)] via-[var(--bg-muted)]/60 to-transparent"
        />
      </span>

      <span className="relative z-10 flex max-w-[62%] flex-col justify-center gap-2 p-6 sm:p-8">
        <span
          className={`font-display font-medium leading-tight tracking-tight text-ink ${titleClassName ?? ""}`}
        >
          {title}
        </span>
        <span className="text-sm leading-relaxed text-ink-secondary">{body}</span>
        <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
          {cta}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5"
          />
        </span>
      </span>
    </Link>
  );
}
