'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AssetForm from '@/components/assets/AssetForm';
import AssetCard from '@/components/assets/AssetCard';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import SiteSelector from "@/components/ui/SiteSelector";
import { useSiteFilter } from '@/hooks/useSiteFilter';
import Link from "next/link";
import { Plus, Upload, Download, Archive, X } from '@/components/ui/icons';
import { AssetBulkUploadWizard } from '@/components/assets/bulk-upload/AssetBulkUploadWizard';

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
  working_temp_min: number | null;
  working_temp_max: number | null;
  ppm_group_id: string | null;
  ppm_group_name: string | null;
};

export default function AssetsPage() {
  const { companyId, loading: authLoading, session } = useAppContext();
  const { applySiteFilter, createRecord, selectedSiteId, isAllSites } = useSiteFilter();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [query, setQuery] = useState("");
  const [showBulkUpload, setShowBulkUpload] = useState(false);
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
    const { data: assetsData, error: assetsError } = await applySiteFilter(
      supabase
        .from('assets')
        .select('*')
        .eq('company_id', companyId)
        .eq('archived', false)
    ).order('name');
      
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
      
      // Get unique PPM group IDs
      const groupIds = [...new Set(assetsData.map(asset => asset.ppm_group_id).filter(Boolean))];

      // Fetch sites, contractors, and PPM groups in parallel
      const [sitesResult, contractorsResult, groupsResult] = await Promise.all([
        siteIds.length > 0 ? supabase.from('sites').select('id, name').in('id', siteIds) : { data: [] },
        contractorIds.length > 0 ? supabase.from('contractors').select('id, name').in('id', contractorIds) : { data: [] },
        groupIds.length > 0 ? supabase.from('ppm_groups').select('id, name').in('id', groupIds) : { data: [] }
      ]);

      // Create lookup maps
      const sitesMap = new Map((sitesResult.data || []).map(site => [site.id, site.name]));
      const contractorsMap = new Map((contractorsResult.data || []).map(contractor => [contractor.id, contractor.name]));
      const groupsMap = new Map((groupsResult.data || []).map(g => [g.id, g.name]));
      
      // Transform the data to match the expected format
      const transformedData = assetsData.map((asset: any) => ({
        ...asset,
        site_name: asset.site_id ? sitesMap.get(asset.site_id) || null : null,
        ppm_contractor_name: asset.ppm_contractor_id ? contractorsMap.get(asset.ppm_contractor_id) || null : null,
        reactive_contractor_name: asset.reactive_contractor_id ? contractorsMap.get(asset.reactive_contractor_id) || null : null,
        warranty_contractor_name: asset.warranty_contractor_id ? contractorsMap.get(asset.warranty_contractor_id) || null : null,
        ppm_group_id: asset.ppm_group_id || null,
        ppm_group_name: asset.ppm_group_id ? groupsMap.get(asset.ppm_group_id) || null : null,
      }));
      
      // Site filtering is now handled by applySiteFilter in the query
      return transformedData as Asset[];
  };

  const { data: assets = [], isLoading, isError, error } = useQuery({
    queryKey: ["assets", companyId, selectedSiteId],
    queryFn: fetchAssets,
    staleTime: 1000 * 60 * 5, // cache for 5 min
    enabled: !authLoading && !!companyId && !!session?.user?.id,
  });
  
  // Wait for auth to load before proceeding
  if (authLoading) return <div className="p-8 text-theme-primary">Loading...</div>;

  if (!companyId) {
    return (
      <div className="p-8">
        <div className="bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
            Company Setup Required
          </h2>
          <p className="text-theme-secondary mb-4">
            Please complete your company setup to access this page.
          </p>
          <a
            href="/dashboard/business"
            className="inline-block px-4 py-2 bg-module-fg hover:bg-module-fg/90 text-white rounded-lg transition-all duration-200"
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
          <h1 className="text-3xl font-bold text-theme-primary">Assets</h1>
          {/* Site filtering is handled by SiteContext - see header SiteFilter component */}
          {isAllSites && (
            <span className="text-sm text-theme-tertiary">(Viewing all sites)</span>
          )}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assets..."
 className="h-11 w-64 px-4 rounded-lg border border-theme bg-theme-surface text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-module-fg/[0.25] focus:border-module-fg/[0.50]"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Action Buttons with unified height and 2mm spacing */}
          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-module-fg/[0.50] text-module-fg bg-transparent hover:bg-module-fg/[0.06] dark:hover:bg-white/[0.04] transition-all duration-150 ease-in-out"
            aria-label="Add Asset"
          >
            <Plus className="h-5 w-5" />
          </button>
          <Link
            href="/dashboard/archived-assets"
            className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-module-fg/[0.30] text-module-fg/70 bg-transparent hover:bg-module-fg/[0.06] dark:hover:bg-white/[0.04] transition-all duration-150 ease-in-out"
            title="View archived assets"
          >
            <Archive className="h-5 w-5" />
          </Link>
          <button
            onClick={handleDownload}
            className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-gray-300 dark:border-white/[0.12] bg-gray-100 dark:bg-white/[0.06] text-theme-secondary hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-all duration-150 ease-in-out"
            aria-label="Download Assets"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowBulkUpload(true)}
            className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-gray-300 dark:border-white/[0.12] bg-gray-100 dark:bg-white/[0.06] text-theme-secondary hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-all duration-150 ease-in-out"
            aria-label="Upload Assets"
          >
            <Upload className="h-5 w-5" />
          </button>
        </div>
      </div>


      {isError && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-white/[0.06] border border-red-200 dark:border-white/[0.1] px-4 py-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error?.message || "Failed to load assets"}</p>
        </div>
      )}

      {isLoading ? (
        <div className="text-theme-tertiary">Loading assets…</div>
      ) : filteredAssets.length === 0 ? (
        <p className="text-theme-tertiary p-6">No assets yet. Add one to get started.</p>
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

      {showBulkUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-theme-surface-elevated rounded-2xl border border-theme shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-theme-primary">Import Assets</h2>
              <button
                onClick={() => setShowBulkUpload(false)}
                className="text-theme-tertiary hover:text-theme-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <AssetBulkUploadWizard
              onComplete={() => {
                setShowBulkUpload(false);
                queryClient.invalidateQueries({ queryKey: ['assets'] });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
