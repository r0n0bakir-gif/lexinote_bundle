"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { defaultTheme, normalizeTheme, type LexiNoteTheme } from "@/lib/theme";

type ThemeContextValue = {
  theme: LexiNoteTheme;
  setTheme: (theme: LexiNoteTheme) => Promise<void>;
  isLoaded: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  setTheme: async () => {},
  isLoaded: false,
});

const storageKey = "lexinote-theme";

function applyTheme(theme: LexiNoteTheme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<LexiNoteTheme>(defaultTheme);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTheme() {
      try {
        const storedTheme = normalizeTheme(window.localStorage.getItem(storageKey));
        applyTheme(storedTheme);
        if (!cancelled) {
          setThemeState(storedTheme);
        }

        const response = await fetch("/api/profile", { cache: "no-store" });
        const data = await response.json().catch(() => null);
        if (cancelled || !response.ok || !data?.ok) {
          return;
        }

        const remoteTheme = normalizeTheme(data.profile?.theme);
        const finalTheme = window.localStorage.getItem(storageKey) ? storedTheme : remoteTheme;
        applyTheme(finalTheme);
        window.localStorage.setItem(storageKey, finalTheme);
        if (!cancelled) {
          setThemeState(finalTheme);
        }
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    }

    loadTheme();

    return () => {
      cancelled = true;
    };
  }, []);

  async function setTheme(nextTheme: LexiNoteTheme) {
    const normalized = normalizeTheme(nextTheme);
    applyTheme(normalized);
    setThemeState(normalized);
    window.localStorage.setItem(storageKey, normalized);

    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: normalized }),
      });
    } catch {}
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
