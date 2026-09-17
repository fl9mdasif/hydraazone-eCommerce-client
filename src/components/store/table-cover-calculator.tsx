"use client";

import { useRouter } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { Product, Variant } from "@/lib/api/schemas/product";
import {
  MAX_WIDTH_IN,
  isMostPopular,
  priceForVariant,
  ratePerSqFt,
  sizeLabel,
  squareFeet,
  squareInches,
  thicknessLabel,
  validateDimensions,
} from "@/lib/utils/table-cover";
import { formatCurrency } from "@/lib/utils/format";
import { useCart } from "@/lib/hooks/use-cart";
import { useWishlist } from "@/lib/hooks/use-wishlist";
import { useWishlistStore } from "@/stores/wishlist";
import { SmartImage } from "@/components/ui/smart-image";
import { Badge, StarRating } from "@/components/ui/layout-primitives";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Magnetic } from "@/components/motion/magnetic";
import { CountUp } from "@/components/motion/count-up";
import { DURATION, EASE_OUT, SPRING } from "@/components/motion/tokens";
import { useMotionPreference } from "@/components/motion/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/** Matches the reference mockup's "Product Details" checklist. */
const DETAIL_BULLETS = [
  "Made according to your exact size.",
  "Length can be any measurement.",
  `Maximum width is ${MAX_WIDTH_IN} inches.`,
  "Price is automatically calculated based on your entered area.",
  "Premium crystal clear transparent material.",
  "Suitable for dining tables, office desks, study tables, and kitchen counters.",
];

const FEATURES: { icon: "ruler" | "maximize" | "gem" | "droplet" | "thermometer" | "sparkles"; label: string }[] = [
  { icon: "ruler", label: "Custom Size Available" },
  { icon: "maximize", label: `Maximum Width ${MAX_WIDTH_IN} Inches` },
  { icon: "gem", label: "Crystal Clear PVC" },
  { icon: "droplet", label: "Waterproof" },
  { icon: "thermometer", label: "Heat Resistant" },
  { icon: "sparkles", label: "Easy to Clean" },
];

interface Calculated {
  length: number;
  width: number;
  sqIn: number;
  sqFt: number;
}

/**
 * The Transparent Table Cover product page: enter Length/Width, pick a
 * thickness, see the price computed live, add to cart or order via
 * WhatsApp.
 *
 * See `lib/utils/table-cover.ts` for how the pricing reaches the server —
 * each variant's `price` is a rate PER SQUARE INCH, and `squareInches(L, W)`
 * is what gets sent as `quantity`, so `variant.price * quantity` (computed
 * identically by the server) reproduces the intended per-square-foot price
 * with no rounding drift.
 *
 * Deliberately not built on `<ProductDetail>` — the shape here (a
 * calculator with an explicit "Calculate" step, three thickness cards
 * instead of a pill row, a feature grid, a WhatsApp CTA) is different
 * enough that reusing it would mean threading calculator-only state
 * through a component that has no other use for it. Shared conventions
 * (gallery pattern, the moving-pill `layoutId` technique, the add-to-cart
 * checkmark morph, `Magnetic`/`useCart`/`useWishlistStore`) are reused
 * directly; nothing here is invented.
 */
