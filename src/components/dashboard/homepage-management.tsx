"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { getHomepageContent, updateHomepageContent } from "@/lib/api/homepage";
import type {
  CollectionTile,
  HeroSlide,
  HomepageContent,
  OfferTile,
  PromoTile,
} from "@/lib/api/schemas/homepage";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/lib/hooks/use-session";
import { Field, FormError, TextArea, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ImageUploader } from "@/components/ui/image-uploader";
import { ColorPicker } from "@/components/ui/color-picker";
import { SmartImage } from "@/components/ui/smart-image";
import { Skeleton } from "@/components/ui/layout-primitives";

/**
 * A "simplified preview" of the three admin-editable homepage sections
 * (hero carousel, quick-links grid + offer card, featured collections) —
 * a thumbnail + title + Edit button per item, not a pixel clone of the
 * live storefront. Editing an item opens it in `Modal`, saves the whole
 * updated array/object back to `PATCH /homepage` (every field there is a
 * full replacement, same as `products-management.tsx`'s `gallery`/`variants`).
 *
 * Counts are fixed — 3 hero slides, 3 quick-link cards, 1 offer card,
 * 3 collection cards — there is no add/remove here, only edit.
 */
export function HomepageManagement() {
  const { token } = useSession();
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setContent(await getHomepageContent());
      setError(null);
    } catch (caught) {
      console.error("[homepage] load failed:", caught);
      setError(caught instanceof ApiError ? caught.message : "Could not load homepage content.");
    }
  }, []);

  useEffect(() => {
    // `load` only calls setState after its own internal `await` calls —
    // the standard fetch-on-mount pattern, not the synchronous-setState
    // footgun this rule targets. It cannot see across the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  type Editing =
    | { type: "hero"; index: number }
    | { type: "promo"; index: number }
    | { type: "offer" }
    | { type: "collection"; index: number };
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveField<K extends keyof HomepageContent>(
    field: K,
    value: HomepageContent[K],
  ) {
    if (!token || !content) return;
    setSaving(true);
    try {
      const updated = await updateHomepageContent(token, { [field]: value });
      setContent(updated);
      setEditing(null);
      toast.success("Homepage updated");
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <FormError message={error} />;
  if (!content) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Section title="Hero carousel">
        <CardRow>
          {content.heroSlides.map((slide, index) => (
            <PreviewCard
              key={slide.id}
              image={slide.image}
              title={slide.headline.replace(/\n/g, " ")}
              onEdit={() => setEditing({ type: "hero", index })}
            />
          ))}
        </CardRow>
      </Section>

      <Section title="Quick links">
        <CardRow>
          {content.promoTiles.map((tile, index) => (
            <PreviewCard
              key={tile.id}
              image={tile.image}
              title={tile.title}
              onEdit={() => setEditing({ type: "promo", index })}
            />
          ))}
          <PreviewCard
            image={null}
            title={content.offerTile.title}
            onEdit={() => setEditing({ type: "offer" })}
          />
        </CardRow>
      </Section>

      <Section title="Featured collections">
        <CardRow>
          {content.collections.map((tile, index) => (
            <PreviewCard
              key={tile.id}
              image={tile.image}
              title={tile.title}
              onEdit={() => setEditing({ type: "collection", index })}
            />
          ))}
        </CardRow>
      </Section>

      {editing?.type === "hero" ? (
        <HeroSlideModal
          token={token}
          slide={content.heroSlides[editing.index]}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={(slide) => {
            const heroSlides = content.heroSlides.map((candidate, i) =>
              i === editing.index ? slide : candidate,
            );
            void saveField("heroSlides", heroSlides);
          }}
        />
      ) : null}

      {editing?.type === "promo" ? (
        <PromoTileModal
          token={token}
          tile={content.promoTiles[editing.index]}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={(tile) => {
            const promoTiles = content.promoTiles.map((candidate, i) =>
              i === editing.index ? tile : candidate,
            );
            void saveField("promoTiles", promoTiles);
          }}
        />
      ) : null}

      {editing?.type === "offer" ? (
        <OfferTileModal
          tile={content.offerTile}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={(tile) => void saveField("offerTile", tile)}
        />
      ) : null}

      {editing?.type === "collection" ? (
        <CollectionTileModal
          token={token}
          tile={content.collections[editing.index]}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={(tile) => {
            const collections = content.collections.map((candidate, i) =>
              i === editing.index ? tile : candidate,
            );
            void saveField("collections", collections);
          }}
        />
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-base font-medium text-ink">{title}</h2>
      {children}
    </section>
  );
}

function CardRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-4">{children}</div>;
}

function PreviewCard({
  image,
  title,
  onEdit,
}: {
  image: string | null;
  title: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex w-44 flex-col gap-2 rounded-lg border border-line bg-surface p-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-muted">
        <SmartImage src={image} alt={title} sizes="176px" fallbackLabel={title} />
      </div>
      <p className="truncate text-sm text-ink">{title}</p>
      <Button variant="outline" size="sm" onClick={onEdit}>
        <Pencil aria-hidden className="size-3.5" />
        Edit
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------- hero slide */

function HeroSlideModal({
  slide,
  saving,
  onClose,
  onSave,
  token,
}: {
  slide: HeroSlide;
  saving: boolean;
  onClose: () => void;
  onSave: (slide: HeroSlide) => void;
  token: string | null;
}) {
  const [form, setForm] = useState(slide);

  return (
    <Modal open onClose={onClose} title="Edit hero slide">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <ImageUploader
          label="Image"
          required
          value={form.image}
          onChange={(image) => setForm((current) => ({ ...current, image }))}
          token={token}
        />

        <Field label="Eyebrow" required>
          {(props) => (
            <TextInput
              {...props}
              required
              value={form.eyebrow}
              onChange={(event) => setForm((current) => ({ ...current, eyebrow: event.target.value }))}
            />
          )}
        </Field>

        <Field label="Headline" required hint="Use a line break for a two-line headline.">
          {(props) => (
            <TextArea
              {...props}
              required
              value={form.headline}
              onChange={(event) => setForm((current) => ({ ...current, headline: event.target.value }))}
            />
          )}
        </Field>

        <Field label="Body" required>
          {(props) => (
            <TextArea
              {...props}
              required
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            />
          )}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Primary link URL" required>
            {(props) => (
              <TextInput
                {...props}
                required
                value={form.primary.href}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    primary: { ...current.primary, href: event.target.value },
                  }))
                }
              />
            )}
          </Field>
          <Field label="Primary link label" required>
            {(props) => (
              <TextInput
                {...props}
                required
                value={form.primary.label}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    primary: { ...current.primary, label: event.target.value },
                  }))
                }
              />
            )}
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Secondary link URL" hint="Leave blank to hide the second button.">
            {(props) => (
              <TextInput
                {...props}
                value={form.secondary?.href ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    secondary: event.target.value
                      ? { href: event.target.value, label: current.secondary?.label ?? "" }
                      : undefined,
                  }))
                }
              />
            )}
          </Field>
          <Field label="Secondary link label">
            {(props) => (
              <TextInput
                {...props}
                value={form.secondary?.label ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    secondary: current.secondary
                      ? { ...current.secondary, label: event.target.value }
                      : undefined,
                  }))
                }
              />
            )}
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ColorPicker
            label="Heading color"
            value={form.headingColor}
            onChange={(headingColor) => setForm((current) => ({ ...current, headingColor }))}
          />
          <ColorPicker
            label="Description color"
            value={form.bodyColor}
            onChange={(bodyColor) => setForm((current) => ({ ...current, bodyColor }))}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------- promo tile */

