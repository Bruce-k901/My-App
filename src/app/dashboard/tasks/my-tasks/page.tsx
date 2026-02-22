"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Calendar, Trash2, Edit2, X, Play, Pause, Loader2, ChevronDown, ChevronUp } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { TaskFromTemplateModal } from '@/components/templates/TaskFromTemplateModal';
import { TemperatureCheckTemplate } from '@/components/compliance/TemperatureCheckTemplate';
import { HotHoldingTemplate } from '@/components/compliance/HotHoldingTemplate';
import { FireAlarmTestTemplate } from '@/components/compliance/FireAlarmTestTemplate';
import { EmergencyLightingTemplate } from '@/components/compliance/EmergencyLightingTemplate';

export default function MyTasksPage() {
  const { profile, companyId, loading: authLoading, siteId, selectedSiteId, setSelectedSite } = useAppContext();
  const { showToast } = useToast();
  
  // Ensure staff always have their home site selected (can't change it)
  useEffect(() => {
    if (profile?.id && profile?.app_role?.toLowerCase() === 'staff') {
      const homeSiteId = profile?.home_site || profile?.site_id;
      if (homeSiteId && selectedSiteId !== homeSiteId) {
        console.log('🔒 Staff: Forcing selectedSiteId to home site:', homeSiteId);
        setSelectedSite(homeSiteId);
      }
    }
  }, [profile?.id, profile?.app_role, profile?.home_site, profile?.site_id, selectedSiteId, setSelectedSite]);
  
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [configs, setConfigs] = useState([]); // Task configurations (site_checklists)
  const [assetsMap, setAssetsMap] = useState<Record<string, { name: string }>>({}); // Map of assetId to asset name
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<any>(null); // For editing configurations
  const [expandedEquipment, setExpandedEquipment] = useState<Record<string, boolean>>({}); // Track which configs have equipment expanded
  const [sitesMap, setSitesMap] = useState<Record<string, { id: string; name: string }>>({}); // Map of siteId to site name

  const loadConfigs = async () => {
    if (!companyId) {
      setLoadingConfigs(false);
      return;
    }
    
    // Wait for profile to load if not available
    if (!profile) {
      console.log('⏳ Waiting for profile to load...');
      setLoadingConfigs(false);
      return;
    }
    
    try {
      setLoadingConfigs(true);
      // Fetch site_checklists (task configurations)
      // Everyone sees configurations for their home site
      // Managers/owners can use header selector to view other sites' configurations
      const userRole = profile?.app_role?.toLowerCase() || 'staff';
      const isManager = ['manager', 'general_manager', 'admin', 'owner'].includes(userRole);
      const homeSiteId = profile?.home_site || profile?.site_id;
      
      // Determine effective site ID:
      // - Staff: always use home site (ignore selectedSiteId)
      // - Managers: use selectedSiteId if it's a specific site, otherwise show all company configs
      let effectiveSiteId: string | null = null;
      if (isManager) {
        // Managers can cycle through sites using header selector
        // If selectedSiteId is set and not 'all', filter by that site
        // Otherwise show all active configurations for the company (no site filter)
        if (selectedSiteId && selectedSiteId !== 'all' && selectedSiteId !== null) {
          effectiveSiteId = selectedSiteId;
        } else {
          effectiveSiteId = null; // Show all sites for the company
        }
      } else {
        effectiveSiteId = homeSiteId;
      }

      // Staff must have a site — bail if not
      if (!isManager && !effectiveSiteId) {
        setConfigs([]);
        setLoadingConfigs(false);
        return;
      }

      let query = supabase
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
        .eq('active', true);

      // Only filter by site_id when a specific site is selected
      // Managers with no site selected see all configs for the company
      if (effectiveSiteId) {
        query = query.eq('site_id', effectiveSiteId);
      }
      
      const { data: configsData, error } = await query
        .order('frequency', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading configurations:', error);
        setConfigs([]);
        return;
      }
      
      // Fetch sites separately and map them
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

      // Collect all asset IDs from equipment_config to fetch asset names
      const assetIds: string[] = [];
      (configsData || []).forEach((config: any) => {
        if (config.equipment_config && Array.isArray(config.equipment_config)) {
          config.equipment_config.forEach((eq: any) => {
            if (eq.assetId && !assetIds.includes(eq.assetId)) {
              assetIds.push(eq.assetId);
            }
          });
        }
      });

      // Fetch asset names if we have asset IDs
      let assetsMap: Record<string, { name: string }> = {};
      if (assetIds.length > 0) {
        const { data: assetsData } = await supabase
          .from('assets')
          .select('id, name')
          .in('id', assetIds);
        
        if (assetsData) {
          assetsMap = assetsData.reduce((acc: Record<string, { name: string }>, asset: any) => {
            acc[asset.id] = { name: asset.name };
            return acc;
          }, {});
        }
      }

      setAssetsMap(assetsMap);

      // Enrich configs with site data
      const enrichedConfigs = (configsData || []).map((config: any) => ({
        ...config,
        site: sitesMap[config.site_id] || null
      }));

      setConfigs(enrichedConfigs);
    } catch (error) {
      console.error('Error loading configurations:', error);
      setConfigs([]);
    } finally {
      setLoadingConfigs(false);
    }
  };


  // Watch for selectedSiteId changes and log them
  useEffect(() => {
    console.log('🔄 selectedSiteId changed:', selectedSiteId);
  }, [selectedSiteId]);
  
  useEffect(() => {
    console.log('🔄 useEffect triggered:', {
      companyId,
      profileId: profile?.id,
      homeSiteId: profile?.home_site || profile?.site_id,
      selectedSiteId,
      app_role: profile?.app_role,
      hasProfile: !!profile
    });
    
    if (companyId && profile?.id) {
      // Wait for profile to have home_site before loading (especially for staff)
      const homeSiteId = profile?.home_site || profile?.site_id;
      const userRole = profile?.app_role?.toLowerCase() || 'staff';
      const isManager = ['manager', 'general_manager', 'admin', 'owner'].includes(userRole);
      
      // Staff MUST have a home_site to load configs
      // Managers can load even without home_site (they can use selectedSiteId)
      if (isManager || homeSiteId) {
        console.log('✅ Calling loadConfigs()', { isManager, homeSiteId });
        loadConfigs();
      } else {
        console.log('⏸️ Not calling loadConfigs - staff member has no home_site');
      }
    } else {
      console.log('⏸️ Not calling loadConfigs - missing companyId or profile.id', { companyId: !!companyId, profileId: !!profile?.id });
    }
  }, [companyId, profile?.id, profile?.home_site, profile?.site_id, profile?.app_role, selectedSiteId]);

  // Show loading only while auth is initializing
  if (authLoading) {
    return (
      <div className="p-8">
        <div className="text-[rgb(var(--text-primary))] dark:text-white">Loading...</div>
      </div>
    );
  }

  // If no company after auth loads, show setup message
  if (!companyId) {
    return (
      <div className="p-8">
        <div className="bg-yellow-500/10 dark:bg-yellow-500/10 border border-yellow-500/20 dark:border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
            Company Setup Required
          </h2>
          <p className="text-[rgb(var(--text-secondary))] dark:text-theme-secondary mb-4">
            Please complete your company setup before accessing this page.
          </p>
          <a 
            href="/dashboard/business" 
            className="inline-block px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] rounded-lg transition-all duration-200"
          >
            Go to Business Details
          </a>
        </div>
      </div>
    );
  }


  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      'in_progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'completed': 'bg-green-500/10 text-green-400 border-green-500/20',
      'overdue': 'bg-red-500/10 text-red-400 border-red-500/20',
      'failed': 'bg-red-500/10 text-red-400 border-red-500/20',
      'skipped': 'bg-theme-surface-elevated0/10 text-theme-tertiary border-gray-500/20'
    };
    return colors[status] || 'bg-theme-surface-elevated0/10 text-theme-tertiary border-gray-500/20';
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
    return colors[category] || 'bg-theme-surface-elevated0/10 text-theme-tertiary';
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

  const getTimeSummary = (config: any) => {
    if (config.daypart_times && typeof config.daypart_times === 'object') {
      const times: string[] = [];
      for (const [daypart, timeValue] of Object.entries(config.daypart_times)) {
        if (Array.isArray(timeValue)) {
          times.push(...timeValue);
        } else {
          times.push(timeValue as string);
        }
      }
      return times.length > 0 ? `${times.length} time${times.length > 1 ? 's' : ''}` : 'No times';
    }
    return 'Single time';
  };

  return (
    <div className="w-full -mt-[72px] pt-[72px] p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-2">
          My Tasks
          {selectedSiteId && sitesMap[selectedSiteId] && (
            <span className="text-lg font-normal text-[rgb(var(--text-secondary))] dark:text-theme-tertiary ml-2">
              - {sitesMap[selectedSiteId].name}
            </span>
          )}
        </h1>
        <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">View and manage task configurations for your home site</p>
      </div>

      {/* Show Configurations */}
      {loadingConfigs ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-module-fg/10 dark:bg-module-fg/15 mb-4">
                <Loader2 className="w-8 h-8 text-module-fg dark:text-module-fg animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-2">Loading configurations...</h3>
            </div>
          ) : configs.length === 0 ? (
            <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-module-fg/10 dark:bg-module-fg/15 mb-4">
                  <CheckCircle className="w-8 h-8 text-module-fg dark:text-module-fg" />
                </div>
                <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-2">No task configurations</h2>
                <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary max-w-md mx-auto">
                  Create task configurations from the Compliance or Templates pages to generate recurring tasks.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map((config: any) => {
                const templateName = config.template?.name || config.name || 'Unknown Template';
                const siteName = config.site?.name || (config as any).sites?.name || 'Unknown Site';

                return (
                  <div
                    key={config.id}
                    className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-lg p-5 hover:bg-theme-surface-elevated dark:hover:bg-white/[0.06] transition-colors"
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

                        <div className="flex items-center gap-4 text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-2">
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
                          <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mt-2">
                            <button
                              onClick={() => setExpandedEquipment(prev => ({
                                ...prev,
                                [config.id]: !prev[config.id]
                              }))}
                              className="flex items-center gap-1 font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors mb-1"
                            >
                              {expandedEquipment[config.id] ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                              <span>Equipment ({config.equipment_config.length})</span>
                            </button>
                            {expandedEquipment[config.id] && (
                              <div className="space-y-1 ml-4 mt-1">
                                {config.equipment_config.map((eq: any, idx: number) => {
                                  // Try multiple ways to get the equipment name
                                  // Priority: nickname > equipment name > asset name from lookup > 'Unknown'
                                  let equipmentName = 'Unknown';
                                  if (eq.nickname && eq.nickname.trim()) {
                                    equipmentName = eq.nickname;
                                  } else if (eq.equipment && eq.equipment.trim()) {
                                    equipmentName = eq.equipment;
                                  } else if (eq.assetId && assetsMap[eq.assetId]?.name) {
                                    equipmentName = assetsMap[eq.assetId].name;
                                  } else if (eq.name && eq.name.trim()) {
                                    equipmentName = eq.name;
                                  }
                                  
                                  // Format temperature range
                                  const hasTempRange = eq.temp_min !== undefined && eq.temp_min !== null 
                                    || eq.temp_max !== undefined && eq.temp_max !== null;
                                  const tempRangeStr = hasTempRange 
                                    ? (eq.temp_min !== undefined && eq.temp_min !== null && eq.temp_max !== undefined && eq.temp_max !== null
                                        ? `${eq.temp_min}°C - ${eq.temp_max}°C`
                                        : eq.temp_min !== undefined && eq.temp_min !== null
                                          ? `Min: ${eq.temp_min}°C`
                                          : `Max: ${eq.temp_max}°C`)
                                    : null;
                                  
                                  return (
                                    <div key={idx} className="ml-2">
                                      <span className="font-medium">{equipmentName}</span>
                                      {tempRangeStr && (
                                        <span className="ml-2 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
                                          ({tempRangeStr})
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingConfig(config);
                          }}
                          className="p-2 rounded-lg hover:bg-[rgb(var(--surface-elevated))] dark:hover:bg-white/10 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary"
                          title="Edit Configuration"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('Are you sure you want to delete this configuration? This will stop generating tasks for this template.')) {
                              return;
                            }
                            try {
                              const { error } = await supabase
                                .from('site_checklists')
                                .update({ active: false })
                                .eq('id', config.id);
                              if (error) throw error;
                              showToast({ title: 'Configuration deleted', description: 'Configuration has been deleted successfully', type: 'success' });
                              loadConfigs();
                            } catch (error: any) {
                              showToast({ title: 'Error', description: error.message || 'Failed to delete configuration', type: 'error' });
                            }
                          }}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400"
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
          onSave={() => {
            setEditingConfig(null);
            loadConfigs();
            showToast({ title: 'Configuration updated', description: 'Configuration has been updated successfully', type: 'success' });
          }}
          templateId={editingConfig.template_id}
          template={editingConfig.template}
          existingSiteChecklist={editingConfig}
        />
      )}

      {/* Template Editor Modal */}
      {editingTemplate && editingTemplateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 dark:bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#141823] border border-[rgb(var(--border))] dark:border-white/[0.1] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-[#141823] border-b border-[rgb(var(--border))] dark:border-white/[0.1] p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white">Edit Task</h2>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setEditingTemplateId(null);
                }}
                className="p-2 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/10 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors"
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
                        loadConfigs(); // Refresh configurations
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
                    <div className="p-4 bg-yellow-500/10 dark:bg-yellow-500/10 border border-yellow-500/20 dark:border-yellow-500/20 rounded-lg">
                      <p className="text-yellow-800 dark:text-yellow-200 text-sm mb-2">
                        Template editing is not yet available for this template type. 
                        Please use the Templates page to edit this template.
                      </p>
                      <div className="text-xs text-yellow-900 dark:text-yellow-300/80 bg-black/[0.05] dark:bg-black/20 p-3 rounded overflow-auto max-h-60 mt-2">
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
