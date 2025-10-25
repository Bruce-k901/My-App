'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { 
  Wrench, 
  AlertTriangle, 
  Shield, 
  Settings, 
  Camera, 
  Upload, 
  CheckCircle, 
  Clock,
  User,
  Phone,
  Mail,
  X,
  Plus,
  FileText,
  Image as ImageIcon
} from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  serial_number: string | null;
  site_name: string | null;
  warranty_end: string | null;
  install_date: string | null;
  ppm_contractor_name: string | null;
  reactive_contractor_name: string | null;
  warranty_contractor_name: string | null;
}

interface Callout {
  id: string;
  callout_type: 'reactive' | 'warranty' | 'ppm';
  priority: 'low' | 'medium' | 'urgent';
  status: 'open' | 'closed' | 'reopened';
  fault_description: string | null;
  repair_summary: string | null;
  notes: string | null;
  attachments: any[];
  documents: any[];
  troubleshooting_complete: boolean;
  created_at: string;
  closed_at: string | null;
  reopened_at: string | null;
  contractor_name: string | null;
  created_by_name: string | null;
}

interface CalloutModalProps {
  open: boolean;
  onClose: () => void;
  asset: Asset;
}

export default function CalloutModal({ open, onClose, asset }: CalloutModalProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'active' | 'history'>('new');
  const [loading, setLoading] = useState(false);
  const [callouts, setCallouts] = useState<Callout[]>([]);
  const [selectedCallout, setSelectedCallout] = useState<Callout | null>(null);
  
  // New callout form state
  const [calloutType, setCalloutType] = useState<'reactive' | 'warranty' | 'ppm'>('reactive');
  const [priority, setPriority] = useState<'low' | 'medium' | 'urgent'>('medium');
  const [faultDescription, setFaultDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [troubleshootingComplete, setTroubleshootingComplete] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // Active callout update state
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateAttachments, setUpdateAttachments] = useState<File[]>([]);
  
  // Close callout state
  const [repairSummary, setRepairSummary] = useState('');
  const [closeDocuments, setCloseDocuments] = useState<File[]>([]);
  
  const { showToast } = useToast();
  const { profile } = useAppContext();

  // Calculate asset age
  const getAssetAge = () => {
    if (!asset.install_date) return 'Unknown';
    const installDate = new Date(asset.install_date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - installDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days`;
  };

  // Check warranty status
  const isUnderWarranty = () => {
    if (!asset.warranty_end) return false;
    return new Date() <= new Date(asset.warranty_end);
  };

  // Load callouts when modal opens
  useEffect(() => {
    if (open) {
      loadCallouts();
    }
  }, [open, asset.id]);

  const loadCallouts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_asset_callouts', {
        p_asset_id: asset.id
      });

      if (error) throw error;
      setCallouts(data || []);
    } catch (error) {
      console.error('Error loading callouts:', error);
      showToast({ title: 'Failed to load callouts', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCallout = async () => {
    try {
      setLoading(true);
      
      // Validate required fields
      if (calloutType !== 'ppm' && !faultDescription.trim()) {
        showToast({ title: 'Fault description is required', type: 'error' });
        return;
      }

      if (!troubleshootingComplete) {
        showToast({ title: 'Please confirm troubleshooting is complete', type: 'error' });
        return;
      }

      // Upload attachments if any
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        // TODO: Implement file upload to Supabase storage
        console.log('Uploading attachments:', attachments);
      }

      const { data, error } = await supabase.rpc('create_callout', {
        p_asset_id: asset.id,
        p_callout_type: calloutType,
        p_priority: priority,
        p_fault_description: faultDescription || null,
        p_notes: notes || null,
        p_attachments: JSON.stringify(attachmentUrls),
        p_troubleshooting_complete: troubleshootingComplete
      });

      if (error) throw error;

      showToast({ 
        title: 'Callout created successfully', 
        description: 'The contractor has been notified',
        type: 'success' 
      });

      // Reset form
      setFaultDescription('');
      setNotes('');
      setTroubleshootingComplete(false);
      setAttachments([]);
      
      // Reload callouts
      await loadCallouts();
      setActiveTab('active');
    } catch (error) {
      console.error('Error creating callout:', error);
      showToast({ title: 'Failed to create callout', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCallout = async (calloutId: string) => {
    try {
      setLoading(true);
      
      if (!repairSummary.trim()) {
        showToast({ title: 'Repair summary is required', type: 'error' });
        return;
      }

      // Upload documents if any
      let documentUrls: string[] = [];
      if (closeDocuments.length > 0) {
        // TODO: Implement file upload to Supabase storage
        console.log('Uploading documents:', closeDocuments);
      }

      const { error } = await supabase.rpc('close_callout', {
        p_callout_id: calloutId,
        p_repair_summary: repairSummary,
        p_documents: JSON.stringify(documentUrls)
      });

      if (error) throw error;

      showToast({ 
        title: 'Callout closed successfully', 
        type: 'success' 
      });

      // Reset form
      setRepairSummary('');
      setCloseDocuments([]);
      
      // Reload callouts
      await loadCallouts();
    } catch (error) {
      console.error('Error closing callout:', error);
      showToast({ title: 'Failed to close callout', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReopenCallout = async (calloutId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.rpc('reopen_callout', {
        p_callout_id: calloutId
      });

      if (error) throw error;

      showToast({ 
        title: 'Callout reopened successfully', 
        type: 'success' 
      });
      
      // Reload callouts
      await loadCallouts();
    } catch (error) {
      console.error('Error reopening callout:', error);
      showToast({ title: 'Failed to reopen callout', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getContractorInfo = () => {
    switch (calloutType) {
      case 'ppm':
        return asset.ppm_contractor_name;
      case 'warranty':
        return asset.warranty_contractor_name;
      default:
        return asset.reactive_contractor_name;
    }
  };

  const canCloseReopen = () => {
    return profile?.role === 'manager' || profile?.role === 'admin';
  };

  const canReopen = (callout: Callout) => {
    if (!canCloseReopen()) return false;
    if (callout.status !== 'closed') return false;
    
    // Check if it's the latest callout for this asset
    const latestCallout = callouts.find(c => c.asset_id === asset.id);
    if (latestCallout?.id !== callout.id) return false;
    
    // Check if closed within 3 months
    if (callout.closed_at) {
      const closedDate = new Date(callout.closed_at);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return closedDate > threeMonthsAgo;
    }
    
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-white">
                {asset.name}
              </DialogTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-neutral-400">
                <span>Serial: {asset.serial_number || 'N/A'}</span>
                <span>Age: {getAssetAge()}</span>
                <span className={`flex items-center gap-1 ${
                  isUnderWarranty() ? 'text-green-400' : 'text-red-400'
                }`}>
                  <Shield size={14} />
                  {isUnderWarranty() ? 'In Warranty' : 'Out of Warranty'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={calloutType === 'reactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCalloutType('reactive')}
                className={calloutType === 'reactive' ? 'bg-red-500 hover:bg-red-600' : ''}
              >
                <AlertTriangle size={14} className="mr-1" />
                Reactive
              </Button>
              <Button
                variant={calloutType === 'warranty' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCalloutType('warranty')}
                className={calloutType === 'warranty' ? 'bg-blue-500 hover:bg-blue-600' : ''}
              >
                <Shield size={14} className="mr-1" />
                Warranty
              </Button>
            <Button
                variant={calloutType === 'ppm' ? 'default' : 'outline'}
              size="sm"
                onClick={() => setCalloutType('ppm')}
                className={calloutType === 'ppm' ? 'bg-green-500 hover:bg-green-600' : ''}
            >
                <Settings size={14} className="mr-1" />
                PPM
            </Button>
            </div>
          </div>
        </DialogHeader>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-700">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'new'
                ? 'border-magenta-500 text-magenta-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            New Fault
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'active'
                ? 'border-magenta-500 text-magenta-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Active Ticket ({callouts.filter(c => c.status === 'open').length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-magenta-500 text-magenta-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            History ({callouts.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="py-6">
          {activeTab === 'new' && (
            <div className="space-y-6">
              {/* Auto-prefilled asset data */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-800 rounded-lg">
                <div>
                  <label className="text-sm text-neutral-400">Asset</label>
                  <p className="text-white font-medium">{asset.name}</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Site</label>
                  <p className="text-white font-medium">{asset.site_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Contractor</label>
                  <p className="text-white font-medium">{getContractorInfo() || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Warranty</label>
                  <p className={`font-medium ${isUnderWarranty() ? 'text-green-400' : 'text-red-400'}`}>
                    {isUnderWarranty() ? 'In Warranty' : 'Out of Warranty'}
                  </p>
                </div>
              </div>

              {/* Fault description */}
              {calloutType !== 'ppm' && (
                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">Fault Description *</label>
                  <textarea
                    value={faultDescription}
                    onChange={(e) => setFaultDescription(e.target.value)}
                    placeholder="Describe the fault or issue..."
                    className="w-full h-24 px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-magenta-500/40 focus:border-magenta-500/40"
                    required
                  />
                </div>
              )}

              {/* Priority */}
              <div>
                <Select
                  label="Priority"
                  value={priority}
                  options={[
                    { label: 'Low', value: 'low' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'Urgent', value: 'urgent' }
                  ]}
                  onValueChange={(value: 'low' | 'medium' | 'urgent') => setPriority(value)}
                />
              </div>

              {/* Troubleshooting checklist */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white">Troubleshooting Checklist</h4>
                <div className="space-y-2">
                  {['Power connected', 'Switched on', 'Settings correct'].map((item) => (
                    <label key={item} className="flex items-center gap-2 text-sm text-neutral-300">
                      <input type="checkbox" className="rounded" />
                      {item}
                    </label>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-white">
                  <input
                    type="checkbox"
                    checked={troubleshootingComplete}
                    onChange={(e) => setTroubleshootingComplete(e.target.checked)}
                    className="rounded"
                  />
                  I confirm basic troubleshooting is complete *
                </label>
              </div>

              {/* Photo upload */}
              <div>
                <label className="text-sm text-neutral-400 mb-2 block">Photos</label>
                <div className="border-2 border-dashed border-neutral-600 rounded-lg p-4 text-center">
                  <Camera className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
                  <p className="text-sm text-neutral-400">Click to upload photos</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setAttachments(Array.from(e.target.files || []))}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" className="mt-2">
                      <Upload size={14} className="mr-1" />
                      Upload Photos
                    </Button>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm text-neutral-400 mb-2 block">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  className="w-full h-20 px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-magenta-500/40 focus:border-magenta-500/40"
                />
              </div>

              {/* Submit button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleCreateCallout}
                  disabled={loading || !troubleshootingComplete}
                  className="bg-magenta-500 hover:bg-magenta-600 text-white"
                >
                  {loading ? 'Creating...' : 'Submit Callout'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'active' && (
            <div className="space-y-4">
              {callouts.filter(c => c.status === 'open').length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  <Clock className="mx-auto h-12 w-12 mb-4" />
                  <p>No active callouts</p>
                </div>
              ) : (
                callouts.filter(c => c.status === 'open').map((callout) => (
                  <div key={callout.id} className="border border-neutral-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          callout.callout_type === 'reactive' ? 'bg-red-500/20 text-red-400' :
                          callout.callout_type === 'warranty' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {callout.callout_type.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          callout.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                          callout.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {callout.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-neutral-400">
                        Created {new Date(callout.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {callout.fault_description && (
                      <div className="mb-4">
                        <label className="text-sm text-neutral-400">Fault Description</label>
                        <p className="text-white mt-1">{callout.fault_description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-sm text-neutral-400">Contractor</label>
                        <p className="text-white">{callout.contractor_name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-neutral-400">Created by</label>
                        <p className="text-white">{callout.created_by_name || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Update section */}
                    <div className="border-t border-neutral-700 pt-4">
                      <h4 className="text-sm font-medium text-white mb-3">Update Callout</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-neutral-400 mb-2 block">Add Notes</label>
                          <textarea
                            value={updateNotes}
                            onChange={(e) => setUpdateNotes(e.target.value)}
                            placeholder="Add update notes..."
                            className="w-full h-20 px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-magenta-500/40 focus:border-magenta-500/40"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <ImageIcon size={14} className="mr-1" />
                            Add Photos
                          </Button>
                          <Button variant="outline" size="sm">
                            <FileText size={14} className="mr-1" />
                            Add Documents
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Close section (Manager+ only) */}
                    {canCloseReopen() && (
                      <div className="border-t border-neutral-700 pt-4 mt-4">
                        <h4 className="text-sm font-medium text-white mb-3">Close Callout</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm text-neutral-400 mb-2 block">Repair Summary *</label>
                            <textarea
                              value={repairSummary}
                              onChange={(e) => setRepairSummary(e.target.value)}
                              placeholder="Describe what was repaired..."
                              className="w-full h-20 px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-magenta-500/40 focus:border-magenta-500/40"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Upload size={14} className="mr-1" />
                              Upload Worksheet
                            </Button>
                            <Button variant="outline" size="sm">
                              <Upload size={14} className="mr-1" />
                              Upload Invoice
                            </Button>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              onClick={() => handleCloseCallout(callout.id)}
                              disabled={loading || !repairSummary.trim()}
                              className="bg-green-500 hover:bg-green-600 text-white"
                            >
                              <CheckCircle size={14} className="mr-1" />
                              Close Callout
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {callouts.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  <Clock className="mx-auto h-12 w-12 mb-4" />
                  <p>No callout history</p>
                </div>
              ) : (
                callouts.map((callout) => (
                  <div key={callout.id} className="border border-neutral-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          callout.callout_type === 'reactive' ? 'bg-red-500/20 text-red-400' :
                          callout.callout_type === 'warranty' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {callout.callout_type.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          callout.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                          callout.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {callout.priority.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          callout.status === 'open' ? 'bg-green-500/20 text-green-400' :
                          callout.status === 'closed' ? 'bg-neutral-500/20 text-neutral-400' :
                          'bg-orange-500/20 text-orange-400'
                        }`}>
                          {callout.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-neutral-400">
                        {new Date(callout.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="text-sm text-neutral-400">Contractor</label>
                        <p className="text-white text-sm">{callout.contractor_name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-neutral-400">Created by</label>
                        <p className="text-white text-sm">{callout.created_by_name || 'N/A'}</p>
                      </div>
                    </div>

                    {callout.fault_description && (
                      <div className="mb-3">
                        <label className="text-sm text-neutral-400">Fault</label>
                        <p className="text-white text-sm mt-1">{callout.fault_description}</p>
          </div>
                    )}

                    {callout.repair_summary && (
                      <div className="mb-3">
                        <label className="text-sm text-neutral-400">Repair Summary</label>
                        <p className="text-white text-sm mt-1">{callout.repair_summary}</p>
          </div>
                    )}

                    <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-500">
                        {callout.closed_at && `Closed: ${new Date(callout.closed_at).toLocaleDateString()}`}
                        {callout.reopened_at && ` • Reopened: ${new Date(callout.reopened_at).toLocaleDateString()}`}
                      </div>
                      {canReopen(callout) && (
                        <Button
                          onClick={() => handleReopenCallout(callout.id)}
                          disabled={loading}
                          size="sm"
                          variant="outline"
                          className="text-orange-400 border-orange-400 hover:bg-orange-400/10"
                        >
                          Reopen Callout
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t border-neutral-700">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}