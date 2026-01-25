"use client";

import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Users, Phone, FileText, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import ParticipantSelector from './ParticipantSelector';
import TemplateSelector from './TemplateSelector';
import DateTimePicker from './DateTimePicker';
import TaskForm from './TaskForm';
import MeetingForm from './MeetingForm';
import CallForm from './CallForm';
import NoteForm from './NoteForm';
import { generateSmartTitle } from './generateTitle';

export type TaskType = 'task' | 'meeting' | 'call' | 'note';

export interface ModalContext {
  source: 'calendar' | 'message' | 'manual';
  messageId?: string;
  messageContent?: string;
  channelId?: string;
  preSelectedDate?: Date;
  preSelectedParticipants?: string[];
  taskId?: string;
  existingTask?: any;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: ModalContext;
  onTaskCreated?: (task: any) => void;
}

interface BaseFormData {
  title: string;
  description: string;
  siteId: string;
  dueDate: Date | null;
  dueTime: string;
  timezone: string;
}

interface TaskFormData extends BaseFormData {
  type: 'task';
  assignedTo: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'blocked';
  relatedEntityId?: string;
}

interface MeetingFormData extends BaseFormData {
  type: 'meeting';
  meetingType: '1-2-1' | 'team_meeting' | 'client_call' | 'other';
  participants: string[];
  duration: '15' | '30' | '60' | 'custom';
  customDuration?: number;
  location: 'office' | 'virtual' | 'custom';
  customLocation?: string;
  meetingLink?: string;
  sendInvites: boolean;
  templateId?: string;
}

interface CallFormData extends BaseFormData {
  type: 'call';
  participants: string[];
  duration: '15' | '30' | '60' | 'custom';
  customDuration?: number;
  location: 'office' | 'virtual' | 'custom';
  customLocation?: string;
  meetingLink?: string;
}

interface NoteFormData extends BaseFormData {
  type: 'note';
}

type FormData = TaskFormData | MeetingFormData | CallFormData | NoteFormData;

