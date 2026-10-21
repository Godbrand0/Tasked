"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Copy text to the clipboard with a timed "copied" flag.
 *
 * Shared by every copy affordance in the app (task share button, wallet address
 * copy, …) so the clipboard logic lives in exactly one place.
 *
 * Fallback chain:
 *   1. navigator.clipboard.writeText  — the modern, permission-aware API.
 *   2. a hidden <textarea> + document.execCommand("copy") — insecure contexts
 *      (plain http) and older browsers, where the Clipboard API is unavailable.
 *   3. return false — the caller decides how to surface the failure.
 */
export function useCopy(resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string) => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // insecure-context / old-browser fallback
          const el = document.createElement("textarea");
          el.value = text;
          el.setAttribute("readonly", "");
          el.style.position = "fixed";
          el.style.opacity = "0";
          document.body.appendChild(el);
          el.select();
          const ok = document.execCommand("copy");
          document.body.removeChild(el);
          if (!ok) return false;
        }
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetMs);
        return true;
      } catch {
        return false;
      }
    },
    [resetMs],
  );

  return { copied, copy };
}
