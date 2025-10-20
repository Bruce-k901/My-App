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
    <div className="w-full max-w-[1200px] mx-auto px-6 md:px-8 lg:px-12 py-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl md:text-4xl font-bold">{title}</h1>
        
        <div className="flex items-center gap-3">
          {/* Site selector and search inputs */}
          <div className="flex items-center gap-2">
            {siteSelector}
            <Input 
              value={q} 
              onChange={handleChange} 
              placeholder={searchPlaceholder} 
              className="w-[192px]" 
            />
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {customActions}
            {onAdd && (
              <IconButton ariaLabel="Add" onClick={() => {
                console.log("🔥 ENTITY LAYOUT - Add button clicked");
                onAdd();
              }} variant="magentaOutline">
                <Plus className="h-5 w-5" />
              </IconButton>
            )}
            {onDownload && (
              <IconButton ariaLabel="Download CSV" onClick={onDownload}>
                <Download className="h-5 w-5" />
              </IconButton>
            )}
            {onUpload && (
              <IconButton ariaLabel="Upload CSV" onClick={onUpload}>
                <Upload className="h-5 w-5" />
              </IconButton>
            )}
          </div>
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
    "inline-flex items-center justify-center",
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