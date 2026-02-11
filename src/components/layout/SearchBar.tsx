"use client";

import { useEffect, useState } from "react";
import { Search } from '@/components/ui/icons';
import { usePanelStore } from "@/lib/stores/panel-store";

export function SearchBar() {
  const { setSearchOpen } = usePanelStore();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC"));
  }, []);

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))] dark:text-white/40" />
      <input
        type="text"
        placeholder="Search pages, modules, settings..."
        onClick={() => setSearchOpen(true)}
        readOnly
        className="w-full h-10 pl-10 pr-20 bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-lg text-[rgb(var(--text-primary))] dark:text-white placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-white/40 focus:bg-black/[0.05] dark:focus:bg-white/[0.06] focus:border-module-fg focus:outline-none transition-colors cursor-pointer"
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex items-center gap-1 rounded border border-gray-300 dark:border-white/[0.15] bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-white/40">
        {isMac ? "⌘" : "Ctrl"} K
      </kbd>
    </div>
  );
}
