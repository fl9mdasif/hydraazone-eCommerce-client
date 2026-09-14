import { trustItems } from "@/content/home";
import { Icon } from "@/components/ui/icon";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { formatCurrency } from "@/lib/utils/format";

/**
 * The four-up trust strip under the hero.
 *
 * The free-shipping threshold is live data from `GET /settings`, not copy —
 * an admin changing it in the dashboard changes this line.
 */
export function TrustBar({
  freeShippingThreshold,
}: {
  freeShippingThreshold: number;
}) {
  return (
    <Stagger
      as="ul"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4"
    >
      {trustItems.map((item) => (
        <StaggerItem
          as="li"
          key={item.id}
          className="flex items-center gap-3 bg-surface px-4 py-5 sm:px-6"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
            <Icon name={item.icon} className="size-5 text-ink" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-medium text-ink">{item.title}</span>
            <span className="truncate text-xs text-ink-secondary">
              {item.id === "shipping"
                ? `On orders over ${formatCurrency(freeShippingThreshold)}`
                : item.body}
            </span>
          </span>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
