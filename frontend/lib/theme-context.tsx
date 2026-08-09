"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "taskify:theme";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeCtx = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Light (Mezo-Native) is the brand default — the inline script in
  // layout.tsx already applied any stored override before paint, so this
  // just mirrors that into React state.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = document.documentElement.dataset.theme;
    if (stored === "dark") setTheme("dark");
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      if (next === "dark") {
        document.documentElement.dataset.theme = "dark";
      } else {
        delete document.documentElement.dataset.theme;
      }
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      return next;
    });
  }

  return <ThemeCtx.Provider value={{ theme, toggleTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}

// Inlined into layout.tsx's <head> as a blocking script so the stored
// theme applies before first paint — otherwise dark-mode users see a
// flash of the light default while React hydrates.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='dark'){document.documentElement.dataset.theme='dark';}}catch(e){}})();`;
