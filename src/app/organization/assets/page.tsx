"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import AssetForm from "@/components/assets/AssetForm";
import AssetCard from "@/components/assets/AssetCard";
import Papa from "papaparse";
import { useLazyExcelExport } from "@/components/sites/LazyExcelExport";
import { useToast } from "@/components/ui/ToastProvider";
import EntityPageLayout from "@/components/layouts/EntityPageLayout";

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
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { exportToExcel } = useLazyExcelExport();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadAssets = async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      // Use direct query approach for better reliability
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .eq('company_id', companyId)
        .eq('archived', false)
        .order('name');

      if (assetsError) throw assetsError;

      if (!assetsData || assetsData.length === 0) {
        setAssets([]);
        return;
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

      setAssets(transformedData);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading assets:", err?.message);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) loadAssets();
  }, [companyId]);

  const handleSaved = async () => {
    setOpenAdd(false);
    setEditing(null);
    await loadAssets();
  };

  const q = (query || "").toLowerCase().trim();
  const filtered = q
    ? assets.filter((a) =>
        (a.name || "").toLowerCase().includes(q) || (a.category || "").toLowerCase().includes(q)
      )
    : assets;

  const handleDownload = async () => {
    if (!assets.length) {
      showToast("No assets to export", "error");
      return;
    }

    try {
      const csvData = assets.map((asset) => ({
        Name: asset.name,
        Category: asset.category,
        Model: asset.model,
        "Site Name": asset.site_name,
        "Contractor Name": asset.contractor_name,
        "Serial Number": asset.serial_number,
        "Install Date": asset.install_date,
        "Warranty End": asset.warranty_end,
        "Next Service": asset.next_service,
        Status: asset.status,
        Notes: asset.notes,
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `assets-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("Assets exported successfully", "success");
    } catch (error) {
      console.error("Export error:", error);
      showToast("Failed to export assets", "error");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast("Please select a CSV file", "error");
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      const results = Papa.parse(text, { header: true, skipEmptyLines: true });
      
      if (results.errors.length > 0) {
        console.error("CSV parsing errors:", results.errors);
        showToast("Error parsing CSV file", "error");
        return;
      }

      const data = results.data as any[];
      if (data.length === 0) {
        showToast("CSV file is empty", "error");
        return;
      }

      // Process and insert assets
      const assetsToInsert = data.map((row: any) => ({
        company_id: companyId,
        name: row.Name || row.name || "Unnamed Asset",
        category: row.Category || row.category || "",
        model: row.Model || row.model || "",
        serial_number: row["Serial Number"] || row.serial_number || "",
        install_date: row["Install Date"] || row.install_date || null,
        warranty_end: row["Warranty End"] || row.warranty_end || null,
        next_service: row["Next Service"] || row.next_service || null,
        status: row.Status || row.status || "Active",
        notes: row.Notes || row.notes || "",
      }));

      const { error } = await supabase
        .from('assets')
        .insert(assetsToInsert);

      if (error) throw error;

      showToast(`Successfully imported ${assetsToInsert.length} assets`, "success");
      await loadAssets();
    } catch (error) {
      console.error("Upload error:", error);
      showToast("Failed to import assets", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <EntityPageLayout
      title="Assets"
      searchPlaceholder="Search"
      onSearch={(v) => setQuery(v)}
      onAdd={() => setOpenAdd(true)}
      onDownload={handleDownload}
      onUpload={handleUploadClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 dark:border-cyan-500 mb-4"></div>
          <p className="text-gray-500 dark:text-slate-400">Loading assets...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-red-600 dark:text-red-400 mb-2">⚠️</div>
          <p className="text-red-600 dark:text-red-400 font-medium">Error loading assets</p>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">{error}</p>
          <button
            onClick={loadAssets}
            className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white rounded-md transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-gray-400 dark:text-slate-400 mb-4 text-4xl">🏭</div>
          <p className="text-gray-600 dark:text-slate-400 font-medium mb-2">No assets found</p>
          <p className="text-gray-500 dark:text-slate-500 text-sm mb-4">
            {query ? `No assets match "${query}"` : "Add your first asset to get started"}
          </p>
          {!query && (
            <button
              onClick={() => setOpenAdd(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white rounded-md transition-all duration-200"
            >
              Add First Asset
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-6xl mx-auto">
          {filtered.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
            />
          ))}
        </div>
      )}

      <AssetForm
        open={openAdd}
        onClose={() => {
          setOpenAdd(false);
        }}
        onSaved={handleSaved}
      />
    </EntityPageLayout>
  );
}