'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Calendar, MapPin, User, Wrench, Clock, FileText, Save, CheckCircle, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { getPPMStatus, formatServiceDate, getFrequencyText, getStatusDisplayText, calculateNextServiceDate } from '@/utils/ppmHelpers';
import ServiceCompletionModal from './ServiceCompletionModal';
import { useAppContext } from '@/context/AppContext';
import { PPMAsset } from '@/types/ppm';
import { nullifyUndefined } from '@/lib/utils';

interface PPMDrawerProps {
  asset: PPMAsset | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

interface PPMForm {
  contractor_id: string | null;
  frequency_months: number;
  next_service_date: string;
  notes: string;
}

export default function PPMDrawer({ asset, open, onClose, onUpdate }: PPMDrawerProps) {
  const { showToast } = useToast();
  const { userId } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [contractors, setContractors] = useState<any[]>([]);
  const [form, setForm] = useState<PPMForm>({
    contractor_id: null,
    frequency_months: 12,
    next_service_date: '',
    notes: ''
  });

  // Load contractors on mount
  useEffect(() => {
    const loadContractors = async () => {
      const { data } = await supabase
        .from('contractors')
        .select('id, name')
        .order('name');
      setContractors(data || []);
    };
    loadContractors();
  }, []);

  // Initialize form when asset changes
  useEffect(() => {
    if (asset) {
      setForm({
        contractor_id: asset.contractor_name ? null : null, // We'll need to map this properly
        frequency_months: asset.frequency_months || 12,
        next_service_date: asset.next_service_date || '',
        notes: asset.ppm_notes || ''
      });
    }
  }, [asset]);

  if (!asset) return null;

  const cleanAsset = nullifyUndefined(asset);
  const { status, color, borderColor } = getPPMStatus(cleanAsset.next_service_date, cleanAsset.ppm_status);
  const frequencyText = getFrequencyText(cleanAsset.frequency_months);
  const statusDisplayText = getStatusDisplayText(status);

  const handleSave = async () => {
    if (!asset) return;
    
    setLoading(true);
    try {
      const ppmData = {
        asset_id: asset.id,
        contractor_id: form.contractor_id,
        frequency_months: form.frequency_months,
        next_service_date: form.next_service_date,
        notes: form.notes,
        status: 'upcoming'
      };

      if (asset.ppm_id) {
        // Update existing PPM
        const { error } = await supabase
          .from('ppm_schedule')
          .update(ppmData)
          .eq('asset_id', asset.id);
        
        if (error) throw error;
      } else {
        // Create new PPM
        const { error } = await supabase
          .from('ppm_schedule')
          .insert(ppmData);
        
        if (error) throw error;
      }

      showToast({
        title: 'Success',
        description: 'PPM schedule updated successfully',
        type: 'success'
      });

      if (onUpdate) onUpdate();
      onClose();
    } catch (error: any) {
      showToast({
        title: 'Error',
        description: error.message || 'Failed to save PPM schedule',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!asset || !asset.ppm_id) return;
    
    setLoading(true);
    try {
      // Call the complete_ppm_service function
      const { error } = await supabase.rpc('complete_ppm_service', {
        asset_id: asset.id,
        completed_by_id: (await supabase.auth.getUser()).data.user?.id,
        completion_notes: form.notes || 'Service completed'
      });

      if (error) throw error;

      showToast({
        title: 'Success',
        description: 'PPM marked as completed and next service date calculated',
        type: 'success'
      });

      if (onUpdate) onUpdate();
      onClose();
    } catch (error: any) {
      showToast({
        title: 'Error',
        description: error.message || 'Failed to complete PPM service',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !asset?.ppm_id) return;

    setUploading(true);
    try {
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${asset.ppm_id}-${Date.now()}.${fileExt}`;
      const filePath = `ppm-certificates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ppm-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ppm-files')
        .getPublicUrl(filePath);

      // Create history record with file URL
      const { error: historyError } = await supabase
        .from('ppm_history')
        .insert({
          ppm_id: asset.ppm_id,
          service_date: new Date().toISOString().split('T')[0],
          completed_by: (await supabase.auth.getUser()).data.user?.id,
          notes: `Certificate uploaded: ${file.name}`,
          file_url: publicUrl
        });

      if (historyError) throw historyError;

      showToast({
        title: 'Success',
        description: 'Certificate uploaded successfully',
        type: 'success'
      });
      if (onUpdate) onUpdate();
    } catch (error: any) {
      showToast({
        title: 'Error',
        description: error.message || 'Failed to upload certificate',
        type: 'error'
      });
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              // Only close if clicking directly on the backdrop, not on dropdown content
              if (e.target === e.currentTarget) {
                onClose();
              }
            }}
            className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-[#0f1220] border-l border-gray-200 dark:border-white/10 z-50 overflow-y-auto shadow-xl dark:shadow-none"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gray-50 dark:bg-[#0f1220] border-b border-gray-200 dark:border-white/10 px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">{cleanAsset.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{cleanAsset.category_name}</p>

                  {/* Status Badge */}
                  <div className="mt-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${color}`}>
                      {statusDisplayText}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8">
              {/* PPM Schedule Form */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  PPM Schedule
                </h3>

                <div className="bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.08] p-6 space-y-4">
                  {/* Contractor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contractor
                    </label>
                    <select
                      value={form.contractor_id || ''}
                      onChange={(e) => setForm({ ...form, contractor_id: e.target.value || null })}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.15] text-gray-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                    >
                      <option value="">Select contractor...</option>
                      {contractors.map((contractor) => (
                        <option key={contractor.id} value={contractor.id}>
                          {contractor.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Frequency (months)
                    </label>
                    <select
                      value={form.frequency_months}
                      onChange={(e) => setForm({ ...form, frequency_months: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.15] text-gray-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                    >
                      <option value={1}>Monthly</option>
                      <option value={3}>Quarterly</option>
                      <option value={6}>Bi-annually</option>
                      <option value={12}>Annually</option>
                      <option value={24}>Every 2 years</option>
                    </select>
                  </div>

                  {/* Next Service Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Next Service Date
                    </label>
                    <input
                      type="date"
                      value={form.next_service_date}
                      onChange={(e) => setForm({ ...form, next_service_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.15] text-gray-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.15] text-gray-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-white/40"
                      placeholder="Add any notes about this PPM schedule..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-medium transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {loading ? 'Saving...' : 'Save Schedule'}
                    </button>

                    {asset.ppm_id && status !== 'completed' && (
                      <button
                        onClick={() => setShowServiceModal(true)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-600 dark:border-cyan-500 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 font-medium transition-all duration-200 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Mark Service Completed
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* Asset Summary */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  Asset Summary
                </h3>

                <div className="bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.08] p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Site</p>
                          <p className="text-sm text-gray-900 dark:text-white">{cleanAsset.site_name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Contractor</p>
                          <p className="text-sm text-gray-900 dark:text-white">{cleanAsset.contractor_name || 'Unassigned'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Wrench className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Frequency</p>
                          <p className="text-sm text-gray-900 dark:text-white">{frequencyText}</p>
                        </div>
                      </div>
                    </div>

                    {/* Service Dates */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Last Service</p>
                          <p className="text-sm text-gray-900 dark:text-white">{formatServiceDate(cleanAsset.last_service_date)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Next Service</p>
                          <p className={`text-sm ${color}`}>{formatServiceDate(cleanAsset.next_service_date)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Service History Placeholder */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  Service History & Certificates
                </h3>

                <div className="bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.08] p-6 space-y-4">
                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Upload Certificate
                    </label>
                    <div className="border-2 border-dashed border-gray-300 dark:border-white/[0.15] rounded-lg p-4 text-center hover:border-cyan-500/50 transition-colors">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="certificate-upload"
                        disabled={uploading}
                      />
                      <label
                        htmlFor="certificate-upload"
                        className={`cursor-pointer flex flex-col items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Upload className="h-8 w-8 text-gray-400" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {uploading ? 'Uploading...' : 'Click to upload certificate'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          PDF, PNG, JPG up to 10MB
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Service History List */}
                  <ServiceHistoryList assetId={asset.id} />
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
      
      {/* Service Completion Modal */}
      {showServiceModal && asset && (
        <ServiceCompletionModal
          ppm={{ id: asset.ppm_id }}
          asset={asset}
          user={{ id: userId }}
          onClose={(refreshData) => {
            setShowServiceModal(false);
            if (refreshData && onUpdate) {
              onUpdate();
            }
          }}
        />
      )}
    </AnimatePresence>
  );
}

// Service History Component
function ServiceHistoryList({ assetId }: { assetId: string }) {
  const [serviceEvents, setServiceEvents] = useState<any[]>([]);
  const [contractors, setContractors] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServiceHistory();
  }, [assetId]);

  const loadServiceHistory = async () => {
    try {
      // Load service events
      const { data: events, error: eventsError } = await supabase
        .from('ppm_service_events')
        .select('*')
        .eq('asset_id', assetId)
        .order('service_date', { ascending: false })
        .limit(10);

      if (eventsError) throw eventsError;

      // Load all contractors to map IDs to names
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('id, name');

      if (contractorError) throw contractorError;

      // Create a map of contractor IDs to names
      const contractorMap = new Map(
        (contractorData || []).map(c => [c.id, c.name])
      );

      setContractors(contractorMap);
      setServiceEvents(events || []);
    } catch (err) {
      console.error('Error loading service history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
        <p className="text-sm text-gray-500">Loading service history...</p>
      </div>
    );
  }

  if (serviceEvents.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-gray-300 dark:text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-2">No Service History</p>
        <p className="text-sm text-gray-500">Service history will appear here after completing PPM tasks</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {serviceEvents.map((event) => (
        <div
          key={event.id}
          className="bg-white dark:bg-white/[0.05] rounded-lg border border-gray-200 dark:border-white/[0.1] p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Service Completed
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(event.service_date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/10 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-500/20">
              {event.status === 'completed' ? 'Completed' : event.status}
            </span>
          </div>

          {event.contractor_id && contractors.get(event.contractor_id) && (
            <div className="flex items-center gap-2 mb-2">
              <User className="h-3 w-3 text-gray-400" />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {contractors.get(event.contractor_id)}
              </p>
            </div>
          )}

          {event.notes && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {event.notes}
            </p>
          )}

          {event.file_url && (
            <a
              href={event.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
            >
              <FileText className="h-3 w-3" />
              View Certificate
            </a>
          )}
        </div>
      ))}
    </div>
  );
}