export default function CreateTaskModal({
  isOpen,
  onClose,
  context,
  onTaskCreated
}: CreateTaskModalProps) {
  const { companyId, userId, userProfile } = useAppContext();
  const [activeType, setActiveType] = useState<TaskType>('task');
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Array<{ id: string; name: string | null }>>([]);
  const [participantNames, setParticipantNames] = useState<string[]>([]);
  const [templateName, setTemplateName] = useState<string | undefined>();
  const [autoTitleEnabled, setAutoTitleEnabled] = useState(true);
  const [userProfileName, setUserProfileName] = useState<string>('');
  const [existingTask, setExistingTask] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Initialize form data based on context
  const getInitialFormData = (existingTask?: any): Partial<FormData> => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // If editing an existing task, use its data
    if (existingTask) {
      const taskType = existingTask.metadata?.task_type || 'task';
      const taskDate = existingTask.due_date ? new Date(existingTask.due_date) : new Date();
      const taskTime = existingTask.due_time || '';
      
      const base: Partial<BaseFormData> = {
        title: existingTask.title || '',
        description: existingTask.description || '',
        siteId: existingTask.site_id || '',
        dueDate: taskDate,
        dueTime: taskTime,
        timezone: existingTask.metadata?.timezone || userTimezone,
      };

      switch (taskType) {
        case 'task':
          // Extract assignedTo - could be in assigned_to column or metadata.assigned_to array
          let assignedTo: string[] = [];
          if (existingTask.assigned_to) {
            assignedTo = Array.isArray(existingTask.assigned_to) ? existingTask.assigned_to : [existingTask.assigned_to];
          } else if (existingTask.metadata?.assigned_to) {
            assignedTo = Array.isArray(existingTask.metadata.assigned_to) ? existingTask.metadata.assigned_to : [existingTask.metadata.assigned_to];
          }
          
          return {
            ...base,
            type: 'task' as const,
            assignedTo,
            priority: existingTask.priority || 'medium',
            status: existingTask.status || 'todo',
          };
        case 'meeting':
          // Extract participants - could be in metadata.participants array or assigned_to
          let meetingParticipants: string[] = [];
          if (existingTask.metadata?.participants) {
            meetingParticipants = Array.isArray(existingTask.metadata.participants) 
              ? existingTask.metadata.participants 
              : [existingTask.metadata.participants];
          } else if (existingTask.assigned_to) {
            meetingParticipants = Array.isArray(existingTask.assigned_to) 
              ? existingTask.assigned_to 
              : [existingTask.assigned_to];
          }
          
          // Determine duration
          const durationMinutes = existingTask.metadata?.duration_minutes;
          let duration: '15' | '30' | '60' | 'custom' = '30';
          let customDuration: number | undefined = undefined;
          if (durationMinutes) {
            if (durationMinutes === 15) duration = '15';
            else if (durationMinutes === 30) duration = '30';
            else if (durationMinutes === 60) duration = '60';
            else {
              duration = 'custom';
              customDuration = durationMinutes;
            }
          }
          
          return {
            ...base,
            type: 'meeting' as const,
            meetingType: existingTask.metadata?.meeting_type || '1-2-1',
            participants: meetingParticipants,
            duration,
            customDuration,
            location: existingTask.metadata?.location || 'virtual',
            customLocation: existingTask.metadata?.location === 'custom' ? existingTask.metadata.custom_location : undefined,
            meetingLink: existingTask.metadata?.meeting_link,
            sendInvites: true,
            templateId: existingTask.metadata?.template_id,
          };
        case 'call':
          // Extract participants - could be in metadata.participants array or assigned_to
          let callParticipants: string[] = [];
          if (existingTask.metadata?.participants) {
            callParticipants = Array.isArray(existingTask.metadata.participants) 
              ? existingTask.metadata.participants 
              : [existingTask.metadata.participants];
          } else if (existingTask.assigned_to) {
            callParticipants = Array.isArray(existingTask.assigned_to) 
              ? existingTask.assigned_to 
              : [existingTask.assigned_to];
          }
          
          // Determine duration
          const callDurationMinutes = existingTask.metadata?.duration_minutes;
          let callDuration: '15' | '30' | '60' | 'custom' = '15';
          let callCustomDuration: number | undefined = undefined;
          if (callDurationMinutes) {
            if (callDurationMinutes === 15) callDuration = '15';
            else if (callDurationMinutes === 30) callDuration = '30';
            else if (callDurationMinutes === 60) callDuration = '60';
            else {
              callDuration = 'custom';
              callCustomDuration = callDurationMinutes;
            }
          }
          
          return {
            ...base,
            type: 'call' as const,
            participants: callParticipants,
            duration: callDuration,
            customDuration: callCustomDuration,
            location: existingTask.metadata?.location || 'virtual',
            customLocation: existingTask.metadata?.location === 'custom' ? existingTask.metadata.custom_location : undefined,
            meetingLink: existingTask.metadata?.meeting_link,
          };
        case 'note':
          return {
            ...base,
            type: 'note' as const,
          };
        default:
          return {
            ...base,
            type: 'task' as const,
            assignedTo: [],
            priority: 'medium',
            status: 'todo',
          };
      }
    }
    
    // Otherwise, create new task
    const preSelectedDate = context?.preSelectedDate || new Date();
    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const base: Partial<BaseFormData> = {
      title: context?.messageContent 
        ? `Follow up: ${context.messageContent.substring(0, 50)}${context.messageContent.length > 50 ? '...' : ''}`
        : '',
      description: context?.messageContent || '',
      siteId: '',
      dueDate: preSelectedDate,
      dueTime: defaultTime,
      timezone: userTimezone,
    };

    switch (activeType) {
      case 'task':
        return {
          ...base,
          type: 'task' as const,
          assignedTo: context?.preSelectedParticipants || [],
          priority: 'medium' as const,
          status: 'todo' as const,
        };
      case 'meeting':
        return {
          ...base,
          type: 'meeting' as const,
          meetingType: '1-2-1' as const,
          participants: context?.preSelectedParticipants || [],
          duration: '30' as const,
          location: 'virtual' as const,
          sendInvites: true,
        };
      case 'call':
        return {
          ...base,
          type: 'call' as const,
          participants: context?.preSelectedParticipants || [],
          duration: '15' as const,
          location: 'virtual' as const,
        };
      case 'note':
        return {
          ...base,
          type: 'note' as const,
        };
    }
  };

  const [formData, setFormData] = useState<Partial<FormData>>(getInitialFormData());

  // Load existing task when editing
  useEffect(() => {
    const loadExistingTask = async () => {
      if (!isOpen) {
        setExistingTask(null);
        setIsEditing(false);
        return;
      }
      
      if (!context?.taskId && !context?.existingTask) {
        setExistingTask(null);
        setIsEditing(false);
        // Reset to new task mode
        const initial = getInitialFormData();
        setFormData(initial);
        setParticipantNames([]);
        setTemplateName(undefined);
        setAutoTitleEnabled(true);
        return;
      }

      try {
        // Use provided existingTask or fetch it
        let task = context.existingTask;
        
        // If we have taskId but no existingTask, fetch it
        if (context.taskId && !task) {
          const { data: fetchedTask, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', context.taskId)
            .single();
          
          if (error) throw error;
          task = fetchedTask;
        }
        
        if (!task) {
          setExistingTask(null);
          setIsEditing(false);
          return;
        }
        
        setExistingTask(task);
        setIsEditing(true);
        
        // Set the active type based on task metadata
        const taskType = task.metadata?.task_type || 'task';
        setActiveType(taskType as TaskType);
        
        // Load form data from existing task
        const initialData = getInitialFormData(task);
        setFormData(initialData);
        
        // Load participant names if it's a meeting or call
        if ((taskType === 'meeting' || taskType === 'call') && task.metadata?.participants) {
          const participantIds = task.metadata.participants;
          if (participantIds && participantIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .in('id', participantIds);
            
            if (profiles) {
              setParticipantNames(profiles.map(p => p.full_name || p.email?.split('@')[0] || ''));
            }
          }
        }
        
        // Load template name if it's a meeting with a template
        if (taskType === 'meeting' && task.metadata?.template_id) {
          // Try to get template name from review_templates or task_templates
          const { data: template } = await supabase
            .from('review_templates')
            .select('name')
            .eq('id', task.metadata.template_id)
            .single();
          
          if (template) {
            setTemplateName(template.name);
          }
        }
        
        setAutoTitleEnabled(false); // Disable auto-generation when editing
      } catch (error) {
        console.error('Error loading existing task:', error);
        toast.error('Failed to load task data');
        setExistingTask(null);
        setIsEditing(false);
      }
    };

    loadExistingTask();
  }, [isOpen, context?.taskId, context?.existingTask, companyId]);

  // Reset form when type changes or modal opens (only if not editing)
  useEffect(() => {
    if (isOpen && !isEditing) {
      const initial = getInitialFormData();
      setFormData(initial);
      setParticipantNames([]);
      setTemplateName(undefined);
      setAutoTitleEnabled(true);
    }
  }, [isOpen, activeType, isEditing]);

  // Load current user's name for title generation
  useEffect(() => {
    const fetchUserName = async () => {
      if (!userId) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId)
          .single();
        
        if (data) {
          setUserProfileName(data.full_name || data.email?.split('@')[0] || '');
        }
      } catch (error) {
        // Silently fail - we'll just not include user name in titles
      }
    };
    
    if (isOpen && userId) {
      fetchUserName();
    }
  }, [isOpen, userId]);

  // Load current user's name for title generation
  useEffect(() => {
    const fetchUserName = async () => {
      if (!userId) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId)
          .single();
        
        if (data) {
          setUserProfileName(data.full_name || data.email?.split('@')[0] || '');
        }
      } catch (error) {
        // Silently fail - we'll just not include user name in titles
      }
    };
    
    if (isOpen && userId) {
      fetchUserName();
    }
  }, [isOpen, userId]);

  // Auto-generate title when form data changes (for meetings/calls)
  useEffect(() => {
    if (!autoTitleEnabled || !isOpen) return;
    
    let generatedTitle = '';
    
    if (activeType === 'meeting' && 'meetingType' in formData) {
      const meetingData = formData as Partial<MeetingFormData>;
      
      generatedTitle = generateSmartTitle({
        type: 'meeting',
        meetingType: meetingData.meetingType,
        templateName,
        participantNames,
        currentUserName: userProfileName,
        dueDate: meetingData.dueDate || null,
        dueTime: meetingData.dueTime,
      });
    } else if (activeType === 'call' && 'participants' in formData) {
      const callData = formData as Partial<CallFormData>;
      generatedTitle = generateSmartTitle({
        type: 'call',
        participantNames,
        currentUserName: userProfileName,
        dueDate: callData.dueDate || null,
        dueTime: callData.dueTime,
      });
    }

    // Only update if title is different (prevents infinite loops)
    if (generatedTitle && generatedTitle !== formData.title) {
      setFormData(prev => ({ ...prev, title: generatedTitle }));
    }
  }, [
    activeType,
    formData.meetingType,
    formData.participants,
    formData.dueDate,
    formData.dueTime,
    participantNames,
    templateName,
    userProfileName,
    autoTitleEnabled,
    isOpen,
    sites,
    // Don't include formData.title in deps to prevent loops
     
  ]);

  // Load sites
  useEffect(() => {
    const fetchSites = async () => {
      if (!companyId) return;
      
      try {
        const { data, error } = await supabase
          .from('sites')
          .select('id, name')
          .eq('company_id', companyId)
          .order('name');
        
        if (error) throw error;
        setSites(data || []);
        
        // Set default site if none selected
        if (data && data.length > 0 && !formData.siteId) {
          setFormData(prev => ({ ...prev, siteId: data[0].id }));
        }
      } catch (error) {
        console.error('Error fetching sites:', error);
      }
    };
    
    if (isOpen) {
      fetchSites();
    }
  }, [companyId, isOpen]);

  const handleCreate = async () => {
    if (!formData.title?.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!formData.siteId) {
      toast.error('Please select a site');
      return;
    }

    if (!companyId || !userId) {
      toast.error('Company ID or User ID is required');
      return;
    }

    setLoading(true);
    try {
      const userTimezone = formData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Combine date and time into UTC datetime
      let scheduledAtUtc: Date | null = null;
      if (formData.dueDate && formData.dueTime) {
        const [hours, minutes] = formData.dueTime.split(':').map(Number);
        const localDateTime = new Date(formData.dueDate);
        localDateTime.setHours(hours, minutes, 0, 0);
        scheduledAtUtc = fromZonedTime(localDateTime, userTimezone);
      }

      // Base task insert
      const taskInsert: any = {
        title: formData.title,
        description: formData.description || '',
        company_id: companyId,
        site_id: formData.siteId,
        created_by: userId,
        due_date: formData.dueDate ? format(formData.dueDate, 'yyyy-MM-dd') : null,
        due_time: formData.dueTime || null,
        status: formData.type === 'task' && 'status' in formData ? formData.status : 'todo',
        priority: formData.type === 'task' && 'priority' in formData ? formData.priority : null,
        metadata: {
          task_type: formData.type,
          timezone: userTimezone,
          scheduled_at_utc: scheduledAtUtc?.toISOString(),
          source: context?.source || 'manual',
          source_message_id: context?.messageId,
        },
      };

      // Add type-specific fields
      if (formData.type === 'meeting' && 'meetingType' in formData) {
        const meetingData = formData as MeetingFormData;
        const durationMinutes = meetingData.duration === 'custom' 
          ? meetingData.customDuration 
          : parseInt(meetingData.duration);
        
        taskInsert.metadata = {
          ...taskInsert.metadata,
          meeting_type: meetingData.meetingType,
          duration_minutes: durationMinutes,
          location: meetingData.location === 'custom' ? meetingData.customLocation : meetingData.location,
          meeting_link: meetingData.meetingLink,
          template_id: meetingData.templateId,
        };
      } else if (formData.type === 'call' && 'duration' in formData) {
        const callData = formData as CallFormData;
        const durationMinutes = callData.duration === 'custom' 
          ? callData.customDuration 
          : parseInt(callData.duration);
        
        taskInsert.metadata = {
          ...taskInsert.metadata,
          duration_minutes: durationMinutes,
          location: callData.location === 'custom' ? callData.customLocation : callData.location,
          meeting_link: callData.meetingLink,
        };
      }

      // Create or update task
      let task;
      if (isEditing && existingTask?.id) {
        // Update existing task - merge metadata to preserve existing fields
        const updatedMetadata = {
          ...existingTask.metadata,
          ...taskInsert.metadata,
        };
        
        // Handle participants/assignedTo for updates
        if ((formData.type === 'meeting' || formData.type === 'call') && 'participants' in formData) {
          const participantIds = (formData as MeetingFormData | CallFormData).participants;
          updatedMetadata.participants = participantIds || [];
        } else if (formData.type === 'task' && 'assignedTo' in formData) {
          const assignedTo = (formData as TaskFormData).assignedTo;
          updatedMetadata.assigned_to = assignedTo || [];
        }
        
        const updateData: any = {
          title: taskInsert.title,
          description: taskInsert.description,
          site_id: taskInsert.site_id,
          due_date: taskInsert.due_date,
          due_time: taskInsert.due_time,
          status: taskInsert.status,
          priority: taskInsert.priority,
          metadata: updatedMetadata,
        };
        
        // Handle single assignment for assigned_to column
        if (formData.type === 'task' && 'assignedTo' in formData) {
          const assignedTo = (formData as TaskFormData).assignedTo;
          if (assignedTo && assignedTo.length === 1) {
            updateData.assigned_to = assignedTo[0];
          } else if (assignedTo && assignedTo.length > 1) {
            updateData.assigned_to = assignedTo[0]; // Use first for column
          } else {
            updateData.assigned_to = null;
          }
        } else if ((formData.type === 'meeting' || formData.type === 'call') && 'participants' in formData) {
          const participantIds = (formData as MeetingFormData | CallFormData).participants;
          if (participantIds && participantIds.length === 1) {
            updateData.assigned_to = participantIds[0];
          } else {
            updateData.assigned_to = existingTask.assigned_to || null;
          }
        }
        
        const { data: updatedTask, error: updateError } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', existingTask.id)
          .select()
          .single();

        if (updateError) throw updateError;
        task = updatedTask;
      } else {
        // Create new task
        const { data: newTask, error: taskError } = await supabase
          .from('tasks')
          .insert(taskInsert)
          .select()
          .single();

        if (taskError) throw taskError;
        task = newTask;
      }

      // Add participants for meetings/calls (only for new tasks)
      if (!isEditing && (formData.type === 'meeting' || formData.type === 'call') && 'participants' in formData) {
        const participantIds = (formData as MeetingFormData | CallFormData).participants;
        if (participantIds && participantIds.length > 0) {
          // Note: If meeting_participants table exists, use it. Otherwise, store in metadata.
          // For now, we'll use the existing assigned_to column for compatibility
          if (participantIds.length === 1) {
            await supabase
              .from('tasks')
              .update({ assigned_to: participantIds[0] })
              .eq('id', task.id);
          }
          // Store all participants in metadata for future use
          await supabase
            .from('tasks')
            .update({
              metadata: {
                ...task.metadata,
                participants: participantIds,
              }
            })
            .eq('id', task.id);
        }
      }

      // Add task assignments for tasks (only for new tasks)
      if (!isEditing && formData.type === 'task' && 'assignedTo' in formData) {
        const assignedTo = (formData as TaskFormData).assignedTo;
        if (assignedTo && assignedTo.length > 0) {
          // Use assigned_to for single assignment, metadata for multiple
          if (assignedTo.length === 1) {
            await supabase
              .from('tasks')
              .update({ assigned_to: assignedTo[0] })
              .eq('id', task.id);
          }
          await supabase
            .from('tasks')
            .update({
              metadata: {
                ...task.metadata,
                assigned_to: assignedTo,
              }
            })
            .eq('id', task.id);
        }
      }

      // Update message if created from message
      if (context?.source === 'message' && context.messageId) {
        await supabase
          .from('messaging_messages')
          .update({
            metadata: {
              action_suggested: true,
              action_type: 'task',
              action_entity_id: task.id,
            }
          })
          .eq('id', context.messageId);
      }

      toast.success(`${formData.type === 'task' ? 'Task' : formData.type === 'meeting' ? 'Meeting' : formData.type === 'call' ? 'Call' : 'Note'} created successfully!`);
      onTaskCreated?.(task);
      onClose();
    } catch (error: any) {
      console.error('Error creating item:', error);
      toast.error(error?.message || `Failed to create ${activeType}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const canSubmit = formData.title?.trim() && formData.siteId;

  return (
    <div
      className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0B0D13] border border-gray-200 dark:border-white/[0.06] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/[0.06] flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit' : 'Create'} {activeType.charAt(0).toUpperCase() + activeType.slice(1)}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05] text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Tabs - Enhanced Visibility */}
        <div className="flex gap-2 p-4 border-b border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-gradient-to-r dark:from-white/[0.03] dark:to-white/[0.01] flex-shrink-0">
          {(['task', 'meeting', 'call', 'note'] as TaskType[]).map((type) => {
            const icons = {
              task: CheckSquare,
              meeting: Users,
              call: Phone,
              note: FileText,
            };
            const Icon = icons[type];
            const isActive = activeType === type;
            
            return (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`flex-1 px-6 py-3 rounded-xl text-base font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#EC4899] text-white shadow-[0_0_20px_rgba(236,72,153,0.5)] transform scale-105'
                    : 'text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white/80 hover:bg-gray-100 dark:hover:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-center gap-2.5">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600 dark:text-white/60'}`} />
                  <span className="capitalize">{type === '1-2-1' ? '1-2-1' : type === 'task' ? 'Task' : type === 'meeting' ? 'Meeting' : type === 'call' ? 'Call' : 'Note'}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeType === 'task' && (
            <TaskForm
              formData={formData as Partial<TaskFormData>}
              setFormData={setFormData}
              sites={sites}
            />
          )}
          {activeType === 'meeting' && (
            <MeetingForm
              formData={formData as Partial<MeetingFormData>}
              setFormData={(newData) => {
                // Handle function updates (prev => new)
                if (typeof newData === 'function') {
                  setFormData(newData);
                  return;
                }
                
                // Check if this is a title-only update (manual edit from input field)
                const typedData = newData as any;
                if (typedData && 'title' in typedData && Object.keys(typedData).length === 1) {
                  // This is likely a manual title edit - disable auto-generation
                  setAutoTitleEnabled(false);
                }
                
                setFormData(typedData);
              }}
              sites={sites}
              companyId={companyId || ''}
              onTemplateChange={(templateId, name) => {
                setTemplateName(name);
                setFormData(prev => ({ ...prev, templateId }));
              }}
              onParticipantsChange={(participants, names) => {
                setParticipantNames(names || []);
                setFormData(prev => ({ ...prev, participants }));
              }}
            />
          )}
          {activeType === 'call' && (
            <CallForm
              formData={formData as Partial<CallFormData>}
              setFormData={setFormData}
              sites={sites}
              onParticipantsChange={(participants, names) => {
                setParticipantNames(names || []);
                setFormData(prev => ({ ...prev, participants }));
              }}
            />
          )}
          {activeType === 'note' && (
            <NoteForm
              formData={formData as Partial<NoteFormData>}
              setFormData={setFormData}
              sites={sites}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-white/[0.06] flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] text-gray-700 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-white/[0.05] transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !canSubmit}
            className="flex-1 px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] rounded-lg hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading 
              ? (isEditing ? 'Updating...' : 'Creating...') 
              : (isEditing 
                  ? `Update ${activeType.charAt(0).toUpperCase() + activeType.slice(1)}` 
                  : `Create ${activeType.charAt(0).toUpperCase() + activeType.slice(1)}`
                )
            }
          </button>
        </div>
      </div>
    </div>
  );
}
