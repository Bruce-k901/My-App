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

export default function CompliancePage() {
  const { companyId } = useAppContext();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [companyId]);

  async function fetchTemplates() {
    try {
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
      
      const uniqueTemplates = Array.from(templatesMap.values());
      setTemplates(uniqueTemplates);
      setFilteredTemplates(uniqueTemplates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  // Filter templates based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTemplates(templates);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = templates.filter(template => {
      const nameMatch = template.name?.toLowerCase().includes(searchLower);
      const descMatch = template.description?.toLowerCase().includes(searchLower);
      const categoryMatch = template.category?.toLowerCase().includes(searchLower);
      const standardMatch = template.compliance_standard?.toLowerCase().includes(searchLower);
      
      return nameMatch || descMatch || categoryMatch || standardMatch;
    });

    setFilteredTemplates(filtered);
  }, [searchTerm, templates]);

  const toggleExpand = (templateId: string) => {
    setExpandedTemplates(prev => {
      const next = new Set(prev);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  };

  const handleTaskCreated = () => {
    setSelectedTemplateId(null); // Close modal
    // Optionally refresh templates if needed
  };

  // Handle template click - opens TaskFromTemplateModal to create a task
  const handleUseTemplate = (templateId: string, e?: React.MouseEvent) => {
    // Prevent triggering when clicking Edit or Expand buttons
    if (e && (e.target as HTMLElement).closest('button')) {
      return;
    }
    setSelectedTemplateId(templateId);
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

  const getTemplateIcon = (template: TaskTemplate) => {
    const category = template.category?.toLowerCase() || '';
    if (category.includes('food')) return Utensils;
    if (category.includes('fire')) return Flame;
    if (category.includes('health') || category.includes('safety')) return ShieldAlert;
    return ClipboardCheck;
  };

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
                  
                  return (
                    <div
                      key={template.id}
                      onClick={(e) => handleUseTemplate(template.id, e)}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-3 bg-pink-500/10 rounded-lg">
                            <Icon className="w-6 h-6 text-pink-400" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-white">
                                {template.name}
                              </h3>
                              {template.is_critical && (
                                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded">
                                  Critical
                                </span>
                              )}
                            </div>
                            
                            {template.description && (
                              <p className="text-white/60 text-sm mb-3 line-clamp-2">
                                {template.description}
                              </p>
                            )}
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
                              {template.frequency && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>{FREQUENCY_LABELS[template.frequency] || template.frequency}</span>
                                </div>
                              )}
                              
                              {template.compliance_standard && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>{template.compliance_standard}</span>
                                </div>
                              )}
                            </div>
                            
                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                                {template.instructions && (
                                  <div>
                                    <p className="text-xs font-semibold text-white/70 uppercase mb-1">Instructions</p>
                                    <p className="text-sm text-white/60">{template.instructions}</p>
                                  </div>
                                )}
                                
                                {template.assigned_to_role && (
                                  <div>
                                    <p className="text-xs font-semibold text-white/70 uppercase mb-1">Assigned To</p>
                                    <p className="text-sm text-white/60 capitalize">{template.assigned_to_role.replace(/_/g, ' ')}</p>
                                  </div>
                                )}
                                
                                {template.dayparts && template.dayparts.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-white/70 uppercase mb-1">Dayparts</p>
                                    <p className="text-sm text-white/60">{template.dayparts.map(dp => dp.charAt(0).toUpperCase() + dp.slice(1)).join(', ')}</p>
                                  </div>
                                )}
                                
                                {template.evidence_types && template.evidence_types.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-white/70 uppercase mb-1">Evidence Types</p>
                                    <p className="text-sm text-white/60">{template.evidence_types.map(et => et.charAt(0).toUpperCase() + et.slice(1).replace(/_/g, ' ')).join(', ')}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleEditTemplate(template, e)}
                            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Use template to create task"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(template.id);
                            }}
                            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-white/60 mb-4">No compliance templates found</p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-pink-400 hover:text-pink-300"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Template count */}
      {!loading && filteredTemplates.length > 0 && (
        <div className="mt-6 text-sm text-white/40">
          Showing {filteredTemplates.length} of {templates.length} compliance templates
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
