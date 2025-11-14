"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Calendar, Trash2, Edit2, X, Play, Pause } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { TemperatureCheckTemplate } from '@/components/compliance/TemperatureCheckTemplate';
import { HotHoldingTemplate } from '@/components/compliance/HotHoldingTemplate';
import { FireAlarmTestTemplate } from '@/components/compliance/FireAlarmTestTemplate';
import { EmergencyLightingTemplate } from '@/components/compliance/EmergencyLightingTemplate';

export default function MyTasksPage() {
  const { profile, companyId, loading: authLoading } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, in_progress, completed
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const loadTasks = async () => {
    if (!companyId || !profile?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch tasks with explicit filtering
      const { data, error } = await supabase
        .from("checklist_tasks")
        .select("*")
        .eq("company_id", companyId)
        .eq("assigned_to_user_id", profile.id)
        .order("due_date", { ascending: true });
      
      if (error) {
        console.error('Error loading tasks:', error);
        throw error;
      }
      
      console.log(`Loaded ${data?.length || 0} task(s) for user`);
      
      // Manually fetch templates for each task
      if (data && data.length > 0) {
        const templateIds = [...new Set(data.map(t => t.template_id))];
        const { data: templates, error: templatesError } = await supabase
          .from("task_templates")
          .select("id, name, description, category, frequency")
          .in("id", templateIds);
        
        if (!templatesError && templates) {
          const templatesMap = new Map(templates.map(t => [t.id, t]));
          const tasksWithTemplates = data.map(task => ({
            ...task,
            template: templatesMap.get(task.template_id)
          }));
          setTasks(tasksWithTemplates);
        } else {
          setTasks(data || []);
        }
      } else {
        setTasks(data || []);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      const errorMsg = error?.message || JSON.stringify(error);
      console.error('Full error details:', errorMsg);
      showToast({ title: 'Error loading tasks', description: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [companyId, profile?.id]);

  // Show loading only while auth is initializing
  if (authLoading) {
    return (
      <div className="p-8">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // If no company after auth loads, show setup message
  if (!companyId) {
    return (
      <div className="p-8">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">
            Company Setup Required
          </h2>
          <p className="text-white/80 mb-4">
            Please complete your company setup before accessing this page.
          </p>
          <a 
            href="/dashboard/business" 
            className="inline-block px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200"
          >
            Go to Business Details
          </a>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { error } = await supabase
        .from("checklist_tasks")
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq("id", taskId);
      
      if (error) throw error;
      
      showToast({ 
        title: 'Task updated', 
        description: `Task marked as ${newStatus}`, 
        type: 'success' 
      });
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      showToast({ title: 'Error updating task', description: error.message, type: 'error' });
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to DELETE this task instance? This will:\n\n• Permanently delete the task\n• Delete all completion records\n• Remove it from your task list\n• This action cannot be undone!')) return;
    
    try {
      // Check for related completion records first (for logging)
      const { data: completionRecords } = await supabase
        .from("task_completion_records")
        .select("id")
        .eq("task_id", taskId);
      
      // Delete completion records first (though CASCADE should handle this, doing it explicitly for safety)
      if (completionRecords && completionRecords.length > 0) {
        const { error: completionError } = await supabase
          .from("task_completion_records")
          .delete()
          .eq("task_id", taskId);
        
        if (completionError) {
          console.error('Error deleting completion records:', completionError);
          // Continue anyway - CASCADE might handle it
        } else {
          console.log(`Deleted ${completionRecords.length} completion record(s)`);
        }
      }
      
      // Delete the task instance
      const { error, data } = await supabase
        .from("checklist_tasks")
        .delete()
        .eq("id", taskId)
        .select(); // Select to verify deletion
      
      if (error) {
        console.error('Delete error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('Task deleted successfully:', taskId);
      console.log('Deleted data:', data);
      
      showToast({ 
        title: 'Task deleted', 
        description: 'Task instance permanently deleted', 
        type: 'success' 
      });
      
      // Force reload tasks to refresh the list
      await loadTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      const errorMessage = error?.message || error?.error?.message || 'Unknown error occurred';
      showToast({ 
        title: 'Error deleting task', 
        description: errorMessage, 
        type: 'error' 
      });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      'in_progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'completed': 'bg-green-500/10 text-green-400 border-green-500/20',
      'overdue': 'bg-red-500/10 text-red-400 border-red-500/20',
      'failed': 'bg-red-500/10 text-red-400 border-red-500/20',
      'skipped': 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    };
    return colors[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      case 'skipped': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'food_safety': 'bg-green-500/10 text-green-400',
      'h_and_s': 'bg-blue-500/10 text-blue-400',
      'fire': 'bg-red-500/10 text-red-400',
      'cleaning': 'bg-purple-500/10 text-purple-400',
      'compliance': 'bg-yellow-500/10 text-yellow-400'
    };
    return colors[category] || 'bg-gray-500/10 text-gray-400';
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Tasks</h1>
        <p className="text-white/60">View and manage your assigned tasks</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { key: 'all', label: 'All Tasks', count: tasks.length },
          { key: 'pending', label: 'Pending', count: tasks.filter(t => t.status === 'pending').length },
          { key: 'in_progress', label: 'In Progress', count: tasks.filter(t => t.status === 'in_progress').length },
          { key: 'completed', label: 'Completed', count: tasks.filter(t => t.status === 'completed').length }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.12] hover:text-white'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4">
            <Clock className="w-8 h-8 text-pink-400 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Loading tasks...</h3>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4">
              <CheckCircle className="w-8 h-8 text-pink-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No tasks found</h2>
            <p className="text-white/60 max-w-md mx-auto">
              {filter === 'all' 
                ? "You don't have any tasks assigned yet. Create a template and deploy it to see tasks here."
                : `No ${filter} tasks found.`
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div key={task.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.06] transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {task.template?.name || 'Untitled Task'}
                    </h3>
                    {/* Status badge removed per user request - only show for non-pending statuses */}
                    {task.status !== 'pending' && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(task.status)}`}>
                        {getStatusIcon(task.status)}
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                    {task.template?.category && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(task.template.category)}`}>
                        {task.template.category.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-white/60 text-sm mb-3">
                    {task.template?.description || 'No description available'}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(task.due_date).toLocaleDateString()}
                    </div>
                    {task.due_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {task.due_time}
                      </div>
                    )}
                    {task.daypart && (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {task.daypart.charAt(0).toUpperCase() + task.daypart.slice(1)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-white/[0.06]">
                {/* Edit Task button - always visible */}
                {task.template_id && (
                  <button
                    onClick={async () => {
                      try {
                      // Fetch the full template details
                        const { data, error } = await supabase
                        .from("task_templates")
                        .select("*")
                        .eq("id", task.template_id)
                          .single();
                        
                        if (error) throw error;
                        
                        if (data) {
                          // Also fetch template_fields separately to help determine type
                          const { data: fields } = await supabase
                            .from('template_fields')
                            .select('field_name, field_type')
                            .eq('template_id', task.template_id);
                          
                          // Attach fields to template for detection
                          const templateWithFields = {
                            ...data,
                            template_fields: fields || []
                          };
                          
                          setEditingTemplate(templateWithFields);
                            setEditingTemplateId(data.id);
                          }
                      } catch (error: any) {
                        console.error('Error loading template:', error);
                        showToast({
                          title: 'Error',
                          description: error.message || 'Failed to load template details.',
                          type: 'error'
                        });
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-500/20 border border-pink-500/30 text-pink-400 hover:bg-pink-500/30 transition-colors text-sm"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit Task
                  </button>
                )}

                {/* Delete button - always visible for all tasks */}
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors text-sm"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Editor Modal */}
      {editingTemplate && editingTemplateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141823] border border-white/[0.1] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#141823] border-b border-white/[0.1] p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Edit Task</h2>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setEditingTemplateId(null);
                }}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {(() => {
                // Determine template type - check multiple indicators
                const templateName = (editingTemplate.name || '').toLowerCase();
                const templateSlug = (editingTemplate.slug || '').toLowerCase();
                const repeatableField = (editingTemplate.repeatable_field_name || '').toLowerCase();
                const assetType = (editingTemplate.asset_type || '').toLowerCase();
                const category = (editingTemplate.category || '').toLowerCase();
                const templateFields = (editingTemplate as any).template_fields || [];
                
                // Helper function to determine template type
                const getTemplateType = () => {
                  // FIRE ALARM - check multiple ways
                  if (repeatableField === 'fire_alarm_call_point' || repeatableField === 'fire_alarm_location') {
                    return 'fire_alarm';
                  }
                  if (templateName.includes('fire') && templateName.includes('alarm')) {
                    return 'fire_alarm';
                  }
                  if (assetType === 'fire_alarms' && category === 'h_and_s') {
                    return 'fire_alarm';
                  }
                  
                  // EMERGENCY LIGHTING
                  if (repeatableField === 'emergency_light_location') {
                    return 'emergency_lighting';
                  }
                  if (templateName.includes('emergency') && templateName.includes('light')) {
                    return 'emergency_lighting';
                  }
                  if (assetType === 'emergency_lighting') {
                    return 'emergency_lighting';
                  }
                  
                  // HOT HOLDING
                  if (repeatableField === 'hot_holding_unit') {
                    return 'hot_holding';
                  }
                  if (templateName.includes('hot') && templateName.includes('holding')) {
                    return 'hot_holding';
                  }
                  if (assetType === 'hot_holding_equipment') {
                    return 'hot_holding';
                  }
                  
                  // TEMPERATURE CHECK
                  if (repeatableField === 'fridge_name') {
                    return 'temperature';
                  }
                  if (templateName.includes('temperature') || templateName.includes('temp check')) {
                    return 'temperature';
                  }
                  
                  // Check template_fields as last resort
                  if (templateFields.length > 0) {
                    const fieldNames = templateFields.map((f: any) => f.field_name).join('|');
                    if (fieldNames.includes('fire_alarm')) return 'fire_alarm';
                    if (fieldNames.includes('emergency_light')) return 'emergency_lighting';
                    if (fieldNames.includes('hot_holding')) return 'hot_holding';
                    if (fieldNames.includes('fridge_name')) return 'temperature';
                  }
                  
                  return null;
                };
                
                const templateType = getTemplateType();
                const onSaveCallback = () => {
                        setEditingTemplate(null);
                        setEditingTemplateId(null);
                        loadTasks(); // Refresh tasks to show updated task info
                        showToast({ 
                          title: 'Task updated', 
                          description: 'Task configuration has been successfully updated.', 
                          type: 'success' 
                        });
                };
                
                // Render the appropriate template component
                if (templateType === 'fire_alarm') {
                  return <FireAlarmTestTemplate editTemplateId={editingTemplateId} onSave={onSaveCallback} />;
                } else if (templateType === 'emergency_lighting') {
                  return <EmergencyLightingTemplate editTemplateId={editingTemplateId} onSave={onSaveCallback} />;
                } else if (templateType === 'hot_holding') {
                  return <HotHoldingTemplate editTemplateId={editingTemplateId} onSave={onSaveCallback} />;
                } else if (templateType === 'temperature') {
                  return <TemperatureCheckTemplate editTemplateId={editingTemplateId} onSave={onSaveCallback} />;
                } else {
                  // Generic template - show message that editing not available for this template type
                  return (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-yellow-200 text-sm mb-2">
                        Template editing is not yet available for this template type. 
                        Please use the Templates page to edit this template.
                      </p>
                      <div className="text-xs text-yellow-300/80 bg-black/20 p-3 rounded overflow-auto max-h-60 mt-2">
                        <div><strong>Name:</strong> {editingTemplate.name || '(empty)'}</div>
                        <div><strong>Slug:</strong> {editingTemplate.slug || '(empty)'}</div>
                        <div><strong>Repeatable Field:</strong> {editingTemplate.repeatable_field_name || '(empty)'}</div>
                        <div><strong>Category:</strong> {editingTemplate.category || '(empty)'}</div>
                        <div><strong>Asset Type:</strong> {editingTemplate.asset_type || '(empty)'}</div>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
