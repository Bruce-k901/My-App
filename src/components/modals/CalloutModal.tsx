'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Image as ImageIcon,
  Send,
  Zap,
  Power,
  Check
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
  const [troubleshootingSteps, setTroubleshootingSteps] = useState({
    powerConnected: false,
    switchedOn: false,
    settingsCorrect: false,
    breakerOn: false,
    connectionsSecure: false,
    noObstructions: false
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
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

  const getAssetAgeInYearsMonths = () => {
    if (!asset.install_date) return 'N/A';
    const installDate = new Date(asset.install_date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - installDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years > 0 && months > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${months} month${months > 1 ? 's' : ''}`;
    } else if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      return `${diffDays} days`;
    }
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
      
      // Try RPC function first, fallback to direct query if not available
      try {
        const { data, error } = await supabase.rpc('get_asset_callouts', {
          p_asset_id: asset.id
        });

        if (error) throw error;
        setCallouts(data || []);
      } catch (rpcError) {
        console.log('RPC function not available, using direct query:', rpcError);
        
        // Fallback to direct query - check if table exists first
        try {
          const { data, error } = await supabase
            .from('callouts')
            .select(`
              id,
              callout_type,
              priority,
              status,
              fault_description,
              repair_summary,
              notes,
              attachments,
              documents,
              log_timeline,
              troubleshooting_complete,
              created_at,
              closed_at,
              reopened_at,
              contractors(name),
              profiles(name)
            `)
            .eq('asset_id', asset.id)
            .order('created_at', { ascending: false });

          if (error) {
            // If table doesn't exist, just set empty array
            if (error.code === 'PGRST116' || error.message?.includes('relation "callouts" does not exist')) {
              console.log('Callouts table does not exist yet, showing empty state');
              setCallouts([]);
              return;
            }
            throw error;
          }
          
          // Transform data to match expected format
          const transformedData = (data || []).map((callout: any) => ({
            id: callout.id,
            callout_type: callout.callout_type,
            priority: callout.priority,
            status: callout.status,
            fault_description: callout.fault_description,
            repair_summary: callout.repair_summary,
            notes: callout.notes,
            attachments: callout.attachments || [],
            documents: callout.documents || [],
            log_timeline: callout.log_timeline || {},
            troubleshooting_complete: callout.troubleshooting_complete,
            created_at: callout.created_at,
            closed_at: callout.closed_at,
            reopened_at: callout.reopened_at,
            contractor_name: callout.contractors?.name || null,
            created_by_name: callout.profiles?.name || null,
          }));
          
          setCallouts(transformedData);
        } catch (tableError) {
          // If table doesn't exist or other error, just show empty state
          console.log('Callouts table not available, showing empty state:', tableError);
          setCallouts([]);
        }
      }
    } catch (error) {
      console.error('Error loading callouts:', error);
      // Don't show error toast for missing table - just show empty state
      if (error.message?.includes('relation "callouts" does not exist') || 
          error.code === 'PGRST116') {
        console.log('Callouts table does not exist, showing empty state');
        setCallouts([]);
      } else {
        showToast({ title: 'Failed to load callouts', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCallout = async () => {
    // Validate required fields
    if (calloutType !== 'ppm' && !faultDescription.trim()) {
      showToast({ title: 'Fault description is required', type: 'error' });
      return;
    }

    if (!troubleshootingComplete) {
      showToast({ title: 'Please confirm troubleshooting is complete', type: 'error' });
      return;
    }

    // Show confirmation popup
    setShowConfirmation(true);
  };

  const handleConfirmCreateCallout = async () => {
    try {
      setLoading(true);
      setShowConfirmation(false);

      // Upload attachments if any
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        // TODO: Implement file upload to Supabase storage
        console.log('Uploading attachments:', attachments);
      }

      // Try RPC function first, fallback to direct insert if not available
      try {
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
      } catch (rpcError) {
        console.log('RPC function not available, using direct insert:', rpcError);
        
        // Fallback to direct insert
        try {
          const { data: assetData } = await supabase
            .from('assets')
            .select('company_id, site_id, ppm_contractor_id, reactive_contractor_id, warranty_contractor_id')
            .eq('id', asset.id)
            .single();

          if (!assetData) {
            throw new Error('Asset not found');
          }

          const contractorId = calloutType === 'ppm' ? assetData.ppm_contractor_id :
                             calloutType === 'warranty' ? assetData.warranty_contractor_id :
                             assetData.reactive_contractor_id;

          const { error } = await supabase
            .from('callouts')
            .insert({
              company_id: assetData.company_id,
              asset_id: asset.id,
              site_id: assetData.site_id,
              contractor_id: contractorId,
              created_by: profile?.id,
              callout_type: calloutType,
              priority: priority,
              fault_description: faultDescription || null,
              notes: notes || null,
              attachments: attachmentUrls,
              troubleshooting_complete: troubleshootingComplete
            });

          if (error) {
            // If table doesn't exist, show helpful message
            if (error.code === 'PGRST116' || error.message?.includes('relation "callouts" does not exist')) {
              showToast({ 
                title: 'Callout system not set up', 
                description: 'Please run the database migration to enable callouts',
                type: 'error' 
              });
              return;
            }
            throw error;
          }
        } catch (tableError) {
          if (tableError.code === 'PGRST116' || tableError.message?.includes('relation "callouts" does not exist')) {
            showToast({ 
              title: 'Callout system not set up', 
              description: 'Please run the database migration to enable callouts',
              type: 'error' 
            });
            return;
          }
          throw tableError;
        }
      }

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

      // Try RPC function first, fallback to direct update if not available
      try {
        const { error } = await supabase.rpc('close_callout', {
          p_callout_id: calloutId,
          p_repair_summary: repairSummary,
          p_documents: JSON.stringify(documentUrls)
        });

        if (error) throw error;
      } catch (rpcError) {
        console.log('RPC function not available, using direct update:', rpcError);
        
        // Fallback to direct update
        const { error } = await supabase
          .from('callouts')
          .update({
            status: 'closed',
            repair_summary: repairSummary,
            documents: documentUrls,
            closed_at: new Date().toISOString()
          })
          .eq('id', calloutId);

        if (error) throw error;
      }

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
      
      // Try RPC function first, fallback to direct update if not available
      try {
        const { error } = await supabase.rpc('reopen_callout', {
          p_callout_id: calloutId
        });

        if (error) throw error;
      } catch (rpcError) {
        console.log('RPC function not available, using direct update:', rpcError);
        
        // Fallback to direct update
        const { error } = await supabase
          .from('callouts')
          .update({
            status: 'open',
            reopened: true,
            reopened_at: new Date().toISOString()
          })
          .eq('id', calloutId);

        if (error) throw error;
      }

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

  const handleTroubleshootingStep = (step: keyof typeof troubleshootingSteps) => {
    setTroubleshootingSteps(prev => ({
      ...prev,
      [step]: !prev[step]
    }));
    
    // Check if all steps are complete
    const updatedSteps = { ...troubleshootingSteps, [step]: !troubleshootingSteps[step] };
    const allComplete = Object.values(updatedSteps).every(Boolean);
    setTroubleshootingComplete(allComplete);
  };

  const PrioritySlider = () => {
    const options = [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'urgent', label: 'Urgent' }
    ];

    return (
      <div className="w-full max-w-md mx-auto">
        <div className="flex rounded-md bg-white/5 backdrop-blur p-[2px] overflow-hidden h-[38px]">
          <div className="relative flex w-full">
            {/* Shared sliding indicator */}
            <motion.div
              layoutId="priority-indicator"
              className="absolute inset-y-0 bg-fuchsia-500/10 border border-fuchsia-400/40 rounded-md shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] shadow-black/20"
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 34
              }}
              style={{
                width: `${100/3}%`,
                left: `${(priority === 'low' ? 0 : priority === 'medium' ? 1 : 2) * (100/3)}%`
              }}
            />
            
            {/* Button labels */}
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => setPriority(option.value as 'low' | 'medium' | 'urgent')}
                className={`flex-1 flex items-center justify-center text-base font-medium transition-colors duration-200 ${
                  priority === option.value
                    ? 'text-fuchsia-200'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const TroubleshootingSpinner = () => {
    const steps = [
      { key: 'powerConnected', label: 'Power Connected', icon: Power },
      { key: 'switchedOn', label: 'Switched On', icon: Zap },
      { key: 'settingsCorrect', label: 'Settings Correct', icon: Settings },
      { key: 'breakerOn', label: 'Breaker On', icon: Power },
      { key: 'connectionsSecure', label: 'Connections Secure', icon: Settings },
      { key: 'noObstructions', label: 'No Obstructions', icon: Check }
    ];

    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="relative w-48 h-48">
          {/* Outer translucent ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-neutral-700/30 to-neutral-600/30 p-2">
            <div className="w-full h-full rounded-full bg-neutral-800/60 backdrop-blur-sm"></div>
          </div>
          
          {/* 6 Checkly tick segments on circumference */}
          {steps.map((step, index) => {
            const isComplete = troubleshootingSteps[step.key as keyof typeof troubleshootingSteps];
            const angle = (index * 60) - 90; // 60 degrees apart, starting at top
            const x = 50 + 40 * Math.cos((angle * Math.PI) / 180);
            const y = 50 + 40 * Math.sin((angle * Math.PI) / 180);
            
            return (
              <div
                key={step.key}
                className={`absolute w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-500 hover:scale-110 ${
                  isComplete 
                    ? 'bg-green-500/30 border-2 border-green-400 text-green-400 shadow-lg shadow-green-500/30' 
                    : 'bg-neutral-700/40 border border-neutral-600 text-neutral-300 hover:bg-neutral-600/50 hover:border-neutral-500 hover:shadow-lg hover:shadow-magenta-500/20'
                }`}
                style={{
                  left: `${x - 16}%`,
                  top: `${y - 16}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={() => handleTroubleshootingStep(step.key as keyof typeof troubleshootingSteps)}
              >
                {isComplete ? (
                  <Check size={16} className="text-green-400" />
                ) : (
                  <step.icon size={16} />
                )}
              </div>
            );
          })}
          
          {/* Center circle with large Checkly tick */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
              troubleshootingComplete 
                ? 'bg-green-500/20 border-green-400 shadow-lg shadow-green-500/30' 
                : 'bg-neutral-800/50 border-neutral-600'
            }`}>
              <CheckCircle 
                size={32} 
                className={troubleshootingComplete ? 'text-green-400' : 'text-neutral-400'} 
              />
            </div>
          </div>
        </div>
        
        {/* Caption */}
        <div className="text-center">
          <p className="text-sm text-neutral-400">
            {troubleshootingComplete 
              ? 'All troubleshooting steps completed ✓' 
              : 'Complete all steps to enable submission'
            }
          </p>
        </div>
      </div>
    );
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
          <div className="bg-neutral-800/30 rounded-lg p-4 backdrop-blur-sm">
            {/* First row: Asset Name left, Site Name right */}
            <div className="flex items-center justify-between mb-2">
              <DialogTitle className="text-xl font-semibold text-white">
                {asset.name}
          </DialogTitle>
              <div className="text-sm text-neutral-400">
                {asset.site_name || 'N/A'}
              </div>
            </div>
            
            {/* Second row: Serial only */}
            <div className="text-sm text-neutral-400 mb-2">
              Serial: {asset.serial_number || 'N/A'}
            </div>
            
            {/* Third row: Age + Warranty inline */}
            <div className="flex items-center justify-between text-sm text-neutral-400">
              <span>Age: {getAssetAgeInYearsMonths()}</span>
              <span className={isUnderWarranty() ? 'text-green-400' : 'text-[#E14C4C]'}>
                Warranty: {isUnderWarranty() ? 'In Warranty' : 'Out of Warranty'}
              </span>
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

        {/* Callout Type Segmented Control */}
        <div className="flex rounded-md bg-white/5 backdrop-blur p-[2px] overflow-hidden h-[38px] mt-4">
          <div className="relative flex w-full">
            {/* Shared sliding indicator */}
            <motion.div
              layoutId="callout-indicator"
              className="absolute inset-y-0 bg-fuchsia-500/10 border border-fuchsia-400/40 rounded-md shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] shadow-black/20"
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 34
              }}
              style={{
                width: `${100/3}%`,
                left: `${(calloutType === 'reactive' ? 0 : calloutType === 'warranty' ? 1 : 2) * (100/3)}%`
              }}
            />
            
            {/* Button labels */}
            {[
              { value: 'reactive', label: 'Reactive', icon: AlertTriangle },
              { value: 'warranty', label: 'Warranty', icon: Shield },
              { value: 'ppm', label: 'PPM', icon: Settings }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setCalloutType(option.value as 'reactive' | 'warranty' | 'ppm')}
                className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-200 ${
                  calloutType === option.value
                    ? 'text-fuchsia-200'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <option.icon size={16} />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="py-6">
          {activeTab === 'new' && (
            <div className="space-y-6">

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

              {/* Priority Slider */}
              <div className="space-y-3">
                <label className="text-sm text-neutral-400 block text-center">Priority</label>
                <PrioritySlider />
              </div>

              {/* Troubleshooting Spinner */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-white text-center">Troubleshooting Checklist</h4>
                <TroubleshootingSpinner />
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

              {/* Contact buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    const contractorName = getContractorInfo();
                    if (confirm(`Call ${contractorName || 'Contractor'}?`)) {
                      // TODO: Implement actual phone call
                      console.log('Calling main contractor line');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-magenta-500/10 border border-magenta-500/30 text-magenta-400 rounded-lg hover:bg-magenta-500/20 transition-colors text-sm"
                  title="Call Contractor"
                >
                  📞 Call Contractor
                </button>
                <button
                  onClick={() => {
                    const contractorName = getContractorInfo();
                    if (confirm(`Call out-of-hours contact for ${contractorName || 'Contractor'}?`)) {
                      // TODO: Implement actual phone call
                      console.log('Calling OOH contact');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-magenta-500/10 border border-magenta-500/30 text-magenta-400 rounded-lg hover:bg-magenta-500/20 transition-colors text-sm"
                  title="Call OOH Contact"
                >
                  🌙 Call OOH
                </button>
              </div>

              {/* CTA Bar - Sticky Footer */}
              <div className="sticky bottom-0 bg-neutral-900/95 backdrop-blur-sm border-t border-neutral-700 -mx-6 px-6 py-4">
                <div className="flex justify-end items-center gap-3">
                  <button
                    onClick={onClose}
                    className="flex items-center gap-2 px-3 py-2 bg-neutral-800/50 border border-neutral-600 text-neutral-400 hover:text-white hover:bg-neutral-700/50 transition-colors rounded-lg"
                    title="Cancel"
                  >
                    ❌
                  </button>
                  <button
                    onClick={handleCreateCallout}
                    disabled={loading || !troubleshootingComplete}
                    className="flex items-center gap-2 px-3 py-2 bg-magenta-500/20 border border-magenta-500/30 text-magenta-400 hover:bg-magenta-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg"
                    title="Send Call-Out"
                  >
                    📨
                  </button>
                </div>
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

      {/* Confirmation Popup */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Call-Out</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-neutral-400">Asset:</span>
                <span className="text-white">{asset.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Serial:</span>
                <span className="text-white">{asset.serial_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Site:</span>
                <span className="text-white">{asset.site_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Type:</span>
                <span className="text-white capitalize">{calloutType}</span>
              </div>
              {faultDescription && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Fault:</span>
                  <span className="text-white text-sm max-w-xs truncate">{faultDescription}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-400">Priority:</span>
                <span className="text-white capitalize">{priority}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Contractor:</span>
                <span className="text-white">{getContractorInfo() || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Attachments:</span>
                <span className="text-white">{attachments.length} files</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleConfirmCreateCallout}
                disabled={loading}
                className="px-4 py-2 bg-magenta-500 hover:bg-magenta-600 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}