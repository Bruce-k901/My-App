'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import TroubleshootReel from '@/components/ui/TroubleshootReel';
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
  id: string | null;
  name: string;
  serial_number?: string | null;
  site_name: string | null;
  warranty_end?: string | null;
  install_date?: string | null;
  ppm_contractor_name?: string | null;
  reactive_contractor_name?: string | null;
  warranty_contractor_name?: string | null;
  reactive_contractor_id?: string | null;
  requiresManualContractor?: boolean;
  contractorType?: 'fire_panel_company' | 'electrician';
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
  requireTroubleshoot?: boolean; // Force troubleshooting before allowing callout
  initialCalloutType?: 'reactive' | 'warranty' | 'ppm'; // Initial callout type (for PPM tasks, etc.)
}

export default function CalloutModal({ open, onClose, asset, requireTroubleshoot = false, initialCalloutType = 'reactive' }: CalloutModalProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'active' | 'history'>('new');
  const [loading, setLoading] = useState(false);
  const [callouts, setCallouts] = useState<Callout[]>([]);
  const [selectedCallout, setSelectedCallout] = useState<Callout | null>(null);
  
  // New callout form state - use initialCalloutType prop if provided
  const [calloutType, setCalloutType] = useState<'reactive' | 'warranty' | 'ppm'>(initialCalloutType);
  
  // Update calloutType when initialCalloutType prop changes (e.g., when opening for PPM task)
  useEffect(() => {
    if (open && initialCalloutType) {
      setCalloutType(initialCalloutType);
    }
  }, [open, initialCalloutType]);
  // Priority is always urgent for callouts
  const priority = 'urgent';
  const [faultDescription, setFaultDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [troubleshootAck, setTroubleshootAck] = useState(false);
  const [troubleshootingQuestions, setTroubleshootingQuestions] = useState<string[]>([]);
  const [troubleshootingAnswersMap, setTroubleshootingAnswersMap] = useState<Map<number, 'yes' | 'no'>>(new Map());
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showCallOptions, setShowCallOptions] = useState(false);
  const [showTroubleshootModal, setShowTroubleshootModal] = useState(false);
  // Manual contractor entry (for cases where no contractor is linked or custom input)
  const [manualContractorName, setManualContractorName] = useState('');
  const [manualContractorEmail, setManualContractorEmail] = useState('');
  
  // Active callout update state
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateAttachments, setUpdateAttachments] = useState<File[]>([]);
  
  // Close callout state
  const [repairSummary, setRepairSummary] = useState('');
  const [closeDocuments, setCloseDocuments] = useState<File[]>([]);
  
  const { showToast } = useToast();
  const { profile, companyId, siteId } = useAppContext();
  
  // Contractor dropdown state
  const [contractors, setContractors] = useState<Array<{ id: string; name: string; email?: string; phone?: string }>>([]);
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);
  const [showCustomContractorInput, setShowCustomContractorInput] = useState(false);
  const [loadingContractors, setLoadingContractors] = useState(false);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

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

  // Load contractors for dropdown
  const loadContractors = async () => {
    if (!companyId) return;
    setLoadingContractors(true);
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('id, name, email, phone')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setContractors(data || []);
      
      // Pre-select contractor based on callout type and asset
      if (asset) {
        let contractorId: string | null = null;
        switch (calloutType) {
          case 'ppm':
            contractorId = asset.id ? (await getContractorIdFromAsset('ppm')) : null;
            break;
          case 'warranty':
            contractorId = asset.id ? (await getContractorIdFromAsset('warranty')) : null;
            break;
          default:
            contractorId = asset.reactive_contractor_id || (asset.id ? (await getContractorIdFromAsset('reactive')) : null);
            break;
        }
        
        if (contractorId && data?.find(c => c.id === contractorId)) {
          setSelectedContractorId(contractorId);
          setShowCustomContractorInput(false);
        } else if (!contractorId) {
          setShowCustomContractorInput(true);
        }
      }
    } catch (error) {
      console.error('Error loading contractors:', error);
    } finally {
      setLoadingContractors(false);
    }
  };

  const getContractorIdFromAsset = async (type: 'reactive' | 'warranty' | 'ppm'): Promise<string | null> => {
    if (!asset.id) return null;
    try {
      const { data } = await supabase
        .from('assets')
        .select(`${type === 'ppm' ? 'ppm_contractor_id' : type === 'warranty' ? 'warranty_contractor_id' : 'reactive_contractor_id'}`)
        .eq('id', asset.id)
        .single();
      return data?.[`${type}_contractor_id`] || null;
    } catch {
      return null;
    }
  };

  // Load callouts when modal opens
  useEffect(() => {
    if (open) {
      if (asset.id) {
        loadCallouts();
      }
      loadContractors();
      
      // Reset form fields (but preserve troubleshootAck - troubleshooting is based on asset, not callout type)
      setManualContractorName('');
      setManualContractorEmail('');
      setSelectedContractorId(null);
      setShowCustomContractorInput(false);
      setAttachments([]);
      setPhotoPreviewUrls([]);
      
      // If troubleshooting is required, open troubleshoot modal immediately
      if (requireTroubleshoot && !troubleshootAck) {
        setShowTroubleshootModal(true);
        setActiveTab('new');
      }
    } else {
      // Reset troubleshoot ack and answers when modal closes
      setTroubleshootAck(false);
      setTroubleshootingAnswersMap(new Map());
    }
  }, [open, asset.id, requireTroubleshoot, companyId]);
  
  // Separate effect for callout type changes - only reload contractors, don't reset troubleshooting
  useEffect(() => {
    if (open) {
      loadContractors();
    }
  }, [calloutType]);

  const loadCallouts = async () => {
    try {
      setLoading(true);
      
      // Try RPC function first, fallback to direct query if not available
      try {
        const { data, error } = await supabase.rpc('get_asset_callouts', {
          p_asset_id: asset.id
        });

        if (error) {
          console.error('Error loading callouts from RPC:', error);
          throw error;
        }
        const calloutsData = data || [];
        console.log('✅ Loaded callouts from RPC:', calloutsData.length, 'Total callouts');
        console.log('All callouts with statuses:', calloutsData.map((c: any) => ({ id: c.id, status: c.status })));
        console.log('Active callouts (status=open):', calloutsData.filter((c: any) => c.status === 'open').length);
        setCallouts(calloutsData);
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
            id: callout.callout_id || callout.id, // Handle both RPC and direct query formats
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
          
          console.log('✅ Loaded callouts from direct query:', transformedData.length, 'Total callouts');
          console.log('Active callouts (status=open):', transformedData.filter((c: any) => c.status === 'open').length);
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

  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // 🔒 LOCKED: Callout form validation rules - DO NOT MODIFY without updating CALLOUT_SYSTEM_LOCKED.md
  const validateCalloutForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Validate fault description (required for reactive and warranty, not PPM)
    if (calloutType !== 'ppm') {
      if (!faultDescription?.trim()) {
        errors.push('Fault Description is required');
      }
    }

    // Validate contractor selection
    if (!selectedContractorId && !showCustomContractorInput) {
      errors.push('Contractor selection is required');
    }

    if (showCustomContractorInput && !manualContractorName?.trim()) {
      errors.push('Custom contractor name is required');
    }

    // Validate troubleshooting only if required
    if (requireTroubleshoot && !troubleshootAck) {
      errors.push('Troubleshooting guide must be completed');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // 🔒 LOCKED: Main callout creation handler - DO NOT MODIFY without updating CALLOUT_SYSTEM_LOCKED.md
  // This function handles validation and triggers the complete callout creation flow
  const handleCreateCallout = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('📞 [CALLOUT] Send Callout button clicked');
    
    // Prevent double-click
    if (loading) {
      console.log('⚠️ [CALLOUT] Already processing, ignoring click');
      return;
    }
    
    // Validate form
    const validation = validateCalloutForm();
    
    if (!validation.isValid) {
      console.log('❌ [CALLOUT] Validation failed:', validation.errors);
      setValidationErrors(validation.errors);
      setShowValidationModal(true);
      return;
    }

    try {
      console.log('✅ [CALLOUT] All validations passed, creating callout and tasks');
      // Create callout and tasks directly (skip confirmation)
      await handleConfirmCreateCallout();
    } catch (error: any) {
      console.error('❌ [CALLOUT] Error in handleCreateCallout:', error);
      showToast({
        title: 'Error',
        description: error?.message || 'Failed to process callout request',
        type: 'error'
      });
    }
  };
  
  // Handle photo capture from camera
  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera on mobile
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        handlePhotoAdd(file);
      }
    };
    input.click();
  };

  // Handle photo upload
  const handlePhotoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e: any) => {
      Array.from(e.target.files || []).forEach((file: File) => {
        handlePhotoAdd(file);
      });
    };
    input.click();
  };

  // Add photo to attachments and create preview
  const handlePhotoAdd = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast({ title: 'Invalid file type', description: 'Please select an image file', type: 'error' });
      return;
    }
    
    setAttachments(prev => [...prev, file]);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreviewUrls(prev => [...prev, reader.result as string]);
    };
    reader.readAsDataURL(file);
  };

  // Remove photo
  const handlePhotoRemove = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // 🔒 LOCKED: Complete callout creation flow - DO NOT MODIFY without updating CALLOUT_SYSTEM_LOCKED.md
  // This function creates: 1) Callout record, 2) Completed task record, 3) Follow-up task
  // See CALLOUT_SYSTEM_LOCKED.md for complete flow documentation
  const handleConfirmCreateCallout = async () => {
    try {
      setLoading(true);
      
      console.log('📞 [CALLOUT] Starting callout creation process...');

      // Upload attachments/photos to Supabase storage
      let attachmentUrls: string[] = [];
      if (attachments.length > 0 && companyId) {
        console.log(`📸 [CALLOUT] Uploading ${attachments.length} photo(s)...`);
        try {
          const uploadPromises = attachments.map(async (file, index) => {
            const fileExt = file.name.split('.').pop();
            const timestamp = Date.now();
            const fileName = `callout_${timestamp}_${index}.${fileExt}`;
            const filePath = `${companyId}/callouts/${fileName}`;
            
            // Try callout_documents bucket first, fallback to sop-photos
            let bucketName = 'callout_documents';
            let { error } = await supabase.storage
              .from(bucketName)
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || 'image/jpeg'
              });
            
            if (error && (error.message?.includes('Bucket not found') || error.message?.includes('does not exist'))) {
              console.warn('callout_documents bucket not found, using sop-photos');
              bucketName = 'sop-photos';
              const fallbackResult = await supabase.storage
                .from(bucketName)
                .upload(filePath, file, {
                  cacheControl: '3600',
                  upsert: false,
                  contentType: file.type || 'image/jpeg'
                });
              error = fallbackResult.error;
            }
            
            if (error) throw error;
            
            const { data: urlData } = supabase.storage
              .from(bucketName)
              .getPublicUrl(filePath);
            
            return urlData.publicUrl;
          });
          
          attachmentUrls = await Promise.all(uploadPromises);
          console.log(`✅ [CALLOUT] Successfully uploaded ${attachmentUrls.length} photo(s)`);
        } catch (uploadError: any) {
          console.error('❌ [CALLOUT] Photo upload error:', uploadError);
          showToast({
            title: 'Photo upload failed',
            description: uploadError.message || 'Some photos may not have been uploaded',
            type: 'warning'
          });
          // Continue with callout creation even if photo upload fails
        }
      }

      // Ensure we have a user profile ID
      let userId = profile?.id
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('User not authenticated')
        }
        
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()
        
        if (!userProfile) {
          throw new Error('User profile not found')
        }
        
        userId = userProfile.id
      }

      // Handle contractor selection - determine final contractor ID
      let finalContractorId = selectedContractorId || null;
      let calloutNotes = notes || null;
      
      // If custom contractor is used, add to notes (no contractor ID)
      if (showCustomContractorInput && manualContractorName) {
        const manualContractorInfo = `Contractor: ${manualContractorName}${manualContractorEmail ? ` (${manualContractorEmail})` : ''}`;
        calloutNotes = calloutNotes 
          ? `${calloutNotes}\n\n${manualContractorInfo}`
          : manualContractorInfo;
        finalContractorId = null; // Custom contractor doesn't have an ID
      } else if (!finalContractorId && asset.id) {
        // Fallback to asset's contractor if available
        const { data: assetContractorData } = await supabase
          .from('assets')
          .select('ppm_contractor_id, reactive_contractor_id, warranty_contractor_id')
          .eq('id', asset.id)
          .single();
        if (assetContractorData) {
          finalContractorId = calloutType === 'ppm' ? assetContractorData.ppm_contractor_id :
                        calloutType === 'warranty' ? assetContractorData.warranty_contractor_id :
                        assetContractorData.reactive_contractor_id;
        }
      } else if (!finalContractorId) {
        // For placeholder assets, use contractor ID from asset prop if available
        finalContractorId = asset.reactive_contractor_id || null;
      }

      // Store asset details for task creation (needed later)
      let assetDetailsForTasks: any = null;
      
      // Try RPC function first, fallback to direct insert if not available
      let calloutCreated = false
      let newCalloutId: string | null = null
      
      // Skip RPC if no asset ID (placeholder asset)
      if (asset.id) {
        try {
          // Load asset details first (needed for RPC and task creation)
          const { data: assetDataForRPC, error: assetError } = await supabase
            .from('assets')
            .select('company_id, site_id')
            .eq('id', asset.id)
            .single();
          
          if (!assetError && assetDataForRPC) {
            assetDetailsForTasks = { company_id: assetDataForRPC.company_id, site_id: assetDataForRPC.site_id };
          }
          
          const { data, error } = await supabase.rpc('create_callout', {
            p_asset_id: asset.id,
            p_callout_type: calloutType,
            p_priority: priority,
            p_fault_description: faultDescription || null,
            p_notes: calloutNotes,
            p_attachments: attachmentUrls.length > 0 ? attachmentUrls : [],
            p_troubleshooting_complete: troubleshootAck
          });

          if (error) throw error
          if (data) newCalloutId = data
          calloutCreated = true
          console.log('✅ [CALLOUT] Callout created via RPC:', newCalloutId);
        } catch (rpcError: any) {
          console.log('⚠️ [CALLOUT] RPC function not available, using direct insert:', rpcError)
          // Fall through to direct insert
        }
      } else {
        // Placeholder asset - set asset details from context
        if (companyId && siteId) {
          assetDetailsForTasks = { company_id: companyId, site_id: siteId };
        }
      }
      
      // Fallback to direct insert (or use if no asset ID)
      if (!calloutCreated) {
        try {
          let assetData: any = null;
          let companyIdFromAsset: string | null = null;
          let siteIdFromAsset: string | null = null;
          
          if (asset.id) {
            // Load asset data if asset exists
            const { data: loadedAssetData, error: assetError } = await supabase
            .from('assets')
            .select('company_id, site_id, ppm_contractor_id, reactive_contractor_id, warranty_contractor_id')
            .eq('id', asset.id)
            .single();

          if (assetError) {
            const errorDetails = {
              message: assetError.message || 'Unknown error',
              code: assetError.code || 'UNKNOWN',
              details: assetError.details || null,
              hint: assetError.hint || null
            }
            console.error('❌ Error loading asset data:', JSON.stringify(errorDetails, null, 2))
            throw new Error(`Failed to load asset: ${assetError.message}`)
          }
            assetData = loadedAssetData;
            companyIdFromAsset = assetData.company_id;
            siteIdFromAsset = assetData.site_id;
            // Store for task creation
            assetDetailsForTasks = { company_id: companyIdFromAsset, site_id: siteIdFromAsset };
          } else {
            // Placeholder asset - get company/site from context
            companyIdFromAsset = companyId || null;
            siteIdFromAsset = siteId || null;
            assetDetailsForTasks = { company_id: companyIdFromAsset, site_id: siteIdFromAsset };
          }
          
          if (!companyIdFromAsset || !siteIdFromAsset) {
            throw new Error('Missing company or site information');
          }

          // Use finalContractorId from outer scope (set earlier)
          // If not set yet, fallback to asset's contractor for this callout
          let contractorIdForCallout = finalContractorId;
          if (!contractorIdForCallout && assetData) {
            contractorIdForCallout = calloutType === 'ppm' ? assetData.ppm_contractor_id :
                             calloutType === 'warranty' ? assetData.warranty_contractor_id :
                           assetData.reactive_contractor_id;
          }

          const calloutData: any = {
              company_id: companyIdFromAsset,
              asset_id: asset.id || null, // Allow null if no asset (placeholder asset)
              site_id: siteIdFromAsset,
              contractor_id: contractorIdForCallout, // May be null if manual entry
            created_by: userId,
              callout_type: calloutType,
              priority: 'urgent', // All callouts are urgent
            status: 'open', // Explicitly set status to 'open'
              fault_description: faultDescription || null,
              notes: calloutNotes,
            attachments: attachmentUrls.length > 0 ? attachmentUrls : [],
              troubleshooting_complete: troubleshootAck
          }

          const { data: calloutResult, error: insertError } = await supabase
            .from('callouts')
            .insert(calloutData)
            .select()
            .single();

          if (insertError) {
            const errorDetails = {
              message: insertError.message || 'Unknown error',
              code: insertError.code || 'UNKNOWN',
              details: insertError.details || null,
              hint: insertError.hint || null,
              attemptedData: calloutData
            }
            console.error('❌ Error creating callout:', JSON.stringify(errorDetails, null, 2))
            
            // If table doesn't exist, show helpful message
            if (insertError.code === 'PGRST116' || insertError.message?.includes('relation "callouts" does not exist')) {
              showToast({ 
                title: 'Callout system not set up', 
                description: 'Please run the database migration to enable callouts',
                type: 'error' 
              });
              return;
            }
            
            // Check for constraint violations
            if (insertError.code === '23514' || insertError.message?.includes('check constraint')) {
              showToast({ 
                title: 'Invalid callout data', 
                description: insertError.message || 'Please check all required fields',
                type: 'error' 
              });
              return;
          }
            
            throw insertError
          }
          
          calloutCreated = true
          newCalloutId = calloutResult?.id || null
          console.log('✅ Callout created successfully:', calloutResult?.id)
          
          // Store asset details for task creation (reuse from above)
          if (!assetDetailsForTasks && assetData) {
            assetDetailsForTasks = { company_id: assetData.company_id, site_id: assetData.site_id };
          }
        } catch (tableError: any) {
          const errorDetails = {
            message: tableError.message || 'Unknown error',
            code: tableError.code || 'UNKNOWN',
            details: tableError.details || null,
            hint: tableError.hint || null
          }
          console.error('❌ Error in callout creation fallback:', JSON.stringify(errorDetails, null, 2))
          
          if (tableError.code === 'PGRST116' || tableError.message?.includes('relation "callouts" does not exist')) {
            showToast({ 
              title: 'Callout system not set up', 
              description: 'Please run the database migration to enable callouts',
              type: 'error' 
            });
            return;
          }
          throw tableError
        }
      }

      if (!calloutCreated || !newCalloutId) {
        throw new Error('Failed to create callout')
      }

      // Get asset details for task creation
      // Use assetDetailsForTasks if already loaded, otherwise fetch
      let assetDetails = assetDetailsForTasks;
      
      if (!assetDetails && asset.id) {
        // Fetch asset details if not already loaded
        const { data, error } = await supabase
          .from('assets')
          .select('company_id, site_id')
          .eq('id', asset.id)
          .single();
        
        if (error) {
          console.error('❌ [CALLOUT] Error fetching asset details for tasks:', error);
          throw new Error(`Failed to load asset details: ${error.message}`);
        }
        assetDetails = data;
      } else if (!assetDetails && !asset.id) {
        // Placeholder asset - use context
        if (!companyId || !siteId) {
          throw new Error('Missing company or site information for task creation');
        }
        assetDetails = { company_id: companyId, site_id: siteId };
      }

      if (!assetDetails || !assetDetails.company_id || !assetDetails.site_id) {
        throw new Error('Missing asset details for task creation');
      }

      // Create tasks after callout is created
      console.log('📋 [CALLOUT] Creating tasks...');
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const expiresAt = tomorrow.toISOString(); // 24 hours from now

      // 🔒 LOCKED: Step 1 - Create Callout Report Task (Completed Task Record)
      // This creates an immutable audit trail with all troubleshooting data
      // See CALLOUT_SYSTEM_LOCKED.md for details
      
      // First, get the callout-followup-generic template ID
      const { data: calloutTemplate } = await supabase
        .from('task_templates')
        .select('id')
        .eq('slug', 'callout-followup-generic')
        .is('company_id', null)
        .single();

      const templateId = calloutTemplate?.id || null;

      const reportTaskData: any = {
        company_id: assetDetails.company_id,
        site_id: assetDetails.site_id,
        template_id: templateId, // Use the actual template ID
        due_date: today,
        due_time: new Date().toTimeString().slice(0, 5),
        daypart: 'during_service',
        assigned_to_role: 'manager',
        status: 'pending', // Will be marked completed after record creation
        priority: 'high',
        flagged: true,
        flag_reason: 'callout_report',
        generated_at: new Date().toISOString(),
        custom_name: `Callout Report: ${asset.name} - ${calloutType}`,
        custom_instructions: `Callout report created on ${new Date().toLocaleDateString()}`,
        task_data: {
          callout_id: newCalloutId,
          callout_type: calloutType,
          asset_id: asset.id,
          asset_name: asset.name,
          fault_description: faultDescription || null,
          troubleshooting_completed: troubleshootAck,
          troubleshooting_questions: troubleshootingQuestions,
          troubleshooting_answers: troubleshootingQuestions.map((_, idx) => {
            const answer = troubleshootingAnswersMap.get(idx);
            return answer || 'completed';
          }),
          troubleshooting: Object.fromEntries(
            troubleshootingQuestions.map((question, idx) => {
              const answer = troubleshootingAnswersMap.get(idx);
              return [question, answer || 'completed'];
            })
          ),
          notes: notes || null,
          photos: attachmentUrls,
          contractor_id: finalContractorId,
          contractor_name: showCustomContractorInput ? manualContractorName : (contractors.find(c => c.id === selectedContractorId)?.name || null),
          manual_contractor_email: showCustomContractorInput ? manualContractorEmail : null
        }
      };

      // Try to create task - first try with callout_id, then without if column doesn't exist
      // Note: We skip creating report tasks for now to avoid RLS issues
      // The callout record itself contains all the necessary audit information
      let finalReportTask = null;
      let reportTaskError = null;
      
      // Skip creating report task for now - callout record is sufficient audit trail
      // TODO: Re-enable if RLS policies are updated to allow callout task creation
      console.log('⚠️ [CALLOUT] Skipping report task creation - callout record provides audit trail');

      // Create completed task record if report task was created
      // Note: We skip creating a separate completion record for callout report tasks
      // because they're audit records, not regular task completions. The task itself
      // is marked as completed, and all callout data is stored in the callout record.
      if (finalReportTask) {
        console.log('✅ [CALLOUT] Report task created:', finalReportTask.id);

        // Mark the report task as completed directly
        // All callout data is already stored in the callout record, so we don't need
        // a separate completion record for callout report tasks
        const { error: updateError } = await supabase
          .from('checklist_tasks')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: userId
          })
          .eq('id', finalReportTask.id);

        if (updateError) {
          console.error('❌ [CALLOUT] Error marking report task as completed:', updateError);
        } else {
          console.log('✅ [CALLOUT] Report task marked as completed');
        }
      }

      // 🔒 LOCKED: Step 2 - Create Follow-Up Task for TODAY (24-hour window)
      // This allows user to update callout status and upload worksheet
      // See CALLOUT_SYSTEM_LOCKED.md for details
      const followupTaskData: any = {
        company_id: assetDetails.company_id,
        site_id: assetDetails.site_id,
        template_id: templateId, // Use the actual template ID
        due_date: today, // TODAY, not tomorrow
        due_time: new Date().toTimeString().slice(0, 5),
        daypart: 'during_service',
        assigned_to_role: 'manager',
        status: 'pending',
        priority: 'high',
        flagged: true,
        flag_reason: 'callout_followup',
        generated_at: new Date().toISOString(),
        expires_at: expiresAt, // 24 hours from now
        custom_name: `Callout Follow-up: ${asset.name}`,
        custom_instructions: `Follow-up task for callout created on ${new Date().toLocaleDateString()}. Update callout status and upload worksheet when complete. This task expires in 24 hours.`,
        task_data: {
          callout_id: newCalloutId,
          callout_status: 'not_yet_visited',
          asset_id: asset.id,
          asset_name: asset.name,
          requires_worksheet_upload: true,
          fault_description: faultDescription || null
        }
      };

      // Create follow-up task for PPM callouts via API route (bypasses RLS)
      if (calloutType === 'ppm' && asset.id) {
        try {
          console.log('📋 [CALLOUT] Creating PPM follow-up task via API...');
          const response = await fetch('/api/tasks/create-ppm-followup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              calloutId: newCalloutId,
              assetId: asset.id,
              assetName: asset.name,
              companyId: assetDetails.company_id,
              siteId: assetDetails.site_id,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ [CALLOUT] Failed to create PPM follow-up task:', errorData);
            // Don't throw - callout was created successfully, just log the error
          } else {
            const result = await response.json();
            console.log('✅ [CALLOUT] PPM follow-up task created:', result.taskId);
          }
        } catch (apiError: any) {
          console.error('❌ [CALLOUT] Error calling PPM follow-up API:', apiError);
          // Don't throw - callout was created successfully
        }
      } else {
        // For non-PPM callouts, skip follow-up task creation (existing behavior)
        console.log('⚠️ [CALLOUT] Skipping follow-up task creation for non-PPM callout');
      }

      showToast({ 
        title: 'Callout created successfully', 
        description: calloutType === 'ppm' 
          ? 'PPM callout created. Follow-up task has been added to Today\'s Tasks.'
          : 'Callout created successfully',
        type: 'success' 
      });

      console.log('✅ [CALLOUT] Callout creation complete, closing modal...');

      // Reset form
      setFaultDescription('');
      setNotes('');
      setTroubleshootAck(false);
      setTroubleshootingAnswersMap(new Map());
      setAttachments([]);
      setPhotoPreviewUrls([]);
      setShowTroubleshootModal(false);
      
      // Close modal
      onClose();
      
      // Reload callouts in background (in case modal is reopened)
      setTimeout(() => {
        loadCallouts();
      }, 500);
    } catch (error: any) {
      const errorDetails = {
        message: error?.message || 'Unknown error',
        code: error?.code || 'UNKNOWN',
        details: error?.details || null,
        hint: error?.hint || null,
        error: error
      }
      console.error('❌ Error creating callout:', JSON.stringify(errorDetails, null, 2))
      
      const errorMessage = error?.message || 'Failed to create callout. Please check console for details.'
      showToast({ 
        title: 'Failed to create callout', 
        description: errorMessage,
        type: 'error' 
      })
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
    // If manual contractor is provided, return it
    if (manualContractorName) {
      return manualContractorName;
    }
    
    // Check if manual contractor is required
    if (asset.requiresManualContractor) {
      return null; // Will show manual entry fields
    }
    
    switch (calloutType) {
      case 'ppm':
        return asset.ppm_contractor_name;
      case 'warranty':
        return asset.warranty_contractor_name;
      default:
        return asset.reactive_contractor_name;
    }
  };
  
  const requiresManualContractorEntry = () => {
    // Check if asset explicitly requires manual contractor
    if (asset.requiresManualContractor) {
      return true;
    }
    
    // Check if no contractor is linked for the current callout type
    let hasContractor = false;
    switch (calloutType) {
      case 'ppm':
        hasContractor = !!asset.ppm_contractor_name;
        break;
      case 'warranty':
        hasContractor = !!asset.warranty_contractor_name;
        break;
      default:
        hasContractor = !!asset.reactive_contractor_name || !!asset.reactive_contractor_id;
        break;
    }
    
    return !hasContractor && !manualContractorName;
  };



  // Fetch troubleshooting questions based on asset category
  const fetchTroubleshootingQuestions = async () => {
    console.log('Fetching troubleshooting questions for category:', asset?.category);
    if (!asset?.category) {
      console.log('No asset category found');
      return;
    }
    
    setLoadingQuestions(true);
    try {
      console.log('Querying troubleshooting_questions table...');
      const { data: questions, error } = await supabase
        .from('troubleshooting_questions')
        .select('question_text, order_index')
        .eq('category', asset.category)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      console.log('Troubleshooting questions query result:', { questions, error });

      if (error) {
        console.error('Error fetching troubleshooting questions:', error);
        setTroubleshootingQuestions([]);
        return;
      }

      if (questions && questions.length > 0) {
        console.log('Found troubleshooting questions:', questions);
        setTroubleshootingQuestions(questions.map(q => q.question_text));
      } else {
        console.log('No troubleshooting questions found for category:', asset.category);
        setTroubleshootingQuestions([]);
      }
    } catch (error) {
      console.error('Error fetching troubleshooting questions:', error);
      setTroubleshootingQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Fetch troubleshooting questions when modal opens and asset is available
  // Note: Questions are based on asset category, NOT callout type, so they don't need to be refetched when callout type changes
  useEffect(() => {
    if (open && asset?.category) {
      fetchTroubleshootingQuestions();
    }
  }, [open, asset?.category]);

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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <div className="bg-neutral-800/30 rounded-lg p-4 backdrop-blur-sm">
            {/* First row: Asset Name left, Site Name right with close button */}
            <div className="flex items-center justify-between mb-2">
              <DialogTitle className="text-xl font-semibold text-white">
                {asset.name}
              </DialogTitle>
              <div className="flex items-center gap-3">
                <div className="text-sm text-neutral-400">
                  {asset.site_name || 'N/A'}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
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
              {/* Priority Badge - All callouts are urgent */}
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-sm font-medium text-red-400">Urgent Priority</span>
                </div>
              </div>

              {/* Fault description */}
              {calloutType !== 'ppm' && (
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">
                    Fault Description <span className="text-red-400">*</span>
                    {!faultDescription.trim() && (
                      <span className="ml-2 text-xs text-yellow-400">(Required)</span>
                    )}
                  </label>
                  <textarea
                    value={faultDescription}
                    onChange={(e) => {
                      console.log('📝 [CALLOUT] Fault description changed:', e.target.value);
                      setFaultDescription(e.target.value);
                    }}
                    placeholder="Describe the fault or issue..."
                    className={`w-full h-24 px-4 py-3 bg-neutral-800/50 border rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 transition-all ${
                      !faultDescription.trim() 
                        ? 'border-yellow-500/50 focus:ring-yellow-500/50 focus:border-yellow-500/50' 
                        : 'border-neutral-700 focus:ring-magenta-500/50 focus:border-magenta-500/50'
                    }`}
                    required
                  />
                  {!faultDescription.trim() && (
                    <p className="mt-1 text-xs text-yellow-400">
                      Please enter a fault description to continue
                    </p>
                  )}
                </div>
              )}

              {/* Contractor Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white block">
                  Contractor <span className="text-red-400">*</span>
                </label>
                
                {!showCustomContractorInput ? (
                  <div className="space-y-3">
                    <select
                      value={selectedContractorId || ''}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setShowCustomContractorInput(true);
                          setSelectedContractorId(null);
                        } else {
                          setSelectedContractorId(e.target.value);
                        }
                      }}
                      className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-magenta-500/50 focus:border-magenta-500/50 transition-all"
                      disabled={loadingContractors}
                    >
                      <option value="">Select a contractor...</option>
                      {contractors.map((contractor) => (
                        <option key={contractor.id} value={contractor.id}>
                          {contractor.name}{contractor.email ? ` (${contractor.email})` : ''}
                        </option>
                      ))}
                      <option value="custom">+ Add Custom Contractor</option>
                    </select>
                    
                    {selectedContractorId && (
                      <div className="p-3 bg-neutral-800/30 border border-neutral-700 rounded-lg">
                        <p className="text-sm text-white font-medium">
                          {contractors.find(c => c.id === selectedContractorId)?.name}
                        </p>
                        {contractors.find(c => c.id === selectedContractorId)?.email && (
                          <p className="text-xs text-neutral-400 mt-1">
                            {contractors.find(c => c.id === selectedContractorId)?.email}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-yellow-400">Custom Contractor</label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomContractorInput(false);
                          setManualContractorName('');
                          setManualContractorEmail('');
                        }}
                        className="text-xs text-neutral-400 hover:text-white"
                      >
                        Use existing contractor
                      </button>
                    </div>
                    <input
                      type="text"
                      value={manualContractorName}
                      onChange={(e) => setManualContractorName(e.target.value)}
                      placeholder="Contractor name *"
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
                      required
                    />
                    <input
                      type="email"
                      value={manualContractorEmail}
                      onChange={(e) => setManualContractorEmail(e.target.value)}
                      placeholder="Contractor email (optional)"
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
                    />
                  </div>
                )}
              </div>

              {/* Troubleshooting Button */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white">Troubleshooting</label>
                  {!troubleshootAck && (
                    <span className="text-xs text-yellow-400">Required</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowTroubleshootModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white hover:bg-neutral-700/50 transition-all"
                >
                  <Wrench className="h-4 w-4" />
                  <span>{troubleshootAck ? 'Troubleshooting Complete ✓' : 'Open Troubleshooting Guide'}</span>
                </button>
              </div>
        
              {/* Photo upload with camera capture */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white block">Photos</label>
                
                {/* Photo previews */}
                {photoPreviewUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {photoPreviewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-neutral-700"
                        />
                        <button
                          type="button"
                          onClick={() => handlePhotoRemove(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Photo capture buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCameraCapture}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white hover:bg-neutral-700/50 transition-all"
                  >
                    <Camera className="h-4 w-4" />
                    <span className="text-sm">Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePhotoUpload}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white hover:bg-neutral-700/50 transition-all"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Upload Photo</span>
                  </button>
                </div>
              </div>
              
              {/* Additional Notes */}
              <div>
                <label className="text-sm font-medium text-white mb-2 block">Additional Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes..."
                  className="w-full h-20 px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-magenta-500/50 focus:border-magenta-500/50 transition-all"
                />
              </div>
        
              {/* CTA Bar */}
              <div className="flex gap-3 pt-4 border-t border-neutral-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-neutral-800/50 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700/50 transition-all rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowCallOptions(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neutral-800/50 border border-neutral-700 text-white hover:bg-neutral-700/50 transition-all rounded-lg text-sm font-medium"
                >
                  <Phone className="h-4 w-4" />
                  Call Options
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    console.log('🔴 [BUTTON CLICK] Send Callout button clicked directly');
                    e.preventDefault();
                    e.stopPropagation();
                    handleCreateCallout(e);
                  }}
                  disabled={loading || (requireTroubleshoot && !troubleshootAck)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-transparent text-magenta-400 border border-magenta-500 rounded-lg hover:shadow-lg hover:shadow-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:text-neutral-500 transition-all text-sm font-medium"
                >
                  {loading ? 'Sending...' : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Callout
                    </>
                  )}
                </button>
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
                            className="w-full h-20 px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-magenta-500/40 focus:border-magenta-500/40 scrollbar-hide"
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
                              className="w-full h-20 px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-magenta-500/40 focus:border-magenta-500/40 scrollbar-hide"
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
                              className="bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200"
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
                <span className="font-medium text-red-400">Urgent</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Contractor:</span>
                <span className="text-white">
                  {showCustomContractorInput 
                    ? `${manualContractorName}${manualContractorEmail ? ` (${manualContractorEmail})` : ''}`
                    : selectedContractorId 
                      ? contractors.find(c => c.id === selectedContractorId)?.name || 'N/A'
                      : 'Not selected'}
                </span>
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
                className="px-4 py-2 bg-transparent text-magenta-400 border border-magenta-500 rounded-lg hover:shadow-lg hover:shadow-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Sending...' : 'Send Callout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Options Modal */}
      {showCallOptions && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Choose Contact Option</h3>
              <p className="text-neutral-400 text-sm">Select how you'd like to contact the contractor</p>
            </div>
            
            <div className="space-y-3">
              {/* Call Contractor Option */}
              <button
                onClick={() => {
                  const contractorName = getContractorInfo();
                  if (confirm(`Call ${contractorName || 'Contractor'}?`)) {
                    // TODO: Implement actual phone call
                    console.log('Calling main contractor line');
                  }
                  setShowCallOptions(false);
                }}
                className="w-full flex items-center gap-3 p-4 bg-magenta-500/10 border border-magenta-500/30 text-magenta-400 rounded-lg hover:bg-magenta-500/20 transition-colors"
              >
                <div className="text-2xl">📞</div>
                <div className="text-left">
                  <div className="font-medium">Call Contractor</div>
                  <div className="text-sm text-neutral-400">{getContractorInfo() || 'Main contractor line'}</div>
                </div>
              </button>
              
              {/* Emergency Contact Option */}
              <button
                onClick={() => {
                  const contractorName = getContractorInfo();
                  if (confirm(`Call emergency contact for ${contractorName || 'Contractor'}?`)) {
                    // TODO: Implement actual phone call
                    console.log('Calling emergency contact');
                  }
                  setShowCallOptions(false);
                }}
                className="w-full flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <div className="text-2xl">🚨</div>
                <div className="text-left">
                  <div className="font-medium">Emergency Contact</div>
                  <div className="text-sm text-neutral-400">Out-of-hours emergency line</div>
                </div>
              </button>
            </div>
            
            {/* Cancel Button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowCallOptions(false)}
                className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Troubleshoot Modal */}
      {showTroubleshootModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Close modal when clicking outside (if not required or if completed)
            if (e.target === e.currentTarget) {
              if (requireTroubleshoot && !troubleshootAck) {
                showToast({ 
                  title: 'Troubleshooting Required', 
                  description: 'Please complete the troubleshooting guide before proceeding',
                  type: 'warning' 
                });
                return;
              }
              setShowTroubleshootModal(false);
            }
          }}
        >
          <div 
            className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 w-full max-w-2xl max-h-[95vh] overflow-y-auto scrollbar-hide relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-neutral-900 z-10 pb-2">
              <h3 className="text-lg font-semibold text-white">Troubleshooting Guide</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // If troubleshooting is required, don't allow closing without completion
                  if (requireTroubleshoot && !troubleshootAck) {
                    showToast({ 
                      title: 'Troubleshooting Required', 
                      description: 'Please complete the troubleshooting guide before proceeding',
                      type: 'warning' 
                    });
                    return;
                  }
                  // Close the modal
                  setShowTroubleshootModal(false);
                }}
                className="text-neutral-400 hover:text-white transition-colors p-1 hover:bg-neutral-700/50 rounded flex items-center justify-center"
                aria-label="Close troubleshooting guide"
                type="button"
              >
                <X size={20} />
              </button>
            </div>
            
            {loadingQuestions ? (
              <div className="h-[200px] flex items-center justify-center">
                <div className="text-neutral-400 text-sm">Loading troubleshooting guide...</div>
              </div>
            ) : troubleshootingQuestions.length > 0 ? (
              <div>
              <TroubleshootReel 
                items={troubleshootingQuestions}
                onComplete={(answers) => {
                  if (answers) {
                    setTroubleshootingAnswersMap(answers);
                    // Convert answers map to array format for storage
                    const answersArray = troubleshootingQuestions.map((_, idx) => {
                      const answer = answers.get(idx);
                      return answer || null;
                    });
                    console.log('✅ Troubleshooting answers captured:', answersArray);
                  }
                  setTroubleshootAck(true);
                  setShowTroubleshootModal(false);
                }}
              />
                
                {/* Prevent closing troubleshoot modal when required */}
                {requireTroubleshoot && !troubleshootAck && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm text-center">
                    Please complete the troubleshooting guide before proceeding
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center">
                <div className="text-neutral-400 text-sm text-center mb-4">
                  No troubleshooting guide available for this equipment.
                  <br />
                  <span className="text-xs text-neutral-500 mt-2 block">
                    Category: {asset?.category || 'Unknown'}
                  </span>
                </div>
                {requireTroubleshoot && (
                  <button
                    onClick={() => {
                      // If no troubleshooting guide, allow proceeding after acknowledgment
                      setTroubleshootAck(true);
                      setShowTroubleshootModal(false);
                    }}
                    className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition-colors text-sm"
                  >
                    Acknowledge - Continue to Callout
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border-2 border-yellow-500/50 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Complete All Required Fields</h3>
                <p className="text-neutral-400 text-sm">
                  Please complete the following required fields before submitting the callout:
                </p>
              </div>
              <button
                onClick={() => setShowValidationModal(false)}
                className="text-neutral-400 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {validationErrors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                >
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-white text-sm">{error}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 bg-neutral-800/50 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700/50 transition-all rounded-lg text-sm font-medium"
              >
                I'll Complete These Fields
              </button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}