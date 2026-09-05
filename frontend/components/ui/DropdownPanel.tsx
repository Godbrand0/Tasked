"use client";

import { useEffect, useRef } from "react";

// Closes on any click outside the returned ref's subtree. Attach the ref to
// the element that wraps both the trigger button and the panel.
export function useOutsideClick<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

// Anchored panel for nav dropdowns (wallet menu, address menu, notifications).
// Desktop: absolutely positioned below its trigger, right-aligned. Below
// 640px it switches to viewport-clamped fixed positioning instead — see the
// shared .dropdown-panel media query in globals.css — so it can never
// overflow off the left edge of a narrow screen the way a plain `right: 0`
// panel does when its trigger isn't near the true right edge.
export default function DropdownPanel({
  children,
  width,
  minWidth = 220,
  maxHeight,
  padding = 0,
}: {
  children: React.ReactNode;
  width?: number;
  minWidth?: number;
  maxHeight?: number;
  padding?: number;
}) {
  return (
    <div
      className="dropdown-panel"
      style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 0,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        width,
        minWidth: width ? undefined : minWidth,
        maxHeight,
        overflowY: maxHeight ? "auto" : undefined,
        padding,
        boxShadow: "var(--shadow-lg)",
        zIndex: 100,
      }}
    >
      {children}
    </div>
  );
}
