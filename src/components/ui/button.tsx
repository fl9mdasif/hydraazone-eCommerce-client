import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "inverse";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-on-accent hover:bg-accent-hover disabled:hover:bg-accent",
  secondary: "bg-muted text-ink hover:bg-warm-soft",
  outline: "border border-line-strong text-ink bg-transparent hover:bg-muted",
  ghost: "text-ink bg-transparent hover:bg-muted",
  // For use on --bg-inverse surfaces (the dark promo card, the footer).
  inverse: "bg-surface text-ink hover:bg-muted",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-6 text-sm gap-2",
  lg: "h-13 px-8 text-base gap-2.5",
};

const BASE = cn(
  "inline-flex items-center justify-center rounded-full font-medium",
  "whitespace-nowrap select-none",
  // Only transform/colour transitions — nothing that triggers layout.
  "transition-[background-color,color,border-color,transform,opacity]",
  "duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
  "active:scale-[0.98]",
  "disabled:opacity-50 disabled:pointer-events-none",
);

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  fullWidth?: boolean;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps & {
  href: string;
  /** Set for links that leave the site (WhatsApp, Messenger). */
  external?: boolean;
  "aria-label"?: string;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    className,
    children,
    fullWidth,
  } = props;

  const classes = cn(
    BASE,
    VARIANT[variant],
    SIZE[size],
    fullWidth && "w-full",
    className,
  );

  if ("href" in props && props.href !== undefined) {
    const { href, external, ...rest } = props;

    if (external) {
      return (
        <a
          href={href}
          className={classes}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={rest["aria-label"]}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} aria-label={rest["aria-label"]}>
        {children}
      </Link>
    );
  }

  const {
    variant: _v,
    size: _s,
    className: _c,
    children: _ch,
    fullWidth: _f,
    ...buttonProps
  } = props as ButtonAsButton;

  return (
    <button type="button" className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
