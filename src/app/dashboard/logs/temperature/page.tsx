"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { Thermometer, Download, Filter, X } from "lucide-react";
import { format as formatDate } from "date-fns";

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
  status: "ok" | "warning" | "failed";
  notes?: string | null;
  recorded_by?: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
};

function StatusBadge({ status }: { status: TempLog["status"] }) {
  const config = {
    ok: { color: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-500/20", border: "border-green-200 dark:border-green-500/30", icon: "✅", label: "OK" },
    warning: { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/20", border: "border-amber-200 dark:border-amber-500/30", icon: "⚠️", label: "Warning" },
    failed: { color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/20", border: "border-red-200 dark:border-red-500/30", icon: "❌", label: "Failed" },
  };
  const { color, bg, border, icon, label } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bg} ${color} ${border}`}>
      {icon} {label}
    </span>
  );
}

function LineChart({ points }: { points: { x: number; y: number }[] }) {
  const width = 600;
  const height = 150;
  if (!points.length) {
    return (
      <div className="w-full h-[150px] bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg flex items-center justify-center text-gray-600 dark:text-white/60 text-sm">
        No data to display
      </div>
    );
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const nx = (x: number) => ((x - minX) / rangeX) * (width - 40) + 20;
  const ny = (y: number) => height - (((y - minY) / rangeY) * (height - 40) + 20);
  const d = points
    .sort((a, b) => a.x - b.x)
    .map((p, i) => `${i === 0 ? "M" : "L"}${nx(p.x)},${ny(p.y)}`)
    .join(" ");

  return (
    <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = 20 + ratio * (height - 40);
          return (
            <line
              key={ratio}
              x1={20}
              y1={y}
              x2={width - 20}
              y2={y}
              stroke="rgba(0,0,0,0.05)"
              className="dark:stroke-white/5"
              strokeWidth={1}
            />
          );
        })}
        {/* Area fill */}
        <path
          d={`${d} L${nx(points[points.length - 1].x)},${height - 20} L${nx(points[0].x)},${height - 20} Z`}
          fill="url(#lineGradient)"
        />
        {/* Line */}
        <path d={d} fill="none" stroke="#EC4899" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={nx(p.x)} cy={ny(p.y)} r={3} fill="#EC4899" className="hover:r-4 transition-all" />
        ))}
      </svg>
    </div>
  );
}

export default function TemperatureLogsPage() {
  const { companyId, siteId } = useAppContext();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);
  const [logs, setLogs] = useState<TempLog[]>([]);
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
          reading,
          unit,
          recorded_at,
          day_part,
          status,
          notes,
          recorded_by,
          profiles:recorded_by (full_name, email)
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
      if (!tempLogsError && tempLogsData) {
        allLogs.push(...(tempLogsData as TempLog[]));
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
      
      if (!completionError && completionRecords && completionRecords.length > 0) {
        console.log(`📊 Found ${completionRecords.length} completion records`);
        
        // Get task details and profiles separately
        const taskIds = completionRecords.map((r: any) => r.task_id).filter(Boolean);
        const userIds = completionRecords.map((r: any) => r.completed_by).filter(Boolean);
        const taskDetailsMap = new Map();
        const profilesMap = new Map();
        
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
              profilesMap.set(profile.id, {
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
                const assetId = item.value || item.asset_id || item.id;
                if (assetId) {
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
            completionData.equipment_list.forEach((eq: any) => {
              const assetId = eq.asset_id;
              if (assetId) {
                const tempValue = eq.temperature !== undefined && eq.temperature !== null ? eq.temperature 
                  : (eq.reading !== undefined && eq.reading !== null ? eq.reading 
                  : (eq.temp !== undefined && eq.temp !== null ? eq.temp : null));
                
                if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
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
              const assetId = temp.assetId || temp.asset_id;
              if (assetId) {
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
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      );

      console.log(`✅ Loaded ${uniqueLogs.length} temperature logs`, {
        fromTempLogs: tempLogsData?.length || 0,
        fromCompletions: completionRecords?.length || 0,
        companyId,
        filterSite: filterSite || "All Sites",
        siteId,
        sitesCount: sites.length,
      });

      if (tempLogsError) {
        console.error("Error loading from temperature_logs:", tempLogsError);
      }
      if (completionError) {
        console.error("Error loading from task_completion_records:", completionError);
      }

      setLogs(uniqueLogs);
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
    return logs.filter((l) => {
      if (filterAsset && l.asset_id !== filterAsset) return false;
      if (filterDayPart && (l.day_part || "") !== filterDayPart) return false;
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterAssetType) {
        const asset = assets.find((a) => a.id === l.asset_id);
        const assetType = asset?.type || asset?.category;
        if (assetType !== filterAssetType) return false;
      }
      return true;
    });
  }, [logs, filterAsset, filterDayPart, filterStatus, filterAssetType, assets]);

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
    return {
      total: filteredLogs.length,
      ok: filteredLogs.filter((l) => l.status === "ok").length,
      warning: filteredLogs.filter((l) => l.status === "warning").length,
      failed: filteredLogs.filter((l) => l.status === "failed").length,
    };
  }, [filteredLogs]);

  return (
    <div className="w-full bg-gray-50 dark:bg-[#0B0D13] min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
            <div className="text-gray-600 dark:text-white/60 text-sm mb-1">Total Readings</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
            <div className="text-gray-600 dark:text-white/60 text-sm mb-1">OK</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.ok}</div>
          </div>
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
            <div className="text-gray-600 dark:text-white/60 text-sm mb-1">Warnings</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.warning}</div>
          </div>
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
            <div className="text-gray-600 dark:text-white/60 text-sm mb-1">Failed</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
          </div>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-white/[0.05] border-b border-gray-200 dark:border-white/[0.06]">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Date & Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Asset</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Reading</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Recorded By</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Day Part</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-white/80">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((l) => {
                    const asset = assets.find((a) => a.id === l.asset_id);
                    return (
                      <tr
                        key={l.id}
                        className="border-b border-gray-100 dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
                      >
                        <td className="py-3 px-4 text-gray-700 dark:text-white/80 text-sm">
                          {formatDate(new Date(l.recorded_at), "d MMM yyyy, HH:mm")}
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-white/80 text-sm">
                          {asset ? asset.name : l.asset_id}
                          {(asset?.type || asset?.category) && (
                            <span className="text-gray-500 dark:text-white/40 ml-1">({asset.type || asset.category})</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-white/80 text-sm font-mono">
                          {l.reading}
                          {l.unit}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={l.status} />
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-white/80 text-sm">
                          {l.profiles?.full_name || l.profiles?.email || "Unknown"}
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-white/80 text-sm">{l.day_part || "—"}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-white/60 text-sm max-w-xs truncate">{l.notes || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Manager Tools */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Download className="w-5 h-5 text-[#EC4899] dark:text-[#EC4899]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Export & Analytics</h2>
          </div>
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

          {/* Chart */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-white/80 mb-3">Temperature Trend (Last 50 Readings)</h3>
            <LineChart
              points={filteredLogs
                .slice(0, 50)
                .reverse()
                .map((l, idx) => ({ x: idx, y: l.reading }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