export function TableCoverCalculator({
  product,
  whatsappNumber,
}: {
  product: Product;
  whatsappNumber?: string | null;
}) {
  const router = useRouter();
  const { animate } = useMotionPreference();
  const { addCustomItem } = useCart();

  const wishlisted = useWishlistStore((state) =>
    state.productIds.includes(product._id),
  );
  const { toggle: toggleWishlist } = useWishlist();

  const [lengthInput, setLengthInput] = useState("");
  const [widthInput, setWidthInput] = useState("");
  const [dimError, setDimError] = useState<string | null>(null);
  const [calculated, setCalculated] = useState<Calculated | null>(null);

  const [variantId, setVariantId] = useState(() => {
    const popular = product.variants.find(isMostPopular);
    return popular?._id ?? product.variants[0]?._id ?? "";
  });
  const variant = useMemo(
    () => product.variants.find((candidate) => candidate._id === variantId) ?? null,
    [product.variants, variantId],
  );

  const [covers, setCovers] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);

  const images = useMemo(() => {
    const pool = [
      ...(variant?.images ?? []),
      product.thumbnail,
      ...product.gallery,
    ].filter(Boolean);
    return Array.from(new Set(pool));
  }, [variant, product.thumbnail, product.gallery]);

  function handleCalculate(event: FormEvent) {
    event.preventDefault();
    const length = Number(lengthInput);
    const width = Number(widthInput);
    const error = validateDimensions(length, width);

    if (error) {
      setDimError(error);
      setCalculated(null);
      return;
    }

    setDimError(null);
    setCalculated({
      length,
      width,
      sqIn: squareInches(length, width),
      sqFt: squareFeet(length, width),
    });
    setCovers(1);
  }

  // Editing a dimension after calculating invalidates the result, so the
  // displayed price can never drift from what's actually in the inputs.
  function handleDimensionChange(setter: (value: string) => void, value: string) {
    setter(value);
    if (calculated) setCalculated(null);
  }

  const totalPerCover =
    calculated && variant ? priceForVariant(variant, calculated.sqIn) : null;
  const grandTotal = totalPerCover !== null ? totalPerCover * covers : null;
  const canAct = Boolean(calculated && variant);

  function currentLabel(target: Variant): string {
    if (!calculated) return target.name;
    return sizeLabel(calculated.length, calculated.width, target);
  }

  function handleAddToCart() {
    if (!calculated || !variant) return;
    addCustomItem({
      product,
      variant,
      sqInPerCover: calculated.sqIn,
      covers,
      customLabel: currentLabel(variant),
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  function handleBuyNow() {
    if (!calculated || !variant) return;
    addCustomItem({
      product,
      variant,
      sqInPerCover: calculated.sqIn,
      covers,
      customLabel: currentLabel(variant),
    });
    router.push("/checkout");
  }

  const whatsappDigits = whatsappNumber?.replace(/[^\d]/g, "");
  const whatsappHref =
    whatsappDigits && calculated && variant && grandTotal !== null
      ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
          `Hi, I'd like to order a ${product.name} — ${calculated.length}" × ${calculated.width}" (${calculated.sqFt.toFixed(2)} sq ft), ${variant.name} thickness. Quantity: ${covers}. Estimated total: ${formatCurrency(grandTotal)}.`,
        )}`
      : null;

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* ---------------------------------------------------------- gallery */}
      <div className="flex flex-col gap-3">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          <AnimatePresence mode="wait">
            <m.div
              key={images[activeImage] ?? "empty"}
              className="absolute inset-0"
              initial={animate ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              exit={animate ? { opacity: 0 } : undefined}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            >
              <SmartImage
                src={images[activeImage]}
                alt={product.name}
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                fallbackLabel={product.name}
              />
            </m.div>
          </AnimatePresence>
        </div>

        {images.length > 1 ? (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <li key={image}>
                <button
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                  aria-current={index === activeImage}
                  className={cn(
                    "relative size-16 shrink-0 overflow-hidden rounded-md bg-muted transition-all duration-200",
                    index === activeImage
                      ? "ring-2 ring-accent"
                      : "ring-1 ring-line hover:ring-line-strong",
                  )}
                >
                  <SmartImage src={image} alt="" sizes="64px" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* ----------------------------------------------------------- detail */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          {product.category ? (
            <p className="text-xs uppercase tracking-[0.16em] text-ink-secondary">
              {product.category.name}
            </p>
          ) : null}

          <h1 className="font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-3xl">
            {product.name}
          </h1>

          {product.reviewCount > 0 ? (
            <StarRating rating={product.rating} count={product.reviewCount} size="md" />
          ) : (
            <p className="text-xs text-ink-muted">No reviews yet</p>
          )}

          <p className="text-sm text-ink-secondary">
            Custom size price calculator — protect your table with crystal
            clear premium PVC, cut to your exact measurements.
          </p>
        </div>

        {/* ---------------------------------------------------- 1. size form */}
        <form
          onSubmit={handleCalculate}
          className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5"
        >
          <h2 className="text-sm font-medium text-ink">1. Enter Your Size</h2>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Length (inch)" required>
              {(fieldProps) => (
                <TextInput
                  {...fieldProps}
                  type="number"
                  inputMode="decimal"
                  min={1}
                  required
                  value={lengthInput}
                  onChange={(event) =>
                    handleDimensionChange(setLengthInput, event.target.value)
                  }
                  placeholder="e.g. 72"
                />
              )}
            </Field>

            <Field label={`Width (inch, max ${MAX_WIDTH_IN})`} required>
              {(fieldProps) => (
                <TextInput
                  {...fieldProps}
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={MAX_WIDTH_IN}
                  required
                  value={widthInput}
                  onChange={(event) =>
                    handleDimensionChange(setWidthInput, event.target.value)
                  }
                  placeholder="e.g. 42"
                />
              )}
            </Field>
          </div>

          <FormError message={dimError} />

          <Button type="submit" fullWidth>
            Calculate Price
          </Button>
        </form>

        {/* ----------------------------------------------- 2. result summary */}
        <div className="rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-3 text-sm font-medium text-ink">
            2. Calculation Result
          </h2>

          {calculated ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              <StatTile label="Square Inch" value={calculated.sqIn.toLocaleString()} />
              <StatTile
                label="Square Foot"
                value={calculated.sqFt.toFixed(2)}
                sub={`${calculated.length} × ${calculated.width} ÷ 144`}
              />
              <StatTile
                label="Total Area"
                value={`${calculated.sqFt.toFixed(2)} sq ft`}
                emphasis
              />
            </div>
          ) : (
            <p className="text-sm text-ink-secondary">
              Enter your length and width above, then select Calculate Price
              to see your area.
            </p>
          )}
        </div>

        {/* -------------------------------------------------- 3. thickness */}
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-ink">
            3. Choose Thickness
          </legend>

          <div className="grid gap-3 sm:grid-cols-3">
            {product.variants.map((candidate) => {
              const selected = candidate._id === variantId;
              const rate = ratePerSqFt(candidate);
              const total = calculated
                ? priceForVariant(candidate, calculated.sqIn)
                : null;

              return (
                <button
                  key={candidate._id}
                  type="button"
                  onClick={() => setVariantId(candidate._id)}
                  aria-pressed={selected}
                  className={cn(
                    "relative flex flex-col gap-2 overflow-hidden rounded-lg border p-4 text-left transition-colors duration-200",
                    selected ? "border-accent" : "border-line hover:border-line-strong",
                  )}
                >
                  {/* The moving background: one shared layoutId slides
                      between the three cards on selection, the same
                      technique the normal variant picker uses. */}
                  {selected ? (
                    <m.span
                      layoutId={animate ? "table-cover-thickness" : undefined}
                      className="absolute inset-0 bg-warm-soft"
                      transition={SPRING}
                    />
                  ) : null}

                  <span className="relative z-10 flex flex-col gap-2">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">
                        {candidate.name}
                      </span>
                      {isMostPopular(candidate) ? (
                        <Badge tone="sale">Most Popular</Badge>
                      ) : null}
                    </span>

                    {thicknessLabel(candidate) ? (
                      <span className="text-xs text-ink-secondary">
                        {thicknessLabel(candidate)}
                      </span>
                    ) : null}

                    {rate !== null ? (
                      <span className="text-xs text-ink-muted">
                        {calculated
                          ? `${calculated.sqFt.toFixed(2)} × ${formatCurrency(rate)}`
                          : `${formatCurrency(rate)} / sq ft`}
                      </span>
                    ) : null}

                    <AnimatePresence mode="wait">
                      {total !== null ? (
                        <CountUp
                          key={`${candidate._id}-${calculated?.sqIn}`}
                          value={total}
                          format={formatCurrency}
                          className="font-display text-xl font-medium text-ink"
                        />
                      ) : (
                        <span className="font-display text-xl font-medium text-ink-muted">
                          —
                        </span>
                      )}
                    </AnimatePresence>

                    <span
                      className={cn(
                        "mt-1 inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                        selected
                          ? "border-accent bg-accent text-on-accent"
                          : "border-line text-ink",
                      )}
                    >
                      {selected ? (
                        <>
                          <Check aria-hidden className="size-3.5" />
                          Selected
                        </>
                      ) : (
                        "Select"
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* ------------------------------------------------------ quantity */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-ink">Quantity</span>
          <div className="flex items-center rounded-full border border-line">
            <StepButton
              onClick={() => setCovers((value) => Math.max(1, value - 1))}
              disabled={covers <= 1}
              label="Decrease quantity"
            >
              <Minus aria-hidden className="size-4" />
            </StepButton>
            <span
              className="w-10 text-center text-sm tabular-nums text-ink"
              aria-live="polite"
            >
              {covers}
            </span>
            <StepButton
              onClick={() => setCovers((value) => value + 1)}
              disabled={false}
              label="Increase quantity"
            >
              <Plus aria-hidden className="size-4" />
            </StepButton>
          </div>

          {covers > 1 && grandTotal !== null ? (
            <p className="text-sm text-ink-secondary" aria-live="polite">
              × {covers} covers ={" "}
              <span className="font-medium text-ink">
                {formatCurrency(grandTotal)}
              </span>
            </p>
          ) : null}
        </div>

        {/* -------------------------------------------------------- features */}
        <ul className="grid grid-cols-3 gap-x-3 gap-y-4 border-y border-line py-5 sm:grid-cols-6">
          {FEATURES.map((feature) => (
            <li key={feature.label} className="flex flex-col items-center gap-1.5 text-center">
              <Icon name={feature.icon} className="size-5 text-ink-secondary" />
              <span className="text-[0.7rem] leading-tight text-ink-secondary">
                {feature.label}
              </span>
            </li>
          ))}
        </ul>

        {/* --------------------------------------------------------- actions */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <Magnetic className="flex-1">
              <Button onClick={handleBuyNow} size="lg" fullWidth disabled={!canAct}>
                Buy Now
              </Button>
            </Magnetic>

            <Button
              onClick={handleAddToCart}
              variant="outline"
              size="lg"
              className="flex-1"
              disabled={!canAct}
              aria-label={`Add ${product.name} to cart`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {added ? (
                  <m.span
                    key="added"
                    initial={animate ? { opacity: 0, scale: 0.9 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={animate ? { opacity: 0, scale: 0.9 } : undefined}
                    transition={{ duration: DURATION.instant, ease: EASE_OUT }}
                    className="inline-flex items-center gap-2"
                  >
                    <Check aria-hidden className="size-4" />
                    Added
                  </m.span>
                ) : (
                  <m.span
                    key="add"
                    initial={animate ? { opacity: 0, scale: 0.9 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={animate ? { opacity: 0, scale: 0.9 } : undefined}
                    transition={{ duration: DURATION.instant, ease: EASE_OUT }}
                    className="inline-flex items-center gap-2"
                  >
                    <ShoppingBag aria-hidden className="size-4" />
                    Add to Cart
                  </m.span>
                )}
              </AnimatePresence>
            </Button>

            {whatsappHref ? (
              <Button
                href={whatsappHref}
                external
                variant="success-outline"
                size="lg"
                className="flex-1"
              >
                Order via WhatsApp
              </Button>
            ) : null}
          </div>

          <Button
            onClick={() => toggleWishlist(product._id)}
            variant="outline"
            fullWidth
            aria-pressed={wishlisted}
          >
            <Heart
              aria-hidden
              className={cn(
                "size-4 transition-colors",
                wishlisted && "fill-danger text-danger",
              )}
            />
            {wishlisted ? "Saved to Wishlist" : "Add to Wishlist"}
          </Button>

          {!canAct ? (
            <p className="text-center text-xs text-ink-muted">
              Enter your size and select Calculate Price to continue.
            </p>
          ) : null}
        </div>

        {/* ------------------------------------------------------- details */}
        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <h2 className="text-sm font-medium text-ink">Product Details</h2>
          {/* `description` is rich text (HTML) from the admin's
              RichTextEditor — admin-authored, same trust boundary as any
              CMS description field. */}
          <div
            className="text-sm leading-relaxed text-ink-secondary [&_a]:text-accent [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />

          <ul className="mt-1 flex flex-col gap-2">
            {DETAIL_BULLETS.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2 text-sm text-ink-secondary">
                <CheckCircle2
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-success"
                />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-md px-2 py-3",
        emphasis ? "bg-success-soft" : "bg-muted",
      )}
    >
      <span className="text-[0.65rem] uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <span
        className={cn(
          "font-display text-lg font-medium",
          emphasis ? "text-success" : "text-ink",
        )}
      >
        {value}
      </span>
      {sub ? <span className="text-[0.65rem] text-ink-muted">{sub}</span> : null}
    </div>
  );
}

function StepButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
