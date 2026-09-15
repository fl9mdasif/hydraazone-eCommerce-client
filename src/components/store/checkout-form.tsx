"use client";

import { useRouter } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import { AlertTriangle, Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { guestCheckout, login } from "@/lib/api/auth";
import { placeOrder } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/client";
import { useCart } from "@/lib/hooks/use-cart";
import { useSession } from "@/lib/hooks/use-session";
import { useStockCheck } from "@/lib/hooks/use-stock-check";
import { customLineNotes, estimateShipping, toOrderItems } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextArea, TextInput } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/layout-primitives";
import { SmartImage } from "@/components/ui/smart-image";
import { Magnetic } from "@/components/motion/magnetic";
import { DURATION, EASE_OUT } from "@/components/motion/tokens";
import { useMotionPreference } from "@/components/motion/use-motion-preference";

interface AddressState {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode: string;
}

const EMPTY_ADDRESS: AddressState = {
  fullName: "",
  phone: "",
  address: "",
  city: "",
  district: "",
  postalCode: "",
};

/**
 * Checkout. COD only.
 *
 * The important flow is the guest one: a brand-new email silently creates an
 * account and returns a token, but an email that ALREADY exists returns 409.
 * That 409 swaps an inline password field into this same form — it must never
 * navigate away, because that would lose the cart.
 *
 * `items` is submitted from the current cart exactly, because the server
 * takes items from the body, ignores the saved cart, and then clears it.
 */
