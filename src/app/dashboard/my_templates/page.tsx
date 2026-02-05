"use client";

import { useState, useEffect } from 'react';
import { Plus, Clock, FileText, Calendar, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { MasterTemplateModal } from '@/components/templates/MasterTemplateModal';
import { TaskFromTemplateModal } from '@/components/templates/TaskFromTemplateModal';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';

interface TaskTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  frequency: string;
  dayparts: string[] | null;
  is_active: boolean;
  created_at: string;
  usage_count?: number;
}

export default function TemplatesPage() {
  const { companyId } = useAppContext();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      fetchTemplates();
    }
  }, [companyId]);

  async function fetchTemplates() {
    if (!companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch user-created templates (is_template_library = false)
      // Note: We don't filter by is_active because custom templates are saved with is_active=false
      // to prevent the old cron from auto-creating tasks. The is_active flag is not relevant for display.
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_template_library', false) // Only show user-created templates, not library templates
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching templates:', error);
        setTemplates([]);
      } else {
        // Fetch usage counts for each template
        const templateIds = (data || []).map(t => t.id);
        const usageCounts = new Map<string, number>();
        
        if (templateIds.length > 0) {
          const { data: usageData } = await supabase
            .from('checklist_tasks')
            .select('template_id')
            .in('template_id', templateIds);
          
          if (usageData) {
            usageData.forEach(task => {
              if (task.template_id) {
                usageCounts.set(task.template_id, (usageCounts.get(task.template_id) || 0) + 1);
              }
            });
          }
        }
        
        // Combine templates with usage counts
        const templatesWithUsage = (data || []).map(t => ({
          ...t,
          usage_count: usageCounts.get(t.id) || 0
        }));
        
        setTemplates(templatesWithUsage);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  const handleTemplateSaved = (result?: any) => {
    setIsBuilderOpen(false);
    setEditingTemplate(null);
    
    // If a new template was created and should create a task instance, open TaskFromTemplateModal
    if (result?.shouldCreateTask && result?.savedTemplate) {
      // Refresh templates first to ensure the new template is in the list
      fetchTemplates().then(() => {
        // Small delay to ensure state is updated
        setTimeout(() => {
          setSelectedTemplateId(result.savedTemplate.id);
        }, 100);
      });
    } else {
      // Just refresh the list for updates
      fetchTemplates();
    }
  };

  const handleTaskCreated = () => {
    setSelectedTemplateId(null); // Close modal
  };

  const handleUseTemplate = (templateId: string, e?: React.MouseEvent) => {
    // Prevent triggering when clicking Edit button
    if (e && (e.target as HTMLElement).closest('button')) {
      return;
    }
    setSelectedTemplateId(templateId);
  };

  const handleEditTemplate = async (template: TaskTemplate, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    // Fetch full template data including evidence_types
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('id', template.id)
        .single();
      
      if (error) {
        console.error('Error fetching template:', error);
        return;
      }
      
      setEditingTemplate(data);
    } catch (error) {
      console.error('Failed to fetch template:', error);
    }
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setIsBuilderOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    setDeletingTemplateId(templateId);
    
    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('task_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) {
        toast.error('Failed to delete template: ' + error.message);
        return;
      }

      toast.success('Template deleted successfully');
      // Refresh templates list
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly',
      'triggered': 'On Demand',
      'once': 'Once'
    };
    return labels[frequency] || frequency;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'food_safety': 'bg-green-500/10 text-green-400 border-green-500/20',
      'h_and_s': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'fire': 'bg-red-500/10 text-red-400 border-red-500/20',
      'cleaning': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'compliance': 'bg-pink-500/10 text-pink-400 border-pink-500/20'
    };
    return colors[category] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  return (
    <div className="bg-[#0f1220] text-white border border-neutral-800 rounded-xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">My Task Templates</h1>
          <p className="text-white/60 text-sm sm:text-base">Custom task templates you've created</p>
        </div>
        <button
          onClick={handleNewTemplate}
          className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-pink-500 text-pink-500 bg-transparent hover:bg-white/[0.04] transition-all duration-150"
          aria-label="Add Template"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="mt-8 text-center">
          <p className="text-white/60">Loading templates...</p>
        </div>
      )}

      {/* Templates Grid */}
      {!loading && templates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={(e) => handleUseTemplate(template.id, e)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5 hover:bg-white/[0.06] transition-colors cursor-pointer relative"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-white pr-2">{template.name}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleEditTemplate(template, e)}
                    className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    title="Edit Template"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteTemplate(template.id, e)}
                    disabled={deletingTemplateId === template.id}
                    className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Delete Template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {template.description && (
                <p className="text-white/60 text-sm mb-3 line-clamp-2">{template.description}</p>
              )}

              {/* Usage Count Tag */}
              <div className="mb-3">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Used {template.usage_count || 0} {template.usage_count === 1 ? 'time' : 'times'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-white/50">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{getFrequencyLabel(template.frequency)}</span>
                </div>
                {template.dayparts && template.dayparts.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{template.dayparts.length} daypart{template.dayparts.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && templates.length === 0 && (
        <div className="mt-8 text-center py-12">
          <FileText className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-2">No templates yet</p>
          <p className="text-white/40 text-sm">Create your first template to get started</p>
        </div>
      )}

      {/* Master Template Modal */}
      <MasterTemplateModal 
        isOpen={isBuilderOpen || editingTemplate !== null}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleTemplateSaved}
        editingTemplate={editingTemplate || undefined}
      />

      {/* Task Creation Modal */}
      {selectedTemplateId && (
        <TaskFromTemplateModal
          isOpen={true}
          onClose={() => setSelectedTemplateId(null)}
          onSave={handleTaskCreated}
          templateId={selectedTemplateId}
          template={templates.find(t => t.id === selectedTemplateId)}
        />
      )}
    </div>
  );
}
