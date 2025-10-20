'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AssetForm from '@/components/assets/AssetForm';
import AssetCard from '@/components/assets/AssetCard';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import SiteSelector from "@/components/ui/SiteSelector";
import Link from "next/link";
import { Plus, Upload, Download } from "lucide-react";

type Asset = {
  id: string;
  company_id: string;
  label: string;
  model?: string;
  serial_number?: string;
  asset_type?: string;
  code?: string;
  date_of_purchase?: string;
  warranty_length_years?: number;
  next_service_due?: string;
  add_to_ppm?: boolean;
  ppm_services_per_year?: number;
  warranty_callout_info?: string;
  document_url?: string;
  site_id?: string;
  contractor_reactive_id?: string;
  contractor_ppm_id?: string;
  created_at?: string;
  updated_at?: string;
  site_name?: string | null; // Add site name to the type
};

export default function AssetsPage() {
  const { profile, loading: ctxLoading } = useAppContext();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      setUserId(userRes?.user?.id || null);
    })();
  }, []);

  const fetchAssets = async () => {
    console.log("Fetching assets...");
    
    let query = supabase
      .from("assets_redundant")
      .select(`
        *,
        sites_redundant!inner(name)
      `)
      .order("updated_at", { ascending: false });
    
    // Filter by site if selected
    if (selectedSite) {
      query = query.eq("site_id", selectedSite);
    }
    
    const { data, error } = await query;
    
    console.log("Fetch result:", { data, error });
    if (error) {
      console.error("Error fetching assets:", error);
      throw new Error("Failed to load assets");
    }
    
    // Transform the data to include site_name
    const assetsWithSiteNames = (data || []).map((asset: any) => ({
      ...asset,
      site_name: asset.sites?.name || null
    }));
    return assetsWithSiteNames as Asset[];
  };

  const { data: assets = [], isLoading, isError, error } = useQuery({
    queryKey: ["assets", selectedSite],
    queryFn: fetchAssets,
    staleTime: 1000 * 60 * 5, // cache for 5 min
    enabled: !ctxLoading && !!profile?.company_id,
  });

  const handleAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleSaved = async () => {
    setFormOpen(false);
    setEditing(null);
    // No need to manually refetch - React Query will handle this via cache invalidation
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDownload = () => {
    try {
      // Prepare CSV data with all asset fields
      const fields = [
        "label",
        "model", 
        "serial_number",
        "code",
        "type",
        "date_of_purchase",
        "under_warranty",
        "warranty_length_years",
        "next_service_due",
        "add_to_ppm",
        "ppm_services_per_year",
        "warranty_callout_info",
        "document_url"
      ];

      const csvContent = [
        fields.join(","), // Header row
        ...filteredAssets.map(asset => 
          fields.map(field => {
            const value = asset[field as keyof Asset];
            // Handle dates and booleans
            if (value === null || value === undefined) return "";
            if (typeof value === "boolean") return value ? "true" : "false";
            if (typeof value === "string" && value.includes(",")) return `"${value}"`;
            return String(value);
          }).join(",")
        )
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `assets-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast({ 
        title: "Assets exported successfully", 
        description: `Exported ${filteredAssets.length} assets to CSV`, 
        type: "success" 
      });
    } catch (error) {
      console.error("Error downloading CSV:", error);
      showToast({ 
        title: "Export failed", 
        description: "Failed to export CSV", 
        type: "error" 
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.company_id) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) return; // Need header + at least one data row

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
        const rowData: any = {};

        headers.forEach((header, index) => {
          const value = values[index];
          if (value && value !== '') {
            rowData[header] = value;
          }
        });

        function generateAssetCode(index: number) {
          const num = String(index + 1).padStart(5, "0");
          return `AST-${num}`;
        }

        function toISODate(dateStr: string | null) {
          if (!dateStr) return null;
          // if already in ISO, return as is
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
          const [day, month, year] = dateStr.split("/");
          if (!day || !month || !year) return null;
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }

        function mapAssetType(uiValue: string) {
          if (!uiValue) return "other";
          const t = uiValue.trim().toLowerCase();
          switch (t) {
            case "refrigeration":
            case "display fridge":
            case "fridge":
              return "refrigeration";

            case "cooking":
            case "cooking equipment":
            case "oven":
            case "hob":
              return "cooking";

            case "dishwashing":
            case "pot washer":
              return "dishwashing";

            case "coffee":
            case "coffee machine":
            case "beverage":
              return "coffee";

            case "safety":
            case "fire safety":
              return "safety";

            case "other":
              return "other";

            default:
              // fallback to enum-safe label
              return "other";
          }
        }

        const assetData = {
          company_id: profile.company_id,
          site_id: rowData.site_id ?? null,
          label: rowData.label ?? "",
          model: rowData.model ?? "",
          serial_number: rowData.serial_number ?? "",
          code: rowData.code && rowData.code.trim() !== "" ? rowData.code : generateAssetCode(i),
          type: mapAssetType(rowData.type),
          date_of_purchase: toISODate(rowData.date_of_purchase),
          under_warranty: rowData.under_warranty === "true" || rowData.under_warranty === true,
          warranty_length_years: Number(rowData.warranty_length_years) || 0,
          next_service_due: toISODate(rowData.next_service_due),
          add_to_ppm: rowData.add_to_ppm === "true" || rowData.add_to_ppm === true,
          ppm_services_per_year: Number(rowData.ppm_services_per_year) || 0,
          warranty_callout_info: rowData.warranty_callout_info ?? "",
          document_url: rowData.document_url ?? "",
        };

        // Insert the asset
        const { error } = await supabase.from("assets_redundant").insert(assetData);
        if (error) {
          console.error("Error inserting asset:", error.message, error.details, error.hint);
        }
      }

      // Refresh the assets list
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      showToast({ 
        title: "Assets imported successfully", 
        description: `Imported assets from CSV`, 
        type: "success" 
      });
    } catch (error) {
      console.error("Error processing CSV file:", error);
      showToast({ 
        title: "Import failed", 
        description: "Failed to process CSV file", 
        type: "error" 
      });
    }
  };

  const q = (query || "").toLowerCase().trim();
  const filteredAssets = q
    ? assets.filter((a) =>
        (a.label || "").toLowerCase().includes(q) || 
        (a.model || "").toLowerCase().includes(q) ||
        (a.serial_number || "").toLowerCase().includes(q)
      )
    : assets;

  const siteSelector = (
    <SiteSelector
      value={selectedSite}
      onChange={setSelectedSite}
      placeholder="All Sites"
      className="w-[160px]"
    />
  );

  return (
    <div className="mt-8 space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-white">Assets</h1>
          <Link
            href="/dashboard/archived-assets"
            className="inline-flex items-center px-4 py-2 rounded-lg border border-pink-500 text-pink-500 bg-transparent hover:bg-white/[0.04] transition-all duration-150 ease-in-out hover:shadow-[0_0_12px_rgba(236,72,153,0.25)] text-sm font-medium"
          >
            Archived Assets
          </Link>
          {/* Site Selector and Search Bar moved closer to Archived Assets button */}
          {siteSelector}
          <input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Search assets..." 
            className="w-64 px-4 py-2 rounded-lg border border-white/[0.12] bg-white/[0.06] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500/40" 
          />
        </div>
        <div className="flex items-center space-x-3">
          {/* Action Buttons */}
          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-pink-500 text-pink-500 bg-transparent hover:bg-white/[0.04] transition-all duration-150 ease-in-out hover:shadow-[0_0_12px_rgba(236,72,153,0.25)]"
            aria-label="Add Asset"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-white/[0.12] bg-white/[0.06] text-white hover:bg-white/[0.12] transition-all duration-150 ease-in-out hover:shadow-[0_0_12px_rgba(236,72,153,0.25)]"
            aria-label="Download Assets"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-white/[0.12] bg-white/[0.06] text-white hover:bg-white/[0.12] transition-all duration-150 ease-in-out hover:shadow-[0_0_12px_rgba(236,72,153,0.25)]"
            aria-label="Upload Assets"
          >
            <Upload className="h-5 w-5" />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />

      {(isError || (!ctxLoading && !profile?.company_id)) && (
        <div className="mb-4 rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-3">
          <p className="text-sm text-red-400">{isError ? error?.message || "Failed to load assets" : "No company context detected. Please sign in or complete setup."}</p>
        </div>
      )}

      {ctxLoading || isLoading ? (
        <div className="text-slate-400">Loading assets…</div>
      ) : filteredAssets.length === 0 ? (
        <p className="text-gray-400 p-6">No assets yet. Add one to get started.</p>
      ) : (
        <div className="space-y-4">
          {filteredAssets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} onArchive={async (assetId) => {
              try {
                await supabase.rpc("archive_asset", { asset_to_archive: assetId });
                await queryClient.invalidateQueries({ queryKey: ["assets"] });
                showToast({ 
                  title: "Asset archived", 
                  description: "Asset has been moved to archived assets", 
                  type: "success" 
                });
              } catch (error) {
                console.error("Error archiving asset:", error);
                showToast({ 
                  title: "Archive failed", 
                  description: "Failed to archive asset", 
                  type: "error" 
                });
              }
            }} />
          ))}
        </div>
      )}

      {formOpen && (
        <AssetForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
