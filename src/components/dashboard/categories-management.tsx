"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createCategory,
  deleteCategory,
  getCategoriesForAdmin,
  toggleCategoryStatus,
  updateCategory,
  type CategoryPayload,
} from "@/lib/api/categories";
import { ApiError } from "@/lib/api/client";
import type { Category } from "@/lib/api/schemas/category";
import { useSession } from "@/lib/hooks/use-session";
import { isValidSlug, slugify } from "@/lib/utils/format";
import { Badge, EmptyState, Skeleton } from "@/components/ui/layout-primitives";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/ui/field";
import { SmartImage } from "@/components/ui/smart-image";
import { ImageUploader } from "@/components/ui/image-uploader";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

const EMPTY_FORM: CategoryPayload = {
  name: "",
  slug: "",
  description: "",
  thumbnail: "",
  isActive: true,
  metaTitle: "",
  metaDescription: "",
};

export function CategoriesManagement() {
  const { token } = useSession();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CategoryPayload>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setCategories(await getCategoriesForAdmin(token));
      setError(null);
    } catch (caught) {
      console.error("[categories] load failed:", caught);
      setCategories([]);
      setError(caught instanceof ApiError ? caught.message : "Could not load categories.");
    }
  }, [token]);

  useEffect(() => {
    // `load` only calls setState after its own internal `await` calls —
    // the standard fetch-on-mount pattern, not the synchronous-setState
    // footgun this rule targets. It cannot see across the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setCreating(true);
  }

  function startEdit(category: Category) {
    setCreating(false);
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      thumbnail: category.thumbnail ?? "",
      isActive: category.isActive,
      metaTitle: category.metaTitle ?? "",
      metaDescription: category.metaDescription ?? "",
    });
    setFormError(null);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || pending) return;

    if (!form.name.trim()) return setFormError("Name is required.");
    if (!isValidSlug(form.slug)) {
      return setFormError("Slug must be lowercase letters, numbers and single hyphens.");
    }

    setPending(true);
    setFormError(null);

    try {
      if (editing) {
        await updateCategory(token, editing._id, form);
        toast.success("Category updated");
      } else {
        await createCategory(token, form);
        toast.success("Category created");
      }
      closeForm();
      await load();
    } catch (caught) {
      setFormError(
        caught instanceof ApiError
          ? caught.status === 409
            ? "A category with that slug or name already exists."
            : caught.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleToggle(category: Category) {
    if (!token) return;
    setBusyId(category._id);
    try {
      await toggleCategoryStatus(token, category._id);
      await load();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not update category.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(category: Category) {
    if (!token) return;
    if (!window.confirm(`Delete "${category.name}"? This cannot be undone.`)) return;
    setBusyId(category._id);
    try {
      await deleteCategory(token, category._id);
      toast.success("Category deleted");
      await load();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not delete category.");
    } finally {
      setBusyId(null);
    }
  }

  const formOpen = creating || editing !== null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-secondary">
          {categories ? `${categories.length} categories` : "Loadingâ¦"}
        </p>
        <Button onClick={startCreate} size="sm">
          <Plus aria-hidden className="size-4" />
          New category
        </Button>
      </div>

      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5"
          noValidate
        >
          <h2 className="font-display text-base font-medium text-ink">
            {editing ? `Edit ${editing.name}` : "New category"}
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
                      // Only auto-fill the slug while creating, and only if
                      // it still matches the auto-generated value â editing
                      // an existing category should never silently rewrite
                      // its slug (and its URLs) behind the admin's back.
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
                  onChange={(event) =>
                    setForm((current) => ({ ...current, slug: event.target.value }))
                  }
                />
              )}
            </Field>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Description</span>
            <RichTextEditor
              value={form.description ?? ""}
              onChange={(description) => setForm((current) => ({ ...current, description }))}
              placeholder="Describe the category…"
            />
          </div>

          <ImageUploader
            label="Thumbnail"
            value={form.thumbnail ?? ""}
            onChange={(url) => setForm((current) => ({ ...current, thumbnail: url }))}
            token={token}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Meta title">
              {(props) => (
                <TextInput
                  {...props}
                  value={form.metaTitle}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, metaTitle: event.target.value }))
                  }
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

          <label className="inline-flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({ ...current, isActive: event.target.checked }))
              }
              className="size-4 accent-[var(--accent)]"
            />
            Active (visible in the storefront)
          </label>

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Savingâ¦" : editing ? "Save changes" : "Create category"}
            </Button>
            <Button type="button" variant="outline" onClick={closeForm}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {!categories ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : error ? (
        <FormError message={error} />
      ) : categories.length === 0 ? (
        <EmptyState title="No categories yet" />
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
          {categories.map((category) => (
            <li key={category._id} className="flex items-center gap-3 px-4 py-3">
              <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                <SmartImage src={category.thumbnail} alt={category.name} sizes="44px" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm text-ink">{category.name}</span>
                <span className="truncate text-xs text-ink-muted">/{category.slug}</span>
              </span>
              <Badge tone={category.isActive ? "success" : "out"}>
                {category.isActive ? "Active" : "Inactive"}
              </Badge>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === category._id}
                  onClick={() => void handleToggle(category)}
                >
                  {category.isActive ? "Deactivate" : "Activate"}
                </Button>
                <button
                  type="button"
                  onClick={() => startEdit(category)}
                  aria-label={`Edit ${category.name}`}
                  className="grid size-8 place-items-center rounded-full text-ink-secondary transition-colors hover:bg-muted hover:text-ink"
                >
                  <Pencil aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(category)}
                  disabled={busyId === category._id}
                  aria-label={`Delete ${category.name}`}
                  className="grid size-8 place-items-center rounded-full text-ink-secondary transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
