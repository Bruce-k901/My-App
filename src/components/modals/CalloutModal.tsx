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
}

export default function CalloutModal({ open, onClose, asset, requireTroubleshoot = false }: CalloutModalProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'active' | 'history'>('new');
  const [loading, setLoading] = useState(false);
  const [callouts, setCallouts] = useState<Callout[]>([]);
  const [selectedCallout, setSelectedCallout] = useState<Callout | null>(null);
  
  // New callout form state
  const [calloutType, setCalloutType] = useState<'reactive' | 'warranty' | 'ppm'>('reactive');
  const [priority, setPriority] = useState<'low' | 'medium' | 'urgent'>('medium');
  const [faultDescription, setFaultDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [troubleshootAck, setTroubleshootAck] = useState(false);
  const [troubleshootingQuestions, setTroubleshootingQuestions] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showCallOptions, setShowCallOptions] = useState(false);
  const [showTroubleshootModal, setShowTroubleshootModal] = useState(false);
  // Manual contractor entry (for cases where no contractor is linked)
  const [manualContractorName, setManualContractorName] = useState('');
  const [manualContractorEmail, setManualContractorEmail] = useState('');
  
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
      if (asset.id) {
      loadCallouts();
      }
      
      // Reset manual contractor fields
      setManualContractorName('');
      setManualContractorEmail('');
      
      // If troubleshooting is required, open troubleshoot modal immediately
      if (requireTroubleshoot) {
        setShowTroubleshootModal(true);
        setActiveTab('new'); // Ensure we're on the new callout tab
      }
    } else {
      // Reset troubleshoot ack when modal closes
      setTroubleshootAck(false);
    }
  }, [open, asset.id, requireTroubleshoot]);

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

  const handleCreateCallout = async () => {
    // Validate required fields
    if (calloutType !== 'ppm' && !faultDescription.trim()) {
      showToast({ title: 'Fault description is required', type: 'error' });
      return;
    }

    // Validate manual contractor entry if required
    if (requiresManualContractorEntry() && !manualContractorName.trim()) {
      showToast({ 
        title: 'Contractor information required', 
        description: 'Please provide contractor name and email', 
        type: 'error' 
      });
      return;
    }

    if (!troubleshootAck) {
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

      // Handle manual contractor entry - prepare notes
      let calloutNotes = notes || null;
      if (requiresManualContractorEntry() && manualContractorName) {
        const manualContractorInfo = `Contractor: ${manualContractorName}${manualContractorEmail ? ` (${manualContractorEmail})` : ''}`;
        calloutNotes = calloutNotes 
          ? `${calloutNotes}\n\n${manualContractorInfo}`
          : manualContractorInfo;
      }

      // Try RPC function first, fallback to direct insert if not available
      let calloutCreated = false
      let newCalloutId: string | null = null
      
      // Skip RPC if no asset ID (placeholder asset)
      if (asset.id) {
      try {
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
      } catch (rpcError: any) {
        console.log('RPC function not available, using direct insert:', rpcError)
          // Fall through to direct insert
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
          } else {
            // Placeholder asset - get company/site from context
            companyIdFromAsset = ctxCompanyId;
            siteIdFromAsset = ctxSiteId;
          }
          
          if (!companyIdFromAsset || !siteIdFromAsset) {
            throw new Error('Missing company or site information');
          }

          // Handle manual contractor entry - store in notes if no contractor ID available
          let contractorId = null;
          if (assetData) {
            contractorId = calloutType === 'ppm' ? assetData.ppm_contractor_id :
                             calloutType === 'warranty' ? assetData.warranty_contractor_id :
                           assetData.reactive_contractor_id || asset.reactive_contractor_id;
          } else {
            // For placeholder assets, use contractor ID from asset if available
            contractorId = asset.reactive_contractor_id;
          }

          const calloutData: any = {
              company_id: companyIdFromAsset,
              asset_id: asset.id || null, // Allow null if no asset (placeholder asset)
              site_id: siteIdFromAsset,
              contractor_id: contractorId, // May be null if manual entry
            created_by: userId,
              callout_type: calloutType,
              priority: priority,
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

      if (!calloutCreated) {
        throw new Error('Failed to create callout')
      }

      // Create follow-up task for tomorrow if callout was created
      if (newCalloutId && asset) {
        try {
          // Get asset details for company_id and site_id
          const { data: assetDetails, error: assetError } = await supabase
            .from('assets')
            .select('company_id, site_id')
            .eq('id', asset.id)
            .single()

          if (assetError) {
            console.error('Error fetching asset details for follow-up task:', {
              message: assetError.message,
              code: assetError.code,
              details: assetError.details,
              hint: assetError.hint
            })
            // Continue without creating follow-up task, but don't exit the function
            // The callout was already created successfully
          } else if (assetDetails) {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            const tomorrowDate = tomorrow.toISOString().split('T')[0]

            // Create follow-up task (no template_id needed for callout follow-ups)
            const taskData: any = {
              company_id: assetDetails.company_id,
              site_id: assetDetails.site_id,
              due_date: tomorrowDate,
              due_time: '09:00', // Default to 9 AM
              daypart: 'during_service',
              assigned_to_role: 'manager',
              status: 'pending',
              priority: priority === 'urgent' ? 'critical' : priority === 'medium' ? 'high' : 'high',
              flagged: true,
              flag_reason: 'callout_followup',
              generated_at: new Date().toISOString(),
            }

            // Try to create follow-up task with callout_id first
            // If migration hasn't been run, fall back to creating without it
            const taskDataWithCallout: any = {
              ...taskData,
              template_id: null, // Nullable after migration
              callout_id: newCalloutId
            }

            let taskError = null
            let { error: initialError } = await supabase
              .from('checklist_tasks')
              .insert(taskDataWithCallout)

            // If error is about missing callout_id column, try without it (migration not run)
            if (initialError && (initialError.code === 'PGRST204' || initialError.message?.includes("callout_id"))) {
              console.warn('callout_id column not found - migration may not be run. Attempting to create task without callout_id...')
              
              // Check if template_id can be null (migration might be partially run)
              // Try with a dummy template_id first, then with null
              const fallbackData: any = {
                ...taskData,
                template_id: taskData.template_id || '00000000-0000-0000-0000-000000000000' // Dummy UUID if null not allowed
              }
              
              // Remove callout_id since column doesn't exist
              delete fallbackData.callout_id
              
              const { error: fallbackError } = await supabase
                .from('checklist_tasks')
                .insert(fallbackData)
              
              if (fallbackError) {
                taskError = fallbackError
                console.error('Error creating follow-up task (fallback):', {
                  message: fallbackError.message,
                  code: fallbackError.code,
                  details: fallbackError.details,
                  hint: fallbackError.hint
                })
              } else {
                console.warn('⚠️ Follow-up task created without callout_id. Please run migration: supabase/migrations/20250128000002_add_callout_followup_tasks.sql')
              }
            } else if (initialError) {
              taskError = initialError
              console.error('Error creating follow-up task:', {
                message: initialError.message,
                code: initialError.code,
                details: initialError.details,
                hint: initialError.hint,
                attemptedData: taskDataWithCallout
              })
              
              // If error is about missing column, the migration hasn't been run
              if (initialError.code === '42703' || (initialError.message?.includes('column') && initialError.message?.includes('does not exist'))) {
                console.warn('Callout follow-up task feature requires database migration. Please run: supabase/migrations/20250128000002_add_callout_followup_tasks.sql')
              }
            } else {
              // Get the created task to verify
              const { data: createdTask } = await supabase
                .from('checklist_tasks')
                .select('id, due_date, due_time, callout_id, flag_reason')
                .eq('callout_id', newCalloutId)
                .eq('due_date', tomorrowDate)
                .single()
              
              if (createdTask) {
                console.log('✅ Follow-up task created successfully:', {
                  taskId: createdTask.id,
                  dueDate: createdTask.due_date,
                  dueTime: createdTask.due_time,
                  calloutId: createdTask.callout_id,
                  flagReason: createdTask.flag_reason
                })
                
                // Show toast with task details
                showToast({
                  title: 'Follow-up task scheduled',
                  description: `Task created for ${new Date(tomorrowDate).toLocaleDateString()} at ${createdTask.due_time || '09:00'}`,
                  type: 'success'
                })
              } else {
                console.log('✅ Follow-up task created successfully')
              }
            }
            
            // Don't fail callout creation if task creation fails
          }
        } catch (taskError: any) {
          console.error('Exception creating follow-up task:', {
            message: taskError?.message || 'Unknown error',
            stack: taskError?.stack,
            error: taskError
          })
          // Don't fail callout creation if task creation fails
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
      setTroubleshootAck(false);
      setAttachments([]);
      setShowTroubleshootModal(false);
      
      // Reload callouts immediately, then again after a delay to ensure data is fresh
      await loadCallouts();
      
      // Switch to active tab
      setActiveTab('active');
      
      // Reload again after a short delay to ensure the newly created callout appears
      setTimeout(async () => {
        await loadCallouts();
        console.log('Reloaded callouts, active count:', callouts.filter(c => c.status === 'open').length);
      }, 800);
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

              {/* Fault description */}
              {calloutType !== 'ppm' && (
                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">Fault Description *</label>
                  <textarea
                    value={faultDescription}
                    onChange={(e) => setFaultDescription(e.target.value)}
                    placeholder="Describe the fault or issue..."
                    className="w-full h-24 px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-magenta-500/40 focus:border-magenta-500/40 scrollbar-hide"
                    required
                  />
            </div>
          )}

              {/* Priority Slider */}
              <div className="space-y-3">
                <label className="text-sm text-neutral-400 block text-center">Priority</label>
                <PrioritySlider />
              </div>

              {/* Manual Contractor Entry - Show when no contractor is linked */}
              {requiresManualContractorEntry() && (
                <div className="space-y-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    <h4 className="text-sm font-semibold text-yellow-400">
                      Contractor Information Required
                    </h4>
                  </div>
                  <p className="text-xs text-yellow-300/80">
                    {asset.contractorType === 'fire_panel_company' 
                      ? 'No fire panel company linked to this site. Please provide contractor details.'
                      : asset.contractorType === 'electrician'
                      ? 'No electrician linked to this site. Please provide contractor details.'
                      : 'No contractor linked. Please provide contractor details.'}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-neutral-400 mb-2 block">
                        Contractor Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualContractorName}
                        onChange={(e) => setManualContractorName(e.target.value)}
                        placeholder="Enter contractor name..."
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-magenta-500/40 focus:border-magenta-500/40"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm text-neutral-400 mb-2 block">
                        Contractor Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={manualContractorEmail}
                        onChange={(e) => setManualContractorEmail(e.target.value)}
                        placeholder="Enter contractor email..."
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-magenta-500/40 focus:border-magenta-500/40"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Troubleshooting Button */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-white text-center">Troubleshooting Checklist</h4>
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowTroubleshootModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-magenta-500/10 border border-magenta-500/30 text-magenta-400 rounded-lg hover:bg-magenta-500/20 transition-colors text-sm"
                    title="Open Troubleshooting Guide"
                  >
                    🔧 Troubleshoot
                  </button>
                </div>
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
        
              {/* Contact button with custom modal */}

              {/* CTA Bar */}
              <div className="flex justify-between items-center mt-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowCallOptions(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-magenta-500/10 border border-magenta-500/30 text-magenta-400 rounded-lg hover:bg-magenta-500/20 transition-colors text-sm"
                    title="Call Options"
                  >
                    📞 Call Options
                  </button>
                  <button
                    onClick={handleCreateCallout}
                    disabled={loading || !troubleshootAck}
                    className="flex items-center gap-2 px-4 py-2 bg-magenta-500/10 border border-magenta-500/30 text-magenta-400 rounded-lg hover:bg-magenta-500/20 transition-colors text-sm disabled:cursor-not-allowed"
                    title="Send Call-Out"
                  >
                    <img src="/logo/send_icon.png" alt="Send" className="w-4 h-4 brightness-150" />
                    Send
                  </button>
                </div>
                <button
            onClick={onClose}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-800/50 border border-neutral-600 text-neutral-400 hover:text-white hover:bg-neutral-700/50 transition-colors rounded-lg text-sm"
                  title="Close"
          >
            Close
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
                <span className="text-white">
                  {manualContractorName || getContractorInfo() || 'N/A'}
                  {manualContractorEmail && ` (${manualContractorEmail})`}
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
                className="px-4 py-2 bg-magenta-500 hover:bg-magenta-600 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : 'Confirm & Send'}
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
                onComplete={() => {
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
    </Dialog>
  );
}