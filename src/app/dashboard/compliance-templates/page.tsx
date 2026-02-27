"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { TaskFromTemplateModal } from "@/components/templates/TaskFromTemplateModal";
import { MasterTemplateModal } from "@/components/templates/MasterTemplateModal";
import { TemplatePreviewPanel } from "@/components/templates/TemplatePreviewPanel";
import { Search, CheckCircle2, Clock, ChevronDown, ChevronRight } from '@/components/ui/icons';
import { TaskTemplate } from "@/types/checklist-types";
import { useAppContext } from "@/context/AppContext";
import { COMPLIANCE_MODULE_SLUGS } from "@/data/compliance-templates";
import { enrichTemplateWithDefinition } from "@/lib/templates/enrich-template";

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
  quarterly: 'Quarterly', annually: 'Annually',
  'bi-annually': 'Bi-Annually', triggered: 'As Needed', once: 'One Time',
};

const AUDIT_CATEGORY_LABELS: Record<string, string> = {
  food_safety: 'Food Safety',
  fire_safety: 'Fire Safety',
  health_and_safety: 'Health & Safety',
  health_safety: 'Health & Safety',
  h_and_s: 'Health & Safety',
  cleaning: 'Cleaning',
  cleaning_premises: 'Cleaning & Premises',
  handling_storage: 'Handling & Storage',
  welfare_first_aid: 'Welfare & First Aid',
  personal_hygiene: 'Personal Hygiene',
  policy_organisation: 'Policy & Organisation',
  risk_assessment: 'Risk Assessment',
  compliance: 'Compliance',
  salsa: 'SALSA',
  fire: 'Fire Safety',
};

