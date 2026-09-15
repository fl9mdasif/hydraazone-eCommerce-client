import { EmptyState } from "@/components/ui/layout-primitives";

/**
 * Honest placeholder for the sidebar sections not yet built out
 * (Orders/Products/Categories/Reviews/Settings/Users management). The nav
 * link is real and goes somewhere real — this is transparent scoping, not
 * fake content: "not built yet" stated plainly, never a blank page or a 404.
 */
export function ComingSoon({ section }: { section: string }) {
  return (
    <EmptyState
      title={`${section} — coming soon`}
      description="This section of the dashboard is being built next. The overview page already reflects your live data."
      className="mt-6"
    />
  );
}