function PromoTileModal({
  tile,
  saving,
  onClose,
  onSave,
  token,
}: {
  tile: PromoTile;
  saving: boolean;
  onClose: () => void;
  onSave: (tile: PromoTile) => void;
  token: string | null;
}) {
  const [form, setForm] = useState(tile);

  return (
    <Modal open onClose={onClose} title="Edit quick-link card">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <ImageUploader
          label="Image"
          required
          value={form.image}
          onChange={(image) => setForm((current) => ({ ...current, image }))}
          token={token}
        />

        <Field label="Title" required>
          {(props) => (
            <TextInput
              {...props}
              required
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          )}
        </Field>

        <Field label="Body" required>
          {(props) => (
            <TextArea
              {...props}
              required
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            />
          )}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Link URL" required>
            {(props) => (
              <TextInput
                {...props}
                required
                value={form.href}
                onChange={(event) => setForm((current) => ({ ...current, href: event.target.value }))}
              />
            )}
          </Field>
          <Field label="Button text" required>
            {(props) => (
              <TextInput
                {...props}
                required
                value={form.cta}
                onChange={(event) => setForm((current) => ({ ...current, cta: event.target.value }))}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ColorPicker
            label="Heading color"
            value={form.headingColor}
            onChange={(headingColor) => setForm((current) => ({ ...current, headingColor }))}
          />
          <ColorPicker
            label="Description color"
            value={form.bodyColor}
            onChange={(bodyColor) => setForm((current) => ({ ...current, bodyColor }))}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------- offer tile */

function OfferTileModal({
  tile,
  saving,
  onClose,
  onSave,
}: {
  tile: OfferTile;
  saving: boolean;
  onClose: () => void;
  onSave: (tile: OfferTile) => void;
}) {
  const [form, setForm] = useState(tile);

  return (
    <Modal open onClose={onClose} title="Edit offer card">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <Field label="Eyebrow" required>
          {(props) => (
            <TextInput
              {...props}
              required
              value={form.eyebrow}
              onChange={(event) => setForm((current) => ({ ...current, eyebrow: event.target.value }))}
            />
          )}
        </Field>

        <Field label="Title" required>
          {(props) => (
            <TextInput
              {...props}
              required
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          )}
        </Field>

        <Field label="Body" required>
          {(props) => (
            <TextArea
              {...props}
              required
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            />
          )}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Link URL" required>
            {(props) => (
              <TextInput
                {...props}
                required
                value={form.href}
                onChange={(event) => setForm((current) => ({ ...current, href: event.target.value }))}
              />
            )}
          </Field>
          <Field label="Button text" required>
            {(props) => (
              <TextInput
                {...props}
                required
                value={form.cta}
                onChange={(event) => setForm((current) => ({ ...current, cta: event.target.value }))}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ColorPicker
            label="Heading color"
            value={form.headingColor}
            onChange={(headingColor) => setForm((current) => ({ ...current, headingColor }))}
          />
          <ColorPicker
            label="Description color"
            value={form.bodyColor}
            onChange={(bodyColor) => setForm((current) => ({ ...current, bodyColor }))}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------- collection tile */

function CollectionTileModal({
  tile,
  saving,
  onClose,
  onSave,
  token,
}: {
  tile: CollectionTile;
  saving: boolean;
  onClose: () => void;
  onSave: (tile: CollectionTile) => void;
  token: string | null;
}) {
  const [form, setForm] = useState(tile);

  return (
    <Modal open onClose={onClose} title="Edit collection card">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <ImageUploader
          label="Image"
          required
          value={form.image}
          onChange={(image) => setForm((current) => ({ ...current, image }))}
          token={token}
        />

        <Field label="Title" required>
          {(props) => (
            <TextInput
              {...props}
              required
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          )}
        </Field>

        <Field label="Body" required>
          {(props) => (
            <TextArea
              {...props}
              required
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            />
          )}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Link URL" required>
            {(props) => (
              <TextInput
                {...props}
                required
                value={form.href}
                onChange={(event) => setForm((current) => ({ ...current, href: event.target.value }))}
              />
            )}
          </Field>
          <Field label="Button text" required>
            {(props) => (
              <TextInput
                {...props}
                required
                value={form.cta}
                onChange={(event) => setForm((current) => ({ ...current, cta: event.target.value }))}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ColorPicker
            label="Heading color"
            value={form.headingColor}
            onChange={(headingColor) => setForm((current) => ({ ...current, headingColor }))}
          />
          <ColorPicker
            label="Description color"
            value={form.bodyColor}
            onChange={(bodyColor) => setForm((current) => ({ ...current, bodyColor }))}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
