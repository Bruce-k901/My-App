"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Upload, Download, FileText, X, CheckCircle, AlertTriangle, FileCheck, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';

interface Chemical {
  id: string;
  product_name: string;
  manufacturer: string | null;
  use_case: string | null;
  coshh_sheet_url: string | null;
  created_at: string;
}

interface COSHHSheet {
  id: string;
  chemical_id: string | null;
  product_name: string;
  file_url: string;
  file_name: string;
  expiry_date: string | null;
  status: string;
  created_at: string;
}

export default function COSHHDataPage() {
  const { companyId, loading: contextLoading } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [coshhSheets, setCOSHHSheets] = useState<COSHHSheet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingForChemical, setUploadingForChemical] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Upload form state
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File | null }>({});

  useEffect(() => {
    if (contextLoading) {
      setLoading(true);
      return;
    }
    
    if (companyId) {
      console.log('Company ID available, loading data:', companyId);
      loadData();
    } else {
      console.log('No company ID available');
      setLoading(false);
      setError('No company ID found. Please ensure you are logged in and have a company assigned.');
    }
  }, [companyId, contextLoading]);

  const loadData = async () => {
    if (!companyId) {
      setError('No company ID found');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading COSHH data for company:', companyId);
      
      // Load all chemicals from the library
      // Using select('*') to match the working pattern from ChemicalsClient
      const { data: chemicalsData, error: chemicalsError } = await supabase
        .from('chemicals_library')
        .select('*')
        .eq('company_id', companyId)
        .order('product_name');
      
      if (chemicalsError) {
        console.error('Error loading chemicals:', chemicalsError);
        throw chemicalsError;
      }
      
      console.log('Loaded chemicals:', chemicalsData?.length || 0);
      
      // Load all COSHH sheets to check which chemicals have sheets
      // Try with status filter first, fallback to all if table doesn't exist or has issues
      let sheetsData = null;
      let sheetsError = null;
      
      const sheetsQuery = supabase
        .from('coshh_data_sheets')
        .select('id, chemical_id, product_name, file_url, file_name, expiry_date, status, created_at')
        .eq('company_id', companyId)
        .eq('status', 'Active')
        .order('created_at', { ascending: false });
      
      const sheetsResult = await sheetsQuery;
      sheetsData = sheetsResult.data;
      sheetsError = sheetsResult.error;
      
      if (sheetsError) {
        console.error('Error loading COSHH sheets:', sheetsError);
        // Try without status filter in case the column doesn't exist
        const fallbackResult = await supabase
          .from('coshh_data_sheets')
          .select('id, chemical_id, product_name, file_url, file_name, expiry_date, status, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        
        if (!fallbackResult.error) {
          console.log('Fallback query succeeded');
          sheetsData = fallbackResult.data;
          sheetsError = null;
        } else {
          console.warn('COSHH sheets error (non-critical - table might not exist yet):', sheetsError.message);
        }
      }
      
      setChemicals(chemicalsData || []);
      setCOSHHSheets(sheetsData || []);
      
      console.log('Data loaded successfully:', {
        chemicalsCount: chemicalsData?.length || 0,
        sheetsCount: sheetsData?.length || 0,
        companyId: companyId
      });
      
      if (!chemicalsData || chemicalsData.length === 0) {
        console.warn('⚠️ No chemicals found in library for company:', companyId);
        console.log('This might indicate:');
        console.log('1. No chemicals have been added to the library');
        console.log('2. Company ID mismatch');
        console.log('3. RLS policy blocking access');
      } else {
        console.log('✅ Chemicals loaded:', chemicalsData.map(c => c.product_name));
      }
    } catch (error) {
      console.error('Error loading COSHH data:', error);
      const errorMessage = (error as Error).message || 'Unknown error occurred';
      setError(errorMessage);
      showToast({ 
        title: 'Error loading data', 
        description: errorMessage, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getCOSHHSheetForChemical = (chemicalId: string): COSHHSheet | undefined => {
    return coshhSheets.find(sheet => sheet.chemical_id === chemicalId);
  };

  const handleFileSelect = (chemicalId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast({ 
        title: 'Invalid file type', 
        description: 'Please upload PDF, JPEG, PNG, or WebP files', 
        type: 'error' 
      });
      return;
    }
    
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast({ 
        title: 'File too large', 
        description: 'Maximum file size is 10MB', 
        type: 'error' 
      });
      return;
    }
    
    setSelectedFiles(prev => ({ ...prev, [chemicalId]: file }));
  };

  const handleUpload = async (chemical: Chemical) => {
    const file = selectedFiles[chemical.id];
    if (!file || !companyId) {
      showToast({ 
        title: 'No file selected', 
        description: 'Please select a file to upload', 
        type: 'error' 
      });
      return;
    }

    try {
      setUploadingForChemical(chemical.id);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Sanitize filename
      const sanitizeFileName = (fileName: string) => {
        return fileName
          .trim()
          .replace(/\s+/g, '_')
          .replace(/[^\w.-]/g, '_')
          .toLowerCase();
      };
      
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const sanitizedProductName = sanitizeFileName(chemical.product_name);
      const fileName = `${companyId}/${sanitizedProductName}_${Date.now()}.${fileExt}`;
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('coshh-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream'
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('coshh-documents')
        .getPublicUrl(fileName);
      
      // Check if a COSHH sheet already exists for this chemical
      const existingSheet = getCOSHHSheetForChemical(chemical.id);
      
      if (existingSheet) {
        // Update existing sheet
        const { error: updateError } = await supabase
          .from('coshh_data_sheets')
          .update({
            file_url: publicUrl,
            file_name: file.name,
            file_size_kb: Math.round(file.size / 1024),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSheet.id);
        
        if (updateError) throw updateError;
      } else {
        // Create new COSHH sheet record
        const { error: insertError } = await supabase
          .from('coshh_data_sheets')
          .insert({
            company_id: companyId,
            chemical_id: chemical.id,
            product_name: chemical.product_name,
            manufacturer: chemical.manufacturer,
            document_type: 'COSHH',
            file_name: file.name,
            file_url: publicUrl,
            file_size_kb: Math.round(file.size / 1024),
            status: 'Active',
            verification_status: 'Pending',
            uploaded_by: user.id
          });
        
        if (insertError) throw insertError;
      }
      
      // Update chemicals_library with the COSHH sheet URL
      const { error: updateChemicalError } = await supabase
        .from('chemicals_library')
        .update({ coshh_sheet_url: publicUrl })
        .eq('id', chemical.id);
      
      if (updateChemicalError) throw updateChemicalError;
      
      showToast({ 
        title: 'COSHH sheet uploaded', 
        description: `Successfully uploaded COSHH data sheet for ${chemical.product_name}`, 
        type: 'success' 
      });
      
      // Reset form
      setSelectedFiles(prev => ({ ...prev, [chemical.id]: null }));
      setUploadModalOpen(null);
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error uploading COSHH sheet:', error);
      showToast({ 
        title: 'Upload failed', 
        description: (error as Error).message, 
        type: 'error' 
      });
    } finally {
      setUploadingForChemical(null);
    }
  };

  const handleDownload = (sheet: COSHHSheet) => {
    window.open(sheet.file_url, '_blank');
  };

  const filteredChemicals = chemicals.filter(chemical => {
    const searchLower = searchQuery.toLowerCase();
    return (
      chemical.product_name.toLowerCase().includes(searchLower) ||
      chemical.manufacturer?.toLowerCase().includes(searchLower) ||
      chemical.use_case?.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: chemicals.length,
    withSheets: chemicals.filter(c => getCOSHHSheetForChemical(c.id)).length,
    withoutSheets: chemicals.filter(c => !getCOSHHSheetForChemical(c.id)).length
  };

  if (loading || contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-400">Loading chemicals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">COSHH Data Sheets</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Manage COSHH data sheets for chemicals in your library
            </p>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-red-400" />
            <div>
              <h3 className="text-red-400 font-semibold">Error Loading Data</h3>
              <p className="text-red-300 text-sm mt-1">{error}</p>
              <Button
                variant="secondary"
                onClick={loadData}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">COSHH Data Sheets</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Manage COSHH data sheets for chemicals in your library
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadData}
          className="h-9"
          disabled={loading}
        >
          <RefreshCw size={14} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <div className="text-neutral-400 text-sm">Total Chemicals</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <div className="text-neutral-400 text-sm">With COSHH Sheets</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats.withSheets}</div>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <div className="text-neutral-400 text-sm">Missing Sheets</div>
          <div className={`text-2xl font-bold mt-1 ${stats.withoutSheets > 0 ? 'text-orange-400' : 'text-white'}`}>
            {stats.withoutSheets}
          </div>
        </div>
      </div>

      {/* Warning Banner for Missing Sheets */}
      {stats.withoutSheets > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-orange-400" />
          <div className="flex-1">
            <div className="text-orange-400 font-semibold">
              {stats.withoutSheets} chemical{stats.withoutSheets !== 1 ? 's' : ''} missing COSHH data sheets
            </div>
            <div className="text-orange-300 text-sm">
              Upload COSHH data sheets to ensure compliance and safety
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search chemicals by name, manufacturer, or use case..."
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:border-[#EC4899]/50 transition-colors"
        />
      </div>

      {/* Chemicals List */}
      {filteredChemicals.length === 0 ? (
        <div className="bg-white/[0.03] rounded-xl p-8 text-center border border-white/[0.06]">
          {chemicals.length === 0 ? (
            <div className="space-y-4">
              <FileText size={48} className="text-neutral-500 mx-auto" />
              <div>
                <p className="text-neutral-300 font-semibold mb-2">No chemicals found in your library</p>
                <p className="text-neutral-400 text-sm mb-4">
                  Add chemicals to your library first, then you can upload COSHH data sheets for each one.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => window.location.href = '/dashboard/libraries/chemicals'}
                >
                  Go to Chemicals Library
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-neutral-400">
              No chemicals match your search. Try a different search term.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredChemicals.map((chemical) => {
            const coshhSheet = getCOSHHSheetForChemical(chemical.id);
            const hasSheet = !!coshhSheet;
            const isUploading = uploadingForChemical === chemical.id;
            const isModalOpen = uploadModalOpen === chemical.id;
            const selectedFile = selectedFiles[chemical.id];

            return (
              <div
                key={chemical.id}
                className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{chemical.product_name}</h3>
                      {hasSheet ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/40 rounded text-xs flex items-center gap-1">
                          <CheckCircle size={12} />
                          COSHH Sheet Uploaded
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/40 rounded text-xs flex items-center gap-1">
                          <AlertTriangle size={12} />
                          Missing Sheet
                        </span>
                      )}
                    </div>
                    
                    {chemical.manufacturer && (
                      <p className="text-sm text-neutral-400 mb-1">Manufacturer: {chemical.manufacturer}</p>
                    )}
                    {chemical.use_case && (
                      <p className="text-sm text-neutral-400">Use Case: {chemical.use_case}</p>
                    )}
                    
                    {hasSheet && coshhSheet && (
                      <div className="mt-3 flex items-center gap-2">
                        <FileText size={14} className="text-neutral-400" />
                        <span className="text-xs text-neutral-400">
                          {coshhSheet.file_name}
                        </span>
                        <Button
                          variant="secondary"
                          onClick={() => handleDownload(coshhSheet)}
                          className="ml-2 h-8 px-3 text-xs"
                        >
                          <Download size={12} className="mr-1" />
                          View Sheet
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {!isModalOpen ? (
                      <Button
                        variant={hasSheet ? "outline" : "secondary"}
                        onClick={() => setUploadModalOpen(chemical.id)}
                        disabled={isUploading}
                        className="h-9 px-4"
                      >
                        <Upload size={14} className="mr-2" />
                        {hasSheet ? 'Replace Sheet' : 'Upload Sheet'}
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-2 min-w-[300px]">
                        <div className="border-2 border-dashed border-white/[0.1] rounded-lg p-4 text-center">
                          {selectedFile ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText size={16} className="text-[#EC4899]" />
                                <span className="text-sm text-white">{selectedFile.name}</span>
                              </div>
                              <button
                                onClick={() => setSelectedFiles(prev => ({ ...prev, [chemical.id]: null }))}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <Upload size={24} className="text-neutral-400 mx-auto mb-2" />
                              <p className="text-neutral-400 text-sm mb-2">Select a COSHH data sheet</p>
                              <button
                                onClick={() => fileInputRefs.current[chemical.id]?.click()}
                                className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg text-white text-sm"
                              >
                                Choose File
                              </button>
                              <p className="text-neutral-500 text-xs mt-2">PDF, JPEG, PNG, WebP • Max 10MB</p>
                            </div>
                          )}
                          <input
                            ref={(el) => {
                              fileInputRefs.current[chemical.id] = el;
                            }}
                            type="file"
                            accept="application/pdf,image/jpeg,image/png,image/webp"
                            onChange={(e) => handleFileSelect(chemical.id, e)}
                            className="hidden"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => handleUpload(chemical)}
                            disabled={!selectedFile || isUploading}
                            loading={isUploading}
                            className="flex-1 h-9"
                          >
                            <Upload size={14} className="mr-2" />
                            {isUploading ? 'Uploading...' : 'Upload'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setUploadModalOpen(null);
                              setSelectedFiles(prev => ({ ...prev, [chemical.id]: null }));
                            }}
                            disabled={isUploading}
                            className="h-9 px-3"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
