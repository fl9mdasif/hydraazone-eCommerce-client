import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/lib/api/schemas/category";
import { SmartImage } from "@/components/ui/smart-image";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

/**
 * The circular category rail. Live data from `GET /categories`.
 *
 * Scrolls horizontally with snap points on narrow screens rather than
 * wrapping, which keeps the row reading as one continuous rail on a phone —
 * where most of this store's traffic will be.
 */
export function CategoryRail({ categories }: { categories: Category[] }) {
  // Nothing to show is a legitimate state, not an error. Render nothing
  // rather than an empty rail with a lone "view all" circle.
  if (categories.length === 0) return null;

  return (
    <Stagger
      as="ul"
      className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:justify-center sm:px-0 lg:gap-6"
    >
      {categories.map((category) => (
        <StaggerItem
          as="li"
          key={category._id}
          className="w-20 shrink-0 snap-start sm:w-24"
        >
          <Link
            href={`/category/${category.slug}`}
            className="group flex flex-col items-center gap-2.5"
          >
            <span className="relative block size-20 overflow-hidden rounded-full bg-muted ring-1 ring-line transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-warm sm:size-24">
              <SmartImage
                src={category.thumbnail}
                alt={category.name}
                sizes="96px"
              />
            </span>
            <span className="line-clamp-2 text-center text-xs font-medium leading-tight text-ink">
              {category.name}
            </span>
          </Link>
        </StaggerItem>
      ))}

      <StaggerItem as="li" className="w-20 shrink-0 snap-start sm:w-24">
        <Link href="/shop" className="group flex flex-col items-center gap-2.5">
          <span className="grid size-20 place-items-center rounded-full bg-inverse text-ink-inverse transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 sm:size-24">
            <ArrowRight
              aria-hidden
              strokeWidth={1.5}
              className="size-5 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
          <span className="text-center text-xs font-medium leading-tight text-ink">
            View all
          </span>
        </Link>
      </StaggerItem>
    </Stagger>
  );
}
