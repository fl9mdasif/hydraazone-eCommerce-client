import {
  Award,
  Headset,
  RefreshCw,
  Tag,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "@/content/home";

/**
 * Maps the icon names used in `content/home.ts` onto components, so the
 * content file stays plain serialisable data rather than importing React.
 */
const ICONS: Record<IconName, LucideIcon> = {
  truck: Truck,
  refresh: RefreshCw,
  wallet: Wallet,
  headset: Headset,
  award: Award,
  tag: Tag,
  trending: TrendingUp,
  users: Users,
};

export function Icon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  const Component = ICONS[name];
  return <Component aria-hidden className={className} strokeWidth={1.5} />;
}
