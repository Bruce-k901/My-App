"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { ArrowLeft, Search, Filter } from "lucide-react";
import Link from "next/link";

interface ArchivedAsset {
  id: string;
  label?: string;
  code?: string;
  type?: string;
  model?: string;
  serial_number?: string;
  date_of_purchase?: string;
  warranty_length_years?: number;
  under_warranty?: boolean;
  next_service_due?: string;
  add_to_ppm?: boolean;
  ppm_services_per_year?: number;
  warranty_callout_info?: string;
  document_url?: string;
  site_id?: string;
  company_id?: string;
  archived_at?: string;
  archived_reason?: string;
}

export default function ArchivedAssetsPage() {
  const [archivedAssets, setArchivedAssets] = useState<ArchivedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { showToast } = useToast();

  const fetchArchivedAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("redundant_assets")
        .select("*")
        .order("archived_at", { ascending: false });

      if (error) {
        console.error("Error fetching archived assets:", error);
        showToast("Failed to load archived assets", "error");
        return;
      }

      setArchivedAssets(data || []);
    } catch (error) {
      console.error("Error:", error);
      showToast("Failed to load archived assets", "error");
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
      asset.label?.toLowerCase().includes(searchLower) ||
      asset.code?.toLowerCase().includes(searchLower) ||
      asset.model?.toLowerCase().includes(searchLower) ||
      asset.serial_number?.toLowerCase().includes(searchLower) ||
      asset.type?.toLowerCase().includes(searchLower)
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
                      {asset.label || asset.code || "(unnamed asset)"}
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
                          Type: <span className="text-white capitalize">{asset.type || "—"}</span>
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
                            <span className="text-gray-400">Asset Code:</span>
                            <span className="text-white">{asset.code || "—"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Purchase Date:</span>
                            <span className="text-white">{formatDate(asset.date_of_purchase)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Warranty:</span>
                            <span className="text-white">{formatYears(asset.warranty_length_years)}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Under Warranty:</span>
                            <span className="text-white">{asset.under_warranty ? "Yes" : "No"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">PPM Enabled:</span>
                            <span className="text-white">{asset.add_to_ppm ? "Yes" : "No"}</span>
                          </div>
                          {asset.document_url && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Document:</span>
                              <a 
                                href={asset.document_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-pink-500 hover:text-pink-400 underline"
                              >
                                View
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}