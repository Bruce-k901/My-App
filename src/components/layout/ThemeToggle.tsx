"use client";

import { Sun, Moon, Monitor } from '@/components/ui/icons';
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <div className="w-10 h-10 bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-lg flex items-center justify-center">
        <Moon className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary" />
      </div>
    );
  }

  const Icon = theme === "dark" ? Sun : theme === "light" ? Moon : Monitor;
  const label =
    theme === "dark" ? "Switch to light" : theme === "light" ? "Switch to system" : "Switch to dark";

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] rounded-lg flex items-center justify-center transition-all"
      aria-label={label}
      title={label}
    >
      <Icon className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary" />
    </button>
  );
}
