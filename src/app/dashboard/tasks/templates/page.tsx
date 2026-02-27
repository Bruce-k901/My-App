"use client";

import { useState, useEffect, useCallback } from 'react';
import { Plus, Clock, FileText, Edit2, Trash2, ChevronDown, ChevronRight, Search } from '@/components/ui/icons';
import { toast } from 'sonner';
import { MasterTemplateModal } from '@/components/templates/MasterTemplateModal';
import { TaskFromTemplateModal } from '@/components/templates/TaskFromTemplateModal';
import { TemplatePreviewPanel } from '@/components/templates/TemplatePreviewPanel';
import { QuickScheduleModal } from '@/components/templates/QuickScheduleModal';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import BackToSetup from "@/components/dashboard/BackToSetup";

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
  tags: string[] | null;
  evidence_types?: string[] | null;
  use_custom_fields?: boolean;
  instructions?: string | null;
  task_description?: string | null;
  recurrence_pattern?: any;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
  quarterly: 'Quarterly', annually: 'Annually',
  'bi-annually': 'Bi-Annually', triggered: 'On Demand', once: 'Once',
};

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    food_safety: 'Food Safety', h_and_s: 'Health & Safety', health_and_safety: 'Health & Safety',
    health_safety: 'Health & Safety',
    fire: 'Fire Safety', fire_safety: 'Fire Safety',
    cleaning: 'Cleaning', cleaning_premises: 'Cleaning & Premises',
    handling_storage: 'Handling & Storage', welfare_first_aid: 'Welfare & First Aid',
    personal_hygiene: 'Personal Hygiene', policy_organisation: 'Policy & Organisation',
    risk_assessment: 'Risk Assessment',
    compliance: 'Compliance', salsa: 'SALSA',
  };
  return labels[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    food_safety: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
    h_and_s: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    health_and_safety: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    health_safety: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    fire: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    fire_safety: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    cleaning: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    cleaning_premises: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    handling_storage: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
    welfare_first_aid: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
    personal_hygiene: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
    policy_organisation: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
    risk_assessment: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    compliance: 'bg-checkly-dark/10 dark:bg-checkly/10 text-checkly-dark dark:text-checkly border-checkly-dark/20 dark:border-checkly/20',
    salsa: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  };
  return colors[category] || 'bg-theme-muted text-theme-tertiary border-theme';
};

