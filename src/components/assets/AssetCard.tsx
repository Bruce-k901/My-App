"use client";

import React, { useState, useEffect } from "react";
import { Edit2, Save, X, Archive, Paperclip, Trash2, ChevronUp, Edit3, Wrench } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/components/ui/ToastProvider";
import { calculateAssetAge, calculateNextServiceDate } from "@/lib/utils/dateUtils";
import { useQueryClient } from "@tanstack/react-query";
import CardChevron from "@/components/ui/CardChevron";
import EditableField from "@/components/ui/EditableField";
import CalloutModal from "@/components/modals/CalloutModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Asset {
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

interface AssetCardProps {
  asset: Asset;
  onArchive?: (assetId: string) => void;
  onEdit?: (asset: Asset) => void;
}

export default function AssetCard({ asset, onArchive, onEdit }: AssetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [calloutModalOpen, setCalloutModalOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Check if under warranty using warranty_end column
  const isUnderWarranty = () => {
    if (!asset.warranty_end) return false;
    return new Date() <= new Date(asset.warranty_end);
  };

  const underWarranty = isUnderWarranty();

  const handleArchive = () => {
    setArchiveConfirmOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (onArchive) {
      // Minimize the card first for visual feedback
      setIsExpanded(false);
      
      // Add a small delay for the minimize animation
      setTimeout(async () => {
        await onArchive(asset.id);
      }, 200);
    }
  };

  // Calculate next service date
  const getNextServiceDate = () => {
    if (asset.next_service_date) {
      return new Date(asset.next_service_date);
    }
    return null;
  };

  // Site change handler with contractor auto-update
  const handleSiteChange = async (newSiteId: string) => {
    try {
      // Update site_id
      await supabase.from('assets').update({ site_id: newSiteId }).eq('id', asset.id);
      
      // Get site region for contractor auto-update
      const { data: site } = await supabase
        .from('sites')
        .select('region')
        .eq('id', newSiteId)
        .single();
      
      if (site?.region) {
        // Find contractors that match the asset category and site region
        const { data: matched } = await supabase
          .from('contractors')
          .select('id, category')
          .eq('region', site.region)
          .eq('category', asset.category)
          .eq('company_id', companyId)
          .limit(1);
        
        if (matched && matched.length > 0) {
          // Auto-update contractors
          await supabase.from('assets').update({
            ppm_contractor_id: matched[0].id,
            reactive_contractor_id: matched[0].id,
            warranty_contractor_id: matched[0].id
          }).eq('id', asset.id);
        }
      }
      
      showToast({ title: 'Site updated successfully', type: 'success' });
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
    } catch (error: any) {
      console.error('Site update failed:', error);
      showToast({ 
        title: 'Failed to update site', 
        description: error.message || 'Could not update site', 
        type: 'error' 
      });
    }
  };

  // Generic field update handler
  const handleFieldUpdate = async (field: string, value: string) => {
    try {
      await supabase.from('assets').update({ [field]: value }).eq('id', asset.id);
      showToast({ title: 'Field updated successfully', type: 'success' });
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
    } catch (error: any) {
      console.error('Field update failed:', error);
      showToast({ 
        title: 'Failed to update field', 
        description: error.message || 'Could not update field', 
        type: 'error' 
      });
    }
  };

  // Fetch sites for site dropdown
  const fetchSites = async () => {
    const { data, error } = await supabase
      .from('sites')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name');
    
    if (error) throw error;
    return (data || []).map(site => ({ value: site.id, label: site.name }));
  };

  // Fetch contractors for contractor dropdowns
  const fetchContractors = async () => {
    const { data, error } = await supabase
      .from('contractors')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name');
    
    if (error) throw error;
    return (data || []).map(contractor => ({ value: contractor.id, label: contractor.name }));
  };

  return (
    <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-3 transition-all duration-150 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]">
      {/* Compact View */}
      {!isExpanded && (
        <div className="space-y-2">
          {/* Header with asset info and buttons */}
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-neutral-800/50 transition"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsExpanded(!isExpanded);
              }
            }}
          >
            <div className="flex items-center justify-between flex-1 min-w-0 mr-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-white truncate">
                  {asset.name || "Unnamed Asset"}
                </h3>
                {asset.site_name && (
                  <span className="text-sm text-gray-400 truncate">
                    @ {asset.site_name}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-8">
                <span className="text-sm text-gray-400 truncate">
                  Next Service: {(() => {
                    const nextService = getNextServiceDate();
                    return nextService ? nextService.toLocaleDateString() : "Not scheduled";
                  })()}
                </span>
                <span className="text-sm text-gray-400 truncate">
                  Age: {calculateAssetAge(asset.install_date)}
                </span>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCalloutModalOpen(true);
                }}
                className="p-1.5 text-magenta-400 hover:text-magenta-300 border border-magenta-500 rounded transition-colors hover:shadow-[0_0_8px_rgba(236,72,153,0.3)]"
                title="Log a callout"
              >
                <Wrench size={16} />
              </button>
              <CardChevron 
                isOpen={isExpanded} 
                onToggle={() => setIsExpanded(!isExpanded)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Expanded View - Full Data Display with Inline Editing */}
      {isExpanded && (
        <div className="mt-4 max-w-5xl mx-auto">
          {/* Header with minimize button */}
          <div 
            onClick={() => setIsExpanded(false)}
            className="flex items-center justify-between pb-4 cursor-pointer hover:bg-neutral-800/30 transition rounded-lg p-2 -m-2"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsExpanded(false);
              }
            }}
          >
            <h2 className="text-lg font-semibold text-white">{asset.name || "Unnamed Asset"}</h2>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="p-1.5 text-gray-400 hover:text-white transition-colors"
              title="Minimize"
            >
              <ChevronUp size={16} />
            </button>
          </div>
          
          {/* Divider line */}
          <div className="border-t border-neutral-700 mb-6"></div>
          
          {/* All Asset Fields with Inline Editing - 2 Column Grid */}
          <div className="space-y-6">
            {/* Section A: Assignment */}
            <div>
              <h3 className="text-base font-semibold tracking-wide text-magenta-400 border-t border-neutral-700 mt-4 pt-3 bg-gradient-to-r from-magenta-600/20 to-transparent px-2 py-1 rounded">
                Assignment
              </h3>
              <div className="grid grid-cols-2 gap-x-12 gap-y-4 items-center text-sm mt-4 py-2 relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-magenta-500/40"></div>
                <EditableField
                  label="Site"
                  value={asset.site_name}
                  type="select"
                  fetchOptions={fetchSites}
                  onSave={handleSiteChange}
                />
                <div className="flex justify-between items-center border-b border-neutral-800 pb-1">
                  <span className="text-neutral-400">Category</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{asset.category}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section B: Identification */}
            <div>
              <h3 className="text-base font-semibold tracking-wide text-magenta-400 border-t border-neutral-700 mt-6 pt-3 bg-gradient-to-r from-magenta-500/10 to-transparent px-2 py-1 rounded">
                Identification
              </h3>
              <div className="grid grid-cols-2 gap-x-12 gap-y-4 items-center text-sm mt-4 py-2 relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-magenta-500/40"></div>
                <div className="flex justify-between items-center border-b border-neutral-800 pb-1">
                  <span className="text-neutral-400">Asset Name</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{asset.name}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-b border-neutral-800 pb-1">
                  <span className="text-neutral-400">Brand</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{asset.brand || '—'}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-b border-neutral-800 pb-1">
                  <span className="text-neutral-400">Model</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{asset.model || '—'}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-b border-neutral-800 pb-1">
                  <span className="text-neutral-400">Serial Number</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{asset.serial_number || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section C: Important Dates */}
            <div>
              <h3 className="text-base font-semibold tracking-wide text-magenta-400 border-t border-neutral-700 mt-6 pt-3 bg-gradient-to-r from-magenta-500/10 to-transparent px-2 py-1 rounded">
                Important Dates
              </h3>
              <div className="grid grid-cols-2 gap-x-12 gap-y-4 items-center text-sm mt-4 py-2 relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-magenta-500/40"></div>
                <div className="flex justify-between items-center border-b border-neutral-800 pb-1">
                  <span className="text-neutral-400">Install Date</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {asset.install_date ? new Date(asset.install_date).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-b border-neutral-800 pb-1">
                  <span className="text-neutral-400">Warranty End</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {asset.warranty_end ? new Date(asset.warranty_end).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
                <EditableField
                  label="Next Service Date"
                  value={asset.next_service_date}
                  type="date"
                  onSave={(value) => handleFieldUpdate('next_service_date', value)}
                />
                <EditableField
                  label="PPM Frequency"
                  value={asset.ppm_frequency_months ? `every ${asset.ppm_frequency_months} months` : '—'}
                  type="text"
                  onSave={(value) => {
                    // Extract number from "every X months" format or just number
                    const match = value.match(/every (\d+) months?/i);
                    const months = match ? parseInt(match[1]) : parseInt(value);
                    if (months && months >= 1) {
                      handleFieldUpdate('ppm_frequency_months', months.toString());
                    }
                  }}
                  placeholder="every 6 months"
                />
              </div>
            </div>

            {/* Section D: Contractor Assignments */}
            <div>
              <h3 className="text-base font-semibold tracking-wide text-magenta-400 border-t border-neutral-700 mt-6 pt-3 bg-gradient-to-r from-magenta-500/10 to-transparent px-2 py-1 rounded">
                Contractor Assignments
              </h3>
              <div className="grid grid-cols-2 gap-x-12 gap-y-4 items-center text-sm mt-4 py-2 relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-magenta-500/40"></div>
                <EditableField
                  label="PPM Contractor"
                  value={asset.ppm_contractor_name}
                  type="select"
                  fetchOptions={fetchContractors}
                  onSave={(value) => handleFieldUpdate('ppm_contractor_id', value)}
                />
                <EditableField
                  label="Reactive Contractor"
                  value={asset.reactive_contractor_name}
                  type="select"
                  fetchOptions={fetchContractors}
                  onSave={(value) => handleFieldUpdate('reactive_contractor_id', value)}
                />
                <EditableField
                  label="Warranty Contractor"
                  value={asset.warranty_contractor_name}
                  type="select"
                  fetchOptions={fetchContractors}
                  onSave={(value) => handleFieldUpdate('warranty_contractor_id', value)}
                />
                <div></div>
              </div>
            </div>

            {/* Section E: Additional Information */}
            <div>
              <h3 className="text-base font-semibold tracking-wide text-magenta-400 border-t border-neutral-700 mt-6 pt-3 bg-gradient-to-r from-magenta-500/10 to-transparent px-2 py-1 rounded">
                Additional Information
              </h3>
              <div className="grid grid-cols-2 gap-x-12 gap-y-4 items-center text-sm mt-4 py-2 relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-magenta-500/40"></div>
                <div className="flex justify-between items-center border-b border-neutral-800 pb-1">
                  <span className="text-neutral-400">Status</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{asset.status}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-b border-neutral-800 pb-1">
                  <span className="text-neutral-400">Warranty Status</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`
                        ${asset.warranty_end && new Date(asset.warranty_end) >= new Date()
                          ? 'text-green-400 animate-pulse font-medium'
                          : 'text-red-400 animate-pulse font-medium'}
                      `}
                    >
                      {asset.warranty_end && new Date(asset.warranty_end) >= new Date()
                        ? 'In Warranty'
                        : 'Out of Warranty'}
                    </span>
                  </div>
                </div>
                <EditableField
                  label="Notes"
                  value={asset.notes}
                  type="textarea"
                  onSave={(value) => handleFieldUpdate('notes', value)}
                  placeholder="Enter any additional notes..."
                />
                <div className="flex justify-between items-center border-b border-neutral-800 pb-1">
                  <span className="text-neutral-400">Document URL</span>
                  <div className="flex items-center gap-2">
                    {asset.document_url ? (
                      <a 
                        href={asset.document_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-magenta-400 hover:text-magenta-300 text-sm underline"
                      >
                        View Document
                      </a>
                    ) : (
                      <span className="text-white font-medium">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end pt-6 border-t border-neutral-700 mt-6">
            <div className="flex items-center space-x-2">
              {onArchive && (
                <button
                  onClick={handleArchive}
                  className="p-2 bg-transparent hover:bg-neutral-800/40 border-none 
                             text-orange-400 hover:text-orange-300 
                             hover:shadow-[0_0_6px_#ff9500] transition flex items-center"
                  title="Archive Asset"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Archived Date Display */}
          {asset.archived && asset.archived_at && (
            <div className="mt-4 pt-4 border-t border-neutral-700">
              <p className="text-xs text-neutral-400 text-center">
                Archived on {new Date(asset.archived_at).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Callout Modal */}
      <CalloutModal
        open={calloutModalOpen}
        onClose={() => setCalloutModalOpen(false)}
        asset={asset}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        open={archiveConfirmOpen}
        onClose={() => setArchiveConfirmOpen(false)}
        onConfirm={handleConfirmArchive}
        title="Move Asset to Archives"
        description={`Are you sure you want to move "${asset.name}" to archives? This action can be undone later.`}
        confirmText="Move to Archives"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}