"use client";

import { useEffect, useRef, useState } from "react";
// import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import AddContractorModal from "@/components/contractors/AddContractorModal";
import ContractorCard from "@/components/contractors/ContractorCard";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useToast } from "@/components/ui/ToastProvider";
import EntityPageLayout from "@/components/layouts/EntityPageLayout";
import { ContextTest } from "@/components/ContextTest";

type Contractor = {
  id: string;
  name: string;
  category: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  ooh_phone?: string;
  hourly_rate?: number;
  callout_fee?: number;
  notes?: string;
  site_ids?: string[];
  site_names?: string[]; // site names for display
};

export default function ContractorsPage() {
  // const router = useRouter();
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadContractors = async () => {
    console.log("🔍 DEBUG ContractorsPage - loadContractors called with companyId:", companyId);
    if (!companyId) {
      console.log("🔍 DEBUG ContractorsPage - no companyId, returning early");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: contractors, error } = await supabase
        .from('contractors')
        .select(`
          id,
          name,
          email,
          phone,
          ooh_phone,
          region,
          website,
          callout_fee,
          hourly_rate,
          postcode,
          contractor_categories ( name, description )
        `)
        .eq('is_active', true)
        .eq('company_id', companyId)
        .order('name', { ascending: true });

      if (error) throw error;

      const mapped = (contractors || []).map((row: any) => ({
        id: row.id,
        name: row.name || "(Unnamed Contractor)",
        category: row.contractor_categories?.name || "—",
        email: row.email || "",
        phone: row.phone || "",
        ooh_phone: row.ooh_phone || "",
        postcode: row.postcode || "",
        region: row.region || "—",
        website: row.website || "",
        hourly_rate: row.hourly_rate ?? null,
        callout_fee: row.callout_fee ?? null,
        site_names: [], // Will be populated later if needed
        site_count: 0, // Will be populated later if needed
      }));
      
      setContractors(mapped);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading contractors:", err?.message);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("🔍 DEBUG ContractorsPage - useEffect triggered with companyId:", companyId);
    if (companyId) loadContractors();
  }, [companyId]);

  const handleSaved = async () => {
    setOpenAdd(false);
    setEditing(null);
    await loadContractors();
  };

  const q = (query || "").toLowerCase().trim();
  const filtered = q
    ? contractors.filter((c) =>
        (c.name || "").toLowerCase().includes(q) || (c.category || "").toLowerCase().includes(q)
      )
    : contractors;

  const handleDownload = async () => {
    const { data, error } = await supabase
      .from('contractors')
      .select('name, email, phone, ooh_phone, hourly_rate, callout_fee, notes')
      .eq('company_id', companyId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error exporting CSV:', error)
      showToast({ title: 'Export failed', description: error.message || 'Unable to export CSV', type: 'error' })
      return
    }

    console.log('Type of data:', typeof data)
    console.log('Data preview:', data)

    // Build rows for XLSX with consistent headers
    let rows: any[] = []
    if (typeof data === 'string') {
      // If a CSV string somehow comes back, parse it first
      const parsed = Papa.parse(data, { header: true, skipEmptyLines: true })
      rows = Array.isArray(parsed.data) ? (parsed.data as any[]) : []
    } else if (Array.isArray(data)) {
      rows = data
    } else {
      console.error('Unexpected data format:', data)
      return
    }

    const fields = ['name','email','phone','ooh_phone','hourly_rate','callout_fee','notes']
    const normalized = rows.map((r) => {
      const obj: Record<string, any> = {}
      for (const f of fields) obj[f] = r?.[f] ?? ''
      return obj
    })

    // Create XLSX workbook for best compatibility with Excel/Sheets
    const worksheet = XLSX.utils.json_to_sheet(normalized, { header: fields })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contractors')
    const xlsxArray = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([xlsxArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'contractors.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    showToast({ title: 'Contractors exported successfully.', description: 'Saved as Excel (.xlsx)', type: 'success' })
  };

  // CSV fallback: hard-wired, guaranteed download
  const handleContractorCsvDownload = async () => {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('name, email, phone, ooh_phone, hourly_rate, callout_fee, notes')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (error) throw error

      const rows = Array.isArray(data) ? data : []

      const csvText = Papa.unparse(rows, {
        header: true,
        quotes: true,
        delimiter: ',',
        newline: '\r\n'
      })

      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = 'contractors.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showToast({ title: 'Contractors CSV exported.', type: 'success' })
      console.log('CSV download triggered.')
    } catch (err: any) {
      console.error('Download failed:', err)
      showToast({ title: 'Export failed', description: err?.message || 'Unable to export CSV', type: 'error' })
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = (results.data as any[]) || [];
          if (!rows.length) {
            showToast({ title: "Upload failed", description: "No rows found in CSV", type: "error" });
            setUploading(false);
            return;
          }
          if (!companyId) {
            showToast({ title: "Upload failed", description: "Company not loaded yet. Please wait and retry.", type: "error" });
            setUploading(false);
            return;
          }
          let successCount = 0;
          let failedCount = 0;
          for (const row of rows) {
            try {
              const payload = {
                company_uuid: companyId,
                name: row.name || row.name || "",
                email: row.email || null,
                phone: row.phone || null,
                ooh_phone: row.ooh_phone || row.ooh || row.emergency_phone || null,
                hourly_rate: row.hourly_rate === undefined || row.hourly_rate === null || String(row.hourly_rate).trim() === "" ? null : Number(row.hourly_rate),
                callout_fee: row.callout_fee === undefined || row.callout_fee === null || String(row.callout_fee).trim() === "" ? null : Number(row.callout_fee),
                notes: row.notes || null,
              } as any;
              const { error } = await supabase.rpc("import_contractors_csv", payload);
              if (error) throw error;
              successCount++;
            } catch (err) {
              console.error("Row import failed", err);
              failedCount++;
            }
          }
          showToast({
            title: failedCount ? "Import completed with some errors" : "Contractors imported successfully",
            description: `${successCount} imported${failedCount ? `, ${failedCount} failed` : ""}`,
            type: failedCount ? "warning" : "success",
          });
          await loadContractors();
          setUploading(false);
          // reset the input value so the same file can be uploaded again if needed
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
        error: (err) => {
          setUploading(false);
          showToast({ title: "Upload failed", description: err?.message || "Unable to parse CSV", type: "error" });
        },
      });
    } catch (e: any) {
      setUploading(false);
      showToast({ title: "Upload failed", description: e?.message || "Unexpected error", type: "error" });
    }
  };

  return (
    <EntityPageLayout
      title="Contractors"
      searchPlaceholder="Search"
      onSearch={(v) => setQuery(v)}
      onAdd={() => setOpenAdd(true)}
      onDownload={handleDownload}
      onUpload={handleUploadClick}
    >
      <ContextTest />
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
          <p className="text-slate-400">Loading contractors...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-red-400 mb-2">⚠️</div>
          <p className="text-red-400 font-medium">Error loading contractors</p>
          <p className="text-slate-400 text-sm mt-1">{error}</p>
          <button 
            onClick={loadContractors}
            className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : contractors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-slate-400 mb-4 text-4xl">👷</div>
          <p className="text-slate-400 font-medium mb-2">No contractors found</p>
          <p className="text-slate-500 text-sm mb-4">
            {query ? `No contractors match "${query}"` : "Add your first contractor to get started"}
          </p>
          {!query && (
            <button 
              onClick={() => setOpenAdd(true)}
              className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 transition-colors"
            >
              Add First Contractor
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-6xl mx-auto">
          {filtered.map((c) => (
            <ContractorCard
              key={c.id}
              contractor={c}
              onEdit={() => {
                setEditing(c);
                setOpenAdd(true);
              }}
            />
          ))}
        </div>
      )}

      <AddContractorModal
        isOpen={openAdd}
        onClose={() => {
          setOpenAdd(false);
          setEditing(null);
        }}
        onSuccess={handleSaved}
        contractor={editing || undefined}
      />
    </EntityPageLayout>
  );
}