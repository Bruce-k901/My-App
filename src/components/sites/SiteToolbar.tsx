"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SiteForm from "@/components/sites/SiteForm";
import { useToast } from "@/components/ui/ToastProvider";

type Props = {
  sites: any[];
  companyId: string;
  onRefresh?: () => void;
  inline?: boolean;
  showBack?: boolean; // when false, hide back button (used in org layout)
};

export default function SiteToolbar({ sites = [], companyId, onRefresh, inline, showBack = true }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleDownload = () => {
    try {
      // Prepare data with consistent headers
      const fields = [
        "name",
        "address_line1",
        "address_line2",
        "city",
        "postcode",
        "country",
        "site_code",
        "site_type",
        "contact_name",
        "contact_email",
        "contact_phone",
        "region",
        "floor_area",
        "status",
        "days_open",
        "opening_time_from",
        "opening_time_to",
        "yearly_closures",
      ];

      const rows = (sites || []).map((site: any) => {
        const row: Record<string, any> = {};
        for (const f of fields) {
          if (f === "days_open") {
            row[f] = site?.days_open ? JSON.stringify(site.days_open) : "";
          } else {
            row[f] = site?.[f] ?? "";
          }
        }
        return row;
      });

      // Build XLSX workbook
      const worksheet = XLSX.utils.json_to_sheet(rows, { header: fields });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sites");
      const xlsxArray = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([xlsxArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      // Trigger download as .xlsx for Excel/Sheets compatibility
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sites_export.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast({ title: "Sites exported successfully.", description: "Saved as Excel (.xlsx)", type: "success" });
    } catch (e: any) {
      showToast({ title: "Export failed", description: e?.message || "Unable to export CSV", type: "error" });
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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
        showToast({ title: "Upload failed", description: err.message || "Parsing error", type: "error" });
        setUploading(false);
      },
    });
  };

  const handleImport = async (rows: any[]) => {
    try {
      // Ensure company context is available before proceeding
      if (!companyId) {
        showToast({ title: "Upload failed", description: "Company not loaded yet. Please wait and retry.", type: "error" });
        return;
      }
      // Normalise field names in case CSV uses either "name" or "site_name"
      const normalised = rows.map((r) => ({
        ...r,
        site_name: r.site_name || r.name || "",
      }));

      const required = ["site_name", "city", "country"];
      const valid = normalised.filter((r) =>
        required.every((f) => r[f] && String(r[f]).trim() !== "")
      );

      // Deduplicate by site_code or site_name
      const keyFor = (r: any) => (r.site_code && String(r.site_code).trim()) || (r.site_name && String(r.site_name).trim());
      const deduped = Array.from(new Map(valid.map((r) => [keyFor(r), r])).values());

      if (deduped.length === 0) {
        showToast({ title: "Upload failed", description: "No valid rows found in CSV", type: "error" });
        return;
      }

      const payload = deduped.map((r) => {
        const floorAreaRaw = r.floor_area;
        const floorArea =
          floorAreaRaw === undefined || floorAreaRaw === null || String(floorAreaRaw).trim() === ""
            ? null
            : Number(floorAreaRaw);
        const statusVal = r.status && String(r.status).trim() ? String(r.status).trim() : "active";
        const daysOpenRaw = r.days_open;
        let daysOpen: any = null;
        if (typeof daysOpenRaw === "string" && daysOpenRaw.trim()) {
          try {
            daysOpen = JSON.parse(daysOpenRaw);
          } catch {
            daysOpen = null;
          }
        } else if (typeof daysOpenRaw === "object" && daysOpenRaw) {
          daysOpen = daysOpenRaw;
        }
        return {
          name: r.site_name, // use normalised field
          address_line1: r.address_line1 || "",
          address_line2: r.address_line2 || "",
          city: r.city,
          postcode: r.postcode || "",
          country: r.country,
          site_code: r.site_code || "",
          site_type: r.site_type || "",
          contact_name: r.contact_name || "",
          contact_email: r.contact_email || "",
          contact_phone: r.contact_phone || "",
          region: r.region || "",
          floor_area: floorArea,
          status: statusVal,
          days_open: daysOpen,
          opening_time_from: r.opening_time_from || null,
          opening_time_to: r.opening_time_to || null,
          yearly_closures: r.yearly_closures || null,
          company_id: companyId,
        };
      });

      const { error } = await supabase.from("sites").insert(payload);
      if (error) {
        showToast({ title: "Upload failed", description: error.message || "Unable to insert rows", type: "error" });
      } else {
        showToast({ title: "Success", description: `${deduped.length} sites added`, type: "success" });
        onRefresh?.();
      }
    } catch (e: any) {
      showToast({ title: "Upload failed", description: e?.message || "Unexpected error", type: "error" });
    }
  };

  const handleCreateSaved = () => {
    setShowAdd(false);
    showToast({ title: "Site added", type: "success" });
    onRefresh?.();
  };

  return (
    <div className={inline ? "" : "mb-4"}>
      <div className={`flex ${inline ? "items-center gap-3" : "justify-end gap-3 mb-4"}`}>
        <button
          className="px-4 py-2 rounded-md bg-pink-500/20 border border-pink-500/40 text-pink-300 hover:bg-pink-500/30"
          onClick={() => setShowAdd(true)}
        >
          + Add Site
        </button>
        <button
          className="px-4 py-2 rounded-md bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1]"
          onClick={handleUploadClick}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Upload CSV"}
        </button>
        <button
          className="px-4 py-2 rounded-md bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1]"
          onClick={handleDownload}
        >
          Download CSV
        </button>
        {showBack && (
          <button
            className="px-4 py-2 rounded-md bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1]"
            onClick={() => router.push("/dashboard/organization")}
          >
            Back
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {showAdd && (
        <SiteForm
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onSaved={handleCreateSaved}
          initial={null}
          companyId={companyId}
        />
      )}
    </div>
  );
}