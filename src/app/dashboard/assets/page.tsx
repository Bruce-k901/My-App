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
import { Plus, Upload, Download, Archive } from "lucide-react";

type Asset = {
  id: string;
  company_id: string;
  name: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  category: string;
  site_id: string | null;
  site_name: string | null;
  ppm_contractor_id: string | null;
  ppm_contractor_name: string | null;
  reactive_contractor_id: string | null;
  reactive_contractor_name: string | null;
  warranty_contractor_id: string | null;
  warranty_contractor_name: string | null;
  install_date: string | null;
  warranty_end: string | null;
  last_service_date: string | null;
  next_service_date: string | null;
  ppm_frequency_months: number | null;
  ppm_status: string | null;
  status: string;
  archived: boolean;
  notes: string | null;
};

export default function AssetsPage() {
  const { companyId, loading: authLoading, session } = useAppContext();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [query, setQuery] = useState("");
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const fetchAssets = async () => {
    console.log("Fetching assets...");
    console.log("Session:", session);
    console.log("Company ID:", companyId);
    
    if (!session?.user?.id) {
      throw new Error("No user ID available");
    }
    
    if (!companyId) {
      throw new Error("No company ID available");
    }
    
    // Use direct query approach for better reliability
    console.log("Fetching assets with direct query...");
    const { data: assetsData, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .eq('company_id', companyId)
      .eq('archived', false)
      .order('name');
      
      console.log("Direct query result:", { data: assetsData, error: assetsError });
      
      if (assetsError) {
        console.error("Error fetching assets:", assetsError);
        console.error("Error details:", JSON.stringify(assetsError, null, 2));
        throw new Error(`Failed to load assets: ${assetsError.message || 'Unknown error'}`);
      }
      
      if (!assetsData || assetsData.length === 0) {
        return [];
      }
      
      // Get unique site IDs and contractor IDs
      const siteIds = [...new Set(assetsData.map(asset => asset.site_id).filter(Boolean))];
      const contractorIds = [...new Set([
        ...assetsData.map(asset => asset.ppm_contractor_id).filter(Boolean),
        ...assetsData.map(asset => asset.reactive_contractor_id).filter(Boolean),
        ...assetsData.map(asset => asset.warranty_contractor_id).filter(Boolean)
      ])];
      
      // Fetch sites and contractors in parallel
      const [sitesResult, contractorsResult] = await Promise.all([
        siteIds.length > 0 ? supabase.from('sites').select('id, name').in('id', siteIds) : { data: [] },
        contractorIds.length > 0 ? supabase.from('contractors').select('id, name').in('id', contractorIds) : { data: [] }
      ]);
      
      // Create lookup maps
      const sitesMap = new Map((sitesResult.data || []).map(site => [site.id, site.name]));
      const contractorsMap = new Map((contractorsResult.data || []).map(contractor => [contractor.id, contractor.name]));
      
      // Transform the data to match the expected format
      const transformedData = assetsData.map((asset: any) => ({
        ...asset,
        site_name: asset.site_id ? sitesMap.get(asset.site_id) || null : null,
        ppm_contractor_name: asset.ppm_contractor_id ? contractorsMap.get(asset.ppm_contractor_id) || null : null,
        reactive_contractor_name: asset.reactive_contractor_id ? contractorsMap.get(asset.reactive_contractor_id) || null : null,
        warranty_contractor_name: asset.warranty_contractor_id ? contractorsMap.get(asset.warranty_contractor_id) || null : null,
      }));
      
      // Filter by site if selected
      let filteredData = transformedData;
      if (selectedSite) {
        filteredData = transformedData.filter((asset: any) => asset.site_id === selectedSite);
      }
      
      return filteredData as Asset[];
  };

  const { data: assets = [], isLoading, isError, error } = useQuery({
    queryKey: ["assets", selectedSite],
    queryFn: fetchAssets,
    staleTime: 1000 * 60 * 5, // cache for 5 min
    enabled: !authLoading && !!companyId,
  });
  
  // Wait for auth to load before proceeding
  if (authLoading) return <div className="p-8 text-white">Loading...</div>;

  if (!companyId) {
    return (
      <div className="p-8">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">
            Company Setup Required
          </h2>
          <p className="text-white/80 mb-4">
            Please complete your company setup to access this page.
          </p>
          <a 
            href="/dashboard/business" 
            className="inline-block px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg"
          >
            Complete Setup
          </a>
        </div>
      </div>
    );
  }

  const handleAdd = () => {
    setFormOpen(true);
  };

  const handleSaved = async () => {
    setFormOpen(false);
    // No need to manually refetch - React Query will handle this via cache invalidation
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDownload = () => {
    try {
      // Prepare CSV data with all asset fields
      const fields = [
        "name",
        "model", 
        "serial_number",
        "category",
        "install_date",
        "warranty_end",
        "next_service_date",
        "status",
        "notes"
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
    if (!file || !companyId) return;

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
          company_id: companyId,
          site_id: rowData.site_id ?? null,
          label: rowData.label ?? "",
          name: rowData.name || rowData.label || "",
          model: rowData.model ?? "",
          serial_number: rowData.serial_number ?? "",
          brand: rowData.brand ?? "",
          category: mapAssetType(rowData.category || rowData.type),
          install_date: toISODate(rowData.install_date || rowData.date_of_purchase),
          warranty_end: toISODate(rowData.warranty_end),
          next_service_date: toISODate(rowData.next_service_date || rowData.next_service_due),
          status: rowData.status || "Active",
          notes: rowData.notes ?? "",
        };

        // Insert the asset
        const { error } = await supabase.from("assets").insert(assetData);
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
        (a.name || "").toLowerCase().includes(q) || 
        (a.model || "").toLowerCase().includes(q) ||
        (a.serial_number || "").toLowerCase().includes(q) ||
        (a.brand || "").toLowerCase().includes(q) ||
        (a.category || "").toLowerCase().includes(q)
      )
    : assets;


  return (
    <div className="mt-8 space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-white">Assets</h1>
          {/* Site Selector and Search Bar next to Assets header */}
          <SiteSelector
            value={selectedSite}
            onChange={setSelectedSite}
            placeholder="All Sites"
            className="h-11 min-w-[120px]"
          />
          <input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Search assets..." 
            className="h-11 w-64 px-4 rounded-lg border border-white/[0.12] bg-white/[0.06] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500/40" 
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Action Buttons with unified height and 2mm spacing */}
          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-pink-500 text-pink-500 bg-transparent hover:bg-white/[0.04] transition-all duration-150 ease-in-out hover:shadow-[0_0_12px_rgba(236,72,153,0.25)]"
            aria-label="Add Asset"
          >
            <Plus className="h-5 w-5" />
          </button>
          <Link
            href="/dashboard/archived-assets"
            className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-orange-500 text-orange-500 bg-transparent hover:bg-orange-500/10 transition-all duration-150 ease-in-out hover:shadow-[0_0_8px_#ff9500]"
            title="View archived assets"
          >
            <Archive className="h-5 w-5" />
          </Link>
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
            <AssetCard 
              key={asset.id} 
              asset={asset} 
              onArchive={async (assetId) => {
                try {
                  console.log("Archiving asset:", assetId);
                  // Use direct update instead of RPC function
                  const { data, error } = await supabase
                    .from('assets')
                    .update({ 
                      archived: true, 
                      archived_at: new Date().toISOString() 
                    })
                    .eq('id', assetId)
                    .select();
                  
                  console.log("Archive update result:", { data, error });
                  if (error) throw error;
                  
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
              }} 
            />
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
