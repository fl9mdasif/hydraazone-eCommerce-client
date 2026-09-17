"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  createProduct,
  deleteProduct,
  getProductsForAdmin,
  toggleProductFeatured,
  updateProduct,
  type ProductPayload,
  type VariantPayload,
} from "@/lib/api/products";
import { getCategoriesForAdmin } from "@/lib/api/categories";
import { ApiError } from "@/lib/api/client";
import type { Category } from "@/lib/api/schemas/category";
import type { Product, ProductStatus } from "@/lib/api/schemas/product";
import { useSession } from "@/lib/hooks/use-session";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { formatCurrency, isValidSlug, slugify } from "@/lib/utils/format";
import { defaultVariant, effectivePrice } from "@/lib/utils/product";
import { Badge, EmptyState, Skeleton } from "@/components/ui/layout-primitives";
import { Button } from "@/components/ui/button";
import { Field, FormError, Select, TextInput } from "@/components/ui/field";
import { SmartImage } from "@/components/ui/smart-image";
import { ImageGalleryUploader, ImageUploader } from "@/components/ui/image-uploader";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

const STATUS_OPTIONS: ProductStatus[] = ["active", "draft", "archived"];
const STATUS_TONE: Record<ProductStatus, "neutral" | "sale" | "out" | "success"> = {
  active: "success",
  draft: "neutral",
  archived: "out",
};

const PAGE_SIZE = 15;

/**
 * The tag the storefront checks (`app/(store)/product/[slug]/page.tsx`,
 * `CUSTOM_SIZE_TAG`) to decide whether to render the area-priced calculator
 * (`TableCoverCalculator`) instead of the normal `ProductDetail` variant
 * picker. Nothing else in the schema marks a product as this special case —
 * it really is just this one tag plus the per-variant attributes below.
 */
const CUSTOM_SIZE_TAG = "custom-size";

function emptyVariant(): VariantPayload {
  return { name: "", sku: "", price: 0, stock: 0, isAvailable: true, images: [] };
}

const emptyForm = (): ProductPayload => ({
  name: "",
  slug: "",
  description: "",
  category: "",
  thumbnail: "",
  gallery: [],
  tags: [],
  variants: [emptyVariant()],
  status: "draft",
  isFeatured: false,
  metaTitle: "",
  metaDescription: "",
});

