import Link from "next/link";

/** Root fallback for URLs that fall outside every route group. */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-5xl font-medium tracking-tight text-ink">
        404
      </p>
      <h1 className="font-display text-xl font-medium text-ink">
        Page not found
      </h1>
      <Link
        href="/"
        className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-on-accent"
      >
        Go home
      </Link>
    </div>
  );
}
