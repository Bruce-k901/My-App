"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import LazyAssetFormModal from "@/components/assets/LazyAssetFormModal";
import AssetCard from "@/components/assets/AssetCard";
import Papa from "papaparse";
import { useLazyExcelExport } from "@/components/sites/LazyExcelExport";
import { useToast } from "@/components/ui/ToastProvider";
import EntityPageLayout from "@/components/layouts/EntityPageLayout";

type Asset = {
  id: string;
  company_id: string;
  label: string;
  name: string;
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
  category?: string;
  contractor_id?: string;
  install_date?: string;
  warranty_expiry?: string;
  purchase_date?: string;
  last_service_date?: string;
  next_service_date?: string;
  frequency_months?: number;
  ppm_status?: string;
  notes?: string;
  reliability_index?: number;
  site_name?: string;
  contractor_name?: string;
};

export default function AssetsPage() {
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { exportToExcel } = useLazyExcelExport();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadAssets = async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: assets, error } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          category,
          site_id,
          contractor_id,
          serial_number,
          install_date,
          warranty_expiry,
          purchase_date,
          last_service_date,
          next_service_date,
          frequency_months,
          ppm_status,
          notes,
          created_at,
          model,
          asset_type,
          code,
          date_of_purchase,
          warranty_length_years,
          next_service_due,
          add_to_ppm,
          ppm_services_per_year,
          warranty_callout_info,
          document_url,
          contractor_reactive_id,
          contractor_ppm_id,
          updated_at,
          sites(name),
          contractors(name)
        `)
        .eq('company_id', companyId)
        .order('name', { ascending: true });

      if (error) throw error;

      const mapped = (assets || []).map((row: any) => ({
        id: row.id,
        company_id: companyId, // Add missing company_id
        label: row.name || "(Unnamed Asset)", // Change name to label to match AssetCard interface
        name: row.name || "(Unnamed Asset)", // Keep name for backward compatibility
        model: row.model || "",
        serial_number: row.serial_number || "",
        asset_type: row.category || "—",
        code: row.code || "",
        date_of_purchase: row.purchase_date || "",
        warranty_length_years: row.warranty_length_years ?? undefined,
        next_service_due: row.next_service_date || "",
        add_to_ppm: row.add_to_ppm ?? false,
        ppm_services_per_year: row.ppm_services_per_year ?? undefined,
        warranty_callout_info: row.warranty_callout_info || "",
        document_url: row.document_url || "",
        site_id: row.site_id,
        contractor_reactive_id: row.contractor_reactive_id || "",
        contractor_ppm_id: row.contractor_ppm_id || "",
        created_at: row.created_at || "",
        updated_at: row.updated_at || "",
        category: row.category || "—",
        contractor_id: row.contractor_id,
        install_date: row.install_date || "",
        warranty_expiry: row.warranty_expiry || "",
        purchase_date: row.purchase_date || "",
        last_service_date: row.last_service_date || "",
        next_service_date: row.next_service_date || "",
        frequency_months: row.frequency_months ?? undefined,
        ppm_status: row.ppm_status || "—",
        notes: row.notes || "",
        site_name: row.sites?.name || "—",
        contractor_name: row.contractors?.name || "—",
        reliability_index: 0, // Will be populated from asset_uptime_report
      })) as Asset[];
      
      setAssets(mapped);
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
        "Site Name": asset.site_name,
        "Contractor Name": asset.contractor_name,
        "Serial Number": asset.serial_number,
        "Install Date": asset.install_date,
        "Warranty Expiry": asset.warranty_expiry,
        "Purchase Date": asset.purchase_date,
        "Last Service": asset.last_service_date,
        "Next Service": asset.next_service_date,
        "Frequency (Months)": asset.frequency_months,
        "PPM Status": asset.ppm_status,
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
        serial_number: row["Serial Number"] || row.serial_number || "",
        install_date: row["Install Date"] || row.install_date || null,
        warranty_expiry: row["Warranty Expiry"] || row.warranty_expiry || null,
        purchase_date: row["Purchase Date"] || row.purchase_date || null,
        frequency_months: parseInt(row["Frequency (Months)"] || row.frequency_months) || null,
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-4"></div>
          <p className="text-slate-400">Loading assets...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-red-400 mb-2">⚠️</div>
          <p className="text-red-400 font-medium">Error loading assets</p>
          <p className="text-slate-400 text-sm mt-1">{error}</p>
          <button 
            onClick={loadAssets}
            className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-slate-400 mb-4 text-4xl">🏭</div>
          <p className="text-slate-400 font-medium mb-2">No assets found</p>
          <p className="text-slate-500 text-sm mb-4">
            {query ? `No assets match "${query}"` : "Add your first asset to get started"}
          </p>
          {!query && (
            <button 
              onClick={() => setOpenAdd(true)}
              className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 transition-colors"
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

      <LazyAssetFormModal
        isOpen={openAdd}
        onClose={() => {
          setOpenAdd(false);
          setEditing(null);
        }}
        onSuccess={handleSaved}
        asset={editing || undefined}
      />
    </EntityPageLayout>
  );
}