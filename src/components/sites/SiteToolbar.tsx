"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Plus, Upload, Download } from '@/components/ui/icons';

type Props = {
  sites: any[];
  companyId: string;
  onRefresh?: () => void;
  inline?: boolean;
  showBack?: boolean;
  /** If the page already renders its own H1, set this false to avoid duplication */
  showTitle?: boolean;
  /** Optional custom title if you *do* show it (defaults to "Sites") */
  title?: string;
  onAddSite?: () => void; // New prop to handle add site action
};

export default function SiteToolbar({
  sites = [],
  companyId,
  onRefresh,
  inline,
  showBack = false,
  showTitle = false,        // <<< default false so you don't get two "Sites"
  title = "Sites",
  onAddSite,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  // ---------- EXPORT ----------
  const handleDownload = () => {
    try {
      const fields = [
        "name",
        "address_line1",
        "address_line2",
        "city",
        "postcode",
        "gm_user_id",
        "region","status","days_open","opening_time_from",
        "opening_time_to","closing_time_from","closing_time_to"
      ];

      const rows = (sites || []).map((site: any) => {
        const row: Record<string, any> = {};
        for (const f of fields) {
          row[f] = f === "days_open" && site?.days_open
            ? JSON.stringify(site.days_open)
            : site?.[f] ?? "";
        }
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows, { header: fields });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sites");
      const xlsxArray = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([xlsxArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sites_export.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("Sites exported successfully");
    } catch (e: any) {
      console.error("Export failed:", e?.message || "Unable to export");
    }
  };

  // ---------- IMPORT ----------
  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        try {
          await handleImport(data as any[]);
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = "";
          setUploading(false);
        }
      },
      error: (err) => {
        console.error("Upload failed:", err.message || "Parsing error");
        setUploading(false);
      },
    });
  };

  const handleImport = async (rows: any[]) => {
    try {
      if (!companyId) {
        console.error("Upload failed: Company not loaded yet.");
        return;
      }

      const normalised = rows.map(r => ({ ...r, site_name: r.site_name || r.name || "" }));
      const required = ["site_name","city"];
      const valid = normalised.filter(r => required.every(f => r[f] && String(r[f]).trim() !== ""));

      const keyFor = (r: any) => (r.site_name && String(r.site_name).trim()) || (r.name && String(r.name).trim());
      const deduped = Array.from(new Map(valid.map(r => [keyFor(r), r])).values());
      if (deduped.length === 0) {
        console.error("Upload failed: No valid rows found");
        return;
      }

      const payload = deduped.map(r => ({
        name: r.site_name,
        address_line1: r.address_line1 || "",
        address_line2: r.address_line2 || "",
        city: r.city,
        postcode: r.postcode || "",
        gm_user_id: r.gm_user_id || "",
        region: r.region || "",
        status: r.status?.trim() || "active",
        days_open: typeof r.days_open === "string" ? JSON.parse(r.days_open || "null") : r.days_open || null,
        opening_time_from: r.opening_time_from || null,
        opening_time_to: r.opening_time_to || null,
        yearly_closures: r.yearly_closures || null,
        company_id: companyId,
      }));

      const { error } = await supabase.from("sites").insert(payload);
      if (error) {
        console.error("Upload failed:", error.message || "Insert error");
      } else {
        console.log(`Success: ${deduped.length} sites added`);
        onRefresh?.();
      }
    } catch (e: any) {
      console.error("Upload failed:", e?.message || "Unexpected error");
    }
  };

  const handleCreateSaved = () => {
    console.log("Site added successfully");
    onRefresh?.();
  };

  // ---------- UI ----------
  return (
    <div className={inline ? "" : "mb-4"}>
      <div className={`flex items-center ${showTitle ? "justify-between" : "justify-end"} mb-6`}>
        {showTitle && <h1 className="text-2xl font-semibold text-theme-primary">{title}</h1>}

        <div className="flex items-center gap-3">
          {/* Add Site (magenta outline) - only show if onAddSite is provided */}
          {onAddSite && (
            <button
              onClick={() => {
                console.log("🔥 ADD SITE BUTTON CLICKED in SiteToolbar");
                console.log("🔥 onAddSite function:", onAddSite);
                onAddSite?.();
              }}
              className="flex items-center justify-center w-10 h-10 rounded-md border border-[#D37E91] text-[#D37E91] hover:bg-[#D37E91]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D37E91]/40"
              title="Add Site"
            >
              <Plus size={18} />
            </button>
          )}

          {/* Download (soft glow border) */}
          <button
            onClick={handleDownload}
            className="flex items-center justify-center w-10 h-10 rounded-md border border-gray-300 dark:border-white/12 bg-gray-50 dark:bg-white/[0.04] text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:focus-visible:ring-white/20"
            title="Download CSV"
          >
            <Download size={18} />
          </button>

          {/* Upload (soft glow border) */}
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            className="flex items-center justify-center w-10 h-10 rounded-md border border-gray-300 dark:border-white/12 bg-gray-50 dark:bg-white/[0.04] text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/[0.08] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:focus-visible:ring-white/20"
            title="Upload CSV"
          >
            <Upload size={18} />
          </button>

          {showBack && (
            <button
              onClick={() => router.push("/dashboard/business")}
              className="flex items-center justify-center w-10 h-10 rounded-md bg-gray-50 dark:bg-white/[0.04] text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/[0.08]"
              title="Back"
            >
              ←
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