export default function TemplatesPage() {
  const { companyId } = useAppContext();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [previewFields, setPreviewFields] = useState<Record<string, any[]>>({});
  const [loadingFields, setLoadingFields] = useState<Record<string, boolean>>({});
  const [quickScheduleTemplate, setQuickScheduleTemplate] = useState<TaskTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

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
      const { data, error } = await supabase
        .from('task_templates')
        .select('*, template_fields (*)')
        .eq('company_id', companyId)
        .eq('is_template_library', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching templates:', error);
        setTemplates([]);
      } else {
        // Pre-populate custom fields from the join
        const fieldsMap: Record<string, any[]> = {};
        (data || []).forEach(t => {
          if (t.use_custom_fields && Array.isArray((t as any).template_fields) && (t as any).template_fields.length > 0) {
            const FIELD_TYPE_NORMALIZE: Record<string, string> = { 'checkbox': 'yes_no' };
            fieldsMap[t.id] = (t as any).template_fields.map((f: any) => ({
              ...f,
              field_type: FIELD_TYPE_NORMALIZE[f.field_type] || f.field_type,
            }));
          }
        });
        if (Object.keys(fieldsMap).length > 0) {
          setPreviewFields(prev => ({ ...prev, ...fieldsMap }));
        }

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

  // Lazy-load custom fields for preview via server API (bypasses RLS)
  const loadCustomFields = useCallback(async (templateId: string) => {
    if (previewFields[templateId] && previewFields[templateId].length > 0) return;
    setLoadingFields(prev => ({ ...prev, [templateId]: true }));
    try {
      // Use server API route to guarantee fields are returned (bypasses RLS)
      const res = await fetch(`/api/tasks/template-fields?templateId=${templateId}`);
      let fields: any[] = [];
      if (res.ok) {
        const json = await res.json();
        fields = json.fields || [];
      } else {
        console.error('Template fields API error:', res.status);
        // Fallback to direct client query
        const { data } = await supabase
          .from('template_fields')
          .select('*')
          .eq('template_id', templateId)
          .order('field_order');
        fields = data || [];
      }
      // Normalize field types from Trail imports (e.g. 'checkbox' → 'yes_no')
      const FIELD_TYPE_NORMALIZE: Record<string, string> = { 'checkbox': 'yes_no' };
      const normalized = fields.map((f: any) => ({
        ...f,
        field_type: FIELD_TYPE_NORMALIZE[f.field_type] || f.field_type,
      }));
      setPreviewFields(prev => ({ ...prev, [templateId]: normalized }));
    } catch (err) {
      console.error('Failed to load custom fields:', err);
      setPreviewFields(prev => ({ ...prev, [templateId]: [] }));
    } finally {
      setLoadingFields(prev => ({ ...prev, [templateId]: false }));
    }
  }, [previewFields]);

  const handleTemplateSaved = (result?: any) => {
    setIsBuilderOpen(false);
    setEditingTemplate(null);

    if (result?.shouldCreateTask && result?.savedTemplate) {
      fetchTemplates().then(() => {
        setTimeout(() => {
          setSelectedTemplateId(result.savedTemplate.id);
        }, 100);
      });
    } else {
      fetchTemplates();
    }
  };

  const handleRowClick = (templateId: string, e?: React.MouseEvent) => {
    if (e && (e.target as HTMLElement).closest('button')) return;
    const template = templates.find(t => t.id === templateId);

    if (expandedTemplateId === templateId) {
      setExpandedTemplateId(null);
    } else {
      setExpandedTemplateId(templateId);
      if (template?.use_custom_fields) {
        loadCustomFields(templateId);
      }
    }
  };

  const handleEditTemplate = async (template: TaskTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
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
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    setDeletingTemplateId(templateId);

    try {
      const { data, error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', templateId)
        .select();

      if (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete template: ' + error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.error('Delete returned no rows - likely RLS denial');
        toast.error('Unable to delete template. You may not have permission.');
        return;
      }

      toast.success('Template deleted successfully');
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      if (expandedTemplateId === templateId) setExpandedTemplateId(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  // Filter templates
  const filtered = templates.filter(t => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        t.name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.frequency?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const categories = Array.from(new Set(templates.map(t => t.category).filter(Boolean)));

  return (
    <div className="bg-theme-surface-elevated text-theme-primary border border-theme rounded-xl p-4 sm:p-6 lg:p-8">
      <BackToSetup />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary mb-2">Custom Templates</h1>
          <p className="text-theme-tertiary text-sm sm:text-base">Build and manage your custom task templates</p>
        </div>
        <button
          onClick={handleNewTemplate}
          className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-checkly-dark dark:border-checkly text-checkly-dark dark:text-checkly bg-transparent hover:bg-theme-hover transition-all duration-150"
          aria-label="Add Template"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Search + Category Filters */}
      {!loading && templates.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-theme-tertiary" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary placeholder-neutral-500 focus:outline-none focus:border-[#D37E91] text-sm"
            />
          </div>
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-[#D37E91]/10 text-[#D37E91] border-[#D37E91]/30'
                    : 'bg-theme-surface text-theme-tertiary border-theme hover:border-theme-hover'
                }`}
              >
                All ({templates.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    categoryFilter === cat
                      ? 'bg-[#D37E91]/10 text-[#D37E91] border-[#D37E91]/30'
                      : 'bg-theme-surface text-theme-tertiary border-theme hover:border-theme-hover'
                  }`}
                >
                  {getCategoryLabel(cat)} ({templates.filter(t => t.category === cat).length})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mt-8 text-center">
          <p className="text-theme-tertiary">Loading templates...</p>
        </div>
      )}

      {/* Import review banner */}
      {!loading && templates.length > 0 && (() => {
        const importedCount = templates.filter(t => t.tags?.includes('trail_import')).length;
        if (importedCount === 0) return null;
        return (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
              {importedCount} imported template{importedCount > 1 ? 's' : ''} need{importedCount === 1 ? 's' : ''} review
            </p>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">
              Click a template to preview it, then edit or quick-schedule.
            </p>
          </div>
        );
      })()}

      {/* Templates List */}
      {!loading && templates.length > 0 && (() => {
        if (filtered.length === 0) {
          return (
            <div className="mt-4 text-center py-8">
              <p className="text-theme-tertiary text-sm">No templates match your filters.</p>
              <button
                onClick={() => { setSearchTerm(''); setCategoryFilter('all'); }}
                className="text-[#D37E91] hover:underline text-sm mt-2"
              >
                Clear filters
              </button>
            </div>
          );
        }
        return (
          <div className="mt-2 divide-y divide-theme">
            {filtered.map((template) => {
              const isTrailImport = template.tags?.includes('trail_import');
              const isExpanded = expandedTemplateId === template.id;

              return (
                <div key={template.id}>
                  <div
                    onClick={(e) => handleRowClick(template.id, e)}
                    className="flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg hover:bg-theme-hover transition-colors cursor-pointer group"
                  >
                    {/* Expand chevron */}
                    <div className="shrink-0 w-4">
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-theme-tertiary" />
                        : <ChevronRight className="w-3.5 h-3.5 text-theme-tertiary" />
                      }
                    </div>

                    {/* Name + badges */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-theme-primary truncate">{template.name}</span>
                        {isTrailImport && (
                          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Needs Review
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Frequency */}
                    <div className="hidden sm:flex items-center gap-1 text-xs text-theme-tertiary w-24 shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>{FREQUENCY_LABELS[template.frequency] || template.frequency}</span>
                    </div>

                    {/* Category pill */}
                    {template.category && (
                      <div className="hidden md:block shrink-0">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getCategoryColor(template.category)}`}>
                          {getCategoryLabel(template.category)}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleEditTemplate(template, e)}
                        className="p-1.5 rounded hover:bg-theme-hover text-theme-tertiary hover:text-theme-primary transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit Template"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteTemplate(template.id, e)}
                        disabled={deletingTemplateId === template.id}
                        className="p-1.5 rounded hover:bg-red-500/10 text-theme-tertiary hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Delete Template"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded preview panel */}
                  {isExpanded && (
                    <TemplatePreviewPanel
                      template={template}
                      customFields={previewFields[template.id] || []}
                      loadingFields={loadingFields[template.id] || false}
                      onEdit={() => handleEditTemplate(template, { stopPropagation: () => {} } as React.MouseEvent)}
                      onQuickSchedule={isTrailImport ? () => setQuickScheduleTemplate(template) : undefined}
                      onCreateTask={!isTrailImport ? () => { setExpandedTemplateId(null); setSelectedTemplateId(template.id); } : undefined}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Empty State */}
      {!loading && templates.length === 0 && (
        <div className="mt-8 text-center py-12">
          <FileText className="h-12 w-12 text-theme-tertiary/30 mx-auto mb-4" />
          <p className="text-theme-tertiary mb-2">No templates yet</p>
          <p className="text-theme-tertiary text-sm">Create your first template to get started</p>
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
          onSave={() => {
            setSelectedTemplateId(null);
            setExpandedTemplateId(null);
            fetchTemplates();
          }}
          templateId={selectedTemplateId}
          template={templates.find(t => t.id === selectedTemplateId)}
          sourcePage="templates"
        />
      )}

      {/* Quick Schedule Modal */}
      {quickScheduleTemplate && (
        <QuickScheduleModal
          isOpen={!!quickScheduleTemplate}
          onClose={() => setQuickScheduleTemplate(null)}
          onSave={() => {
            setQuickScheduleTemplate(null);
            setExpandedTemplateId(null);
            fetchTemplates();
          }}
          template={quickScheduleTemplate}
        />
      )}
    </div>
  );
}
