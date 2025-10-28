"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, AlertTriangle, CheckCircle, FileText, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

const DOCUMENT_TYPES = ['COSHH', 'SDS', 'MSDS', 'Product Spec'];
const HAZARD_TYPES = ['Corrosive', 'Irritant', 'Flammable', 'Toxic', 'Harmful', 'Oxidising', 'Explosive', 'Environmental Hazard'];

export default function COSHHDataPage() {
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [coshhSheets, setCOSHHSheets] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingSheet, setEditingSheet] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Upload form state
  const [formData, setFormData] = useState({
    chemical_id: '',
    product_name: '',
    manufacturer: '',
    document_type: 'COSHH',
    issue_date: '',
    revision_number: '',
    expiry_date: '',
    hazard_types: [],
    emergency_contact: '',
    notes: ''
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterVerification, setFilterVerification] = useState('all');
  const [filterHazards, setFilterHazards] = useState([]);
  
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      const [sheetsResult, chemicalsResult] = await Promise.all([
        supabase.from('coshh_data_sheets').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('chemicals_library').select('id, product_name').eq('company_id', companyId).order('product_name')
      ]);
      
      setCOSHHSheets(sheetsResult.data || []);
      setChemicals(chemicalsResult.data || []);
    } catch (error) {
      console.error('Error loading COSHH data:', error);
      showToast({ title: 'Error loading data', description: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast({ title: 'Invalid file type', description: 'Please upload PDF, JPEG, PNG, or WebP files', type: 'error' });
      return;
    }
    
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast({ title: 'File too large', description: 'Maximum file size is 10MB', type: 'error' });
      return;
    }
    
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !formData.product_name || !companyId) {
      showToast({ title: 'Missing required fields', description: 'Please select a file and enter product name', type: 'error' });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${companyId}/${formData.product_name.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('coshh-documents')
        .upload(fileName, selectedFile);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('coshh-documents')
        .getPublicUrl(fileName);
      
      // Save metadata to database
      const { error: dbError } = await supabase
        .from('coshh_data_sheets')
        .insert({
          company_id: companyId,
          chemical_id: formData.chemical_id || null,
          product_name: formData.product_name,
          manufacturer: formData.manufacturer,
          document_type: formData.document_type,
          file_name: selectedFile.name,
          file_url: publicUrl,
          file_size_kb: Math.round(selectedFile.size / 1024),
          issue_date: formData.issue_date || null,
          revision_number: formData.revision_number || null,
          expiry_date: formData.expiry_date || null,
          hazard_types: formData.hazard_types,
          emergency_contact: formData.emergency_contact,
          notes: formData.notes,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        });
      
      if (dbError) throw dbError;
      
      // If linked to chemical, update chemicals_library
      if (formData.chemical_id) {
        await supabase
          .from('chemicals_library')
          .update({ coshh_sheet_url: publicUrl })
          .eq('id', formData.chemical_id);
      }
      
      showToast({ title: 'COSHH sheet uploaded', description: 'Document saved successfully', type: 'success' });
      
      // Reset form
      setSelectedFile(null);
      setFormData({
        chemical_id: '',
        product_name: '',
        manufacturer: '',
        document_type: 'COSHH',
        issue_date: '',
        revision_number: '',
        expiry_date: '',
        hazard_types: [],
        emergency_contact: '',
        notes: ''
      });
      setShowUploadModal(false);
      
      // Reload data
      loadData();
    } catch (error) {
      console.error('Error uploading COSHH sheet:', error);
      showToast({ title: 'Upload failed', description: error.message, type: 'error' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this COSHH sheet?')) return;
    
    try {
      const { error } = await supabase
        .from('coshh_data_sheets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      showToast({ title: 'COSHH sheet deleted', type: 'success' });
      loadData();
    } catch (error) {
      console.error('Error deleting sheet:', error);
      showToast({ title: 'Error deleting', description: error.message, type: 'error' });
    }
  };

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const daysUntilExpiry = Math.floor((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isOverdue = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const filteredSheets = coshhSheets.filter(sheet => {
    const matchesSearch = sheet.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sheet.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || sheet.status === filterStatus;
    const matchesVerification = filterVerification === 'all' || sheet.verification_status === filterVerification;
    const matchesHazards = filterHazards.length === 0 || 
                          filterHazards.some(h => sheet.hazard_types?.includes(h));
    return matchesSearch && matchesStatus && matchesVerification && matchesHazards;
  });

  const stats = {
    total: coshhSheets.length,
    pendingVerification: coshhSheets.filter(s => s.verification_status === 'Pending').length,
    expiringSoon: coshhSheets.filter(s => isExpiringSoon(s.expiry_date)).length,
    overdue: coshhSheets.filter(s => isOverdue(s.expiry_date)).length
  };

  if (loading) {
    return <div className="text-neutral-400 text-center py-8">Loading COSHH data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">COSHH Data Sheets</h1>
          <p className="text-neutral-400 text-sm mt-1">Manage chemical safety data sheets</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-magenta-600 hover:bg-magenta-500 rounded-lg text-white flex items-center gap-2"
        >
          <Plus size={16} />
          Upload New Sheet
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
          <div className="text-neutral-400 text-sm">Total Sheets</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
          <div className="text-neutral-400 text-sm">Pending Verification</div>
          <div className={`text-2xl font-bold mt-1 ${stats.pendingVerification > 0 ? 'text-amber-400' : 'text-white'}`}>
            {stats.pendingVerification}
          </div>
        </div>
        <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
          <div className="text-neutral-400 text-sm">Expiring Soon</div>
          <div className={`text-2xl font-bold mt-1 ${stats.expiringSoon > 0 ? 'text-orange-400' : 'text-white'}`}>
            {stats.expiringSoon}
          </div>
        </div>
        <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
          <div className="text-neutral-400 text-sm">Overdue</div>
          <div className={`text-2xl font-bold mt-1 ${stats.overdue > 0 ? 'text-red-400' : 'text-white'}`}>
            {stats.overdue}
          </div>
        </div>
      </div>

      {/* Expiring Soon Banner */}
      {stats.expiringSoon > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-orange-400" />
          <div className="flex-1">
            <div className="text-orange-400 font-semibold">Warning: {stats.expiringSoon} COSHH sheet(s) expiring within 30 days</div>
            <div className="text-orange-300 text-sm">Review and update documents to maintain compliance</div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name or manufacturer..."
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Superseded">Superseded</option>
          <option value="Archived">Archived</option>
        </select>
        <select
          value={filterVerification}
          onChange={(e) => setFilterVerification(e.target.value)}
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Verification</option>
          <option value="Pending">Pending</option>
          <option value="Verified">Verified</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* COSHH Sheets List */}
      {filteredSheets.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-neutral-700">
          <p className="text-neutral-400">No COSHH sheets found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSheets.map((sheet) => {
            const expiryDate = sheet.expiry_date ? new Date(sheet.expiry_date) : null;
            const daysUntilExpiry = expiryDate ? Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
            
            return (
              <div key={sheet.id} className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700 hover:bg-neutral-800/70 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{sheet.product_name}</h3>
                    {sheet.manufacturer && (
                      <p className="text-sm text-neutral-400">{sheet.manufacturer}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(sheet.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded text-xs">
                      {sheet.document_type}
                    </span>
                    {sheet.verification_status === 'Verified' && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/40 rounded text-xs flex items-center gap-1">
                        <CheckCircle size={12} />
                        Verified
                      </span>
                    )}
                    {sheet.verification_status === 'Pending' && (
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded text-xs">
                        Pending
                      </span>
                    )}
                  </div>
                  
                  {sheet.hazard_types && sheet.hazard_types.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sheet.hazard_types.map((hazard, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded text-xs">
                          {hazard}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {expiryDate && (
                    <div className={`text-xs ${
                      daysUntilExpiry < 0 ? 'text-red-400' :
                      daysUntilExpiry <= 30 ? 'text-orange-400' :
                      daysUntilExpiry <= 90 ? 'text-amber-400' :
                      'text-neutral-400'
                    }`}>
                      Expires: {expiryDate.toLocaleDateString()} 
                      {daysUntilExpiry !== null && daysUntilExpiry >= 0 && ` (${daysUntilExpiry} days)`}
                      {daysUntilExpiry !== null && daysUntilExpiry < 0 && ' (OVERDUE)'}
                    </div>
                  )}
                  
                  {sheet.file_size_kb && (
                    <div className="text-xs text-neutral-500">
                      {sheet.file_size_kb} KB
                    </div>
                  )}
                </div>
                
                <a
                  href={sheet.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-magenta-600 hover:bg-magenta-500 rounded-lg text-white text-sm"
                >
                  <Download size={14} />
                  View Sheet
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-xl border border-neutral-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Upload COSHH Sheet</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                  setFormData({
                    chemical_id: '',
                    product_name: '',
                    manufacturer: '',
                    document_type: 'COSHH',
                    issue_date: '',
                    revision_number: '',
                    expiry_date: '',
                    hazard_types: [],
                    emergency_contact: '',
                    notes: ''
                  });
                }}
                className="text-neutral-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Link to Chemical or Manual Entry */}
              <div>
                <label className="block text-sm text-neutral-300 mb-1">Link to Chemical (Optional)</label>
                <select
                  value={formData.chemical_id}
                  onChange={(e) => {
                    const chemical = chemicals.find(c => c.id === e.target.value);
                    setFormData({
                      ...formData,
                      chemical_id: e.target.value,
                      product_name: chemical?.product_name || formData.product_name,
                      manufacturer: formData.manufacturer
                    });
                  }}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Select chemical...</option>
                  {chemicals.map(c => <option key={c.id} value={c.id}>{c.product_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-300 mb-1">Product Name *</label>
                <input
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                  placeholder="Enter product name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Manufacturer</label>
                  <input
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Document Type</label>
                  <select
                    value={formData.document_type}
                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                  >
                    {DOCUMENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm text-neutral-300 mb-1">Upload Document *</label>
                <div className="border-2 border-dashed border-neutral-600 rounded-lg p-6 text-center">
                  {selectedFile ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={20} className="text-magenta-400" />
                        <span className="text-white">{selectedFile.name}</span>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload size={32} className="text-neutral-400 mx-auto mb-2" />
                      <p className="text-neutral-400 text-sm mb-2">Drag and drop or click to select</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm"
                      >
                        Choose File
                      </button>
                      <p className="text-neutral-500 text-xs mt-2">PDF, JPEG, PNG, WebP • Max 10MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Hazard Types */}
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Hazard Types</label>
                <div className="flex flex-wrap gap-2">
                  {HAZARD_TYPES.map(hazard => (
                    <label key={hazard} className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 border border-neutral-600 rounded-lg cursor-pointer hover:bg-neutral-700">
                      <input
                        type="checkbox"
                        checked={formData.hazard_types.includes(hazard)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, hazard_types: [...formData.hazard_types, hazard] });
                          } else {
                            setFormData({ ...formData, hazard_types: formData.hazard_types.filter(h => h !== hazard) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-white">{hazard}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm text-neutral-300 mb-1">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                />
                {formData.expiry_date && (
                  <p className="text-xs text-amber-400 mt-1">You'll be notified 30 days before expiry</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !formData.product_name}
                className="flex-1 px-4 py-2 bg-magenta-600 hover:bg-magenta-500 rounded-lg text-white flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : <><Upload size={16} /> Upload Sheet</>}
              </button>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                }}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

