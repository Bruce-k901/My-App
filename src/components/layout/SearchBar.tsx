"use client";

import { useState } from "react";
import { Search } from "lucide-react";

export function SearchBar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))] dark:text-white/40" />
      <input
        type="text"
        placeholder="Search tasks, documents, people..."
        onClick={() => setIsSearchOpen(true)}
        className="w-full h-10 pl-10 pr-4 bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-lg text-[rgb(var(--text-primary))] dark:text-white placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-white/40 focus:bg-black/[0.05] dark:focus:bg-white/[0.06] focus:border-[#EC4899] focus:outline-none transition-colors"
      />
      {/* TODO: Implement SearchModal component */}
    </div>
  );
}
