"use client";

import { ReactNode, useEffect, useState } from "react";
import { Input, Button } from "@/components/ui";
import { motion } from "framer-motion";
import { useDebounce } from "use-debounce";

export default function PageLayout({
  title,
  showSearch = false,
  searchPlaceholder = "Search",
  onSearch,
  buttons,
  children,
}: {
  title: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  buttons?: ReactNode;
  children: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);

  // propagate search only after debounce
  useEffect(() => {
    onSearch?.(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold mb-2">{title}</h1>
        <div className="flex flex-wrap gap-2">{buttons}</div>
      </div>

      {showSearch && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            className="bg-white dark:bg-neutral-900 text-theme-primary border-theme focus:border-[#D37E91]"
            onChange={(e: any) => setSearch(e.target.value)}
          />
        </motion.div>
      )}

      {/* Body */}
      <div className="space-y-3">{children}</div>
    </div>
  );
}