export function CheckoutForm({
  shippingRate,
  freeShippingThreshold,
}: {
  shippingRate: number;
  freeShippingThreshold: number;
}) {
  const router = useRouter();
  const { animate } = useMotionPreference();
  const { lines, subtotal, hydrated, clear, setQuantity, removeItem } = useCart();
  const { token, user, isAuthenticated, setSession } = useSession();

  const [address, setAddress] = useState<AddressState>(EMPTY_ADDRESS);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  /** Set when guest checkout returns 409: this email already has an account. */
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /*
   * A `CartLine`'s stock is a snapshot from whenever it was added — possibly
   * hours or days stale, and `POST /carts` never checks stock either. This
   * revalidates against live product data before the order can be placed,
   * rather than letting the customer fill out the whole form and only then
   * discover a 400 from the server. Called unconditionally (hook rules),
   * before the early returns below.
   */
  const { status: stockStatus, issues: stockIssues, recheck: recheckStock } =
    useStockCheck(lines, hydrated);

  const shipping = estimateShipping(
    subtotal,
    shippingRate,
    freeShippingThreshold,
  );

  if (!hydrated) return <Skeleton className="h-96 w-full" />;

  if (lines.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Add something to your cart before checking out."
        action={
          <Button href="/shop" size="sm">
            Browse the shop
          </Button>
        }
      />
    );
  }

  function update(field: keyof AddressState, value: string) {
    setAddress((current) => ({ ...current, [field]: value }));
  }

  function validate(): string | null {
    if (!address.fullName.trim()) return "Please enter your full name.";
    if (!address.phone.trim()) return "Please enter a phone number.";
    if (!address.address.trim()) return "Please enter a delivery address.";
    if (!address.city.trim()) return "Please enter a city.";
    if (!address.district.trim()) return "Please enter a district.";
    if (!isAuthenticated && !email.includes("@"))
      return "Please enter a valid email address.";
    if (needsLogin && !password) return "Please enter your password.";
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending || stockStatus !== "ok") return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setPending(true);

    try {
      let activeToken = token;

      if (!activeToken) {
        if (needsLogin) {
          // Second pass: they had an account, and have now given a password.
          const session = await login({ email: email.trim(), password });
          setSession(session.user, session.accessToken);
          activeToken = session.accessToken;
        } else {
          try {
            const session = await guestCheckout({
              email: email.trim(),
              fullName: address.fullName.trim(),
              phone: address.phone.trim(),
            });
            setSession(session.user, session.accessToken);
            activeToken = session.accessToken;
          } catch (caught) {
            if (caught instanceof ApiError && caught.isConflict) {
              // Swap in a password field, in place. Cart is untouched.
              setNeedsLogin(true);
              setError(
                "You already have an account with this email. Enter your password to continue.",
              );
              setPending(false);
              return;
            }
            throw caught;
          }
        }
      }

      if (!activeToken) throw new Error("No session token after checkout");

      // Custom-size lines (e.g. the table-cover calculator) have no
      // structured place to store dimensions server-side — the order-level
      // note is the only carrier, so a generated summary is prepended
      // ahead of whatever the customer typed themselves.
      const sizeNotes = customLineNotes(lines);
      const fullNote = [
        sizeNotes.length > 0 ? `Custom sizes: ${sizeNotes.join("; ")}` : null,
        note.trim() || null,
      ]
        .filter(Boolean)
        .join(" — ");

      const order = await placeOrder(activeToken, {
        items: toOrderItems(lines),
        shippingAddress: {
          fullName: address.fullName.trim(),
          phone: address.phone.trim(),
          address: address.address.trim(),
          city: address.city.trim(),
          district: address.district.trim(),
          postalCode: address.postalCode.trim() || undefined,
          country: "Bangladesh",
        },
        paymentMethod: "cod",
        note: fullNote || undefined,
      });

      // The server clears the cart itself; mirror that locally.
      clear();
      toast.success("Order placed");
      router.push(`/order/${order._id}`);
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.status === 403 && needsLogin) {
          setError("That password is not correct.");
        } else {
          // Covers the 429 order rate limit and insufficient-stock 400s,
          // both of which carry a useful server message.
          setError(caught.message);
        }
      } else {
        setError("Something went wrong placing your order. Please try again.");
      }
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_20rem]" noValidate>
      <div className="flex flex-col gap-6">
        <FormError message={error} />

        {stockStatus === "blocked" ? (
          <section
            role="alert"
            className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning-soft p-4"
          >
            <p className="inline-flex items-center gap-2 text-sm font-medium text-ink">
              <AlertTriangle aria-hidden className="size-4 text-warning" />
              Some items in your cart have changed
            </p>

            <ul className="flex flex-col gap-3">
              {stockIssues.map((issue) => (
                <li
                  key={`${issue.productId}-${issue.variantId}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface px-3.5 py-2.5"
                >
                  <span className="flex flex-col text-sm">
                    <span className="text-ink">{issue.name}</span>
                    <span className="text-xs text-ink-secondary">
                      {issue.variantName} — requested {issue.requested},{" "}
                      {issue.available > 0
                        ? `only ${issue.available} available`
                        : "no longer available"}
                    </span>
                  </span>

                  <span className="flex gap-2">
                    {issue.available > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQuantity(issue.productId, issue.variantId, issue.available);
                          void recheckStock();
                        }}
                      >
                        Update to {issue.available}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        removeItem(issue.productId, issue.variantId);
                        void recheckStock();
                      }}
                    >
                      Remove
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!isAuthenticated ? (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-lg font-medium text-ink">
                Contact
              </h2>
              <p className="text-sm text-ink-secondary">
                No account needed — we&apos;ll create one for you so you can
                track this order.
              </p>
            </div>

            <Field label="Email" required>
              {(props) => (
                <TextInput
                  {...props}
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    // Editing the email invalidates the "already exists" state.
                    if (needsLogin) {
                      setNeedsLogin(false);
                      setError(null);
                    }
                  }}
                  placeholder="you@example.com"
                />
              )}
            </Field>

            <AnimatePresence>
              {needsLogin ? (
                <m.div
                  initial={animate ? { opacity: 0, height: 0 } : false}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={animate ? { opacity: 0, height: 0 } : undefined}
                  transition={{ duration: DURATION.base, ease: EASE_OUT }}
                  className="overflow-hidden"
                >
                  <div className="rounded-lg border border-line bg-muted p-4">
                    <p className="mb-3 inline-flex items-center gap-2 text-sm text-ink">
                      <Lock aria-hidden className="size-4" />
                      Sign in to continue
                    </p>
                    <Field label="Password" required>
                      {(props) => (
                        <TextInput
                          {...props}
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                        />
                      )}
                    </Field>
                  </div>
                </m.div>
              ) : null}
            </AnimatePresence>
          </section>
        ) : (
          <p className="rounded-lg bg-muted px-4 py-3 text-sm text-ink-secondary">
            Ordering as <span className="text-ink">{user?.email}</span>
          </p>
        )}

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-medium text-ink">
            Delivery address
          </h2>

          <Field label="Full name" required>
            {(props) => (
              <TextInput
                {...props}
                autoComplete="name"
                required
                value={address.fullName}
                onChange={(event) => update("fullName", event.target.value)}
              />
            )}
          </Field>

          <Field label="Phone" required>
            {(props) => (
              <TextInput
                {...props}
                type="tel"
                autoComplete="tel"
                required
                value={address.phone}
                onChange={(event) => update("phone", event.target.value)}
                placeholder="01XXXXXXXXX"
              />
            )}
          </Field>

          <Field label="Address" required>
            {(props) => (
              <TextArea
                {...props}
                autoComplete="street-address"
                required
                value={address.address}
                onChange={(event) => update("address", event.target.value)}
                placeholder="House, road, area"
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" required>
              {(props) => (
                <TextInput
                  {...props}
                  autoComplete="address-level2"
                  required
                  value={address.city}
                  onChange={(event) => update("city", event.target.value)}
                />
              )}
            </Field>

            <Field label="District" required>
              {(props) => (
                <TextInput
                  {...props}
                  autoComplete="address-level1"
                  required
                  value={address.district}
                  onChange={(event) => update("district", event.target.value)}
                />
              )}
            </Field>

            <Field label="Postal code">
              {(props) => (
                <TextInput
                  {...props}
                  autoComplete="postal-code"
                  value={address.postalCode}
                  onChange={(event) => update("postalCode", event.target.value)}
                />
              )}
            </Field>
          </div>

          <Field label="Order note" hint="Anything the courier should know.">
            {(props) => (
              <TextArea
                {...props}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            )}
          </Field>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-medium text-ink">Payment</h2>
          <label className="flex items-center gap-3 rounded-lg border border-accent bg-muted px-4 py-3.5">
            {/*
              A real radio input, not a styled span — COD is the only option
              today, but assistive tech should see an actual control rather
              than something merely painted to look like one.
            */}
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked
              readOnly
              className="size-4 accent-[var(--accent)]"
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium text-ink">
                Cash on delivery
              </span>
              <span className="text-xs text-ink-secondary">
                Pay the courier when your order arrives.
              </span>
            </span>
          </label>
        </section>
      </div>

      {/* ----------------------------------------------------- summary */}
      <aside className="h-fit rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-medium text-ink">
          Order summary
        </h2>

        <ul className="my-4 flex flex-col gap-3">
          {lines.map((line) => (
            <li
              key={`${line.productId}-${line.variantId}`}
              className="flex items-center gap-3"
            >
              <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                <SmartImage src={line.thumbnail} alt={line.name} sizes="48px" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm text-ink">{line.name}</span>
                <span className="text-xs text-ink-secondary">
                  {line.customLabel ??
                    `${line.variantName} · ${line.quantity}`}
                </span>
              </span>
              <span className="text-sm text-ink">
                {formatCurrency(line.price * line.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-secondary">Subtotal</dt>
            <dd className="text-ink">{formatCurrency(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-secondary">Shipping (est.)</dt>
            <dd className="text-ink">
              {shipping === 0 ? "Free" : formatCurrency(shipping)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base">
            <dt className="font-medium text-ink">Total</dt>
            <dd className="font-medium text-ink">
              {formatCurrency(subtotal + shipping)}
            </dd>
          </div>
        </dl>

        <p className="my-3 text-xs text-ink-muted">
          The final total is calculated and confirmed by our server when the
          order is placed.
        </p>

        <Magnetic className="w-full">
          <Button
            type="submit"
            size="lg"
            fullWidth
            disabled={pending || stockStatus !== "ok"}
          >
            {pending
              ? "Placing order…"
              : stockStatus === "checking"
                ? "Checking availability…"
                : stockStatus === "blocked"
                  ? "Resolve the items above to continue"
                  : "Place order"}
          </Button>
        </Magnetic>
      </aside>
    </form>
  );
}
