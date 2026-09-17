"use client";

import { Check } from "lucide-react";
import { COLOR_PALETTE } from "@/lib/api/schemas/homepage";
import { cn } from "@/lib/utils/cn";

/**
 * A 10-swatch picker for `headingColor`/`bodyColor` on homepage content —
 * see `COLOR_PALETTE` for the exact set and why those ten. `value` empty/
 * undefined means "use the section's own default colour", shown as its own
 * selectable "Default" swatch rather than forcing a color to always be set.
 */
export function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (color: string | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label={`${label}: use default`}
          aria-pressed={!value}
          className={cn(
            "grid size-8 place-items-center rounded-full border-2 border-dashed border-line bg-surface text-[0.6rem] text-ink-muted transition-transform",
            !value && "border-solid border-line-strong",
          )}
          title="Default"
        >
          {!value ? <Check aria-hidden className="size-3.5 text-ink" /> : "—"}
        </button>

        {COLOR_PALETTE.map((color) => {
          const selected = value === color.value;
          return (
            <button
              key={color.value}
              type="button"
              onClick={() => onChange(color.value)}
              aria-label={color.label}
              aria-pressed={selected}
              title={color.label}
              className={cn(
                "grid size-8 place-items-center rounded-full border-2 transition-transform",
                selected ? "scale-110 border-ink" : "border-transparent hover:scale-105",
              )}
              style={{ backgroundColor: color.value }}
            >
              {selected ? (
                <Check
                  aria-hidden
                  className={cn(
                    "size-3.5",
                    color.value === "#FFFFFF" ? "text-ink" : "text-white",
                  )}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