const AUDIT_CATEGORY_COLORS: Record<string, string> = {
  food_safety: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  fire_safety: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  health_and_safety: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  health_safety: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  h_and_s: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  cleaning: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  cleaning_premises: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  handling_storage: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  welfare_first_aid: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  personal_hygiene: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  policy_organisation: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  risk_assessment: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  compliance: 'bg-checkly-dark/10 dark:bg-checkly/10 text-checkly-dark dark:text-checkly border-checkly-dark/20 dark:border-checkly/20',
  salsa: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  fire: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

export default function ComplianceTemplatesPage() {
  const { companyId } = useAppContext();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [inUseTemplateIds, setInUseTemplateIds] = useState<Set<string>>(new Set());
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [previewFields, setPreviewFields] = useState<Record<string, any[]>>({});
  const [loadingFields, setLoadingFields] = useState<Record<string, boolean>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const hasAttemptedSeed = useRef(false);
  const shouldAutoSeed = process.env.NEXT_PUBLIC_ENABLE_COMPLIANCE_TEMPLATE_AUTOFILL === "true";

  async function seedGlobalTemplates() {
    if (!shouldAutoSeed || hasAttemptedSeed.current) return false;
    hasAttemptedSeed.current = true;
    try {
      const response = await fetch("/api/compliance/import-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: null }),
      });
      if (!response.ok) return false;
      return true;
    } catch { return false; }
  }

  useEffect(() => { fetchTemplates(); }, []);

  async function fetchTemplates() {
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .is('company_id', null)
        .eq('is_template_library', true)
        .eq('is_active', true)
        .order('audit_category')
        .order('name');

      if (error) { setTemplates([]); return; }

      const requiredSlugs = new Set(COMPLIANCE_MODULE_SLUGS);
      const presentSlugs = new Set((data || []).map(t => t.slug));
      const missingSlugs = COMPLIANCE_MODULE_SLUGS.filter(s => !presentSlugs.has(s));

      if (shouldAutoSeed && missingSlugs.length > 0) {
        const seeded = await seedGlobalTemplates();
        if (seeded) { await fetchTemplates(); return; }
      }

      const filteredData = (data || []).filter(t => {
        const isDraft = t.name.toLowerCase().includes('(draft)') || t.description?.toLowerCase().includes('draft');
        return !isDraft && t.slug && requiredSlugs.has(t.slug);
      });

      // Deduplicate by name
      const templatesMap = new Map<string, TaskTemplate>();
      filteredData.forEach(t => {
        const existing = templatesMap.get(t.name);
        if (!existing || new Date(t.created_at) > new Date(existing.created_at)) {
          templatesMap.set(t.name, t);
        }
      });

      const deduped = Array.from(templatesMap.values()).map(t =>
        enrichTemplateWithDefinition(t)
      ) as TaskTemplate[];

      setTemplates(deduped);

      // Fetch "in use" status
      if (deduped.length > 0) {
        const templateIds = deduped.map(t => t.id);
        const { data: tasks } = await supabase
          .from('checklist_tasks')
          .select('template_id')
          .in('template_id', templateIds)
          .eq('company_id', companyId);
        setInUseTemplateIds(new Set(tasks?.map(t => t.template_id) || []));
      }
    } catch (error) {
      console.error('Failed to fetch compliance templates:', error);
    } finally {
      setLoading(false);
    }
  }

  // Lazy-load custom fields for preview
  const loadCustomFields = useCallback(async (templateId: string) => {
    if (previewFields[templateId]) return;
    setLoadingFields(prev => ({ ...prev, [templateId]: true }));
    try {
      const { data: fields } = await supabase
        .from('template_fields').select('*').eq('template_id', templateId).order('field_order');
      setPreviewFields(prev => ({ ...prev, [templateId]: fields || [] }));
    } catch {
      setPreviewFields(prev => ({ ...prev, [templateId]: [] }));
    } finally {
      setLoadingFields(prev => ({ ...prev, [templateId]: false }));
    }
  }, [previewFields]);

  const handleRowClick = (templateId: string, e?: React.MouseEvent) => {
    if (e && (e.target as HTMLElement).closest('button')) return;
    const template = templates.find(t => t.id === templateId);
    if (expandedTemplateId === templateId) {
      setExpandedTemplateId(null);
    } else {
      setExpandedTemplateId(templateId);
      if (template?.use_custom_fields) loadCustomFields(templateId);
    }
  };

  const handleEditTemplate = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        console.error('Error fetching template for edit:', error);
        return;
      }

      setEditingTemplate(data);
    } catch (error) {
      console.error('Failed to fetch template:', error);
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    if (categoryFilter !== 'all' && t.audit_category !== categoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.audit_category?.toLowerCase().includes(q) ||
        t.slug?.toLowerCase().includes(q) ||
        t.evidence_types?.some(e => e.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Group by audit_category
  const groupedTemplates = filteredTemplates.reduce((acc, t) => {
    const cat = t.audit_category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, TaskTemplate[]>);

  // Unique categories for filter pills
  const categories = Array.from(new Set(templates.map(t => t.audit_category).filter(Boolean)));

  return (
    <div className="bg-theme-surface-elevated text-theme-primary border border-theme rounded-xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary mb-2">Compliance Templates</h1>
        <p className="text-theme-tertiary text-sm sm:text-base">Pre-built EHO compliance task templates</p>
      </div>

      {/* Search + Category Filters */}
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
              onClick={() => setCategoryFilter(cat!)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#D37E91]/10 text-[#D37E91] border-[#D37E91]/30'
                  : 'bg-theme-surface text-theme-tertiary border-theme hover:border-theme-hover'
              }`}
            >
              {AUDIT_CATEGORY_LABELS[cat!] || cat} ({templates.filter(t => t.audit_category === cat).length})
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-8 text-center">
          <p className="text-theme-tertiary">Loading compliance templates...</p>
        </div>
      )}

      {/* Templates List */}
      {!loading && filteredTemplates.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-theme-secondary mb-2 uppercase tracking-wider">
                {AUDIT_CATEGORY_LABELS[category] || category}
              </h2>
              <div className="divide-y divide-theme">
                {categoryTemplates.map((template) => {
                  const isExpanded = expandedTemplateId === template.id;
                  const isInUse = inUseTemplateIds.has(template.id);

                  return (
                    <div key={template.id}>
                      <div
                        onClick={(e) => handleRowClick(template.id, e)}
                        className="flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg hover:bg-theme-hover transition-colors cursor-pointer group"
                      >
                        {/* Chevron */}
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
                            {isInUse && (
                              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                In Use
                              </span>
                            )}
                            {template.is_critical && (
                              <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                Critical
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Frequency */}
                        <div className="hidden sm:flex items-center gap-1 text-xs text-theme-tertiary w-24 shrink-0">
                          <Clock className="h-3 w-3" />
                          <span>{FREQUENCY_LABELS[template.frequency] || template.frequency}</span>
                        </div>

                        {/* Category */}
                        <div className="hidden md:block w-28 shrink-0">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${AUDIT_CATEGORY_COLORS[template.audit_category || ''] || 'bg-theme-muted text-theme-tertiary border-theme'}`}>
                            {AUDIT_CATEGORY_LABELS[template.audit_category || ''] || template.audit_category || 'Other'}
                          </span>
                        </div>
                      </div>

                      {/* Preview panel */}
                      {isExpanded && (
                        <TemplatePreviewPanel
                          template={{
                            id: template.id,
                            name: template.name,
                            description: template.description,
                            task_description: template.task_description,
                            category: template.category || template.audit_category || '',
                            frequency: template.frequency,
                            dayparts: template.dayparts,
                            evidence_types: template.evidence_types,
                            instructions: template.instructions,
                            recurrence_pattern: template.recurrence_pattern,
                            use_custom_fields: template.use_custom_fields,
                          }}
                          customFields={previewFields[template.id] || []}
                          loadingFields={loadingFields[template.id] || false}
                          onEdit={() => handleEditTemplate(template.id)}
                          onCreateTask={() => {
                            setExpandedTemplateId(null);
                            setSelectedTemplateId(template.id);
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && filteredTemplates.length === 0 && (
        <div className="mt-8 text-center py-12">
          <p className="text-theme-tertiary mb-2">
            {searchTerm || categoryFilter !== 'all'
              ? `No templates found matching your filters.`
              : 'No compliance templates available.'
            }
          </p>
        </div>
      )}

      {/* MasterTemplateModal for full editing */}
      {editingTemplate && (
        <MasterTemplateModal
          isOpen={true}
          onClose={() => setEditingTemplate(null)}
          onSave={() => {
            setEditingTemplate(null);
            fetchTemplates();
          }}
          editingTemplate={editingTemplate}
        />
      )}

      {/* TaskFromTemplateModal */}
      {selectedTemplateId && (
        <TaskFromTemplateModal
          isOpen={!!selectedTemplateId}
          onClose={() => setSelectedTemplateId(null)}
          templateId={selectedTemplateId}
          onSave={() => {
            setSelectedTemplateId(null);
            fetchTemplates();
          }}
        />
      )}
    </div>
  );
}
