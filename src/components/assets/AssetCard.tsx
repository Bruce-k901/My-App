"use client";

import React, { useState, useEffect } from "react";
import { Edit2, Save, X, Archive, Paperclip, Trash2, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/components/ui/ToastProvider";
import { calculateAssetAge, calculateNextServiceDate } from "@/lib/utils/dateUtils";
import { useQueryClient } from "@tanstack/react-query";
import CardChevron from "@/components/ui/CardChevron";

interface Asset {
  id: string;
  company_id: string;
  label: string;
  model?: string;
  serial_number?: string;
  asset_type?: string;
  code?: string; // Changed from asset_code to code
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
}

interface AssetCardProps {
  asset: Asset & {
    site_name?: string | null;
  };
  onArchive?: (assetId: string) => void;
}

export default function AssetCard({ asset, onArchive }: AssetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAsset, setEditedAsset] = useState<Asset>(asset);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [contractors, setContractors] = useState<{id: string; name: string; category_name: string}[]>([]);

  // Load contractors when component mounts or when editing starts
  useEffect(() => {
    const loadContractors = async () => {
      if (!companyId || !isEditing) return;
      
      try {
        const { data, error } = await supabase
          .from("contractors")
          .select("id, name, category_name")
          .eq("company_id", companyId)
          .in("category_name", [asset.asset_type])
          .order("name");
        
        if (error) throw error;
        
        setContractors(data || []);
      } catch (error) {
        console.error("Failed to load contractors:", error);
      }
    };

    loadContractors();
  }, [companyId, isEditing, asset.asset_type]);

  // Auto-fill PPM contractor when reactive contractor is selected
  useEffect(() => {
    if (!editedAsset.contractor_ppm_id && editedAsset.contractor_reactive_id) {
      setEditedAsset(prev => ({
        ...prev,
        contractor_ppm_id: editedAsset.contractor_reactive_id
      }));
    }
  }, [editedAsset.contractor_reactive_id]);

  // Update editedAsset when asset prop changes (from React Query updates)
  React.useEffect(() => {
    setEditedAsset(asset);
  }, [asset]);

  // Auto-calculate warranty end date
  const getWarrantyEndDate = (purchaseDate?: string, warrantyYears?: number) => {
    if (!purchaseDate || !warrantyYears) return null;
    const purchase = new Date(purchaseDate);
    const warrantyEnd = new Date(purchase);
    warrantyEnd.setFullYear(purchase.getFullYear() + warrantyYears);
    return warrantyEnd;
  };

  // Check if under warranty
  const isUnderWarranty = () => {
    const warrantyEnd = getWarrantyEndDate(editedAsset.date_of_purchase, editedAsset.warranty_length_years);
    if (!warrantyEnd) return false;
    return new Date() <= warrantyEnd;
  };

  const warrantyEndDate = getWarrantyEndDate(editedAsset.date_of_purchase, editedAsset.warranty_length_years);
  const underWarranty = isUnderWarranty();

  const handleInputChange = (field: keyof Asset, value: any) => {
    setEditedAsset(prev => ({ ...prev, [field]: value }));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedAsset(asset);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log("Saving asset with data:", editedAsset);
      
      // Generate asset code if it doesn't exist
      let assetCode = editedAsset.code;
      if (!assetCode || assetCode.trim() === "") {
        // Get the current count of assets for this company to generate the next code
        const { count, error: countError } = await supabase
          .from("assets_redundant")
          .select("*", { count: "exact", head: true })
          .eq("company_id", asset.company_id);
        
        if (countError) {
          console.error("Error counting assets:", countError);
        } else {
          const nextNumber = (count || 0) + 1;
          assetCode = `AST-${String(nextNumber).padStart(5, "0")}`;
          console.log("Generated asset code:", assetCode);
        }
      }
      
      // Only update the editable fields
      const updateData = {
        label: editedAsset.label,
        model: editedAsset.model,
        serial_number: editedAsset.serial_number,
        asset_type: editedAsset.asset_type,
        code: assetCode, // Include the generated or existing asset code
        date_of_purchase: editedAsset.date_of_purchase,
        warranty_length_years: editedAsset.warranty_length_years,
        warranty_callout_info: editedAsset.warranty_callout_info,
        add_to_ppm: editedAsset.add_to_ppm,
        ppm_services_per_year: editedAsset.ppm_services_per_year,
      };

      console.log("Update data being sent:", updateData);
      console.log("Asset ID:", asset.id);

      const { data, error } = await supabase
        .from("assets_redundant")
        .update(updateData)
        .eq("id", asset.id)
        .select();

      console.log("Supabase response:", { data, error });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      showToast("Asset updated successfully", "success");
      setIsEditing(false);
      setIsExpanded(false); // Minimize the card after successful save
      
      // ✅ Auto-refresh data without manual onRefresh
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
    } catch (error: any) {
      console.error("Error updating asset:", error);
      showToast(`Failed to update asset: ${error?.message || 'Unknown error'}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (onArchive) {
      onArchive(asset.id);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Handle file upload logic here
    // For now, just add to uploaded files list
    const newFiles = Array.from(files).map(file => file.name);
    setUploadedFiles(prev => [...prev, ...newFiles]);
    showToast(`${newFiles.length} file(s) uploaded`, "success");
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f !== fileName));
  };



  // Calculate next service date
  const getNextServiceDate = () => {
    const calculatedDate = calculateNextServiceDate(
      asset.date_of_purchase,
      asset.add_to_ppm,
      asset.ppm_services_per_year
    );
    return calculatedDate;
  };

  return (
    <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-4 transition-all duration-150 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]">
      {/* Compact View */}
      {!isExpanded && (
        <div className="space-y-2">
          {/* Header with asset info and buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between flex-1 min-w-0 mr-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-white truncate">
                  {asset.label || "Unnamed Asset"}
                </h3>
                {asset.code && (
                  <span className="text-xs text-gray-500 bg-white/[0.05] px-2 py-1 rounded">
                    {asset.code}
                  </span>
                )}
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
                  Age: {calculateAssetAge(asset.date_of_purchase)}
                </span>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleEdit}
                className="p-1.5 text-gray-400 hover:text-white border border-magenta-500 rounded transition-colors"
                title="Edit Asset"
              >
                <Edit2 size={16} />
              </button>
              {onArchive && (
                <button
                  onClick={handleArchive}
                  className="p-1.5 text-gray-400 hover:text-white border border-magenta-500 rounded transition-colors"
                  title="Archive Asset"
                >
                  <Archive size={16} />
                </button>
              )}
              <CardChevron 
                isOpen={isExpanded} 
                onToggle={() => setIsExpanded(!isExpanded)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Header with minimize button */}
          <div className="flex items-center justify-between pb-4">
            <h2 className="text-lg font-semibold text-white">{asset.label || "Unnamed Asset"}</h2>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 text-gray-400 hover:text-white transition-colors"
              title="Minimize"
            >
              <ChevronUp size={16} />
            </button>
          </div>
          
          {/* Divider line */}
          <div className="border-t border-white/[0.1]"></div>
          
          {/* Unified 4-Column Grid for All Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Row 1: Identity Fields */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Label</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedAsset.label}
                  onChange={(e) => handleInputChange("label", e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                />
              ) : (
                <p className="text-white text-sm py-2">{asset.label}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Model</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedAsset.model || ""}
                  onChange={(e) => handleInputChange("model", e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                />
              ) : (
                <p className="text-white text-sm py-2">{asset.model || "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Serial Number</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedAsset.serial_number || ""}
                  onChange={(e) => handleInputChange("serial_number", e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                />
              ) : (
                <p className="text-white text-sm py-2">{asset.serial_number || "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Asset Code</label>
              {isEditing ? (
                 <input
                   type="text"
                   value={editedAsset.code || ""}
                   onChange={(e) => handleInputChange("code", e.target.value)}
                   className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                   placeholder="Will be auto-generated if empty"
                 />
               ) : (
                 <p className="text-white text-sm py-2">{asset.code || "—"}</p>
               )}
            </div>

            {/* Row 2: Identity + Warranty Fields */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedAsset.asset_type || ""}
                  onChange={(e) => handleInputChange("asset_type", e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                />
              ) : (
                <p className="text-white text-sm py-2">{asset.asset_type || "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Purchase Date</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editedAsset.date_of_purchase || ""}
                  onChange={(e) => handleInputChange("date_of_purchase", e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                />
              ) : (
                <p className="text-white text-sm py-2">{asset.date_of_purchase ? new Date(asset.date_of_purchase).toLocaleDateString() : "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Warranty (Years)</label>
              {isEditing ? (
                <input
                  type="number"
                  value={editedAsset.warranty_length_years || ""}
                  onChange={(e) => handleInputChange("warranty_length_years", parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                />
              ) : (
                <p className="text-white text-sm py-2">{asset.warranty_length_years || "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Warranty End Date</label>
              <p className="text-white text-sm py-2">{warrantyEndDate ? warrantyEndDate.toLocaleDateString() : "—"}</p>
            </div>

            {/* Row 3: Warranty + PPM Fields + Contractor Dropdowns */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Under Warranty</label>
              <span className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                underWarranty 
                  ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}>
                {underWarranty ? "Yes" : "No"}
              </span>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Warranty Contact / Callout Info</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedAsset.warranty_callout_info || ""}
                  onChange={(e) => handleInputChange("warranty_callout_info", e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                  placeholder="Contact details, phone numbers, or callout instructions"
                />
              ) : (
                <p className="text-white text-sm py-2">{asset.warranty_callout_info || "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Next Service Date</label>
              <p className="text-white text-sm py-2">{(() => {
                const nextService = getNextServiceDate();
                return nextService ? nextService.toLocaleDateString() : asset.add_to_ppm ? "Not scheduled" : "Not scheduled";
              })()}</p>
            </div>
            {/* Reactive Contractor Dropdown */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Reactive Contractor</label>
              {isEditing ? (
                <select
                  value={editedAsset.contractor_reactive_id || ""}
                  onChange={(e) => handleInputChange("contractor_reactive_id", e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                >
                  <option value="">Select contractor...</option>
                  {contractors.map(contractor => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name} ({contractor.category_name})
                    </option>
                  ))}
                </select>
              ) : (
                 <p className="text-white text-sm py-2">
                   {(() => {
                     const contractor = contractors.find(c => c.id === asset.contractor_reactive_id);
                     return contractor ? `${contractor.name} (${contractor.category_name})` : "—";
                   })()}
                 </p>
               )}
            </div>

            {/* Row 4: PPM Fields */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">PPM Enabled</label>
              {isEditing ? (
                <select
                  value={editedAsset.add_to_ppm ? "true" : "false"}
                  onChange={(e) => handleInputChange("add_to_ppm", e.target.value === "true")}
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              ) : (
                <p className="text-white text-sm py-2">{asset.add_to_ppm ? "Yes" : "No"}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Services/Year</label>
              {isEditing ? (
                <input
                  type="number"
                  value={editedAsset.ppm_services_per_year || ""}
                  onChange={(e) => handleInputChange("ppm_services_per_year", parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                />
              ) : (
                <p className="text-white text-sm py-2">{asset.ppm_services_per_year || "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Service Docs</label>
              {isEditing ? (
                <div className="flex items-center">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label 
                    htmlFor="file-upload" 
                    className="inline-flex items-center px-2 py-1.5 bg-white/[0.05] border border-white/[0.1] rounded text-white text-xs hover:bg-white/[0.1] cursor-pointer transition-colors"
                  >
                    <Paperclip className="h-3 w-3 mr-1" />
                    Attach
                  </label>
                </div>
              ) : (
                <p className="text-white text-sm py-2">{uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s)` : "—"}</p>
              )}
            </div>
            {/* PPM Contractor Dropdown */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">PPM Contractor</label>
              {isEditing ? (
                <select
                  value={editedAsset.contractor_ppm_id || ""}
                  onChange={(e) => handleInputChange("contractor_ppm_id", e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                >
                  <option value="">Select contractor...</option>
                  {contractors.map(contractor => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name} ({contractor.category_name})
                    </option>
                  ))}
                </select>
              ) : (
                 <p className="text-white text-sm py-2">
                   {(() => {
                     const contractor = contractors.find(c => c.id === asset.contractor_ppm_id);
                     return contractor ? `${contractor.name} (${contractor.category_name})` : "—";
                   })()}
                 </p>
               )}
            </div>
          </div>

          {/* File Upload Display */}
          {uploadedFiles.length > 0 && (
            <div className="mt-3 space-y-1">
              {uploadedFiles.map((fileName, index) => (
                <div key={index} className="flex items-center justify-between bg-white/[0.05] rounded-lg px-3 py-2">
                  <span className="text-sm text-white">{fileName}</span>
                  {isEditing && (
                    <button
                      onClick={() => removeFile(fileName)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end pt-3 border-t border-white/[0.1]">
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-pink-500 text-pink-500 bg-transparent hover:bg-white/[0.04] transition-all duration-150 ease-in-out hover:shadow-[0_0_12px_rgba(236,72,153,0.25)] text-sm font-medium disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-500 text-gray-400 bg-transparent hover:bg-white/[0.04] transition-all duration-150 ease-in-out hover:shadow-[0_0_12px_rgba(107,114,128,0.25)] text-sm font-medium"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center px-4 py-2 rounded-lg border border-blue-500 text-blue-500 bg-transparent hover:bg-white/[0.04] transition-all duration-150 ease-in-out hover:shadow-[0_0_12px_rgba(37,99,235,0.25)] text-sm font-medium"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  {onArchive && (
                    <button
                      onClick={handleArchive}
                      className="inline-flex items-center px-4 py-2 rounded-lg border border-orange-500 text-orange-500 bg-transparent hover:bg-white/[0.04] transition-all duration-150 ease-in-out hover:shadow-[0_0_12px_rgba(249,115,22,0.25)] text-sm font-medium"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}