export function ProductsManagement() {
  const { token } = useSession();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 400);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ProductPayload>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [productResult, categoryResult] = await Promise.all([
        getProductsForAdmin({ search: search || undefined, page, limit: PAGE_SIZE }, token),
        getCategoriesForAdmin(token),
      ]);
      setProducts(productResult.data);
      setTotal(productResult.meta.total);
      setCategories(categoryResult);
      setError(null);
    } catch (caught) {
      console.error("[products] load failed:", caught);
      setProducts([]);
      setError(caught instanceof ApiError ? caught.message : "Could not load products.");
    }
  }, [token, search, page]);

  useEffect(() => {
    // `load` only calls setState after its own internal `await` calls —
    // the standard fetch-on-mount pattern, not the synchronous-setState
    // footgun this rule targets. It cannot see across the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setCreating(true);
  }

  function startEdit(product: Product) {
    setCreating(false);
    setEditing(product);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: product.category?._id ?? "",
      thumbnail: product.thumbnail,
      gallery: product.gallery,
      tags: product.tags,
      variants: product.variants.map((variant) => ({
        name: variant.name,
        sku: variant.sku,
        price: variant.price,
        discountPrice: variant.discountPrice ?? undefined,
        stock: variant.stock,
        isAvailable: variant.isAvailable,
        images: variant.images,
        attributes: variant.attributes,
      })),
      status: product.status,
      isFeatured: product.isFeatured,
      metaTitle: product.metaTitle ?? "",
      metaDescription: product.metaDescription ?? "",
    });
    setFormError(null);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
  }

  function updateVariantField(index: number, patch: Partial<VariantPayload>) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)),
    }));
  }

  /**
   * `variant.price` must be the rate PER SQUARE INCH (`ratePerSqFt / 144`)
   * — the server always computes a line as `price * quantity`, and the
   * calculator sends square inches as `quantity` — see
   * `lib/utils/table-cover.ts`'s own doc comment for the full reasoning.
   * This keeps the human-entered "rate per sq ft" and the actually-charged
   * `price` in lockstep so nobody has to do that division by hand.
   */
  function updateRatePerSqFt(index: number, ratePerSqFtInput: string) {
    const ratePerSqFt = Number(ratePerSqFtInput);
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, i) =>
        i === index
          ? {
              ...variant,
              price: Number.isFinite(ratePerSqFt) ? ratePerSqFt / 144 : 0,
              attributes: { ...variant.attributes, ratePerSqFt: ratePerSqFtInput },
            }
          : variant,
      ),
    }));
  }

  function updateThicknessLabel(index: number, label: string) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, i) =>
        i === index ? { ...variant, attributes: { ...variant.attributes, label } } : variant,
      ),
    }));
  }

  /** Only one variant can be "Most popular" — matches `isMostPopular`'s read side. */
  function setMostPopular(index: number) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, i) => ({
        ...variant,
        attributes: { ...variant.attributes, mostPopular: i === index ? "true" : "false" },
      })),
    }));
  }

  function addVariant() {
    setForm((current) => ({ ...current, variants: [...current.variants, emptyVariant()] }));
  }

  function removeVariant(index: number) {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || pending) return;

    if (!form.name.trim()) return setFormError("Name is required.");
    if (!isValidSlug(form.slug)) {
      return setFormError("Slug must be lowercase letters, numbers and single hyphens.");
    }
    if (!form.category) return setFormError("Choose a category.");
    if (!form.thumbnail.trim()) return setFormError("A thumbnail URL is required.");
    if (form.variants.length === 0) return setFormError("At least one variant is required.");
    for (const variant of form.variants) {
      if (!variant.name.trim() || !variant.sku.trim() || variant.price <= 0) {
        return setFormError(
          isCustomSize
            ? "Every variant needs a name, SKU and a rate per square foot greater than 0."
            : "Every variant needs a name, SKU and a price greater than 0.",
        );
      }
    }

    setPending(true);
    setFormError(null);

    try {
      if (editing) {
        await updateProduct(token, editing._id, form);
        toast.success("Product updated");
      } else {
        await createProduct(token, form);
        toast.success("Product created");
      }
      closeForm();
      await load();
    } catch (caught) {
      setFormError(
        caught instanceof ApiError
          ? caught.status === 409
            ? "A product with that slug, name or a variant SKU already exists."
            : caught.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleToggleFeatured(product: Product) {
    if (!token) return;
    setBusyId(product._id);
    try {
      await toggleProductFeatured(token, product._id);
      await load();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not update this product.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(product: Product) {
    if (!token) return;
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setBusyId(product._id);
    try {
      await deleteProduct(token, product._id);
      toast.success("Product deleted");
      await load();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not delete this product.");
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const formOpen = creating || editing !== null;
  const isCustomSize = (form.tags ?? []).includes(CUSTOM_SIZE_TAG);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => {
            setPage(1);
            setSearchInput(event.target.value);
          }}
          placeholder="Search products"
          className="h-10 min-w-56 flex-1 rounded-full border border-line bg-surface px-4 text-sm text-ink placeholder:text-ink-muted focus:border-line-strong focus:outline-none"
        />
        <p className="text-sm text-ink-secondary">{total} products</p>
        <Button onClick={startCreate} size="sm">
          <Plus aria-hidden className="size-4" />
          New product
        </Button>
      </div>

      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5"
          noValidate
        >
          <h2 className="font-display text-base font-medium text-ink">
            {editing ? `Edit ${editing.name}` : "New product"}
          </h2>

          <FormError message={formError} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              {(props) => (
                <TextInput
                  {...props}
                  required
                  value={form.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setForm((current) => ({
                      ...current,
                      name,
                      slug:
                        !editing && (current.slug === "" || current.slug === slugify(current.name))
                          ? slugify(name)
                          : current.slug,
                    }));
                  }}
                />
              )}
            </Field>
            <Field label="Slug" required hint="lowercase-with-hyphens">
              {(props) => (
                <TextInput
                  {...props}
                  required
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                />
              )}
            </Field>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">
              Description
              <span className="ml-0.5 text-danger" aria-hidden>
                *
              </span>
            </span>
            <RichTextEditor
              value={form.description}
              onChange={(description) => setForm((current) => ({ ...current, description }))}
              placeholder="Describe the product…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Category" required>
              {(props) => (
                <Select
                  {...props}
                  required
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                >
                  <option value="">Selectâ¦</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Status">
              {(props) => (
                <Select
                  {...props}
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, status: event.target.value as ProductStatus }))
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <div className="flex items-end pb-2.5">
              <label className="inline-flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isFeatured: event.target.checked }))
                  }
                  className="size-4 accent-[var(--accent)]"
                />
                Featured
              </label>
            </div>
          </div>

          <label className="flex items-start gap-2 rounded-md border border-line bg-muted p-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={isCustomSize}
              onChange={(event) => {
                const checked = event.target.checked;
                setForm((current) => ({
                  ...current,
                  tags: checked
                    ? [...(current.tags ?? []).filter((tag) => tag !== CUSTOM_SIZE_TAG), CUSTOM_SIZE_TAG]
                    : (current.tags ?? []).filter((tag) => tag !== CUSTOM_SIZE_TAG),
                }));
              }}
              className="mt-0.5 size-4 accent-[var(--accent)]"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">Custom-size calculator</span>
              <span className="text-xs text-ink-secondary">
                Customer enters length &amp; width and is charged per square inch (like the
                Transparent Table Cover) — each variant below becomes a thickness/material
                option instead of a fixed-price choice.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-6">
            <ImageUploader
              label="Thumbnail"
              required
              value={form.thumbnail}
              onChange={(url) => setForm((current) => ({ ...current, thumbnail: url }))}
              token={token}
            />
            <ImageGalleryUploader
              label="Gallery"
              value={form.gallery ?? []}
              onChange={(urls) => setForm((current) => ({ ...current, gallery: urls }))}
              token={token}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Meta title">
              {(props) => (
                <TextInput
                  {...props}
                  value={form.metaTitle}
                  onChange={(event) => setForm((current) => ({ ...current, metaTitle: event.target.value }))}
                />
              )}
            </Field>
            <Field label="Meta description">
              {(props) => (
                <TextInput
                  {...props}
                  value={form.metaDescription}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, metaDescription: event.target.value }))
                  }
                />
              )}
            </Field>
          </div>

          {/* ---------------------------------------------------- variants */}
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-ink">Variants</h3>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                <Plus aria-hidden className="size-4" />
                Add variant
              </Button>
            </div>

            {form.variants.map((variant, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-md border border-line p-3 sm:grid-cols-6"
              >
                <input
                  aria-label="Variant name"
                  value={variant.name}
                  onChange={(event) => updateVariantField(index, { name: event.target.value })}
                  placeholder="Name"
                  className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink sm:col-span-2"
                />
                <input
                  aria-label="Variant SKU"
                  value={variant.sku}
                  onChange={(event) => updateVariantField(index, { sku: event.target.value })}
                  placeholder="SKU"
                  className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink"
                />
                {isCustomSize ? (
                  <input
                    aria-label="Rate per square foot (BDT)"
                    type="number"
                    min={0}
                    step="0.01"
                    value={variant.attributes?.ratePerSqFt ?? ""}
                    onChange={(event) => updateRatePerSqFt(index, event.target.value)}
                    placeholder="Rate / sq ft"
                    className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink"
                  />
                ) : (
                  <input
                    aria-label="Variant price"
                    type="number"
                    min={0}
                    value={variant.price || ""}
                    onChange={(event) => updateVariantField(index, { price: Number(event.target.value) })}
                    placeholder="Price"
                    className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink"
                  />
                )}
                <input
                  aria-label="Variant stock"
                  type="number"
                  min={0}
                  value={variant.stock || ""}
                  onChange={(event) => updateVariantField(index, { stock: Number(event.target.value) })}
                  placeholder="Stock"
                  className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink"
                />
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  disabled={form.variants.length <= 1}
                  aria-label={`Remove variant ${index + 1}`}
                  className="grid size-10 place-items-center rounded-md text-ink-secondary transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-30"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>

                {isCustomSize ? (
                  <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
                    <input
                      aria-label="Thickness/material label"
                      value={variant.attributes?.label ?? ""}
                      onChange={(event) => updateThicknessLabel(index, event.target.value)}
                      placeholder='Display label, e.g. "Extra Durable"'
                      className="h-10 min-w-56 flex-1 rounded-md border border-line bg-surface px-3 text-sm text-ink"
                    />
                    <label className="inline-flex items-center gap-2 text-sm text-ink">
                      <input
                        type="radio"
                        name="most-popular"
                        checked={variant.attributes?.mostPopular === "true"}
                        onChange={() => setMostPopular(index)}
                        className="size-4 accent-[var(--accent)]"
                      />
                      Most popular
                    </label>
                    {variant.attributes?.ratePerSqFt ? (
                      <span className="text-xs text-ink-muted">
                        {formatCurrency(variant.price)} charged per square inch
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <div className="sm:col-span-6">
                  <ImageGalleryUploader
                    label="Images"
                    value={variant.images ?? []}
                    onChange={(images) => updateVariantField(index, { images })}
                    token={token}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-ink-muted">
              {isCustomSize
                ? "Each variant is a thickness/material option, priced per square inch from the rate above."
                : "Discount price, weight and attributes can be set from a variant's own edit screen once the product exists."}
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Savingâ¦" : editing ? "Save changes" : "Create product"}
            </Button>
            <Button type="button" variant="outline" onClick={closeForm}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <FormError message={error} />

      {!products ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState title="No products found" />
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
          {products.map((product) => {
            const variant = defaultVariant(product);
            const stock = product.variants.reduce(
              (sum, candidate) => sum + (candidate.isAvailable ? candidate.stock : 0),
              0,
            );

            return (
              <li key={product._id} className="flex items-center gap-3 px-4 py-3">
                <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                  <SmartImage src={product.thumbnail} alt={product.name} sizes="44px" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-ink">{product.name}</span>
                  <span className="truncate text-xs text-ink-muted">
                    {product.category?.name ?? "Uncategorised"} Â· {stock} in stock
                  </span>
                </span>
                <span className="w-24 shrink-0 text-sm text-ink">
                  {variant ? formatCurrency(effectivePrice(variant)) : "â"}
                </span>
                <Badge tone={STATUS_TONE[product.status]}>{product.status}</Badge>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void handleToggleFeatured(product)}
                    disabled={busyId === product._id}
                    aria-label={product.isFeatured ? "Unfeature" : "Feature"}
                    aria-pressed={product.isFeatured}
                    className="grid size-8 place-items-center rounded-full text-ink-secondary transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <Star
                      aria-hidden
                      className={`size-4 ${product.isFeatured ? "fill-warm text-warm" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(product)}
                    aria-label={`Edit ${product.name}`}
                    className="grid size-8 place-items-center rounded-full text-ink-secondary transition-colors hover:bg-muted hover:text-ink"
                  >
                    <Pencil aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(product)}
                    disabled={busyId === product._id}
                    aria-label={`Delete ${product.name}`}
                    className="grid size-8 place-items-center rounded-full text-ink-secondary transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-full px-3.5 py-2 text-sm text-ink transition-colors hover:bg-muted disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-2 py-2 text-sm text-ink-secondary">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-full px-3.5 py-2 text-sm text-ink transition-colors hover:bg-muted disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
