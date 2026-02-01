"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { Thermometer, Download, Filter, X } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { Badge } from "@/components/ui/badge";
import TemperatureSparkline from "@/components/temperature/TemperatureSparkline";

type Asset = {
  id: string;
  name: string;
  type?: string; // May be category or type depending on schema
  category?: string;
  working_temp_min?: number | null;
  working_temp_max?: number | null;
};

type TempLog = {
  id: string;
  asset_id: string;
  reading: number;
  unit: string;
  recorded_at: string;
  day_part?: string | null;
  status: string; // Allow any string status value
  notes?: string | null;
  recorded_by?: string | null;
  profiles?: {
    full_name: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email: string | null;
  } | null;
  nickname?: string | null;
  display_name?: string | null;
  position?: {
    id: string;
    nickname: string | null;
    position_type?: string | null;
  } | null;
  asset?: {
    id: string;
    name: string;
    working_temp_min?: number | null;
    working_temp_max?: number | null;
  } | null;
  asset_name?: string | null;
  temp_min?: number | null;
  temp_max?: number | null;
  monitorTask?: any | null;
  created_at?: string;
  recorder?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

// Helper function: Calculate temperature status
const getTemperatureStatus = (
  temp: number | null,
  min: number | null | undefined,
  max: number | null | undefined
): { label: string; color: string; icon: string; variant: 'default' | 'destructive' | 'secondary' } => {
  if (temp === null || temp === undefined) {
    return { 
      label: 'Not Recorded', 
      color: 'text-gray-500 dark:text-gray-400', 
      icon: '○',
      variant: 'secondary'
    };
  }
  
  if (min === undefined || max === undefined || min === null || max === null) {
    return { 
      label: `Recorded (${temp}°C)`, 
      color: 'text-blue-500 dark:text-blue-400', 
      icon: '●',
      variant: 'default'
    };
  }
  
  // Handle inverted ranges (freezers where min > max, e.g. -18 to -20)
  const isInvertedRange = min > max;
  const actualMin = isInvertedRange ? max : min;
  const actualMax = isInvertedRange ? min : max;
  
  const inRange = temp >= actualMin && temp <= actualMax;
  
  if (inRange) {
    return { 
      label: `In Range (${temp}°C)`, 
      color: 'text-green-600 dark:text-green-400', 
      icon: '✓',
      variant: 'default'
    };
  } else {
    return { 
      label: `Out of Range (${temp}°C)`, 
      color: 'text-red-600 dark:text-red-400', 
      icon: '⚠',
      variant: 'destructive'
    };
  }
};

// Helper function: Format temperature range display
const formatTempRange = (min: number | null | undefined, max: number | null | undefined): string => {
  if (min === undefined || max === undefined || min === null || max === null) {
    return 'No range set';
  }
  
  // Handle inverted ranges (freezers)
  const isInverted = min > max;
  const actualMin = isInverted ? max : min;
  const actualMax = isInverted ? min : max;
  
  return `${actualMin}°C to ${actualMax}°C`;
};

// Helper function: Calculate time since last check for same asset
const calculateTimeSinceLastCheck = (
  currentLog: TempLog,
  allLogs: TempLog[]
): { display: string; hours: number } | null => {
  // Find all logs for same asset, sorted by date descending
  const assetLogs = allLogs
    .filter(log => log.asset_id === currentLog.asset_id)
    .sort((a, b) => new Date(b.recorded_at || b.created_at || '').getTime() - new Date(a.recorded_at || a.created_at || '').getTime());
  
  // Find current log index
  const currentIndex = assetLogs.findIndex(log => log.id === currentLog.id);
  
  // If there's a previous log
  if (currentIndex < assetLogs.length - 1) {
    const previousLog = assetLogs[currentIndex + 1];
    const minutes = differenceInMinutes(
      new Date(currentLog.recorded_at || currentLog.created_at || ''),
      new Date(previousLog.recorded_at || previousLog.created_at || '')
    );
    
    const hours = minutes / 60;
    
    // Format display
    let display: string;
    if (hours < 1) {
      // Less than 1 hour: show minutes
      display = `${minutes}m`;
    } else if (hours < 24) {
      // 1-24 hours: show hours and minutes
      const fullHours = Math.floor(hours);
      const remainingMinutes = minutes % 60;
      display = remainingMinutes > 0 
        ? `${fullHours}h ${remainingMinutes}m`
        : `${fullHours}h`;
    } else {
      // 24+ hours: show days and hours
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      display = remainingHours > 0
        ? `${days}d ${remainingHours}h`
        : `${days}d`;
    }
    
    return { display, hours };
  }
  
  return null;
};


// Helper function: Categorize equipment by temperature type
const categorizeEquipment = (logs: TempLog[]) => {
  return logs.reduce((acc, log) => {
    const min = log.temp_min ?? log.asset?.working_temp_min;
    const max = log.temp_max ?? log.asset?.working_temp_max;
    
    if (min === undefined || max === undefined || min === null || max === null) {
      acc.uncategorized.push(log);
    } else {
      const actualMax = Math.max(min, max);
      const actualMin = Math.min(min, max);
      
      if (actualMax < -10) {
        acc.frozen.push(log);
      } else if (actualMax <= 8) {
        acc.chilled.push(log);
      } else if (actualMin >= 50) {
        acc.hot.push(log);
      } else {
        acc.ambient.push(log);
      }
    }
    
    return acc;
  }, {
    frozen: [] as TempLog[],
    chilled: [] as TempLog[],
    hot: [] as TempLog[],
    ambient: [] as TempLog[],
    uncategorized: [] as TempLog[]
  });
};


export default function TemperatureLogsPage() {
  const { companyId, siteId } = useAppContext();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);
  const [logs, setLogs] = useState<TempLog[]>([]);
  const [enrichedLogs, setEnrichedLogs] = useState<TempLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Enhanced filters
  const [filterSite, setFilterSite] = useState<string>(siteId || "");
  const [filterAsset, setFilterAsset] = useState<string>("");
  const [filterAssetType, setFilterAssetType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterDayPart, setFilterDayPart] = useState<string>("");
  const [dateRangeStart, setDateRangeStart] = useState<string>("");
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("");
  const [showFilters, setShowFilters] = useState(true); // Show filters by default
  
  // Graph filters
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState<string>('chilled');
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<string>('all');
  
  // Export
  const [exportStart, setExportStart] = useState<string>("");
  const [exportEnd, setExportEnd] = useState<string>("");

  // Load sites
  useEffect(() => {
    const loadSites = async () => {
      if (!companyId) return;
      const { data, error } = await supabase
        .from("sites")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");
      if (error) {
        console.error("Error loading sites:", error);
      }
      setSites(data || []);
    };
    loadSites();
  }, [companyId]);

  // Load assets
  useEffect(() => {
    const loadAssets = async () => {
      if (!companyId) return;
      
      try {
        // If a specific site is selected, load assets from that site
        // If "All Sites" is selected (filterSite empty) and multiple sites exist, load from all sites
        // Otherwise, load from default siteId
        let query = supabase
          .from("assets")
          .select("id,name,category,working_temp_min,working_temp_max")
          .eq("company_id", companyId);
        
        if (filterSite) {
          query = query.eq("site_id", filterSite);
        } else if (sites.length <= 1 && siteId) {
          // Single site company - use default site
          query = query.eq("site_id", siteId);
        }
        // If multiple sites and filterSite is empty, don't filter by site (show all assets)
        
        query = query.order("name");
        const { data, error } = await query;
        
        if (error) {
          console.error("Error loading assets:", error);
          // Try without type/category if that's causing issues
          const fallbackQuery = supabase
            .from("assets")
            .select("id,name,working_temp_min,working_temp_max")
            .eq("company_id", companyId);
          
          if (filterSite) {
            fallbackQuery.eq("site_id", filterSite);
          } else if (sites.length <= 1 && siteId) {
            fallbackQuery.eq("site_id", siteId);
          }
          
          const { data: fallbackData, error: fallbackError } = await fallbackQuery.order("name");
          if (fallbackError) {
            console.error("Fallback assets query also failed:", fallbackError);
            setAssets([]);
          } else {
            setAssets((fallbackData || []).map(a => ({ ...a, type: a.category, category: a.category })));
          }
        } else {
          // Map category to type for backward compatibility
          setAssets((data || []).map(a => ({ ...a, type: a.category || a.type, category: a.category })));
        }
      } catch (err) {
        console.error("Unexpected error loading assets:", err);
        setAssets([]);
      }
    };
    loadAssets();
  }, [companyId, siteId, filterSite, sites.length]);

  // Load logs from both temperature_logs table AND task_completion_records
  useEffect(() => {
    const loadLogs = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const allLogs: TempLog[] = [];

      // 1. Load from temperature_logs table (if any exist)
      let tempLogsQuery = supabase
        .from("temperature_logs")
        .select(`
          id,
          asset_id,
          position_id,
          reading,
          unit,
          recorded_at,
          day_part,
          status,
          notes,
          recorded_by,
          profiles:recorded_by (full_name, email),
          position:site_equipment_positions!position_id (
            id,
            nickname,
            position_type
          ),
          asset:assets!asset_id (
            id,
            name,
            working_temp_min,
            working_temp_max,
            category
          )
        `)
        .eq("company_id", companyId)
        .order("recorded_at", { ascending: false })
        .limit(1000);

      if (filterSite) {
        tempLogsQuery = tempLogsQuery.eq("site_id", filterSite);
      } else if (sites.length <= 1 && siteId) {
        tempLogsQuery = tempLogsQuery.eq("site_id", siteId);
      }

      if (dateRangeStart) {
        tempLogsQuery = tempLogsQuery.gte("recorded_at", new Date(dateRangeStart).toISOString());
      }
      if (dateRangeEnd) {
        const endDate = new Date(dateRangeEnd);
        endDate.setHours(23, 59, 59, 999);
        tempLogsQuery = tempLogsQuery.lte("recorded_at", endDate.toISOString());
      }

      const { data: tempLogsData, error: tempLogsError } = await tempLogsQuery;

      // DEBUG: Log sample record to check position data
      console.log('🔍 [TEMP LOGS] Query result count:', tempLogsData?.length || 0);
      console.log('🔍 [TEMP LOGS] Sample record:', tempLogsData?.[0]);
      console.log('🔍 [TEMP LOGS] Position data:', tempLogsData?.[0]?.position);
      console.log('🔍 [TEMP LOGS] Asset data:', tempLogsData?.[0]?.asset);

      if (!tempLogsError && tempLogsData) {
        // Map the data to include display_name from position or asset
        const mappedLogs = (tempLogsData as any[]).map(log => ({
          ...log,
          nickname: log.position?.nickname || null,
          display_name: log.position?.nickname || log.asset?.name || 'Unknown Equipment'
        }));
        allLogs.push(...(mappedLogs as TempLog[]));
      }

      // 2. Load from task_completion_records (where most temperature data is stored)
      let completionQuery = supabase
        .from("task_completion_records")
        .select(`
          id,
          task_id,
          company_id,
          site_id,
          completed_at,
          completed_by,
          completion_data
        `)
        .eq("company_id", companyId)
        .not("completion_data", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1000);

      if (filterSite) {
        completionQuery = completionQuery.eq("site_id", filterSite);
      } else if (sites.length <= 1 && siteId) {
        completionQuery = completionQuery.eq("site_id", siteId);
      }

      if (dateRangeStart) {
        completionQuery = completionQuery.gte("completed_at", new Date(dateRangeStart).toISOString());
      }
      if (dateRangeEnd) {
        const endDate = new Date(dateRangeEnd);
        endDate.setHours(23, 59, 59, 999);
        completionQuery = completionQuery.lte("completed_at", endDate.toISOString());
      }

      const { data: completionRecords, error: completionError } = await completionQuery;
      
      // Initialize maps outside conditional block so they're available for nickname extraction
      const taskDetailsMap = new Map();
      const profilesMap = new Map();
      
      if (!completionError && completionRecords && completionRecords.length > 0) {
        console.log(`📊 Found ${completionRecords.length} completion records`);
        
        // Get task details and profiles separately
        const taskIds = completionRecords.map((r: any) => r.task_id).filter(Boolean);
        const userIds = completionRecords.map((r: any) => r.completed_by).filter(Boolean);
        
        // Fetch task details
        if (taskIds.length > 0) {
          const { data: tasksData } = await supabase
            .from("checklist_tasks")
            .select(`
              id,
              template_id,
              daypart,
              task_data,
              task_templates:template_id (
                name,
                asset_id,
                repeatable_field_name
              )
            `)
            .in("id", taskIds);
          
          if (tasksData) {
            tasksData.forEach((task: any) => {
              taskDetailsMap.set(task.id, {
                daypart: task.daypart,
                templateName: task.task_templates?.name || 'Unknown Task',
                templateAssetId: task.task_templates?.asset_id,
                repeatableFieldName: task.task_templates?.repeatable_field_name,
                taskData: task.task_data || {}
              });
            });
          }
        }
        
        // Fetch profiles
        if (userIds.length > 0) {
          const uniqueUserIds = [...new Set(userIds)];
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", uniqueUserIds);
          
          if (profilesData) {
            profilesData.forEach((profile: any) => {
              // Parse full_name to extract first and last name
              const fullName = profile.full_name || '';
              const nameParts = fullName.trim().split(/\s+/);
              const first_name = nameParts.length > 0 ? nameParts[0] : null;
              const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
              
              profilesMap.set(profile.id, {
                first_name,
                last_name,
                full_name: profile.full_name,
                email: profile.email
              });
            });
          }
        }
        
        // Extract temperature readings using the same logic as CompletedTaskCard
        completionRecords.forEach((record: any) => {
          const completionData = record.completion_data || {};
          const taskDetails = taskDetailsMap.get(record.task_id);
          const profile = profilesMap.get(record.completed_by);
          
          // Get assets from task_data (assets chosen when task was created)
          const taskData = taskDetails?.taskData || {};
          const assetsFromTaskData: any[] = [];
          
          // Check repeatable field
          if (taskDetails?.repeatableFieldName && taskData[taskDetails.repeatableFieldName]) {
            const repeatableField = taskData[taskDetails.repeatableFieldName];
            if (Array.isArray(repeatableField)) {
              repeatableField.forEach((item: any) => {
                // Properly extract asset ID from nested structures
                let assetId: string | null = null
                const rawId = item.value || item.asset_id || item.id
                
                if (rawId) {
                  if (typeof rawId === 'string') {
                    assetId = rawId
                  } else if (typeof rawId === 'object' && rawId !== null) {
                    // Extract from nested object
                    assetId = rawId.id || rawId.value || rawId.asset_id || rawId.assetId
                  }
                }
                
                // Only add if we have a valid asset ID (not "[object Object]")
                if (assetId && typeof assetId === 'string' && !assetId.includes('[object')) {
                  assetsFromTaskData.push({
                    asset_id: assetId,
                    asset_name: item.label || item.name || item.asset_name || 'Unknown Equipment'
                  });
                }
              });
            }
          }
          
          // METHOD 1: Extract from equipment_list (preferred format)
          if (completionData.equipment_list && Array.isArray(completionData.equipment_list)) {
            completionData.equipment_list.forEach((eq: any, index: number) => {
              // CRITICAL: Properly extract asset ID, handling "[object Object]" and nested objects
              let assetId: string | null = null
              const rawId = eq.asset_id || eq.assetId || eq.id || eq.value
              
              if (rawId) {
                if (typeof rawId === 'string') {
                  // Skip if it's "[object Object]" - try to find real ID from task_data
                  if (rawId === '[object Object]' || rawId.includes('[object')) {
                    // Try to find real asset ID from task_data by index
                    if (assetsFromTaskData.length > index) {
                      const taskDataAsset = assetsFromTaskData[index]
                      if (taskDataAsset && taskDataAsset.asset_id) {
                        assetId = typeof taskDataAsset.asset_id === 'string' 
                          ? taskDataAsset.asset_id 
                          : (taskDataAsset.asset_id.id || taskDataAsset.asset_id.value || taskDataAsset.asset_id.asset_id)
                      }
                    }
                    // If still no ID, try to match by asset_name
                    if (!assetId && eq.asset_name) {
                      const matchingAsset = assetsFromTaskData.find(a => 
                        a.asset_name === eq.asset_name || 
                        eq.asset_name?.includes(a.asset_name) ||
                        a.asset_name?.includes(eq.asset_name)
                      )
                      if (matchingAsset && matchingAsset.asset_id) {
                        assetId = typeof matchingAsset.asset_id === 'string'
                          ? matchingAsset.asset_id
                          : (matchingAsset.asset_id.id || matchingAsset.asset_id.value || matchingAsset.asset_id.asset_id)
                      }
                    }
                  } else {
                    assetId = rawId
                  }
                } else if (typeof rawId === 'object' && rawId !== null) {
                  // Extract from nested object
                  assetId = rawId.id || rawId.value || rawId.asset_id || rawId.assetId
                }
              }
              
              // Only process if we have a valid asset ID
              if (assetId && typeof assetId === 'string' && !assetId.includes('[object')) {
                const tempValue = eq.temperature !== undefined && eq.temperature !== null ? eq.temperature 
                  : (eq.reading !== undefined && eq.reading !== null ? eq.reading 
                  : (eq.temp !== undefined && eq.temp !== null ? eq.temp : null));
                
                // Handle 0 as valid temperature
                if (tempValue === 0 || tempValue === '0') {
                  const numValue = 0
                  allLogs.push({
                    id: `${record.id}_${assetId}`,
                    asset_id: assetId,
                    reading: numValue,
                    unit: '°C',
                    recorded_at: eq.recorded_at || record.completed_at,
                    day_part: taskDetails?.daypart || null,
                    status: eq.status || 'ok',
                    notes: `Recorded via task: ${taskDetails?.templateName || 'Unknown Task'}`,
                    recorded_by: record.completed_by,
                    profiles: profile || null
                  });
                } else if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
                  const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue;
                  if (!isNaN(numValue)) {
                    allLogs.push({
                      id: `${record.id}_${assetId}`,
                      asset_id: assetId,
                      reading: numValue,
                      unit: '°C',
                      recorded_at: eq.recorded_at || record.completed_at,
                      day_part: taskDetails?.daypart || null,
                      status: eq.status || 'ok',
                      notes: `Recorded via task: ${taskDetails?.templateName || 'Unknown Task'}`,
                      recorded_by: record.completed_by,
                      profiles: profile || null
                    });
                  }
                }
              }
            });
          }
          
          // METHOD 2: Extract from temperatures array
          if (completionData.temperatures && Array.isArray(completionData.temperatures)) {
            completionData.temperatures.forEach((temp: any) => {
              // Properly extract asset ID
              let assetId: string | null = null
              const rawId = temp.assetId || temp.asset_id || temp.id || temp.value
              
              if (rawId) {
                if (typeof rawId === 'string' && !rawId.includes('[object')) {
                  assetId = rawId
                } else if (typeof rawId === 'object' && rawId !== null) {
                  assetId = rawId.id || rawId.value || rawId.asset_id || rawId.assetId
                }
              }
              
              if (assetId && typeof assetId === 'string' && !assetId.includes('[object')) {
                const tempValue = temp.temp !== undefined && temp.temp !== null ? temp.temp 
                  : (temp.temperature !== undefined && temp.temperature !== null ? temp.temperature 
                  : (temp.reading !== undefined && temp.reading !== null ? temp.reading : null));
                
                if (tempValue !== undefined && tempValue !== null && tempValue !== '' && 
                    !allLogs.some(log => log.id === `${record.id}_${assetId}`)) {
                  const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue;
                  if (!isNaN(numValue)) {
                    allLogs.push({
                      id: `${record.id}_${assetId}`,
                      asset_id: assetId,
                      reading: numValue,
                      unit: '°C',
                      recorded_at: temp.recorded_at || temp.time || record.completed_at,
                      day_part: taskDetails?.daypart || null,
                      status: temp.status || 'ok',
                      notes: `Recorded via task: ${taskDetails?.templateName || 'Unknown Task'}`,
                      recorded_by: record.completed_by,
                      profiles: profile || null
                    });
                  }
                }
              }
            });
          }
          
          // METHOD 3: Extract from temp_${assetId} keys in completion_data
          assetsFromTaskData.forEach((asset) => {
            if (asset.asset_id && !allLogs.some(log => log.id === `${record.id}_${asset.asset_id}`)) {
              const tempKey = `temp_${asset.asset_id}`;
              const tempValue = completionData[tempKey];
              
              if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
                const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue;
                if (!isNaN(numValue)) {
                  allLogs.push({
                    id: `${record.id}_${asset.asset_id}`,
                    asset_id: asset.asset_id,
                    reading: numValue,
                    unit: '°C',
                    recorded_at: record.completed_at,
                    day_part: taskDetails?.daypart || null,
                    status: 'ok',
                    notes: `Recorded via task: ${taskDetails?.templateName || 'Unknown Task'}`,
                    recorded_by: record.completed_by,
                    profiles: profile || null
                  });
                }
              }
            }
          });
          
          // METHOD 4: Check all keys starting with temp_ in completion_data
          Object.keys(completionData).forEach((key) => {
            if (key.startsWith('temp_')) {
              const assetId = key.replace('temp_', '');
              if (assetId && !allLogs.some(log => log.id === `${record.id}_${assetId}`)) {
                const tempValue = completionData[key];
                if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
                  const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue;
                  if (!isNaN(numValue)) {
                    allLogs.push({
                      id: `${record.id}_${assetId}`,
                      asset_id: assetId,
                      reading: numValue,
                      unit: '°C',
                      recorded_at: record.completed_at,
                      day_part: taskDetails?.daypart || null,
                      status: 'ok',
                      notes: `Recorded via task: ${taskDetails?.templateName || 'Unknown Task'}`,
                      recorded_by: record.completed_by,
                      profiles: profile || null
                    });
                  }
                }
              }
            }
          });
          
          // METHOD 5: Single temperature field (template's linked asset)
          if (completionData.temperature !== undefined && completionData.temperature !== null && 
              completionData.temperature !== '' && taskDetails?.templateAssetId) {
            const assetId = taskDetails.templateAssetId;
            if (!allLogs.some(log => log.id === `${record.id}_${assetId}`)) {
              const numValue = typeof completionData.temperature === 'string' 
                ? parseFloat(completionData.temperature) 
                : completionData.temperature;
              if (!isNaN(numValue)) {
                allLogs.push({
                  id: `${record.id}_${assetId}`,
                  asset_id: assetId,
                  reading: numValue,
                  unit: '°C',
                  recorded_at: record.completed_at,
                  day_part: taskDetails?.daypart || null,
                  status: 'ok',
                  notes: `Recorded via task: ${taskDetails?.templateName || 'Unknown Task'}`,
                  recorded_by: record.completed_by,
                  profiles: profile || null
                });
              }
            }
          }
        });
        
        console.log(`✅ Extracted ${allLogs.length} temperature logs from completion records`);
      } else if (completionError) {
        console.error("Error loading from task_completion_records:", completionError);
      }

      // Sort by recorded_at descending and remove duplicates
      const uniqueLogs = Array.from(
        new Map(allLogs.map(log => [log.id, log])).values()
      ).sort((a, b) => 
        new Date(b.recorded_at || b.created_at || '').getTime() - new Date(a.recorded_at || a.created_at || '').getTime()
      );

      // Extract nicknames from completion data and task data
      const logsWithNicknames = uniqueLogs.map(log => {
        let nickname: string | null = null;

        // PRIORITY 1: Use position nickname from database join (most reliable)
        if (log.position?.nickname) {
          nickname = log.position.nickname;
          console.log(`✅ [NICKNAME] Using position nickname for ${log.asset_id}: ${nickname}`);
          return { ...log, nickname, display_name: nickname || log.asset?.name || 'Unknown Equipment' };
        }

        // PRIORITY 2: Use already-mapped nickname (from initial query mapping)
        if (log.nickname) {
          nickname = log.nickname;
          console.log(`✅ [NICKNAME] Using pre-mapped nickname for ${log.asset_id}: ${nickname}`);
          return { ...log, nickname, display_name: nickname || log.asset?.name || 'Unknown Equipment' };
        }

        // Helper to normalize asset ID for comparison
        const normalizeAssetId = (id: any): string | null => {
          if (!id) return null;
          if (typeof id === 'string') return id.trim();
          if (typeof id === 'object' && id !== null) {
            return (id.id || id.value || id.assetId || id.asset_id || '').toString().trim();
          }
          return String(id).trim();
        };

        const logAssetId = normalizeAssetId(log.asset_id);
        if (!logAssetId) {
          return { ...log, nickname: null };
        }

        // PRIORITY 3: Try to find nickname from completion records (fallback)
        if (completionRecords) {
          for (const record of completionRecords) {
            const completionData = record.completion_data || {};
            const taskDetails = taskDetailsMap.get(record.task_id);
            const taskData = taskDetails?.taskData || {};
            
            // Check equipment_list
            if (completionData.equipment_list && Array.isArray(completionData.equipment_list)) {
              const eq = completionData.equipment_list.find((e: any) => {
                const eqId = normalizeAssetId(e.asset_id || e.assetId || e.id || e.value);
                return eqId === logAssetId;
              });
              if (eq && eq.nickname) {
                nickname = eq.nickname;
                break;
              }
            }
            
            // Check temperatures array
            if (!nickname && completionData.temperatures && Array.isArray(completionData.temperatures)) {
              const temp = completionData.temperatures.find((t: any) => {
                const tempId = normalizeAssetId(t.assetId || t.asset_id || t.id || t.value);
                return tempId === logAssetId;
              });
              if (temp && temp.nickname) {
                nickname = temp.nickname;
                break;
              }
            }
            
            // Check task_data temperatures
            if (!nickname && taskData.temperatures && Array.isArray(taskData.temperatures)) {
              const temp = taskData.temperatures.find((t: any) => {
                const tempId = normalizeAssetId(t.assetId || t.asset_id || t.id || t.value);
                return tempId === logAssetId;
              });
              if (temp && temp.nickname) {
                nickname = temp.nickname;
                break;
              }
            }
            
            // Check task_data equipment_config (most reliable source)
            if (!nickname && taskData.equipment_config && Array.isArray(taskData.equipment_config)) {
              const eq = taskData.equipment_config.find((e: any) => {
                const eqId = normalizeAssetId(e.assetId || e.asset_id || e.id || e.value);
                return eqId === logAssetId;
              });
              if (eq && eq.nickname) {
                nickname = eq.nickname;
                break;
              }
            }
          }
        }
        
        // Also check task_data directly from taskDetailsMap (if task wasn't completed yet)
        if (!nickname && taskDetailsMap) {
          for (const [taskId, taskDetails] of taskDetailsMap.entries()) {
            const taskData = taskDetails.taskData || {};
            if (taskData.equipment_config && Array.isArray(taskData.equipment_config)) {
              const eq = taskData.equipment_config.find((e: any) => {
                const eqId = normalizeAssetId(e.assetId || e.asset_id || e.id || e.value);
                return eqId === logAssetId;
              });
              if (eq && eq.nickname) {
                nickname = eq.nickname;
                break;
              }
            }
          }
        }
        
        return {
          ...log,
          nickname: nickname || null,
          display_name: nickname || log.display_name || log.asset?.name || 'Unknown Equipment'
        };
      });

      // Fetch assets with temp ranges for all unique asset IDs
      // Filter out invalid UUIDs (like "action_asset_id" string literals)
      const assetIds = Array.from(new Set(
        logsWithNicknames
          .map(log => log.asset_id)
          .filter(Boolean)
          .filter(id => {
            // UUID v4 format: 8-4-4-4-12 hex characters
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return typeof id === 'string' && uuidRegex.test(id);
          })
      ));
      const assetsMap = new Map<string, Asset>();
      
      if (assetIds.length > 0) {
        const { data: assetsData, error: assetsError } = await supabase
          .from("assets")
          .select("id, name, working_temp_min, working_temp_max")
          .in("id", assetIds);
        
        if (assetsError) {
          console.error("Error fetching assets:", assetsError);
        }
        
        if (assetsData) {
          assetsData.forEach(asset => {
            assetsMap.set(asset.id, asset);
          });
        }
      }

      // Fetch monitor tasks
      const { data: monitorTasks } = await supabase
        .from('checklist_tasks')
        .select('*')
        .eq('company_id', companyId)
        .eq('flag_reason', 'monitoring')
        .limit(1000);

      // Create map of asset_id + timestamp proximity to monitor task
      const monitorTasksMap = new Map<string, any>();
      if (monitorTasks) {
        monitorTasks.forEach(task => {
          const taskData = task.task_data || {};
          const temperatures = taskData.temperatures || [];
          
          temperatures.forEach((temp: any) => {
            const assetId = temp.assetId || temp.asset_id;
            if (assetId) {
              // Use asset_id as key (could be improved with timestamp matching)
              monitorTasksMap.set(`${assetId}_${task.id}`, task);
            }
          });
          
          // Also check selectedAssets
          if (taskData.selectedAssets && Array.isArray(taskData.selectedAssets)) {
            taskData.selectedAssets.forEach((assetId: string) => {
              monitorTasksMap.set(`${assetId}_${task.id}`, task);
            });
          }
        });
      }

      // Fetch profiles with first_name and last_name for all logs (merge with existing profilesMap)
      // Filter out invalid UUIDs
      const userIds = Array.from(new Set(
        logsWithNicknames
          .map(log => log.recorded_by)
          .filter(Boolean)
          .filter(id => {
            // UUID v4 format: 8-4-4-4-12 hex characters
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return typeof id === 'string' && uuidRegex.test(id);
          })
      ));
      
      // Get user IDs that aren't already in profilesMap
      const missingUserIds = userIds.filter(id => !profilesMap.has(id));
      
      if (missingUserIds.length > 0) {
        try {
          // Use .eq() for single item, .in() for multiple (like useConversations pattern)
          let query = supabase
            .from("profiles")
            .select("id, full_name, email");
          
          const { data: profilesData, error: profilesError } = missingUserIds.length === 1
            ? await query.eq("id", missingUserIds[0])
            : await query.in("id", missingUserIds);
          
          if (profilesError) {
            console.error("Error fetching profiles:", {
              error: profilesError,
              message: profilesError.message,
              code: profilesError.code,
              details: profilesError.details,
              hint: profilesError.hint,
              userIds: missingUserIds,
              count: missingUserIds.length
            });
          } else if (profilesData) {
            profilesData.forEach(profile => {
              // Parse full_name to extract first and last name
              const fullName = profile.full_name || '';
              const nameParts = fullName.trim().split(/\s+/);
              const first_name = nameParts.length > 0 ? nameParts[0] : null;
              const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
              
              profilesMap.set(profile.id, {
                id: profile.id,
                first_name,
                last_name,
                full_name: profile.full_name,
                email: profile.email
              });
            });
          }
        } catch (err) {
          console.error("Exception fetching profiles:", err);
        }
      }

      // Enrich logs with asset data, temp ranges, monitor tasks, and profiles
      const enriched = logsWithNicknames.map(log => {
        const asset = assetsMap.get(log.asset_id);
        const profile = log.recorded_by ? profilesMap.get(log.recorded_by) : null;
        
        // Find monitor task for this log (match by asset_id and approximate timestamp)
        let monitorTask = null;
        if (monitorTasks) {
          const logTime = new Date(log.recorded_at || log.created_at || '').getTime();
          monitorTask = monitorTasks.find(task => {
            const taskData = task.task_data || {};
            const temps = taskData.temperatures || [];
            const matchesAsset = temps.some((t: any) => (t.assetId || t.asset_id) === log.asset_id) ||
                               (taskData.selectedAssets && Array.isArray(taskData.selectedAssets) && taskData.selectedAssets.includes(log.asset_id));
            
            if (matchesAsset) {
              const taskTime = new Date(task.due_date || task.created_at || '').getTime();
              // Match if within 24 hours
              return Math.abs(logTime - taskTime) < 24 * 60 * 60 * 1000;
            }
            return false;
          });
        }
        
        return {
          ...log,
          asset: asset ? {
            id: asset.id,
            name: asset.name,
            working_temp_min: asset.working_temp_min,
            working_temp_max: asset.working_temp_max
          } : null,
          // Get temperature ranges - prioritize from asset, but also check if stored in task data
          // Some logs might have temp ranges stored directly (from equipment_config)
          temp_min: (() => {
            // First try asset
            if (asset?.working_temp_min !== null && asset?.working_temp_min !== undefined) {
              return asset.working_temp_min;
            }
            // Then try task data equipment_config
            if (taskDetailsMap) {
              for (const [taskId, taskDetails] of taskDetailsMap.entries()) {
                const taskData = taskDetails.taskData || {};
                if (taskData.equipment_config && Array.isArray(taskData.equipment_config)) {
                  const eq = taskData.equipment_config.find((e: any) => {
                    const eqId = typeof e.assetId === 'string' ? e.assetId : (e.assetId?.id || e.assetId?.value || e.asset_id || e.id || '');
                    return eqId === log.asset_id;
                  });
                  if (eq && eq.temp_min !== undefined && eq.temp_min !== null) {
                    return eq.temp_min;
                  }
                }
              }
            }
            return null;
          })(),
          temp_max: (() => {
            // First try asset
            if (asset?.working_temp_max !== null && asset?.working_temp_max !== undefined) {
              return asset.working_temp_max;
            }
            // Then try task data equipment_config
            if (taskDetailsMap) {
              for (const [taskId, taskDetails] of taskDetailsMap.entries()) {
                const taskData = taskDetails.taskData || {};
                if (taskData.equipment_config && Array.isArray(taskData.equipment_config)) {
                  const eq = taskData.equipment_config.find((e: any) => {
                    const eqId = typeof e.assetId === 'string' ? e.assetId : (e.assetId?.id || e.assetId?.value || e.asset_id || e.id || '');
                    return eqId === log.asset_id;
                  });
                  if (eq && eq.temp_max !== undefined && eq.temp_max !== null) {
                    return eq.temp_max;
                  }
                }
              }
            }
            return null;
          })(),
          asset_name: asset?.name || null,
          monitorTask: monitorTask || null,
          recorder: profile ? {
            id: profile.id || log.recorded_by || '',
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email
          } : null,
          profiles: profile ? {
            full_name: profile.full_name,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email
          } : log.profiles
        };
      });

      console.log(`✅ Loaded ${enriched.length} temperature logs`, {
        fromTempLogs: tempLogsData?.length || 0,
        fromCompletions: completionRecords?.length || 0,
        companyId,
        filterSite: filterSite || "All Sites",
        siteId,
        sitesCount: sites.length,
      });

      if (tempLogsError) {
        console.error("Error loading from temperature_logs:", {
          message: tempLogsError?.message,
          details: tempLogsError?.details,
          hint: tempLogsError?.hint,
          code: tempLogsError?.code,
          fullError: tempLogsError
        });
      }
      if (completionError) {
        console.error("Error loading from task_completion_records:", {
          message: completionError?.message,
          details: completionError?.details,
          hint: completionError?.hint,
          code: completionError?.code,
          fullError: completionError
        });
      }

      setLogs(uniqueLogs);
      setEnrichedLogs(enriched);
      setLoading(false);
    };
    loadLogs();

    const sub = supabase
      .channel("temperature_logs_rt")
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "temperature_logs",
          filter: `company_id=eq.${companyId}`
        },
        (payload: any) => {
          // Only add if it matches current filters
          const log = payload.new as TempLog;
          const matchesSiteFilter = !filterSite || log.site_id === filterSite || (sites.length <= 1 && log.site_id === siteId);
          if (matchesSiteFilter) {
            console.log("📊 New temperature log received:", log);
            setLogs((prev) => [log, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "temperature_logs",
          filter: `company_id=eq.${companyId}`
        },
        (payload: any) => {
          setLogs((prev) => prev.map((l) => (l.id === payload.new.id ? (payload.new as TempLog) : l)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [companyId, siteId, filterSite, dateRangeStart, dateRangeEnd, sites.length]);


  const filteredLogs = useMemo(() => {
    return enrichedLogs.filter((l) => {
      if (filterAsset && l.asset_id !== filterAsset) return false;
      if (filterDayPart && (l.day_part || "") !== filterDayPart) return false;
      if (filterStatus) {
        const status = getTemperatureStatus(l.reading, l.temp_min, l.temp_max);
        if (filterStatus === 'ok' && !status.label.includes('In Range')) return false;
        if (filterStatus === 'out_of_range' && !status.label.includes('Out of Range')) return false;
        if (filterStatus === 'warning' && status.label.includes('Out of Range')) return false;
      }
      if (filterAssetType) {
        const asset = assets.find((a) => a.id === l.asset_id);
        const assetType = asset?.type || asset?.category;
        if (assetType !== filterAssetType) return false;
      }
      return true;
    });
  }, [enrichedLogs, filterAsset, filterDayPart, filterStatus, filterAssetType, assets]);

  // Group logs by day
  const groupLogsByDay = (logs: TempLog[]) => {
    const grouped = logs.reduce((acc, log) => {
      const date = format(new Date(log.recorded_at || log.created_at || ''), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(log);
      return acc;
    }, {} as Record<string, TempLog[]>);
    
    // Convert to array of { date, logs, dayName }
    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA)) // Newest first
      .map(([date, logs]) => ({
        date,
        dayName: format(new Date(date), 'EEEE, dd MMMM yyyy'),
        logs
      }));
  };

  const logsByDay = useMemo(() => groupLogsByDay(filteredLogs), [filteredLogs]);

  const exportCsv = async () => {
    if (!supabase || !companyId) return;
    const from = exportStart ? new Date(exportStart).toISOString() : undefined;
    const to = exportEnd ? new Date(exportEnd).toISOString() : undefined;
    let q = supabase
      .from("temperature_logs")
      .select(`
        recorded_at,
        reading,
        unit,
        status,
        day_part,
        notes,
        asset_id,
        recorded_by,
        profiles:recorded_by (full_name, email)
      `)
      .eq("company_id", companyId)
      .order("recorded_at", { ascending: false });
    
    if (filterSite) {
      q = q.eq("site_id", filterSite);
    } else if (siteId) {
      q = q.eq("site_id", siteId);
    }
    
    if (from) q = q.gte("recorded_at", from);
    if (to) q = q.lte("recorded_at", to);
    
    const { data } = await q;
    const assetMap = new Map<string, string>();
    for (const a of assets) assetMap.set(a.id, a.name);
    
    const rows = [
      ["recorded_at", "asset", "reading", "unit", "status", "day_part", "recorded_by", "notes"].join(","),
      ...(data || []).map((r: any) =>
        [
          r.recorded_at,
          assetMap.get(r.asset_id) || r.asset_id,
          r.reading,
          r.unit,
          r.status,
          r.day_part || "",
          r.profiles?.full_name || r.profiles?.email || "Unknown",
          (r.notes || "").replace(/\n/g, " ").replace(/,/g, ";"),
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `temperature_logs_${exportStart || "start"}_${exportEnd || "end"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const assetTypes = useMemo(() => {
    return Array.from(new Set(assets.map((a) => (a.type || a.category)).filter(Boolean))) as string[];
  }, [assets]);

  const dayParts = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.day_part).filter(Boolean))) as string[];
  }, [logs]);

  const stats = useMemo(() => {
    const inRange = filteredLogs.filter(log => {
      const status = getTemperatureStatus(log.reading, log.temp_min, log.temp_max);
      return status.label.includes('In Range');
    }).length;
    
    const outOfRange = filteredLogs.filter(log => {
      const status = getTemperatureStatus(log.reading, log.temp_min, log.temp_max);
      return status.label.includes('Out of Range');
    }).length;
    
    const followUps = filteredLogs.filter(log => log.monitorTask).length;
    
    return {
      total: filteredLogs.length,
      inRange,
      outOfRange,
      followUps
    };
  }, [filteredLogs]);

  return (
    <div className="w-full bg-gray-50 dark:bg-[#0B0D13] min-h-screen">
      <div className="w-full px-4">
        <div className="max-w-[2000px] mx-auto p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Thermometer className="w-8 h-8 text-red-600 dark:text-[#EC4899]" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Temperature Logs</h1>
          </div>
          <p className="text-gray-600 dark:text-white/60 text-sm sm:text-base">
            Historical log of all temperature readings collected by your business
          </p>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
            <div className="text-gray-600 dark:text-white/60 text-sm mb-1">Total Readings</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
            <div className="text-gray-600 dark:text-white/60 text-sm mb-1">In Range</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.inRange}</div>
          </div>
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
            <div className="text-gray-600 dark:text-white/60 text-sm mb-1">Out of Range</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.outOfRange}</div>
          </div>
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
            <div className="text-gray-600 dark:text-white/60 text-sm mb-1">Follow-Ups Required</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.followUps}</div>
          </div>
        </div>

        {/* Export & Analytics Section */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Download className="w-5 h-5 text-[#EC4899] dark:text-[#EC4899]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Export & Analytics</h2>
          </div>

          {/* Export Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-700 dark:text-white/80 mb-2">Export Start Date</label>
              <input
                type="date"
                value={exportStart}
                onChange={(e) => setExportStart(e.target.value)}
                className="w-full bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 dark:focus:ring-[#EC4899]/50 focus:border-[#EC4899]/50 transition-all hover:border-gray-300 dark:hover:border-white/[0.2]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-white/80 mb-2">Export End Date</label>
              <input
                type="date"
                value={exportEnd}
                onChange={(e) => setExportEnd(e.target.value)}
                className="w-full bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 dark:focus:ring-[#EC4899]/50 focus:border-[#EC4899]/50 transition-all hover:border-gray-300 dark:hover:border-white/[0.2]"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={exportCsv}
                className="w-full bg-transparent text-[#EC4899] border border-[#EC4899] rounded-lg px-4 py-2 hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all font-medium flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Equipment Filters for Graph */}
          {(() => {
            const categorizedLogs = categorizeEquipment(enrichedLogs);
            const uniqueAssets = Array.from(
              new Map(
                enrichedLogs.map(log => [
                  log.asset_id,
                  {
                    id: log.asset_id,
                    nickname: log.nickname,
                    name: log.asset?.name || log.asset_name
                  }
                ])
              ).values()
            );

            const getFilteredLogs = () => {
              let filtered = categorizedLogs[equipmentTypeFilter as keyof typeof categorizedLogs] || [];

              if (selectedAssetFilter !== 'all') {
                filtered = filtered.filter(log => log.asset_id === selectedAssetFilter);
              }

              return filtered;
            };

            const filteredGraphLogs = getFilteredLogs();

            // Prepare data for chart - last 50 readings, sorted by time
            const chartData = filteredGraphLogs
              .sort((a, b) => new Date(a.recorded_at || a.created_at || '').getTime() - new Date(b.recorded_at || b.created_at || '').getTime())
              .slice(-50)
              .map(log => ({
                timestamp: format(new Date(log.recorded_at || log.created_at || ''), 'MMM dd HH:mm'),
                temperature: log.reading,
                assetName: log.display_name || log.nickname || log.position?.nickname || log.asset?.name || log.asset_name || 'Unknown',
                assetId: log.asset_id,
                min: log.temp_min ?? log.asset?.working_temp_min,
                max: log.temp_max ?? log.asset?.working_temp_max
              }));

            // Get range for reference lines (if single asset selected)
            const getRangeLimits = () => {
              if (selectedAssetFilter !== 'all' && chartData.length > 0) {
                const firstLog = filteredGraphLogs.find(l => l.asset_id === selectedAssetFilter);
                if (firstLog) {
                  const min = firstLog.temp_min ?? firstLog.asset?.working_temp_min;
                  const max = firstLog.temp_max ?? firstLog.asset?.working_temp_max;
                  if (min !== null && min !== undefined && max !== null && max !== undefined) {
                    return {
                      min: Math.min(min, max),
                      max: Math.max(min, max)
                    };
                  }
                }
              }
              return null;
            };

            const rangeLimits = getRangeLimits();

            // Get unique assets for the selected equipment type
            const assetsInType = uniqueAssets.filter(asset => {
              const assetLogs = enrichedLogs.filter(l => l.asset_id === asset.id);
              return categorizedLogs[equipmentTypeFilter as keyof typeof categorizedLogs]
                ?.some(log => log.asset_id === asset.id);
            });

            return (
              <>
                {/* Equipment Filters */}
                <div className="flex gap-4 mb-6 p-4 bg-gray-50 dark:bg-white/[0.05] rounded-lg">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-white/80">Equipment Type</label>
                    <select
                      value={equipmentTypeFilter}
                      onChange={(e) => {
                        setEquipmentTypeFilter(e.target.value);
                        setSelectedAssetFilter('all'); // Reset asset filter when type changes
                      }}
                      className="w-full bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 dark:focus:ring-[#EC4899]/50 focus:border-[#EC4899]/50 transition-all hover:border-gray-300 dark:hover:border-white/[0.2]"
                    >
                      <option value="chilled">Chilled (0-8°C)</option>
                      <option value="frozen">Frozen (&lt;-10°C)</option>
                      <option value="hot">Hot Hold (&gt;50°C)</option>
                      <option value="ambient">Ambient (8-50°C)</option>
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-white/80">Specific Equipment</label>
                    <select
                      value={selectedAssetFilter}
                      onChange={(e) => setSelectedAssetFilter(e.target.value)}
                      className="w-full bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 dark:focus:ring-[#EC4899]/50 focus:border-[#EC4899]/50 transition-all hover:border-gray-300 dark:hover:border-white/[0.2]"
                    >
                      <option value="all">All Equipment in Type</option>
                      {assetsInType.map(asset => (
                        <option key={asset.id} value={asset.id}>
                          {asset.nickname ? `${asset.nickname} - ${asset.name}` : asset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Graph */}
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
                    Temperature Trend - {equipmentTypeFilter.charAt(0).toUpperCase() + equipmentTypeFilter.slice(1)}
                    {selectedAssetFilter !== 'all' && ` (${assetsInType.find(a => a.id === selectedAssetFilter)?.nickname || assetsInType.find(a => a.id === selectedAssetFilter)?.name})`}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-white/60 mb-4">
                    Last 50 readings for selected equipment
                  </p>
                </div>

                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-white/10" />

                      {/* X Axis - Time */}
                      <XAxis
                        dataKey="timestamp"
                        tick={{ fontSize: 12, fill: 'currentColor' }}
                        className="text-gray-600 dark:text-white/60"
                        label={{
                          value: 'Date & Time',
                          position: 'insideBottom',
                          offset: -10,
                          style: { fontSize: 14, fontWeight: 600, fill: 'currentColor' }
                        }}
                      />

                      {/* Y Axis - Temperature */}
                      <YAxis
                        tick={{ fontSize: 12, fill: 'currentColor' }}
                        className="text-gray-600 dark:text-white/60"
                        label={{
                          value: 'Temperature (°C)',
                          angle: -90,
                          position: 'insideLeft',
                          style: { fontSize: 14, fontWeight: 600, fill: 'currentColor' }
                        }}
                      />

                      {/* Tooltip */}
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '12px',
                          color: '#000'
                        }}
                        formatter={(value: any) => [`${value}°C`, 'Temperature']}
                        labelFormatter={(label) => `Time: ${label}`}
                      />

                      {/* Legend */}
                      <Legend
                        verticalAlign="top"
                        height={36}
                        wrapperStyle={{ paddingBottom: '20px' }}
                      />

                      {/* Reference Lines - Only show for single asset */}
                      {rangeLimits && (
                        <>
                          <ReferenceLine
                            y={rangeLimits.min}
                            stroke="#3b82f6"
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            label={{
                              value: `Min (${rangeLimits.min}°C)`,
                              position: 'left',
                              fill: '#3b82f6',
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          />
                          <ReferenceLine
                            y={rangeLimits.max}
                            stroke="#ef4444"
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            label={{
                              value: `Max (${rangeLimits.max}°C)`,
                              position: 'left',
                              fill: '#ef4444',
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          />
                        </>
                      )}

                      {/* Temperature Line - Group by asset if showing multiple */}
                      {selectedAssetFilter === 'all' ? (
                        // Multiple assets - different color per asset
                        (() => {
                          const colors = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
                          const assetsInView = Array.from(new Set(chartData.map(d => d.assetId)));

                          return assetsInView.map((assetId, index) => {
                            const assetData = chartData.filter(d => d.assetId === assetId);
                            const assetName = assetData[0]?.assetName || 'Unknown';

                            return (
                              <Line
                                key={assetId}
                                type="monotone"
                                dataKey="temperature"
                                data={assetData}
                                stroke={colors[index % colors.length]}
                                strokeWidth={2}
                                name={assetName}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                            );
                          });
                        })()
                      ) : (
                        // Single asset - one line
                        <Line
                          type="monotone"
                          dataKey="temperature"
                          stroke="#ec4899"
                          strokeWidth={3}
                          name="Temperature"
                          dot={{ r: 5, fill: '#ec4899' }}
                          activeDot={{ r: 7 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] bg-gray-50 dark:bg-white/[0.03] rounded-lg">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-gray-500 dark:text-white/60 text-lg">No data to display</p>
                    <p className="text-gray-400 dark:text-white/40 text-sm mt-2">
                      Select a different equipment type or check your filters
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#EC4899] dark:text-[#EC4899]" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
            >
              {showFilters ? "Hide" : "Show"} Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Site Filter - Show if company has more than 1 site */}
              {sites.length > 1 && (
                <div>
                  <label className="block text-sm text-gray-700 dark:text-white/80 mb-2">Site</label>
                  <select
                    value={filterSite}
                    onChange={(e) => setFilterSite(e.target.value)}
                    className="w-full bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 dark:focus:ring-[#EC4899]/50 focus:border-[#EC4899]/50 transition-all hover:border-gray-300 dark:hover:border-white/[0.2]"
                  >
                    <option value="" className="bg-white dark:bg-[#0B0D13]">All Sites</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id} className="bg-white dark:bg-[#0B0D13]">
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Asset Filter */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-white/80 mb-2">Asset</label>
                <select
                  value={filterAsset}
                  onChange={(e) => setFilterAsset(e.target.value)}
                  className="w-full bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 dark:focus:ring-[#EC4899]/50 focus:border-[#EC4899]/50 transition-all hover:border-gray-300 dark:hover:border-white/[0.2]"
                >
                  <option value="" className="bg-white dark:bg-[#0B0D13]">All Assets</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id} className="bg-white dark:bg-[#0B0D13]">
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Asset Type Filter */}
              {assetTypes.length > 0 && (
                <div>
                  <label className="block text-sm text-gray-700 dark:text-white/80 mb-2">Asset Type</label>
                  <select
                    value={filterAssetType}
                    onChange={(e) => setFilterAssetType(e.target.value)}
                    className="w-full bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 dark:focus:ring-[#EC4899]/50 focus:border-[#EC4899]/50 transition-all hover:border-gray-300 dark:hover:border-white/[0.2]"
                  >
                    <option value="" className="bg-white dark:bg-[#0B0D13]">All Types</option>
                    {assetTypes.map((type) => (
                      <option key={type} value={type} className="bg-white dark:bg-[#0B0D13]">
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Filter */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-white/80 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 dark:focus:ring-[#EC4899]/50 focus:border-[#EC4899]/50 transition-all hover:border-gray-300 dark:hover:border-white/[0.2]"
                >
                  <option value="" className="bg-white dark:bg-[#0B0D13]">All Statuses</option>
                  <option value="ok" className="bg-white dark:bg-[#0B0D13]">OK</option>
                  <option value="warning" className="bg-white dark:bg-[#0B0D13]">Warning</option>
                  <option value="failed" className="bg-white dark:bg-[#0B0D13]">Failed</option>
                </select>
              </div>

              {/* Day Part Filter */}
              {dayParts.length > 0 && (
                <div>
                  <label className="block text-sm text-gray-700 dark:text-white/80 mb-2">Day Part</label>
                  <select
                    value={filterDayPart}
                    onChange={(e) => setFilterDayPart(e.target.value)}
                    className="w-full bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 dark:focus:ring-[#EC4899]/50 focus:border-[#EC4899]/50 transition-all hover:border-gray-300 dark:hover:border-white/[0.2]"
                  >
                    <option value="" className="bg-white dark:bg-[#0B0D13]">All</option>
                    {dayParts.map((dp) => (
                      <option key={dp} value={dp} className="bg-white dark:bg-[#0B0D13]">
                        {dp}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Range Start */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-white/80 mb-2">Date From</label>
                <input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="w-full bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 dark:focus:ring-[#EC4899]/50 focus:border-[#EC4899]/50 transition-all hover:border-gray-300 dark:hover:border-white/[0.2]"
                />
              </div>

              {/* Date Range End */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-white/80 mb-2">Date To</label>
                <input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="w-full bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 dark:focus:ring-[#EC4899]/50 focus:border-[#EC4899]/50 transition-all hover:border-gray-300 dark:hover:border-white/[0.2]"
                />
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterSite(siteId || "");
                    setFilterAsset("");
                    setFilterAssetType("");
                    setFilterStatus("");
                    setFilterDayPart("");
                    setDateRangeStart("");
                    setDateRangeEnd("");
                  }}
                  className="w-full bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] text-gray-700 dark:text-white/80 rounded-lg px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.1] transition-all text-sm flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden mb-6">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Readings</h2>
            <span className="text-gray-600 dark:text-white/60 text-sm">{filteredLogs.length} records</span>
          </div>
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-[#EC4899] border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-gray-600 dark:text-white/60">Loading temperature logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-600 dark:text-white/60">
              <Thermometer className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No temperature logs found</p>
            </div>
          ) : (
            <div className="w-full overflow-visible">
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: '16%' }} /><col style={{ width: '7%' }} /><col style={{ width: '9%' }} /><col style={{ width: '11%' }} /><col style={{ width: '12%' }} /><col style={{ width: '8%' }} /><col style={{ width: '7%' }} /><col style={{ width: '11%' }} /><col style={{ width: '9%' }} /><col style={{ width: '10%' }} />
                </colgroup>
                <thead className="bg-gray-50 dark:bg-white/[0.05] border-b border-gray-200 dark:border-white/[0.06]">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Equipment</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Reading</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Expected Range</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Trend</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Time Since</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Follow-Up</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Recorded By</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Day Part</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logsByDay && logsByDay.length > 0 ? (
                    logsByDay.map((dayGroup) => (
                      <React.Fragment key={dayGroup.date}>
                        {/* Day Header Row */}
                        <tr className="bg-gray-100 dark:bg-white/[0.05] border-t-2 border-gray-300 dark:border-white/[0.1]">
                          <td 
                            colSpan={10} 
                            className="py-3 px-4 font-semibold text-gray-700 dark:text-white/80"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-base">
                                📅 {dayGroup.dayName}
                              </span>
                              <span className="text-sm font-normal text-gray-500 dark:text-white/60">
                                {dayGroup.logs.length} reading{dayGroup.logs.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Log Rows for this day */}
                        {dayGroup.logs.map((log) => {
                          const status = getTemperatureStatus(log.reading, log.temp_min, log.temp_max);
                          const timeSince = calculateTimeSinceLastCheck(log, filteredLogs);
                          
                          // Determine equipment category for badge
                          const min = log.temp_min ?? log.asset?.working_temp_min;
                          const max = log.temp_max ?? log.asset?.working_temp_max;
                          let categoryBadge = '';
                          if (min !== undefined && max !== undefined && min !== null && max !== null) {
                            const actualMax = Math.max(min, max);
                            const actualMin = Math.min(min, max);
                            if (actualMax < -10) categoryBadge = 'Frozen';
                            else if (actualMax <= 8) categoryBadge = 'Chilled';
                            else if (actualMin >= 50) categoryBadge = 'Hot';
                            else categoryBadge = 'Ambient';
                          }
                          
                          return (
                            <tr
                              key={log.id}
                              className="border-b border-gray-100 dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
                            >
                              {/* Equipment: Nickname + Asset Name */}
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                                      {log.nickname || 'No Nickname'}
                                    </span>
                                    {categoryBadge && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                        {categoryBadge}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-500 dark:text-white/60">
                                    {log.display_name || log.nickname || log.position?.nickname || log.asset?.name || log.asset_name || 'Unknown Asset'}
                                  </span>
                                </div>
                              </td>
                              
                              {/* Reading */}
                              <td className="py-3 px-4 font-mono text-base font-semibold text-gray-900 dark:text-white">
                                {log.reading !== null && log.reading !== undefined
                                  ? `${log.reading}°C`
                                  : '—'
                                }
                              </td>
                              
                              {/* Expected Range */}
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-white/60">
                                {formatTempRange(log.temp_min, log.temp_max)}
                              </td>
                              
                              {/* Status */}
                              <td className="py-3 px-4">
                                <Badge variant={status.variant} className={status.color}>
                                  <span className="mr-1">{status.icon}</span>
                                  {status.label}
                                </Badge>
                              </td>
                              
                              {/* Trend Sparkline */}
                              <td className="py-3 px-4">
                                {(() => {
                                  // Only show sparkline if we have asset_id and temperature range defined
                                  if (!log.asset_id) {
                                    return (
                                      <span className="text-sm text-gray-400 dark:text-white/40">No asset</span>
                                    );
                                  }
                                  
                                  const minTemp = log.temp_min !== undefined && log.temp_min !== null ? log.temp_min : null;
                                  const maxTemp = log.temp_max !== undefined && log.temp_max !== null ? log.temp_max : null;
                                  
                                  if (minTemp === null || maxTemp === null) {
                                    return (
                                      <span className="text-sm text-gray-400 dark:text-white/40">No range set</span>
                                    );
                                  }
                                  
                                  return (
                                    <TemperatureSparkline
                                      assetId={log.asset_id}
                                      minTemp={minTemp}
                                      maxTemp={maxTemp}
                                      width={140}
                                      height={50}
                                    />
                                  );
                                })()}
                              </td>
                              
                              {/* Time Since Last - SIMPLIFIED */}
                              <td className="py-3 px-4">
                                {timeSince ? (
                                  <span className="text-sm font-medium text-gray-700 dark:text-white/80">
                                    {timeSince.display}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400 dark:text-white/40">First check</span>
                                )}
                              </td>
                              
                              {/* Follow-Up - SIMPLIFIED */}
                              <td className="py-3 px-4 text-center">
                                {log.monitorTask ? (
                                  <button
                                    onClick={() => {
                                      window.location.href = `/dashboard/tasks/${log.monitorTask.id}`;
                                    }}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-semibold underline p-0"
                                    title="View follow-up task"
                                  >
                                    Yes
                                  </button>
                                ) : (
                                  <span className="text-gray-400 dark:text-white/40">—</span>
                                )}
                              </td>
                              
                              {/* Recorded By - FIXED */}
                              <td className="py-3 px-4 text-sm text-gray-700 dark:text-white/80">
                                {log.recorder?.first_name && log.recorder?.last_name
                                  ? `${log.recorder.first_name} ${log.recorder.last_name}`
                                  : log.recorder?.email 
                                  ? log.recorder.email.split('@')[0]
                                  : log.recorded_by
                                  ? 'User ' + log.recorded_by.substring(0, 8)
                                  : 'System'
                                }
                              </td>
                              
                              {/* Day Part */}
                              <td className="py-3 px-4">
                                {log.day_part ? (
                                  <span className="text-sm px-2 py-1 bg-gray-100 dark:bg-white/10 rounded text-gray-700 dark:text-white/80">
                                    {log.day_part.replace(/_/g, ' ')}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 dark:text-white/40">—</span>
                                )}
                              </td>
                              
                              {/* Date & Time - Show only time since date is in header */}
                              <td className="py-3 px-4 text-sm font-mono text-gray-700 dark:text-white/80">
                                {format(new Date(log.recorded_at || log.created_at || ''), 'HH:mm:ss')}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="text-center text-gray-500 dark:text-white/60 py-8">
                        No temperature logs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

