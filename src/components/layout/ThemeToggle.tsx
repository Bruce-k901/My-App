"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <div className="w-10 h-10 bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-lg flex items-center justify-center">
        <Moon className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-white/60" />
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] rounded-lg flex items-center justify-center transition-all"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-white/60" />
      ) : (
        <Moon className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-white/60" />
      )}
    </button>
  );
}
