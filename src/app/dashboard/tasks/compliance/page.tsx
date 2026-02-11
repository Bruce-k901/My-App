"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { TaskFromTemplateModal } from "@/components/templates/TaskFromTemplateModal";
import { Search, Clock, FileText, Calendar, Copy, CheckCircle2, Utensils, ShieldAlert, Flame, ClipboardCheck } from '@/components/ui/icons';
import { TaskTemplate } from "@/types/checklist-types";
import { useAppContext } from "@/context/AppContext";
import { COMPLIANCE_MODULE_SLUGS, COMPLIANCE_MODULE_TEMPLATES, getAllTemplates } from "@/data/compliance-templates";
import { enrichTemplateWithDefinition } from "@/lib/templates/enrich-template";
import Select from "@/components/ui/Select";
import BackToSetup from "@/components/dashboard/BackToSetup";

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
  triggered: 'As Needed',
  once: 'One Time'
};

export default function CompliancePage() {
  const { companyId, session, loading: authLoading } = useAppContext();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [templateUsageCounts, setTemplateUsageCounts] = useState<Map<string, number>>(new Map());
  const hasAttemptedSeed = useRef(false);

  async function seedGlobalTemplates() {
    // Prevent multiple simultaneous seed attempts
    if (hasAttemptedSeed.current) {
      return false;
    }

    hasAttemptedSeed.current = true;

    try {
      const response = await fetch("/api/compliance/import-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ company_id: null }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error("Failed to seed compliance templates:", errorBody);
        // Don't return false - we'll fall back to code definitions
        return false;
      }

      const result = await response.json().catch(() => ({}));
      console.log("Compliance templates seeded:", result);
      return true;
    } catch (error) {
      console.error("Error seeding compliance templates:", error);
      // Don't return false - we'll fall back to code definitions
      return false;
    } finally {
      // Reset after a delay to allow retry if needed
      setTimeout(() => {
        hasAttemptedSeed.current = false;
      }, 5000);
    }
  }

  // Convert code-defined templates to TaskTemplate format for display
  function getCodeDefinedTemplates(): TaskTemplate[] {
    const codeTemplates = getAllTemplates();
    return codeTemplates.map((template) => {
      // Convert ComplianceTemplate to TaskTemplate format
      const { workflowType, workflowConfig, ...taskTemplate } = template;
      return enrichTemplateWithDefinition(taskTemplate as TaskTemplate);
    });
  }

  useEffect(() => {
    // Wait for auth to finish loading before fetching templates
    if (authLoading) {
      return;
    }
    
    // Only fetch if we have a session and companyId
    if (session?.user && companyId) {
      fetchTemplates();
    } else if (!authLoading && !session?.user) {
      // Auth finished loading but no user - set loading to false
      setLoading(false);
      // Still show code-defined templates even without auth (for preview)
      const codeTemplates = getCodeDefinedTemplates();
      setTemplates(codeTemplates);
      setFilteredTemplates(codeTemplates);
      // Can't fetch usage counts without auth/companyId
    }
  }, [companyId, session, authLoading]);

  async function fetchTemplates() {
    // Double-check we have session and companyId
    if (!session?.user || !companyId) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch templates - include both global (company_id IS NULL) and company-specific
      // For compliance templates, we want global templates (company_id IS NULL) that are library templates
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_template_library', true)
        .or(`company_id.is.null,company_id.eq.${companyId}`)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Database error fetching compliance templates:', error?.message ?? error);
        setTemplates([]);
        return;
      }
      
      const templatesData = data || [];

      const requiredSlugs = new Set(COMPLIANCE_MODULE_SLUGS);
      const presentSlugs = new Set(templatesData.map((template: any) => template.slug));
      const missingSlugs = COMPLIANCE_MODULE_SLUGS.filter((slug) => !presentSlugs.has(slug));

      // Always attempt to seed missing templates (they're shipped with the app)
      if (missingSlugs.length > 0) {
        console.log("Missing compliance templates detected:", missingSlugs);
        const seeded = await seedGlobalTemplates();
        if (seeded) {
          // Retry fetch after seeding
          await fetchTemplates();
          return;
        }
      }
      
      console.log('Fetched compliance templates from database:', templatesData.length, 'templates');
      
      const filteredData = templatesData.filter((template: any) => {
        const name = template.name?.toLowerCase() ?? '';
        const description = template.description?.toLowerCase() ?? '';
        const isDraft = name.includes('(draft)') || description.includes('draft');
        const isModuleTemplate = template.slug ? requiredSlugs.has(template.slug) : false;
        return !isDraft && isModuleTemplate;
      });
      
      console.log('Filtered compliance templates (after draft filter):', filteredData.length);
      
      // Deduplicate templates by name - keep the most recent one if duplicates exist
      const templatesMap = new Map<string, TaskTemplate>();
      filteredData.forEach((template: TaskTemplate) => {
        const existing = templatesMap.get(template.name);
        if (!existing || new Date(template.created_at) > new Date(existing.created_at)) {
          templatesMap.set(template.name, enrichTemplateWithDefinition(template));
        }
      });
      
      let uniqueTemplates = Array.from(templatesMap.values());
      
      // If we have fewer templates than expected, merge with code-defined templates
      // This ensures templates are always available even if database seeding failed
      if (uniqueTemplates.length < COMPLIANCE_MODULE_SLUGS.length) {
        console.log('Some templates missing from database, using code definitions as fallback');
        const codeTemplates = getCodeDefinedTemplates();
        
        // Create a map of database templates by slug
        const dbTemplatesBySlug = new Map<string, TaskTemplate>();
        uniqueTemplates.forEach(t => {
          if (t.slug) {
            dbTemplatesBySlug.set(t.slug, t);
          }
        });
        
        // Add code-defined templates that aren't in the database
        codeTemplates.forEach(codeTemplate => {
          if (codeTemplate.slug && !dbTemplatesBySlug.has(codeTemplate.slug)) {
            // Use code template but mark it as not yet in database
            uniqueTemplates.push(codeTemplate);
          }
        });
      }
      
      setTemplates(uniqueTemplates);
      setFilteredTemplates(uniqueTemplates);
      
      // Fetch usage counts for templates
      await fetchTemplateUsageCounts(uniqueTemplates.map(t => t.id));
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTemplateUsageCounts(templateIds: string[]) {
    if (!companyId || templateIds.length === 0) {
      return;
    }

    try {
      // Filter out any null/undefined/invalid template IDs
      // Also filter to only valid UUIDs (templates that exist in database)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validTemplateIds = templateIds.filter(
        id => id && typeof id === 'string' && uuidRegex.test(id)
      );
      
      if (validTemplateIds.length === 0) {
        // No valid template IDs to query - this is fine, just return
        return;
      }

      // Count tasks for each template from checklist_tasks table
      // Count all tasks (pending, in_progress, completed, etc.) to show which templates are in use
      const { data, error } = await supabase
        .from('checklist_tasks')
        .select('template_id')
        .eq('company_id', companyId)
        .in('template_id', validTemplateIds);

      if (error) {
        console.error('Error fetching template usage counts:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        // Don't throw - just return empty counts so the page still works
        return;
      }

      // Count occurrences of each template_id
      const counts = new Map<string, number>();
      data?.forEach((task: any) => {
        if (task.template_id) {
          counts.set(task.template_id, (counts.get(task.template_id) || 0) + 1);
        }
      });

      setTemplateUsageCounts(counts);
    } catch (error: any) {
      console.error('Failed to fetch template usage counts:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack
      });
      // Don't throw - just continue without usage counts
    }
  }

  // Filter templates based on search term and category
  useEffect(() => {
    let filtered = templates;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(template => {
        const nameMatch = template.name?.toLowerCase().includes(searchLower);
        const descMatch = template.description?.toLowerCase().includes(searchLower);
        const categoryMatch = template.category?.toLowerCase().includes(searchLower);
        const standardMatch = template.compliance_standard?.toLowerCase().includes(searchLower);
        const auditCategoryMatch = template.audit_category?.toLowerCase().includes(searchLower);
        
        return nameMatch || descMatch || categoryMatch || standardMatch || auditCategoryMatch;
      });
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(template => {
        return template.audit_category === filterCategory || template.category === filterCategory;
      });
    }

    setFilteredTemplates(filtered);
  }, [searchTerm, filterCategory, templates]);

  const handleTaskCreated = () => {
    setSelectedTemplateId(null); // Close modal
    setSelectedTemplate(null); // Clear selected template
    // Refresh usage counts after task creation
    if (templates.length > 0) {
      fetchTemplateUsageCounts(templates.map(t => t.id));
    }
  };

  // Handle template click - opens TaskFromTemplateModal to create a task
  const handleUseTemplate = (template: TaskTemplate) => {
    setSelectedTemplateId(template.id);
    setSelectedTemplate(template);
  };

  const getTemplateIcon = (template: TaskTemplate) => {
    const category = template.category?.toLowerCase() || '';
    if (category.includes('food')) return Utensils;
    if (category.includes('fire')) return Flame;
    if (category.includes('health') || category.includes('safety')) return ShieldAlert;
    return ClipboardCheck;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'food_safety': 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/20',
      'health_safety': 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/20',
      'fire_safety': 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/20',
      'cleaning': 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/20',
      'compliance': 'bg-[#D37E91]/10 dark:bg-[#D37E91]/15 text-[#D37E91] dark:text-[#D37E91] border-[#D37E91] dark:border-[#D37E91]/20',
      'maintenance': 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/20'
    };
    return colors[category] || 'bg-gray-100 dark:bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-500/20';
  };

  const getAuditCategoryColor = (auditCategory: string) => {
    const colors: Record<string, string> = {
      'food_safety': 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/20',
      'health_safety': 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/20',
      'fire_safety': 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/20',
      'cleaning': 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/20',
      'compliance': 'bg-[#D37E91]/10 dark:bg-[#D37E91]/15 text-[#D37E91] dark:text-[#D37E91] border-[#D37E91] dark:border-[#D37E91]/20',
      'maintenance': 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/20'
    };
    return colors[auditCategory] || 'bg-gray-100 dark:bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-500/20';
  };

  const categories = [...new Set(templates.map(t => t.audit_category || t.category).filter(Boolean))].sort();

  return (
    <div className="bg-[rgb(var(--surface-elevated))] dark:bg-[#0f1220] text-[rgb(var(--text-primary))] dark:text-white border border-[rgb(var(--border))] dark:border-neutral-800 rounded-xl p-4 sm:p-6 lg:p-8">
      <BackToSetup />
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-2">Compliance Templates</h1>
        <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm sm:text-base">Pre-built EHO compliance task templates for food safety, health & safety, and regulatory requirements</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-tertiary))] dark:text-white/40 w-4 h-4" />
          <input
            type="text"
            placeholder="Search compliance templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-theme-button dark:bg-white/[0.06] border border-theme dark:border-white/[0.1] rounded-lg text-theme-primary dark:text-white placeholder:text-theme-tertiary dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
          />
        </div>
        
        <div className="w-full sm:w-auto">
          <Select
            value={filterCategory}
            onValueChange={setFilterCategory}
            options={[
              { label: 'All Categories', value: 'all' },
              ...categories.map(category => ({
                label: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                value: category
              }))
            ]}
            placeholder="All Categories"
            className="w-full sm:w-auto"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#D37E91]"></div>
          <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 mt-2">Loading compliance templates...</p>
        </div>
      )}

      {/* Templates Grid */}
      {!loading && filteredTemplates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {filteredTemplates.map((template) => {
            const Icon = getTemplateIcon(template);
            const category = template.audit_category || template.category || 'other';
            
            return (
              <div
                key={template.id}
                className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-lg p-5 hover:bg-theme-button-hover dark:hover:bg-white/[0.06] transition-colors cursor-pointer relative group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-[#D37E91]/15 rounded-lg flex-shrink-0">
                        <Icon className="w-4 h-4 text-[#D37E91] dark:text-[#D37E91]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white">{template.name}</h3>
                    </div>
                    {template.description && (
                      <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm mb-3 line-clamp-2">{template.description}</p>
                    )}
                  </div>
                  {(() => {
                    const usageCount = templateUsageCounts.get(template.id) || 0;
                    if (usageCount > 0) {
                      return (
                        <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-500/30 rounded-full whitespace-nowrap flex-shrink-0">
                          {usageCount} in use
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Category and Critical Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getAuditCategoryColor(category)}`}>
                    {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  {template.is_critical && (
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30 rounded-full text-xs font-medium">
                      Critical
                    </span>
                  )}
                  {template.compliance_standard && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30 rounded-full text-xs font-medium">
                      {template.compliance_standard}
                    </span>
                  )}
                </div>

                {/* Frequency and Dayparts */}
                <div className="flex items-center gap-4 text-xs text-[rgb(var(--text-tertiary))] dark:text-white/50 mb-4">
                  {template.frequency && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{FREQUENCY_LABELS[template.frequency] || template.frequency}</span>
                    </div>
                  )}
                  {template.dayparts && template.dayparts.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{template.dayparts.length} daypart{template.dayparts.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                {/* Use Template Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseTemplate(template);
                  }}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-[#D37E91]/10 dark:bg-[#D37E91]/25 border border-[#D37E91] dark:border-[#D37E91]/40 rounded-lg text-[#D37E91] dark:text-[#D37E91] hover:bg-[#D37E91]/20 dark:hover:bg-[#D37E91]/35 transition-colors group-hover:border-[#D37E91] dark:group-hover:border-[#D37E91]/60"
                >
                  <Copy className="h-4 w-4" />
                  <span className="text-sm font-medium">Use Template</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTemplates.length === 0 && (
        <div className="mt-8 text-center py-12">
          <FileText className="h-12 w-12 text-[rgb(var(--text-tertiary))] dark:text-white/20 mx-auto mb-4" />
          <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 mb-2">
            {searchTerm || filterCategory !== 'all' 
              ? 'No templates match your search' 
              : 'No compliance templates available'}
          </p>
          {searchTerm || filterCategory !== 'all' ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('all');
              }}
              className="text-[#D37E91] dark:text-[#D37E91] hover:text-[#D37E91] dark:hover:text-[#D37E91] text-sm mt-2"
            >
              Clear filters
            </button>
          ) : (
            <p className="text-[rgb(var(--text-tertiary))] dark:text-white/40 text-sm">Compliance templates will appear here when available</p>
          )}
        </div>
      )}

      {/* Template count */}
      {!loading && filteredTemplates.length > 0 && (
        <div className="mt-6 text-sm text-[rgb(var(--text-tertiary))] dark:text-white/40">
          Showing {filteredTemplates.length} of {templates.length} compliance templates
        </div>
      )}

      {/* TaskFromTemplateModal - Opens when a template is clicked */}
      {selectedTemplateId && (
        <TaskFromTemplateModal
          isOpen={!!selectedTemplateId}
          onClose={() => {
            setSelectedTemplateId(null);
            setSelectedTemplate(null);
          }}
          templateId={selectedTemplateId}
          template={selectedTemplate || undefined}
          onSave={handleTaskCreated}
          sourcePage="compliance"
        />
      )}
    </div>
  );
}
