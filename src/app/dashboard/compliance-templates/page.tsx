"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { TaskFromTemplateModal } from "@/components/templates/TaskFromTemplateModal";
import { Search, CheckCircle2, Calendar, Edit2, ChevronDown, ChevronUp, Utensils, ShieldAlert, Flame, Sparkles, ClipboardCheck } from "lucide-react";
import { TaskTemplate } from "@/types/checklist-types";
import { useAppContext } from "@/context/AppContext";

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
  triggered: 'As Needed',
  once: 'One Time'
};

interface TemplateStatus {
  templateId: string;
  inUse: boolean; // Has active task instances
  edited: boolean; // Has been modified from original
}

export default function ComplianceTemplatesPage() {
  const { companyId } = useAppContext();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [templateStatuses, setTemplateStatuses] = useState<Map<string, TemplateStatus>>(new Map());
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const handleUseTemplate = (templateId: string, e?: React.MouseEvent) => {
    // Prevent triggering when clicking Edit or Expand buttons
    if (e && (e.target as HTMLElement).closest('button')) {
      return;
    }
    setSelectedTemplateId(templateId);
  };

  const handleTaskCreated = () => {
    setSelectedTemplateId(null); // Close modal
    // Optionally refresh templates to update "In Use" status
    fetchTemplates();
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.audit_category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTemplates(filtered);
  }, [templates, searchTerm]);

  async function fetchTemplates() {
    try {
      // Get current user's profile to get company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user logged in');
        setTemplates([]);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        console.error('Error fetching profile or no company_id:', profileError);
        setTemplates([]);
        setLoading(false);
        return;
      }

      // Fetch templates - include both global (company_id IS NULL) and company-specific
      // For compliance templates, we want global templates (company_id IS NULL) that are library templates
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .is('company_id', null) // Only global templates for compliance page
        .eq('is_template_library', true)
        .eq('is_active', true)
        .order('audit_category')
        .order('name');

      if (error) {
        console.error('Database error fetching compliance templates:', error);
        setTemplates([]);
        return;
      }
      
      console.log('Fetched compliance templates:', data?.length || 0, 'templates');
      if (data && data.length > 0) {
        console.log('Template names:', data.map(t => t.name));
      }
      
      // Filter out draft templates only
      // All templates with is_template_library = true are compliance templates
      const filteredData = (data || []).filter(template => {
        // Exclude drafts only
        const isDraft = template.name.toLowerCase().includes('(draft)') || 
                       template.description?.toLowerCase().includes('draft');
        
        return !isDraft;
      });
      
      console.log('Filtered compliance templates (after draft filter):', filteredData.length);
      
      // Deduplicate templates by name - keep the most recent one if duplicates exist
      const templatesMap = new Map<string, TaskTemplate>();
      filteredData.forEach(template => {
        const existing = templatesMap.get(template.name);
        if (!existing || new Date(template.created_at) > new Date(existing.created_at)) {
          templatesMap.set(template.name, template);
        }
      });
      
      setTemplates(Array.from(templatesMap.values()));
      
      // Fetch status information for templates (in use, edited)
      // Use deduplicated templates for status check
      const deduplicatedTemplates = Array.from(templatesMap.values());
      if (deduplicatedTemplates.length > 0) {
        await fetchTemplateStatuses(deduplicatedTemplates.map(t => t.id), profile.company_id);
      }
    } catch (error) {
      console.error('Failed to fetch compliance templates:', error);
    } finally {
      setLoading(false);
    }
  }

  // Fetch template statuses (in use, edited)
  async function fetchTemplateStatuses(templateIds: string[], companyId: string) {
    try {
      const statusMap = new Map<string, TemplateStatus>();
      
      // Check which templates are "in use" (have any task instances, not just active ones)
      // This indicates the template has been deployed and is generating tasks
      const { data: taskInstances } = await supabase
        .from('checklist_tasks')
        .select('template_id')
        .in('template_id', templateIds)
        .eq('company_id', companyId);
      
      // Build set of template IDs that are in use (have generated tasks)
      const inUseTemplateIds = new Set(
        taskInstances?.map(t => t.template_id) || []
      );
      
      // Check which templates have fields that were added AFTER the template was created
      // This indicates the template was customized by the user, not just imported
      const { data: templateFields } = await supabase
        .from('template_fields')
        .select('template_id, created_at')
        .in('template_id', templateIds);
      
      // Build a map of template IDs to their field creation times
      const templateFieldTimes = new Map<string, Date[]>();
      templateFields?.forEach(field => {
        if (!templateFieldTimes.has(field.template_id)) {
          templateFieldTimes.set(field.template_id, []);
        }
        templateFieldTimes.get(field.template_id)?.push(new Date(field.created_at));
      });
      
      // For each template, determine status
      templates.forEach(template => {
        const inUse = inUseTemplateIds.has(template.id);
        
        // Check if edited: 
        // Only mark as "edited" if user clearly customized it AFTER import/creation
        // This means checking for user activity significantly after the template was created
        const templateCreatedAt = new Date(template.created_at);
        const templateUpdatedAt = new Date(template.updated_at);
        
        // Check if any fields were created AFTER template creation
        // Imported templates have fields created at the same time (within minutes)
        // User-edited templates have fields created hours or days later
        const fieldTimes = templateFieldTimes.get(template.id) || [];
        const hasFieldsAddedLater = fieldTimes.some(fieldTime => {
          const timeDiff = fieldTime.getTime() - templateCreatedAt.getTime();
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          // Field created more than 6 hours after template creation
          // This catches user edits while avoiding import artifacts
          return hoursDiff > 6;
        });
        
        // Check if template metadata was updated after creation
        // Imported templates typically have created_at and updated_at very close (seconds/minutes)
        // User-edited templates have updated_at significantly later
        const updateTimeDiff = templateUpdatedAt.getTime() - templateCreatedAt.getTime();
        const updateDaysDiff = updateTimeDiff / (1000 * 60 * 60 * 24);
        const updateHoursDiff = updateTimeDiff / (1000 * 60 * 60);
        
        // Updated more than 1 day after creation, OR updated more than 2 hours after with fields
        // This catches both recent edits (same day) and older edits
        const wasUpdatedLater = updateDaysDiff > 1 || (updateHoursDiff > 2 && fieldTimes.length > 0);
        
        // Mark as edited if fields were added later OR template was updated later
        // This prevents false positives from imports while catching user edits
        const edited = hasFieldsAddedLater || wasUpdatedLater;
        
        statusMap.set(template.id, {
          templateId: template.id,
          inUse,
          edited
        });
      });
      
      setTemplateStatuses(statusMap);
    } catch (error) {
      console.error('Error fetching template statuses:', error);
    }
  }


  // Helper function to get icon based on category/audit_category
  const getTemplateIcon = (template: TaskTemplate) => {
    const category = template.category?.toLowerCase() || template.audit_category?.toLowerCase() || '';
    const name = template.name?.toLowerCase() || '';
    
    if (category.includes('food') || name.includes('food') || name.includes('temperature') || name.includes('fridge')) {
      return Utensils;
    }
    if (category.includes('fire') || name.includes('fire') || name.includes('alarm') || name.includes('emergency light')) {
      return Flame;
    }
    if (category.includes('health') || category.includes('safety') || name.includes('health') || name.includes('safety')) {
      return ShieldAlert;
    }
    if (category.includes('clean') || name.includes('clean')) {
      return Sparkles;
    }
    return ClipboardCheck;
  };

  // Toggle expand/collapse for a template
  const toggleExpand = (templateId: string) => {
    setExpandedTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  // Handle edit button click - For compliance templates, editing opens the template in TaskFromTemplateModal
  const handleEditTemplate = async (template: TaskTemplate, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    // For compliance templates, "edit" means create a task from it
    setSelectedTemplateId(template.id);
  };

  // Group templates by audit_category
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const category = template.audit_category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, TaskTemplate[]>);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Compliance Templates</h1>
        <p className="text-white/60">Pre-built EHO compliance task templates for food safety, health & safety, and regulatory requirements</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search compliance templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
          />
        </div>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="text-white">Loading compliance templates...</div>
      ) : filteredTemplates.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold text-white mb-4">{category}</h2>
              <div className="space-y-4">
                {categoryTemplates.map((template) => {
                  const Icon = getTemplateIcon(template);
                  const isExpanded = expandedTemplates.has(template.id);
                  const status = templateStatuses.get(template.id);
                  const isInUse = status?.inUse || false;
                  
                  return (
                    <div
                      key={template.id}
                      onClick={(e) => handleUseTemplate(template.id, e)}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden hover:border-pink-500/30 transition-colors cursor-pointer"
                    >
                      {/* Collapsed Card View */}
                      <div className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className="flex-shrink-0 p-2 bg-white/[0.08] rounded-lg">
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h3 className="text-base font-semibold text-white">{template.name}</h3>
                                  {isInUse && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded border border-green-500/30 flex items-center gap-1 flex-shrink-0">
                                      <CheckCircle2 className="w-3 h-3" />
                                      In Use
                                    </span>
                                  )}
                                  {template.is_critical && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded border border-red-500/30 flex-shrink-0">
                                      Critical
                                    </span>
                                  )}
                                </div>
                                {template.description && (
                                  <p className="text-sm text-white/60 line-clamp-1">
                                    {template.description}
                                  </p>
                                )}
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={(e) => handleEditTemplate(template, e)}
                                  className="p-2 hover:bg-white/[0.08] rounded-lg transition-colors"
                                  title="Use template to create task"
                                >
                                  <Edit2 className="w-4 h-4 text-white/60 hover:text-white" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(template.id);
                                  }}
                                  className="p-2 hover:bg-white/[0.08] rounded-lg transition-colors"
                                  title={isExpanded ? "Collapse" : "Expand"}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-white/60 hover:text-white" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-white/60 hover:text-white" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
                            {/* Description (full) */}
                            {template.description && (
                              <div>
                                <p className="text-xs text-white/40 mb-1">Description</p>
                                <p className="text-sm text-white/70">{template.description}</p>
                              </div>
                            )}

                            {/* Frequency */}
                            {template.frequency && (
                              <div className="flex items-center gap-2 text-sm text-white/60">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs text-white/40 mr-2">Frequency:</span>
                                <span>{FREQUENCY_LABELS[template.frequency] || template.frequency}</span>
                              </div>
                            )}

                            {/* Category */}
                            {template.audit_category && (
                              <div>
                                <p className="text-xs text-white/40 mb-1">Category</p>
                                <p className="text-sm text-white/70">{template.audit_category}</p>
                              </div>
                            )}

                            {/* Compliance Standard */}
                            {template.compliance_standard && (
                              <div>
                                <p className="text-xs text-white/40 mb-1">Regulation</p>
                                <p className="text-sm text-white/70">{template.compliance_standard}</p>
                              </div>
                            )}

                            {/* Evidence Types */}
                            {template.evidence_types && template.evidence_types.length > 0 && (
                              <div>
                                <p className="text-xs text-white/40 mb-2">Required Evidence</p>
                                <div className="flex flex-wrap gap-2">
                                  {template.evidence_types.map((evidence, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 text-xs bg-pink-500/10 text-pink-400 rounded border border-pink-500/20"
                                    >
                                      {evidence}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Edited Status */}
                            {status?.edited && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 flex items-center gap-1">
                                  <Edit2 className="w-3 h-3" />
                                  Edited
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* No templates found message - only show if searching and no results */}
      {!loading && searchTerm && filteredTemplates.length === 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
          <p className="text-white/60">
            No templates found matching your search "{searchTerm}".
          </p>
        </div>
      )}

      {/* Template count */}
      {!loading && filteredTemplates.length > 0 && (
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-200">
            <strong>Total Templates:</strong> {filteredTemplates.length} compliance templates available
          </p>
        </div>
      )}

      {/* TaskFromTemplateModal - Opens when a template is clicked */}
      {selectedTemplateId && (
        <TaskFromTemplateModal
          isOpen={!!selectedTemplateId}
          onClose={() => setSelectedTemplateId(null)}
          templateId={selectedTemplateId}
          onSave={handleTaskCreated}
        />
      )}
    </div>
  );
}
