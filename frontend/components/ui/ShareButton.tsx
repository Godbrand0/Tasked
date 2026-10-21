"use client";

import { useState, type MouseEvent } from "react";
import { useCopy } from "@/lib/use-copy";
import { IconLink, IconCheck } from "@/components/icons";

interface Props {
  url: string; // absolute
  title: string; // used by the native share sheet
  label?: string; // default "Share"
  variant?: "button" | "icon"; // "icon" = compact, for cards
}

export default function ShareButton({ url, title, label = "Share", variant = "button" }: Props) {
  const { copied, copy } = useCopy();
  const [manual, setManual] = useState(false);

  /**
   * Resolve the URL to share at click time.
   *
   * The `url` prop is rendered server-side, where `window` is unavailable and the
   * base origin falls back to the canonical production origin. On click we are
   * always in the browser, so prefer the live origin — that way a preview,
   * staging or local deployment shares its own origin rather than the
   * production one, and the copied link is always the page the user is on.
   */
  function resolveUrl(): string {
    if (typeof window === "undefined") return url;
    try {
      const resolved = new URL(url, window.location.origin);
      return `${window.location.origin}${resolved.pathname}`;
    } catch {
      return url;
    }
  }

  async function onShare(e: MouseEvent<HTMLButtonElement>) {
    // The button never navigates — TaskCard is a <Link>, so the click must be
    // swallowed before it bubbles up to the link.
    e.preventDefault();
    e.stopPropagation();
    setManual(false);

    const shareUrl = resolveUrl();

    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ url: shareUrl })) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return; // user cancelled
        // fall through to clipboard
      }
    }

    const ok = await copy(shareUrl);
    if (!ok) {
      // Last resort: show the URL selected so the user can copy it manually.
      setManual(true);
    }
  }

  const text = manual ? "Press ⌘/Ctrl+C to copy" : copied ? "Link copied" : label;
  const Icon = copied ? IconCheck : IconLink;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onShare}
        aria-label={label}
        title={label}
        className="btn-motion"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          minWidth: 32,
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: copied ? "var(--success)" : "var(--text-dim)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <Icon size={14} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label={label}
      title={label}
      className="btn-motion"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 40,
        padding: "0 14px",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: copied ? "var(--success)" : "var(--text)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <Icon size={14} />
      <span>{text}</span>
      {manual && (
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          style={{
            position: "absolute",
            opacity: 0,
            pointerEvents: "none",
            width: 1,
            height: 1,
          }}
        />
      )}
    </button>
  );
}
