"use client";

import { m, AnimatePresence } from "framer-motion";
import { ImagePlus, Link2, X } from "lucide-react";
import { useState, type DragEvent } from "react";
import { toast } from "sonner";
import { uploadImage } from "@/lib/api/uploads";
import { SmartImage } from "@/components/ui/smart-image";
import { DURATION, EASE_OUT } from "@/components/motion/tokens";
import { cn } from "@/lib/utils/cn";

/**
 * Real file upload, dropped inline into whichever form needs it — chosen
 * over a separate Media Library page (which would need its own browse UI,
 * an asset-picker modal and usage-tracking before delete to not feel
 * broken). See the plan this shipped from for the full reasoning.
 *
 * Both components below share the same dropzone (`Dropzone`, drag-and-drop
 * + click-to-browse + a circular progress ring while an upload is in
 * flight) and the same "Or upload from URL" fallback — a manual escape
 * hatch for when imgbb or the network is flaky, so the admin is never
 * stuck with no way to set an image at all.
 */

function validatePick(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Please choose an image file.";
  if (file.size > 5 * 1024 * 1024) return "Image is too large — please use a file under 5MB.";
  return null;
}

function filesFromDrop(event: DragEvent<HTMLLabelElement>): File[] {
  event.preventDefault();
  return Array.from(event.dataTransfer.files);
}

/** A ring that fills as `percent` climbs — the "75%" moment from the reference. */
function ProgressRing({ percent }: { percent: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className="relative grid size-14 place-items-center">
      <svg viewBox="0 0 56 56" className="size-14 -rotate-90">
        <circle cx={28} cy={28} r={radius} strokeWidth={5} fill="none" className="stroke-line" />
        <circle
          cx={28}
          cy={28}
          r={radius}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          className="stroke-accent transition-[stroke-dashoffset] duration-150"
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums text-ink">{percent}%</span>
    </span>
  );
}

/**
 * The shared dropzone box — dashed border, drag-and-drop, click to browse.
 * `busy` renders the progress ring in place of the upload icon so it's
 * unmistakable that something is happening, matching Asif's reference.
 */
function Dropzone({
  onFiles,
  multiple,
  busy,
  percent,
  statusText,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  multiple: boolean;
  busy: boolean;
  percent: number;
  statusText?: string;
  disabled?: boolean;
}) {
  const [dragActive, setDragActive] = useState(false);

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => {
        setDragActive(false);
        if (disabled) return;
        const files = filesFromDrop(event);
        if (files.length > 0) onFiles(files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors duration-200",
        dragActive ? "border-accent bg-accent/5" : "border-line bg-muted hover:border-line-strong",
        disabled && "pointer-events-none opacity-70",
      )}
    >
      {busy ? (
        <>
          <ProgressRing percent={percent} />
          <p className="text-xs text-ink-secondary">{statusText ?? "Uploading…"}</p>
        </>
      ) : (
        <>
          <span className="grid size-10 place-items-center rounded-full bg-accent text-on-accent">
            <ImagePlus aria-hidden className="size-5" />
          </span>
          <p className="text-sm font-medium text-ink">
            Select {multiple ? "images" : "an image"} to upload
          </p>
          <p className="text-xs text-ink-muted">or drag and drop here</p>
        </>
      )}

      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const files = event.target.files ? Array.from(event.target.files) : [];
          event.target.value = "";
          if (files.length > 0) onFiles(files);
        }}
      />
    </label>
  );
}

/** "Or upload from URL" — the reference's manual fallback when a real upload can't go through. */
function UrlFallback({ onSubmit, disabled }: { onSubmit: (url: string) => void; disabled?: boolean }) {
  const [url, setUrl] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = url.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
        setUrl("");
      }}
      className="flex flex-col gap-1"
    >
      <span className="text-xs text-ink-muted">Or upload from URL</span>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 aria-hidden className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" />
          <input
            type="url"
            value={url}
            disabled={disabled}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…"
            className="h-9 w-full rounded-md border border-line bg-surface pl-8 pr-3 text-xs text-ink placeholder:text-ink-muted focus:border-line-strong focus:outline-none disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !url.trim()}
          className="h-9 shrink-0 rounded-md border border-line px-3 text-xs font-medium text-ink transition-colors hover:bg-muted disabled:opacity-50"
        >
          Upload
        </button>
      </div>
    </form>
  );
}

