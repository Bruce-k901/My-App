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
    <div className="w-full max-w-[1200px] mx-auto px-6 md:px-8 lg:px-12 py-3 text-white">
      {/* Header */}
      <div className="flex items-center justify-between w-full mb-4">
        {/* Left side - Title and Search */}
        <div className="flex items-center gap-4">
          {title && <h1 className="text-2xl font-semibold mb-2 flex-shrink-0">{title}</h1>}
          
          {/* Search area */}
          <div className="flex items-center gap-3">
            {/* Site Selector */}
            {siteSelector && siteSelector}
            
            {/* Search Input */}
            <input 
              type="text"
              value={q} 
              onChange={handleChange} 
              placeholder={searchPlaceholder}
              className="h-10 px-3 rounded-md border border-neutral-700 bg-transparent text-sm text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-pink-400 w-[192px]" 
            />
          </div>
        </div>

        {/* Right side - Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Custom Actions */}
          {customActions}
          
          {/* Add Button */}
          {onAdd && (
            <button 
              onClick={() => {
                console.log("🔥 ENTITY LAYOUT - Add button clicked");
                onAdd();
              }}
              className="h-10 w-10 flex items-center justify-center rounded-md border border-pink-400 text-pink-400 hover:bg-pink-500/10 transition-all"
              aria-label="Add"
            >
              <span className="text-lg leading-none">+</span>
            </button>
          )}
          
          {/* Download Button */}
          {onDownload && (
            <button 
              onClick={onDownload}
              className="h-10 w-10 flex items-center justify-center rounded-md border border-neutral-400 text-neutral-200 hover:bg-neutral-500/10 transition-all"
              aria-label="Download CSV"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          
          {/* Upload Button */}
          {onUpload && (
            <button 
              onClick={onUpload}
              className="h-10 w-10 flex items-center justify-center rounded-md border border-neutral-400 text-neutral-200 hover:bg-neutral-500/10 transition-all"
              aria-label="Upload CSV"
            >
              <Upload className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
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