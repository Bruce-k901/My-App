"use client";

import { useEffect, useState } from "react";
import type { ThemePreference } from "@/types/user-preferences";

type ResolvedTheme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<ThemePreference>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const [mounted, setMounted] = useState(false);

  const resolve = (pref: ThemePreference): ResolvedTheme => {
    if (pref === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return pref;
  };

  const applyTheme = (resolved: ResolvedTheme) => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(resolved);
    setResolvedTheme(resolved);
  };

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as ThemePreference | null;
    const pref: ThemePreference =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "dark";
    setTheme(pref);
    applyTheme(resolve(pref));
  }, []);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(resolve("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const toggleTheme = () => {
    // Cycle: dark → light → system → dark
    const order: ThemePreference[] = ["dark", "light", "system"];
    const idx = order.indexOf(theme);
    const next = order[(idx + 1) % order.length];
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(resolve(next));
  };

  const setThemeValue = (newTheme: ThemePreference) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(resolve(newTheme));
  };

  return {
    theme,           // raw preference: 'light' | 'dark' | 'system'
    resolvedTheme,   // actual applied theme: 'light' | 'dark'
    toggleTheme,
    setTheme: setThemeValue,
    mounted,
  };
}
