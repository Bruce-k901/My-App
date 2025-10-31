"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { Wrench, Clock, CheckCircle, XCircle, AlertTriangle, Calendar, User, Building, Edit2, Upload, FileText, X, Download } from 'lucide-react';

interface Callout {
  id: string;
  callout_type: 'reactive' | 'warranty' | 'ppm';
  priority: 'low' | 'medium' | 'urgent';
  status: 'open' | 'closed' | 'reopened';
  fault_description: string | null;
  repair_summary: string | null;
  notes: string | null;
  troubleshooting_complete: boolean;
  created_at: string;
  closed_at: string | null;
  reopened_at: string | null;
  asset_name: string | null;
  asset_id: string;
  site_name: string | null;
  contractor_name: string | null;
  created_by_name: string | null;
  documents?: Array<{ url: string; name: string; type: string }>;
  attachments?: Array<{ url: string; name: string }>;
}

interface EditingCallout {
  id: string;
  notes: string;
  fault_description: string;
  repair_summary: string;
  worksheet: File | null;
  invoice: File | null;
}

export default function CalloutLogsPage() {
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  const [callouts, setCallouts] = useState<Callout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [editingCallout, setEditingCallout] = useState<EditingCallout | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expandedCallout, setExpandedCallout] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadCallouts();
    }
  }, [companyId, filter]);

  const loadCallouts = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('callouts')
        .select(`
          id,
          callout_type,
          priority,
          status,
          fault_description,
          repair_summary,
          notes,
          troubleshooting_complete,
          created_at,
          closed_at,
          reopened_at,
          asset_id,
          site_id,
          contractor_id,
          created_by,
          documents,
          attachments
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (filter === 'open') {
        query = query.eq('status', 'open');
      } else if (filter === 'closed') {
        query = query.in('status', ['closed', 'reopened']);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading callouts:', error);
        return;
      }

      if (!data || data.length === 0) {
        setCallouts([]);
        setLoading(false);
        return;
      }

      // Load related data (assets, sites, contractors, profiles)
      const assetIds = [...new Set(data.map(c => c.asset_id).filter(Boolean))];
      const siteIds = [...new Set(data.map(c => c.site_id).filter(Boolean))];
      const contractorIds = [...new Set(data.map(c => c.contractor_id).filter(Boolean))];
      const createdByIds = [...new Set(data.map(c => c.created_by).filter(Boolean))];

      const [assetsResult, sitesResult, contractorsResult, profilesResult] = await Promise.all([
        assetIds.length > 0 ? supabase.from('assets').select('id, name').in('id', assetIds) : { data: [] },
        siteIds.length > 0 ? supabase.from('sites').select('id, name').in('id', siteIds) : { data: [] },
        contractorIds.length > 0 ? supabase.from('contractors').select('id, name').in('id', contractorIds) : { data: [] },
        createdByIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', createdByIds) : { data: [] }
      ]);

      const assetsMap = new Map((assetsResult.data || []).map(a => [a.id, a.name]));
      const sitesMap = new Map((sitesResult.data || []).map(s => [s.id, s.name]));
      const contractorsMap = new Map((contractorsResult.data || []).map(c => [c.id, c.name]));
      const profilesMap = new Map((profilesResult.data || []).map(p => [p.id, p.full_name]));

      // Enrich callouts with names
      const enrichedCallouts: Callout[] = data.map(callout => {
        // Parse documents if they exist
        let parsedDocuments: Array<{ url: string; name: string; type: string }> = [];
        if (callout.documents && Array.isArray(callout.documents)) {
          parsedDocuments = callout.documents.map((doc: any) => ({
            url: doc.url || doc,
            name: doc.name || 'Document',
            type: doc.type || 'document'
          }));
        }
        
        return {
          ...callout,
          asset_name: assetsMap.get(callout.asset_id) || null,
          site_name: sitesMap.get(callout.site_id) || null,
          contractor_name: contractorsMap.get(callout.contractor_id) || null,
          created_by_name: profilesMap.get(callout.created_by) || null,
          documents: parsedDocuments,
          attachments: callout.attachments || []
        };
      });

      setCallouts(enrichedCallouts);
    } catch (error) {
      console.error('Failed to load callouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'closed':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'reopened':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="w-4 h-4" />;
      case 'closed':
        return <CheckCircle className="w-4 h-4" />;
      case 'reopened':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/10 text-red-400';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'low':
        return 'bg-green-500/10 text-green-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'reactive':
        return 'bg-red-500/10 text-red-400';
      case 'warranty':
        return 'bg-blue-500/10 text-blue-400';
      case 'ppm':
        return 'bg-green-500/10 text-green-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  const startEditing = (callout: Callout) => {
    setEditingCallout({
      id: callout.id,
      notes: callout.notes || '',
      fault_description: callout.fault_description || '',
      repair_summary: callout.repair_summary || '',
      worksheet: null,
      invoice: null
    });
    setExpandedCallout(callout.id);
  };

  const cancelEditing = () => {
    setEditingCallout(null);
    setExpandedCallout(null);
  };

  const uploadFile = async (file: File, calloutId: string, type: 'worksheet' | 'invoice'): Promise<string> => {
    if (!companyId) throw new Error('Company ID not available');

    // Create storage bucket path
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/callouts/${calloutId}/${type}_${Date.now()}.${fileExt}`;
    
    // Upload to Supabase Storage
    // Try callout_documents bucket first, fallback to global_docs
    let bucketName = 'callout_documents';
    let uploadError = null;
    
    let { error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream'
      });

    if (error) {
      // Fallback to global_docs if callout_documents doesn't exist
      if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
        console.warn('callout_documents bucket not found, using global_docs');
        bucketName = 'global_docs';
        const fallbackResult = await supabase.storage
          .from(bucketName)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'application/octet-stream'
          });
        error = fallbackResult.error;
      }
      
      if (error) {
        console.error('Upload error:', error);
        throw new Error(`Failed to upload ${type}: ${error.message}`);
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleSaveUpdate = async () => {
    if (!editingCallout) return;

    try {
      setUploading(true);

      // Upload files if any
      const documentUrls: Array<{ url: string; name: string; type: string }> = [];
      
      if (editingCallout.worksheet) {
        const url = await uploadFile(editingCallout.worksheet, editingCallout.id, 'worksheet');
        documentUrls.push({
          url,
          name: editingCallout.worksheet.name,
          type: 'worksheet'
        });
      }

      if (editingCallout.invoice) {
        const url = await uploadFile(editingCallout.invoice, editingCallout.id, 'invoice');
        documentUrls.push({
          url,
          name: editingCallout.invoice.name,
          type: 'invoice'
        });
      }

      // Get existing documents
      const currentCallout = callouts.find(c => c.id === editingCallout.id);
      const existingDocuments = currentCallout?.documents || [];

      // Merge with new documents
      const allDocuments = [...existingDocuments, ...documentUrls];

      // Update callout
      const updateData: any = {
        notes: editingCallout.notes || null,
        fault_description: editingCallout.fault_description || null,
        documents: allDocuments,
        updated_at: new Date().toISOString()
      };

      // If repair_summary is provided and callout is open, close it
      // If repair_summary was set (even if empty string), it means we're trying to close
      const isClosingCallout = editingCallout.repair_summary !== undefined && currentCallout?.status === 'open';
      
      if (isClosingCallout) {
        if (!editingCallout.repair_summary || !editingCallout.repair_summary.trim()) {
          showToast({
            title: 'Repair Summary Required',
            description: 'Please enter a repair summary to close the callout',
            type: 'error'
          });
          setUploading(false);
          return;
        }
        updateData.repair_summary = editingCallout.repair_summary;
        updateData.status = 'closed';
        updateData.closed_at = new Date().toISOString();
      }

      // Try RPC function first, fallback to direct update
      let useDirectUpdate = false;
      
      if (updateData.status === 'closed' && updateData.repair_summary) {
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('close_callout', {
            p_callout_id: editingCallout.id,
            p_repair_summary: updateData.repair_summary,
            p_documents: allDocuments
          });
          
          if (rpcError) {
            console.error('RPC close_callout error details:', {
              message: rpcError.message,
              code: rpcError.code,
              details: rpcError.details,
              hint: rpcError.hint
            });
            // If RPC fails, fall through to direct update
            useDirectUpdate = true;
          } else {
            console.log('Callout closed successfully via RPC:', rpcData);
          }
        } catch (rpcException: any) {
          console.log('RPC function exception, using direct update:', rpcException);
          useDirectUpdate = true;
        }
      } else {
        // For non-closing updates, use direct update
        useDirectUpdate = true;
      }
      
      // Use direct update if RPC failed or if this is a regular update
      if (useDirectUpdate) {
        const { error } = await supabase
          .from('callouts')
          .update(updateData)
          .eq('id', editingCallout.id);

        if (error) {
          console.error('Direct update error:', error);
          throw error;
        }
      }

      // Show success message
      if (updateData.status === 'closed') {
        showToast({
          title: 'Callout closed successfully',
          description: 'The callout has been moved to closed section',
          type: 'success'
        });
      } else {
        showToast({
          title: 'Callout updated successfully',
          description: 'Changes saved',
          type: 'success'
        });
      }
      
      cancelEditing();
      
      // Reload callouts - if we closed it, also switch filter to show closed callouts
      if (updateData.status === 'closed') {
        // Switch filter first, then reload (useEffect will trigger reload when filter changes)
        setFilter('closed');
      } else {
        // Just reload with current filter
        await loadCallouts();
      }
    } catch (error: any) {
      console.error('Error updating callout:', error);
      showToast({
        title: 'Failed to update callout',
        description: error.message || 'Unknown error occurred',
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCloseCallout = async (calloutId: string, repairSummary: string) => {
    try {
      setUploading(true);

      const currentCallout = callouts.find(c => c.id === calloutId);
      
      // Try RPC function first
      try {
        await supabase.rpc('close_callout', {
          p_callout_id: calloutId,
          p_repair_summary: repairSummary,
          p_documents: currentCallout?.documents || []
        });
      } catch (rpcError) {
        // Fallback to direct update
        const { error } = await supabase
          .from('callouts')
          .update({
            status: 'closed',
            repair_summary: repairSummary,
            closed_at: new Date().toISOString()
          })
          .eq('id', calloutId);

        if (error) throw error;
      }

      showToast({
        title: 'Callout closed successfully',
        type: 'success'
      });

      await loadCallouts();
      cancelEditing();
    } catch (error: any) {
      console.error('Error closing callout:', error);
      showToast({
        title: 'Failed to close callout',
        description: error.message || 'Unknown error occurred',
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Callout Logs</h1>
        <p className="text-white/60">Track and manage contractor callout logs</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
            filter === 'all'
              ? 'bg-white/10 border-white/20 text-white'
              : 'bg-white/[0.03] border-white/[0.06] text-white/70 hover:bg-white/[0.06]'
          }`}
        >
          All ({callouts.length})
        </button>
        <button
          onClick={() => setFilter('open')}
          className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
            filter === 'open'
              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
              : 'bg-white/[0.03] border-white/[0.06] text-white/70 hover:bg-white/[0.06]'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Open ({callouts.filter(c => c.status === 'open').length})
        </button>
        <button
          onClick={() => setFilter('closed')}
          className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
            filter === 'closed'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-white/[0.03] border-white/[0.06] text-white/70 hover:bg-white/[0.06]'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Closed ({callouts.filter(c => c.status === 'closed' || c.status === 'reopened').length})
        </button>
      </div>

      {/* Callouts List */}
      {loading ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8">
          <div className="text-center text-white/60">Loading callouts...</div>
        </div>
      ) : callouts.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4">
              <Wrench className="w-8 h-8 text-pink-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Callouts Found</h2>
            <p className="text-white/60 max-w-md mx-auto">
              {filter === 'all' 
                ? 'No callouts have been created yet.'
                : `No ${filter} callouts found.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {callouts.map((callout) => (
            <div
              key={callout.id}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {callout.asset_name || 'Unknown Asset'}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(callout.status)}`}>
                      {getStatusIcon(callout.status)}
                      {callout.status.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(callout.callout_type)}`}>
                      {callout.callout_type.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(callout.priority)}`}>
                      {callout.priority.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-white/60 mb-3">
                    {callout.site_name && (
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        <span>{callout.site_name}</span>
                      </div>
                    )}
                    {callout.contractor_name && (
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        <span>{callout.contractor_name}</span>
                      </div>
                    )}
                    {callout.created_by_name && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{callout.created_by_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(callout.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {callout.fault_description && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-white/80 mb-1">Fault Description:</p>
                      <p className="text-sm text-white/60">{callout.fault_description}</p>
                    </div>
                  )}

                  {callout.repair_summary && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-white/80 mb-1">Repair Summary:</p>
                      <p className="text-sm text-white/60">{callout.repair_summary}</p>
                    </div>
                  )}

                  {callout.notes && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-white/80 mb-1">Notes:</p>
                      <p className="text-sm text-white/60">{callout.notes}</p>
                    </div>
                  )}

                  {/* Documents Section */}
                  {callout.documents && callout.documents.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-white/80 mb-2">Documents:</p>
                      <div className="flex flex-wrap gap-2">
                        {callout.documents.map((doc, idx) => (
                          <a
                            key={idx}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 hover:bg-white/10 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            <span>{doc.name}</span>
                            <span className="text-xs text-white/50">({doc.type})</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Edit Form */}
                  {editingCallout && editingCallout.id === callout.id ? (
                    <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">
                          Fault Description
                        </label>
                        <textarea
                          value={editingCallout.fault_description}
                          onChange={(e) => setEditingCallout({ ...editingCallout, fault_description: e.target.value })}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-none"
                          rows={3}
                          disabled={callout.status === 'closed'}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={editingCallout.notes}
                          onChange={(e) => setEditingCallout({ ...editingCallout, notes: e.target.value })}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-none"
                          rows={3}
                        />
                      </div>

                      {callout.status === 'open' && (
                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-1">
                            Repair Summary <span className="text-red-400">*</span>
                            <span className="text-xs text-white/50 ml-2">(required to close callout)</span>
                          </label>
                          <textarea
                            value={editingCallout.repair_summary || ''}
                            onChange={(e) => setEditingCallout({ ...editingCallout, repair_summary: e.target.value })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-none"
                            rows={3}
                            placeholder="Enter repair summary to close this callout..."
                            required
                          />
                        </div>
                      )}

                      {/* File Uploads */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-2">
                            <Upload className="w-4 h-4 inline mr-1" />
                            Upload Worksheet
                          </label>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setEditingCallout({ ...editingCallout, worksheet: file });
                            }}
                            className="w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
                          />
                          {editingCallout.worksheet && (
                            <p className="text-xs text-white/60 mt-1">{editingCallout.worksheet.name}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-2">
                            <Upload className="w-4 h-4 inline mr-1" />
                            Upload Invoice
                          </label>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setEditingCallout({ ...editingCallout, invoice: file });
                            }}
                            className="w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
                          />
                          {editingCallout.invoice && (
                            <p className="text-xs text-white/60 mt-1">{editingCallout.invoice.name}</p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          onClick={cancelEditing}
                          className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors text-sm"
                          disabled={uploading}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveUpdate}
                          disabled={uploading}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex gap-2">
                      {callout.status === 'open' && (
                        <button
                          onClick={() => {
                            setEditingCallout({
                              id: callout.id,
                              notes: callout.notes || '',
                              fault_description: callout.fault_description || '',
                              repair_summary: '',
                              worksheet: null,
                              invoice: null
                            });
                            setExpandedCallout(callout.id);
                          }}
                          className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Close Callout
                        </button>
                      )}
                      <button
                        onClick={() => startEditing(callout)}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors text-sm flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Update
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-right text-sm text-white/40">
                  <div className="mb-1">
                    Created: {new Date(callout.created_at).toLocaleString()}
                  </div>
                  {callout.closed_at && (
                    <div>
                      Closed: {new Date(callout.closed_at).toLocaleString()}
                    </div>
                  )}
                  {callout.reopened_at && (
                    <div className="text-yellow-400">
                      Reopened: {new Date(callout.reopened_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
