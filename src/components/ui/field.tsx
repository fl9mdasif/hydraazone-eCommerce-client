import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils/cn";

const CONTROL = cn(
  "w-full rounded-md border border-line bg-surface px-3.5 text-sm text-ink",
  "placeholder:text-ink-muted",
  "transition-colors duration-200",
  "focus:border-line-strong focus:outline-none",
  "disabled:opacity-60",
  "aria-[invalid=true]:border-danger",
);

interface FieldWrapperProps {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

/**
 * Every form control is labelled and, when invalid, points at its message
 * through `aria-describedby`. Required by the Definition of Done, and the
 * single place that wiring lives so no form can forget it.
 */
export function Field({
  label,
  hint,
  error,
  required,
  children,
}: FieldWrapperProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        ) : null}
      </label>

      {children({
        id,
        describedBy: message ? messageId : undefined,
        invalid: Boolean(error),
      })}

      {message ? (
        <p
          id={messageId}
          className={cn("text-xs", error ? "text-danger" : "text-ink-secondary")}
          role={error ? "alert" : undefined}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  className,
  invalid,
  describedBy,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn(CONTROL, "h-11", className)}
    />
  );
}

export function TextArea({
  className,
  invalid,
  describedBy,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn(CONTROL, "min-h-24 py-2.5", className)}
    />
  );
}

/** Inline error banner for a whole form (a 401, a 429, a server message). */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
    >
      {message}
    </p>
  );
}
