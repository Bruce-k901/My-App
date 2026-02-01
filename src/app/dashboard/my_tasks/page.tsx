"use client";

import { useState, useEffect } from 'react';
import { Clock, Calendar, Edit2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import { TaskFromTemplateModal } from '@/components/templates/TaskFromTemplateModal';

interface TaskTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  frequency: string;
  is_critical?: boolean;
}

interface SiteChecklist {
  id: string;
  site_id: string;
  company_id: string;
  template_id: string;
  name: string;
  frequency: string;
  active: boolean;
  daypart_times?: Record<string, string | string[]>;
  equipment_config?: any;
  days_of_week?: number[];
  date_of_month?: number;
  anniversary_date?: string;
  created_at: string;
  updated_at: string;
  template?: TaskTemplate | null;
  site?: { name: string; id: string } | null;
}

export default function MyTasksPage() {
  const { companyId, siteId } = useAppContext();
  const [configs, setConfigs] = useState<SiteChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<SiteChecklist | null>(null);
  const [deletingConfigId, setDeletingConfigId] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      fetchConfigs();
    }
  }, [companyId, siteId]);
  
  // Refresh configs when page becomes visible (e.g., after redirect from task creation)
  useEffect(() => {
    const handleFocus = () => {
      if (companyId && document.visibilityState === 'visible') {
        fetchConfigs();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [companyId]);

  async function fetchConfigs() {
    if (!companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // My Tasks page shows site_checklists (configurations)
      // These are recurring task configurations that generate daily/weekly/monthly tasks
      // Fetch site_checklists with related data
      const { data: configsData, error } = await supabase
        .from('site_checklists')
        .select(`
          *,
          task_templates (
            id,
            name,
            slug,
            category,
            frequency,
            is_critical
          )
        `)
        .eq('company_id', companyId)
        .eq('active', true)
        .order('frequency', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching configurations:', error);
        setConfigs([]);
        return;
      }

      // Fetch sites separately and map them to configs
      const siteIds = [...new Set((configsData || []).map((c: any) => c.site_id).filter(Boolean))];
      let sitesMap: Record<string, { id: string; name: string }> = {};
      
      if (siteIds.length > 0) {
        const { data: sitesData } = await supabase
          .from('sites')
          .select('id, name')
          .in('id', siteIds);
        
        if (sitesData) {
          sitesMap = sitesData.reduce((acc: Record<string, { id: string; name: string }>, site: any) => {
            acc[site.id] = { id: site.id, name: site.name };
            return acc;
          }, {});
        }
      }

      // Enrich configs with site data
      const enrichedConfigs = (configsData || []).map((config: any) => ({
        ...config,
        site: sitesMap[config.site_id] || null
      }));

      setConfigs(enrichedConfigs);

    } catch (error) {
      console.error('Failed to fetch configurations:', error);
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this configuration? This will stop generating tasks for this template.')) {
      return;
    }

    setDeletingConfigId(configId);
    
    try {
      // Soft delete by setting active to false
      const { error } = await supabase
        .from('site_checklists')
        .update({ active: false })
        .eq('id', configId);

      if (error) throw error;

      toast.success('Configuration deleted successfully');
      fetchConfigs();
    } catch (error: any) {
      console.error('Error deleting configuration:', error);
      toast.error(`Failed to delete configuration: ${error.message}`);
    } finally {
      setDeletingConfigId(null);
    }
  };

  const handleEditConfig = (config: SiteChecklist) => {
    setEditingConfig(config);
  };

  const handleConfigUpdated = () => {
    setEditingConfig(null);
    fetchConfigs();
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly',
      'annually': 'Annually',
      'triggered': 'On Demand'
    };
    return labels[frequency] || frequency;
  };

  const getTimeSummary = (config: SiteChecklist) => {
    if (config.daypart_times && typeof config.daypart_times === 'object') {
      const times: string[] = [];
      for (const [daypart, timeValue] of Object.entries(config.daypart_times)) {
        if (Array.isArray(timeValue)) {
          times.push(...timeValue);
        } else {
          times.push(timeValue);
        }
      }
      return times.length > 0 ? `${times.length} time${times.length > 1 ? 's' : ''}` : 'No times';
    }
    return 'Single time';
  };

  return (
    <div className="bg-[rgb(var(--surface-elevated))] dark:bg-[#0f1220] text-[rgb(var(--text-primary))] dark:text-white border border-[rgb(var(--border))] dark:border-neutral-800 rounded-xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-2">My Tasks</h1>
        <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm sm:text-base">
          Configure recurring tasks. These configurations generate daily, weekly, or monthly task instances.
        </p>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="mt-8 text-center py-12">
          <Loader2 className="h-12 w-12 text-pink-500 mx-auto mb-4 animate-spin" />
          <p className="text-[rgb(var(--text-secondary))] dark:text-white/60">Loading configurations...</p>
        </div>
      ) : configs.length === 0 ? (
        <div className="mt-8 text-center py-12">
          <AlertCircle className="h-12 w-12 text-[rgb(var(--text-tertiary))] dark:text-white/20 mx-auto mb-4" />
          <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 mb-2">No task configurations yet</p>
          <p className="text-[rgb(var(--text-tertiary))] dark:text-white/40 text-sm">
            Create configurations from Compliance or Templates pages to generate recurring tasks
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {configs.map((config) => {
            const templateName = config.template?.name || config.name || 'Unknown Template';
            // Handle both 'site' (aliased) and 'sites' (if relationship name differs)
            const siteName = config.site?.name || (config as any).sites?.name || 'Unknown Site';

            return (
              <div
                key={config.id}
                className="bg-[rgb(var(--surface))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-lg p-5 hover:bg-[rgb(var(--surface-elevated))] dark:hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white">
                        {templateName}
                      </h3>
                      {config.template?.is_critical && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-500/20">
                          Critical
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[rgb(var(--text-tertiary))] dark:text-white/50 mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{getFrequencyLabel(config.frequency)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{getTimeSummary(config)}</span>
                      </div>
                      <span>{siteName}</span>
                    </div>

                    {config.equipment_config && Array.isArray(config.equipment_config) && config.equipment_config.length > 0 && (
                      <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40 mt-2">
                        Equipment: {config.equipment_config.map((eq: any) => eq.nickname || eq.equipment).join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditConfig(config)}
                      className="p-2 rounded-lg hover:bg-[rgb(var(--surface-elevated))] dark:hover:bg-white/10 text-[rgb(var(--text-tertiary))] dark:text-white/60"
                      title="Edit Configuration"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(config.id)}
                      disabled={deletingConfigId === config.id}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 disabled:opacity-50"
                      title="Delete Configuration"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Configuration Modal */}
      {editingConfig && editingConfig.template_id && (
        <TaskFromTemplateModal
          isOpen={true}
          onClose={() => setEditingConfig(null)}
          onSave={handleConfigUpdated}
          templateId={editingConfig.template_id}
          template={editingConfig.template}
          existingSiteChecklist={editingConfig}
        />
      )}
    </div>
  );
}

