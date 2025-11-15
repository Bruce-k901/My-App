"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import Input from "@/components/ui/Input";
import { Plus, Upload, Download } from "lucide-react";

type EntityPageLayoutProps = {
  title: string;
  children: React.ReactNode;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  onAdd?: () => void;
  onUpload?: () => void;
  onDownload?: () => void;
  siteSelector?: React.ReactNode;
  customActions?: React.ReactNode;
};

export default function EntityPageLayout({
  title,
  children,
  onSearch,
  searchPlaceholder = "Search",
  onAdd,
  onUpload,
  onDownload,
  siteSelector,
  customActions,
}: EntityPageLayoutProps) {
  const [q, setQ] = React.useState("");
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQ(v);
    onSearch?.(v);
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full mb-4 gap-3 sm:gap-4">
        {/* Left side - Title and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
          {title && <h1 className="text-xl sm:text-2xl font-semibold mb-0 sm:mb-2 flex-shrink-0">{title}</h1>}
          
          {/* Search area */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Site Selector */}
            {siteSelector && <div className="flex-shrink-0">{siteSelector}</div>}
            
            {/* Search Input */}
            <input 
              type="text"
              value={q} 
              onChange={handleChange} 
              placeholder={searchPlaceholder}
              className="h-9 sm:h-10 px-2 sm:px-3 rounded-md border border-neutral-700 bg-transparent text-xs sm:text-sm text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-pink-400 flex-1 min-w-0 sm:w-[192px]" 
            />
          </div>
        </div>

        {/* Right side - Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Custom Actions */}
          {customActions}
          
          {/* Add Button */}
          {onAdd && (
            <button 
              onClick={() => {
                console.log("🔥 ENTITY LAYOUT - Add button clicked");
                onAdd();
              }}
              className="h-9 sm:h-10 w-9 sm:w-10 flex items-center justify-center rounded-md border border-pink-400 text-pink-400 hover:bg-pink-500/10 transition-all"
              aria-label="Add"
            >
              <span className="text-base sm:text-lg leading-none">+</span>
            </button>
          )}
          
          {/* Download Button */}
          {onDownload && (
            <button 
              onClick={onDownload}
              className="h-9 sm:h-10 w-9 sm:w-10 flex items-center justify-center rounded-md border border-neutral-400 text-neutral-200 hover:bg-neutral-500/10 transition-all"
              aria-label="Download CSV"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
          
          {/* Upload Button */}
          {onUpload && (
            <button 
              onClick={onUpload}
              className="h-9 sm:h-10 w-9 sm:w-10 flex items-center justify-center rounded-md border border-neutral-400 text-neutral-200 hover:bg-neutral-500/10 transition-all"
              aria-label="Upload CSV"
            >
              <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 sm:mt-4">
        {children}
      </div>
    </div>
  );
}

// Export IconButton for use in other components
export { IconButton };

function IconButton({ children, onClick, ariaLabel, variant = "neutral" }: { children: React.ReactNode; onClick?: () => void; ariaLabel: string; variant?: "neutral" | "magentaOutline" | "orangeOutline" }) {
  const base = cn(
    "flex items-center justify-center",
    "h-11 w-11 rounded-lg",
    "transition-colors duration-150 ease-in-out",
    "hover:shadow-[0_0_12px_rgba(236,72,153,0.25)]",
  );
  const variants = {
    neutral: "border border-white/[0.12] bg-white/[0.06] text-white hover:bg-white/[0.12]",
    magentaOutline: "border border-pink-500 text-pink-500 bg-transparent hover:bg-white/[0.04]",
    orangeOutline: "border border-orange-500 text-orange-500 bg-transparent hover:bg-white/[0.04] hover:shadow-[0_0_12px_rgba(249,115,22,0.25)]",
  } as const;
  return (
    <button aria-label={ariaLabel} onClick={onClick} className={cn(base, variants[variant])}>
      {children}
    </button>
  );
}