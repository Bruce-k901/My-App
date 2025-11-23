"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { TaskFromTemplateModal } from "@/components/templates/TaskFromTemplateModal";
import { Search, Clock, FileText, Calendar, Copy, Filter, CheckCircle2, Utensils, ShieldAlert, Flame, ClipboardCheck } from "lucide-react";
import { TaskTemplate } from "@/types/checklist-types";
import { useAppContext } from "@/context/AppContext";
import { COMPLIANCE_MODULE_SLUGS } from "@/data/compliance-templates";
import { enrichTemplateWithDefinition } from "@/lib/templates/enrich-template";

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
  const hasAttemptedSeed = useRef(false);
  const shouldAutoSeed = process.env.NEXT_PUBLIC_ENABLE_COMPLIANCE_TEMPLATE_AUTOFILL === "true";

  async function seedGlobalTemplates() {
    if (!shouldAutoSeed) {
      return false;
    }
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
        return false;
      }

      const result = await response.json().catch(() => ({}));
      console.log("Compliance templates seeded:", result);
      return true;
    } catch (error) {
      console.error("Error seeding compliance templates:", error);
      return false;
    }
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
      setTemplates([]);
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

      if (shouldAutoSeed && missingSlugs.length > 0) {
        console.log("Missing compliance templates detected:", missingSlugs);
        const seeded = await seedGlobalTemplates();
        if (seeded) {
          await fetchTemplates();
          return;
        }
      }
      console.log('Fetched compliance templates:', templatesData.length, 'templates');
      if (templatesData.length) {
        console.log('Template names:', templatesData.map((t: any) => t.name));
      }
      
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
    // Optionally refresh templates if needed
  };

  // Handle template click - opens TaskFromTemplateModal to create a task
  const handleUseTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
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
      'food_safety': 'bg-green-500/10 text-green-400 border-green-500/20',
      'health_safety': 'bg-red-500/10 text-red-400 border-red-500/20',
      'fire_safety': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'cleaning': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'compliance': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      'maintenance': 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    };
    return colors[category] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const getAuditCategoryColor = (auditCategory: string) => {
    const colors: Record<string, string> = {
      'food_safety': 'bg-green-500/10 text-green-400 border-green-500/20',
      'health_safety': 'bg-red-500/10 text-red-400 border-red-500/20',
      'fire_safety': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'cleaning': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'compliance': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      'maintenance': 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    };
    return colors[auditCategory] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const categories = [...new Set(templates.map(t => t.audit_category || t.category).filter(Boolean))].sort();

  return (
    <div className="bg-[#0f1220] text-white border border-neutral-800 rounded-xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Compliance Templates</h1>
        <p className="text-white/60 text-sm sm:text-base">Pre-built EHO compliance task templates for food safety, health & safety, and regulatory requirements</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
          <input
            type="search"
            inputMode="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            enterKeyHint="search"
            placeholder="Search compliance templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500/40 text-base"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4 pointer-events-none" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full sm:w-auto pl-10 pr-8 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500/40 appearance-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          <p className="text-white/60 mt-2">Loading compliance templates...</p>
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
                className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5 hover:bg-white/[0.06] transition-colors cursor-pointer relative group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-pink-500/10 rounded-lg flex-shrink-0">
                        <Icon className="w-4 h-4 text-pink-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                    </div>
                    {template.description && (
                      <p className="text-white/60 text-sm mb-3 line-clamp-2">{template.description}</p>
                    )}
                  </div>
                  {template.company_id === null && (
                    <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full whitespace-nowrap flex-shrink-0">
                      Global
                    </span>
                  )}
                </div>

                {/* Category and Critical Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getAuditCategoryColor(category)}`}>
                    {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  {template.is_critical && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-medium">
                      Critical
                    </span>
                  )}
                  {template.compliance_standard && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-medium">
                      {template.compliance_standard}
                    </span>
                  )}
                </div>

                {/* Frequency and Dayparts */}
                <div className="flex items-center gap-4 text-xs text-white/50 mb-4">
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
                    // Add vibration for tactile feedback
                    if ('vibrate' in navigator) {
                      navigator.vibrate(10); // Short vibration
                    }
                    handleUseTemplate(template.id);
                  }}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-pink-500/20 border border-pink-500/40 rounded-lg text-pink-400 active:bg-pink-500/40 active:scale-[0.98] transition-all touch-manipulation min-h-[44px]"
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
          <FileText className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-2">
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
              className="text-pink-400 hover:text-pink-300 text-sm mt-2"
            >
              Clear filters
            </button>
          ) : (
            <p className="text-white/40 text-sm">Compliance templates will appear here when available</p>
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
