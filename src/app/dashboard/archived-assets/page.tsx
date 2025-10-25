"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { ArrowLeft, Search, Filter, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";

interface ArchivedAsset {
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
  archived_at: string | null;
  notes: string | null;
  document_url: string | null;
}

export default function ArchivedAssetsPage() {
  const [archivedAssets, setArchivedAssets] = useState<ArchivedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [unarchiveConfirmOpen, setUnarchiveConfirmOpen] = useState(false);
  const [assetToUnarchive, setAssetToUnarchive] = useState<ArchivedAsset | null>(null);
  const { showToast } = useToast();

  const handleUnarchive = (asset: ArchivedAsset) => {
    setAssetToUnarchive(asset);
    setUnarchiveConfirmOpen(true);
  };

  const handleConfirmUnarchive = async () => {
    if (!assetToUnarchive) return;

    try {
      console.log("Unarchiving asset:", assetToUnarchive.id);
      const { data, error } = await supabase
        .from('assets')
        .update({
          archived: false,
          archived_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assetToUnarchive.id)
        .select();

      console.log("Unarchive update result:", { data, error });
      if (error) throw error;

      // Remove the asset from the archived list
      setArchivedAssets(prev => prev.filter(asset => asset.id !== assetToUnarchive.id));
      
      showToast({
        title: "Asset restored",
        description: "Asset has been moved back to active assets",
        type: "success"
      });

      setUnarchiveConfirmOpen(false);
      setAssetToUnarchive(null);
    } catch (error) {
      console.error("Error unarchiving asset:", error);
      showToast({
        title: "Restore failed",
        description: "Failed to restore asset",
        type: "error"
      });
    }
  };

  const fetchArchivedAssets = async () => {
    try {
      setLoading(true);
      
      // First, get the user's company_id
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error("No user session found");
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error("No company ID found");
      }

      // Use a simpler query approach like the main assets page
      console.log("Fetching archived assets for company:", profile.company_id);
      const { data: assetsData, error: assetsError } = await supabase
        .from("assets")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("archived", true)
        .order("name");
      
      console.log("Archived assets query result:", { data: assetsData, error: assetsError });

      if (assetsError) {
        console.error("Error fetching archived assets:", assetsError);
        showToast({ title: "Failed to load archived assets", type: "error" });
        return;
      }

      if (!assetsData || assetsData.length === 0) {
        setArchivedAssets([]);
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

      setArchivedAssets(transformedData);
    } catch (error) {
      console.error("Error:", error);
      showToast({ title: "Failed to load archived assets", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedAssets();
  }, []);

  const filteredAssets = archivedAssets.filter((asset) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      asset.name?.toLowerCase().includes(searchLower) ||
      asset.model?.toLowerCase().includes(searchLower) ||
      asset.serial_number?.toLowerCase().includes(searchLower) ||
      asset.category?.toLowerCase().includes(searchLower) ||
      asset.status?.toLowerCase().includes(searchLower)
    );
  });

  const formatYears = (years?: number) => {
    if (!years) return "—";
    return years === 1 ? "1 yr" : `${years} yrs`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading archived assets...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Controls */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">Assets</h1>
            <Link
              href="/dashboard/assets"
              className="inline-flex items-center px-4 py-2 rounded-lg border border-pink-500 text-pink-500 bg-transparent hover:bg-white/[0.04] transition-all duration-150 ease-in-out hover:shadow-[0_0_12px_rgba(236,72,153,0.25)] text-sm font-medium"
            >
              Active Assets
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search archived assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500/40"
              />
            </div>
            <div className="text-gray-400 text-sm flex items-center">
              {filteredAssets.length} archived asset{filteredAssets.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Assets List */}
        {filteredAssets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">
              {searchTerm ? "No archived assets match your search" : "No archived assets found"}
            </div>
            <p className="text-gray-500">
              {searchTerm ? "Try adjusting your search terms" : "Assets that are archived will appear here"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-xl border border-gray-700 bg-gray-900 px-6 py-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-white font-semibold text-lg">
                      {asset.name || "(unnamed asset)"}
                    </div>
                    <div className="mt-1 text-sm text-gray-300">
                      <div className="flex flex-wrap gap-3">
                        <span className="text-gray-300">
                          Model: <span className="text-white">{asset.model || "—"}</span>
                        </span>
                        <span className="text-gray-300">
                          Serial: <span className="text-white">{asset.serial_number || "—"}</span>
                        </span>
                        <span className="text-gray-300">
                          Category: <span className="text-white capitalize">{asset.category || "—"}</span>
                        </span>
                        <span className="text-gray-300">
                          Archived: <span className="text-white">{formatDate(asset.archived_at)}</span>
                        </span>
                      </div>
                    </div>
                    
                    {asset.archived_reason && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-400">Reason: </span>
                        <span className="text-orange-400">{asset.archived_reason}</span>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Install Date:</span>
                            <span className="text-white">{formatDate(asset.install_date)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Warranty End:</span>
                            <span className="text-white">{formatDate(asset.warranty_end)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Next Service:</span>
                            <span className="text-white">{formatDate(asset.next_service)}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <span className="text-white">{asset.status || "—"}</span>
                          </div>
                          {asset.notes && (
                             <div className="flex justify-between">
                               <span className="text-gray-400">Notes:</span>
                               <span className="text-white">{asset.notes}</span>
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Unarchive Button */}
                  <div className="flex items-center">
                    <button
                      onClick={() => handleUnarchive(asset)}
                      className="p-2 bg-transparent hover:bg-neutral-800/40 border-none 
                                 text-green-400 hover:text-green-300 
                                 hover:shadow-[0_0_6px_#00ff99] transition flex items-center"
                      title="Restore to Active Assets"
                    >
                      <RotateCcw size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unarchive Confirmation Modal */}
      <Dialog open={unarchiveConfirmOpen} onOpenChange={setUnarchiveConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restore Asset?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-neutral-300">
              This asset and its full history will be moved back to the Active Assets list. Continue?
            </p>
            {assetToUnarchive && (
              <div className="mt-3 p-3 bg-neutral-800 rounded-lg">
                <p className="text-sm text-neutral-400">Asset: {assetToUnarchive.name}</p>
                <p className="text-sm text-neutral-400">Archived: {formatDate(assetToUnarchive.archived_at)}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setUnarchiveConfirmOpen(false)}
              className="text-neutral-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUnarchive}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Restore
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}