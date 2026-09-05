"use client";

import Link from "next/link";

type Variant = "primary" | "outline" | "subtle";
type Size = "sm" | "md";

const BASE: React.CSSProperties = {
  fontWeight: 700,
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  transition: "background 0.15s, border-color 0.15s, color 0.15s",
};

const SIZES: Record<Size, React.CSSProperties> = {
  sm: { fontSize: 13, padding: "9px 18px" },
  md: { fontSize: 14, padding: "10px 20px" },
};

const VARIANTS: Record<Variant, { className: string; style: React.CSSProperties }> = {
  primary: { className: "btn-primary", style: { background: "var(--primary)", color: "var(--on-primary)", border: "none", boxShadow: "var(--shadow-sm)" } },
  outline: { className: "btn-outline", style: { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border-strong)" } },
  subtle: {
    className: "btn-subtle",
    style: {
      background: "color-mix(in srgb, var(--primary) 9%, transparent)",
      color: "var(--primary)",
      border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)",
    },
  },
};

interface ButtonProps {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

// Shared primary/outline/subtle button, usable as either a real <button> or
// (via `href`) a Next Link styled the same way — most CTAs in this app are
// links styled as buttons. Hover states live in globals.css (.btn-*:hover)
// so they're real CSS, not per-instance onMouseEnter/onMouseLeave handlers.
export default function Button({ children, variant = "primary", size = "md", href, onClick, type = "button", disabled, style, className }: ButtonProps) {
  const v = VARIANTS[variant];
  const combinedStyle: React.CSSProperties = {
    ...BASE,
    ...SIZES[size],
    ...v.style,
    ...(disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}),
    ...style,
  };
  const combinedClassName = [v.className, className].filter(Boolean).join(" ");

  if (href) {
    return (
      <Link href={href} className={combinedClassName} style={combinedStyle}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={combinedClassName} style={combinedStyle}>
      {children}
    </button>
  );
}
