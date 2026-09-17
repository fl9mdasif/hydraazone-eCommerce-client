"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getPublicSettings, updateSettings } from "@/lib/api/settings";
import type { UpdateSettingsPayload } from "@/lib/api/schemas/settings";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/lib/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/layout-primitives";

const EMPTY_FORM: UpdateSettingsPayload = {
  fbPixelId: "",
  gaId: "",
  gtmId: "",
  searchConsoleTag: "",
  fbConversionApiToken: "",
  whatsappNumber: "",
  messengerPageId: "",
  shippingRate: undefined,
  freeShippingThreshold: undefined,
  lowStockThreshold: undefined,
};

/**
 * `GET /settings` (public) deliberately withholds `fbConversionApiToken`
 * and `lowStockThreshold` â there is no admin GET that returns them. Both
 * fields below are effectively write-only: the form can set them, but
 * can't show their current value, since the server never sends it back
 * outside of a PATCH response.
 */
export function SettingsManagement() {
  const { token } = useSession();
  const [form, setForm] = useState<UpdateSettingsPayload>(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      const settings = await getPublicSettings();
      setForm((current) => ({
        ...current,
        fbPixelId: settings.fbPixelId ?? "",
        gaId: settings.gaId ?? "",
        gtmId: settings.gtmId ?? "",
        searchConsoleTag: settings.searchConsoleTag ?? "",
        whatsappNumber: settings.whatsappNumber ?? "",
        messengerPageId: settings.messengerPageId ?? "",
        shippingRate: settings.shippingRate ?? undefined,
        freeShippingThreshold: settings.freeShippingThreshold ?? undefined,
      }));
      setLoaded(true);
    } catch (caught) {
      console.error("[settings] load failed:", caught);
      setError(caught instanceof ApiError ? caught.message : "Could not load settings.");
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // `load` only calls setState after its own internal `await` calls —
    // the standard fetch-on-mount pattern, not the synchronous-setState
    // footgun this rule targets. It cannot see across the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function update<K extends keyof UpdateSettingsPayload>(key: K, value: UpdateSettingsPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || pending) return;

    setPending(true);
    setError(null);

    // Blank strings mean "leave unset" â don't send an empty write over a
    // real configured value, and never send the write-only token field
    // unless the admin actually typed something new into it.
    const payload: UpdateSettingsPayload = {};
    for (const [key, value] of Object.entries(form) as [keyof UpdateSettingsPayload, unknown][]) {
      if (value === "" || value === undefined) continue;
      (payload as Record<string, unknown>)[key] = value;
    }

    try {
      await updateSettings(token, payload);
      toast.success("Settings saved");
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save settings.");
    } finally {
      setPending(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6" noValidate>
      <FormError message={error} />

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
        <h2 className="font-display text-base font-medium text-ink">Shipping</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shipping rate (BDT)" hint="Falls back to 60 when unset.">
            {(props) => (
              <TextInput
                {...props}
                type="number"
                min={0}
                value={form.shippingRate ?? ""}
                onChange={(event) =>
                  update("shippingRate", event.target.value === "" ? undefined : Number(event.target.value))
                }
              />
            )}
          </Field>
          <Field label="Free shipping threshold (BDT)" hint="Falls back to 10,000 when unset.">
            {(props) => (
              <TextInput
                {...props}
                type="number"
                min={0}
                value={form.freeShippingThreshold ?? ""}
                onChange={(event) =>
                  update(
                    "freeShippingThreshold",
                    event.target.value === "" ? undefined : Number(event.target.value),
                  )
                }
              />
            )}
          </Field>
        </div>

        <Field label="Low stock threshold" hint="Write-only â the current value can't be read back; falls back to 5 when unset.">
          {(props) => (
            <TextInput
              {...props}
              type="number"
              min={0}
              value={form.lowStockThreshold ?? ""}
              onChange={(event) =>
                update(
                  "lowStockThreshold",
                  event.target.value === "" ? undefined : Number(event.target.value),
                )
              }
            />
          )}
        </Field>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
        <h2 className="font-display text-base font-medium text-ink">Contact</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp number" hint="Digits only, with country code.">
            {(props) => (
              <TextInput
                {...props}
                value={form.whatsappNumber}
                onChange={(event) => update("whatsappNumber", event.target.value)}
                placeholder="8801700000000"
              />
            )}
          </Field>
          <Field label="Messenger page ID">
            {(props) => (
              <TextInput
                {...props}
                value={form.messengerPageId}
                onChange={(event) => update("messengerPageId", event.target.value)}
              />
            )}
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
        <h2 className="font-display text-base font-medium text-ink">Marketing & analytics</h2>

        <Field label="Meta Pixel ID">
          {(props) => (
            <TextInput
              {...props}
              value={form.fbPixelId}
              onChange={(event) => update("fbPixelId", event.target.value)}
            />
          )}
        </Field>
        <Field
          label="Meta Conversions API token"
          hint="Write-only â never returned by the server once set, including to this form."
        >
          {(props) => (
            <TextInput
              {...props}
              type="password"
              value={form.fbConversionApiToken}
              onChange={(event) => update("fbConversionApiToken", event.target.value)}
              placeholder="Leave blank to keep the current token"
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Google Analytics ID">
            {(props) => (
              <TextInput
                {...props}
                value={form.gaId}
                onChange={(event) => update("gaId", event.target.value)}
              />
            )}
          </Field>
          <Field label="Google Tag Manager ID">
            {(props) => (
              <TextInput
                {...props}
                value={form.gtmId}
                onChange={(event) => update("gtmId", event.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label="Search Console verification tag">
          {(props) => (
            <TextInput
              {...props}
              value={form.searchConsoleTag}
              onChange={(event) => update("searchConsoleTag", event.target.value)}
            />
          )}
        </Field>
      </section>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Savingâ¦" : "Save settings"}
      </Button>
    </form>
  );
}
