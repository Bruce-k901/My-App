"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { TemperatureCheckTemplate } from "@/components/compliance/TemperatureCheckTemplate";
import { HotHoldingTemplate } from "@/components/compliance/HotHoldingTemplate";
import { FireAlarmTestTemplate } from "@/components/compliance/FireAlarmTestTemplate";
import { EmergencyLightingTemplate } from "@/components/compliance/EmergencyLightingTemplate";
import { PATTestingTemplate } from "@/components/compliance/PATTestingTemplate";
import { ProbeCalibrationTemplate } from "@/components/compliance/ProbeCalibrationTemplate";
import { ExtractionServiceTemplate } from "@/components/compliance/ExtractionServiceTemplate";
import { Search, CheckCircle2, Calendar, Edit2, ChevronDown, ChevronUp, Utensils, ShieldAlert, Flame, Sparkles, ClipboardCheck } from "lucide-react";
import { TaskTemplate } from "@/types/checklist-types";

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
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [templateStatuses, setTemplateStatuses] = useState<Map<string, TemplateStatus>>(new Map());
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());

  // Special template components metadata for search
  const specialTemplates = [
    { name: 'SFBB Temperature Checks', description: 'Daily temperature monitoring for refrigerators, freezers, and hot holding units', component: TemperatureCheckTemplate },
    { name: 'Verify hot holding above 63°C', description: 'Record during service to ensure compliance', component: HotHoldingTemplate },
    { name: 'Test fire alarms and emergency lighting', description: 'Weekly testing of fire alarms and emergency lighting systems', component: FireAlarmTestTemplate },
    { name: 'Test emergency lighting', description: 'Weekly testing of emergency lighting systems', component: EmergencyLightingTemplate },
    { name: 'PAT test electrical equipment', description: 'Annual Portable Appliance Testing of electrical equipment', component: PATTestingTemplate },
    { name: 'Calibrate temperature probes', description: 'Monthly calibration verification of temperature probes', component: ProbeCalibrationTemplate },
    { name: 'Service extraction and ventilation systems', description: 'Biannual service and verification of extraction and ventilation systems', component: ExtractionServiceTemplate },
  ];

  // Filter special templates based on search
  const filteredSpecialTemplates = specialTemplates.filter(template =>
    !searchTerm || 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchTemplates().then(() => {
      // After fetching, ensure global templates exist
      ensureGlobalTemplates();
    });
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
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .or(`company_id.is.null,company_id.eq.${profile.company_id}`)
        .eq('is_template_library', true)
        .eq('is_active', true)
        .order('audit_category')
        .order('name');

      if (error) {
        console.error('Database error:', error);
        setTemplates([]);
        return;
      }
      
      // Filter out draft templates and non-EHO templates
      // Only show templates that are clearly EHO compliance templates
      const filteredData = (data || []).filter(template => {
        // Exclude drafts
        const isDraft = template.name.toLowerCase().includes('(draft)') || 
                       template.description?.toLowerCase().includes('draft');
        
        // Must have audit_category for proper grouping
        const hasCategory = template.audit_category && template.audit_category.trim() !== '';
        
        // Exclude operational/operational templates that aren't EHO compliance templates
        // These typically have simple operational names without compliance codes/standards
        const name = template.name.toLowerCase();
        const description = (template.description || '').toLowerCase();
        
        // Operational templates that shouldn't be here:
        const operationalKeywords = [
          'calibrate temperature probes',
          'check fridge/freezer temperatures',
          'label and date all stored foods',
          'daily temperature monitoring for refrigeration equipment - draft'
        ];
        
        const seemsOperational = operationalKeywords.some(keyword => 
          name.includes(keyword) || description.includes(keyword)
        );
        
        // Also check if it's a real EHO template - should have compliance codes or specific patterns
        // EHO templates usually have codes like "FS-001", "HS-001", or mention compliance standards
        const hasComplianceCode = /^(fs|hs|fire|clean|comp)-\d+/i.test(template.name);
        const hasComplianceStandard = template.compliance_standard && 
                                      template.compliance_standard.length > 0;
        
        // Only include if it's not a draft, has category, not operational, AND looks like EHO template
        return !isDraft && 
               hasCategory && 
               !seemsOperational && 
               (hasComplianceCode || hasComplianceStandard);
      });
      
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

  // Auto-import global templates if they don't exist (run once on page load)
  async function ensureGlobalTemplates() {
    try {
      // Check if global templates already exist
      const { data: existingTemplates } = await supabase
        .from('task_templates')
        .select('slug')
        .is('company_id', null)
        .eq('is_template_library', true)
        .eq('is_active', true);

      const existingSlugs = new Set(existingTemplates?.map(t => t.slug) || []);
      
      // Get all templates from TypeScript definitions
      const { getAllTemplates } = await import('@/data/compliance-templates');
      const allTemplates = getAllTemplates();
      
      // Check if we need to import any
      const needsImport = allTemplates.some(t => !existingSlugs.has(t.slug));
      
      if (!needsImport) {
        return; // All templates already exist
      }

      // Import missing templates as global (company_id = NULL)
      const response = await fetch('/api/compliance/import-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: null }) // null = global templates
      });

      const result = await response.json();
      
      if (result.success && result.imported > 0) {
        console.log(`Auto-imported ${result.imported} global templates`);
        // Refresh templates silently
        await fetchTemplates();
      }
    } catch (error) {
      // Silent fail - templates might already exist or we'll retry next time
      console.error('Error ensuring global templates:', error);
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

  // Handle edit button click
  const handleEditTemplate = (template: TaskTemplate) => {
    // TODO: Navigate to edit page or open edit modal
    console.log('Edit template:', template.id);
    // Example: router.push(`/dashboard/tasks/compliance-templates/edit/${template.id}`);
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

      {/* Special Template Components */}
      {filteredSpecialTemplates.length > 0 && (
        <div className="space-y-8 mb-8">
          {filteredSpecialTemplates.map((template) => {
            const Component = template.component;
            return <Component key={template.name} />;
          })}
        </div>
      )}

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
                      className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden hover:border-pink-500/30 transition-colors"
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
                                  onClick={() => handleEditTemplate(template)}
                                  className="p-2 hover:bg-white/[0.08] rounded-lg transition-colors"
                                  title="Edit template"
                                >
                                  <Edit2 className="w-4 h-4 text-white/60 hover:text-white" />
                                </button>
                                <button
                                  onClick={() => toggleExpand(template.id)}
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
      {!loading && searchTerm && filteredSpecialTemplates.length === 0 && filteredTemplates.length === 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
          <p className="text-white/60">
            No templates found matching your search "{searchTerm}".
          </p>
        </div>
      )}

      {/* Template count - show total including special templates */}
      {!loading && (
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-200">
            <strong>Total Templates:</strong> {filteredSpecialTemplates.length + filteredTemplates.length} available
            {filteredSpecialTemplates.length > 0 && filteredTemplates.length > 0 && (
              <span className="text-blue-300/70">
                {' '}({filteredSpecialTemplates.length} special templates above, {filteredTemplates.length} EHO compliance templates below)
              </span>
            )}
            {filteredSpecialTemplates.length > 0 && filteredTemplates.length === 0 && (
              <span className="text-blue-300/70">
                {' '}({filteredSpecialTemplates.length} special templates)
              </span>
            )}
            {filteredSpecialTemplates.length === 0 && filteredTemplates.length > 0 && (
              <span className="text-blue-300/70">
                {' '}({filteredTemplates.length} EHO compliance templates)
              </span>
            )}
          </p>
        </div>
      )}

    </div>
  );
}