/** Single-URL mode — a product/category thumbnail, a profile picture. */
export function ImageUploader({
  value,
  onChange,
  token,
  label = "Image",
  required,
}: {
  value: string;
  onChange: (url: string) => void;
  token: string | null;
  label?: string;
  required?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(file: File) {
    const problem = validatePick(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    if (!token) {
      toast.error("Your session has ended. Please log in again.");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const url = await uploadImage(file, token, setProgress);
      onChange(url);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex w-64 flex-col gap-2">
      <span className="text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        ) : null}
      </span>

      {value && !uploading ? (
        <div className="relative size-28 shrink-0 overflow-hidden rounded-lg border border-line bg-muted">
          <SmartImage src={value} alt={label} sizes="112px" />
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Remove ${label.toLowerCase()}`}
            className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-ink/70 text-white transition-colors hover:bg-danger"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        </div>
      ) : (
        <Dropzone
          onFiles={(files) => void handleFile(files[0])}
          multiple={false}
          busy={uploading}
          percent={progress}
        />
      )}

      <UrlFallback disabled={uploading} onSubmit={(url) => onChange(url)} />
    </div>
  );
}

/** Multi-URL mode — a product's gallery, a variant's own images. */
export function ImageGalleryUploader({
  value,
  onChange,
  token,
  label = "Images",
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  token: string | null;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [queuePosition, setQueuePosition] = useState({ current: 0, total: 0 });

  async function handleFiles(files: File[]) {
    if (!token) {
      toast.error("Your session has ended. Please log in again.");
      return;
    }

    setUploading(true);
    // Sequential, not Promise.all — this hits the shared imgbb quota and
    // there's nothing to gain from racing a handful of uploads. Each file
    // is validated and committed on its own (not upfront for the whole
    // batch, and not batched behind a single trailing `onChange`) so one
    // bad or failing file in a multi-select doesn't cost the others.
    // `committed` tracks the running result locally — `value` itself is a
    // prop and won't reflect the parent's re-render from the previous
    // iteration's `onChange` call by the time the next iteration runs.
    const committed = [...value];
    let succeeded = 0;
    let failures = 0;
    for (const [index, file] of files.entries()) {
      setQueuePosition({ current: index + 1, total: files.length });
      setProgress(0);

      const problem = validatePick(file);
      if (problem) {
        failures += 1;
        toast.error(`${file.name}: ${problem}`);
        continue;
      }
      try {
        const url = await uploadImage(file, token, setProgress);
        committed.push(url);
        onChange([...committed]);
        succeeded += 1;
      } catch (error) {
        failures += 1;
        console.error(`[image-uploader] ${file.name} failed to upload:`, error);
      }
    }
    setUploading(false);
    if (succeeded > 0) {
      toast.success(succeeded === 1 ? "Image uploaded" : `${succeeded} images uploaded`);
    }
    if (failures > 0) {
      toast.error(
        failures === files.length
          ? "Image upload failed. Please try again, or paste the URL directly below."
          : `${failures} of ${files.length} images failed to upload.`,
      );
    }
  }

  function remove(url: string) {
    onChange(value.filter((candidate) => candidate !== url));
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">{label}</span>
        {uploading ? (
          <span className="text-xs tabular-nums text-ink-secondary">
            {queuePosition.current} of {queuePosition.total}
          </span>
        ) : null}
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {value.map((url) => (
              <m.div
                key={url}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: DURATION.fast, ease: EASE_OUT }}
                className="relative size-20 shrink-0 overflow-hidden rounded-md border border-line bg-muted"
              >
                <SmartImage src={url} alt="" sizes="80px" />
                <button
                  type="button"
                  onClick={() => remove(url)}
                  aria-label="Remove image"
                  className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-ink/70 text-white transition-colors hover:bg-danger"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </m.div>
            ))}
          </AnimatePresence>
        </div>
      ) : null}

      <Dropzone
        onFiles={(files) => void handleFiles(files)}
        multiple
        busy={uploading}
        percent={progress}
        statusText={
          queuePosition.total > 0
            ? `Uploading ${queuePosition.current} of ${queuePosition.total}…`
            : undefined
        }
      />

      <UrlFallback disabled={uploading} onSubmit={(url) => onChange([...value, url])} />
    </div>
  );
}
