"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import { AlertTriangle, Clock, Bell, Thermometer, Wrench } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type AlertRow = {
  id: string;
  title?: string;
  message?: string;
  severity?: string;
  created_at: string;
  type: "notification" | "task-note" | "temp-breach";
  site_name?: string | null;
  due_time?: string | null;
  action_type?: "monitor" | "callout";
  status?: string;
  isOverdue?: boolean;
  isMissed?: boolean;
};

export default function AlertsFeed() {
  const { companyId } = useAppContext();
  const [open, setOpen] = useState(true);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const since = useMemo(() => new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), []);

  useEffect(() => {
    let mounted = true;
    let isLoading = false; // Prevent concurrent loads
    
    const load = async () => {
      // Prevent multiple simultaneous loads
      if (isLoading) return;
      isLoading = true;
      
      setLoading(true);
      setError(null);
      try {
        const alertRows: AlertRow[] = [];
        const todayIso = new Date().toISOString().split("T")[0];

        // Only query notifications if companyId is available
        if (companyId) {
          try {
            // Use select("*") to avoid column issues
            // Note: This query may fail if notifications table doesn't exist or has different schema
            const { data, error } = await supabase
              .from("notifications")
              .select("*")
              .eq("company_id", companyId)
              .gte("created_at", since)
              .order("created_at", { ascending: false })
              .limit(50);
            
            if (error) {
              // Silently log error - notifications table may not exist, have different schema, or RLS policy issue
              // This is expected and not critical - other alerts will still load
              // Only log if it's not a 400 error (which might be RLS policy related)
              if (error.code !== 'PGRST116' && !error.message?.includes('400')) {
                console.debug("Notifications query failed:", error.message);
              }
            } else if (data) {
              // Filter in JavaScript for severity if the column exists, otherwise show all
              const filteredData = data.filter((d: any) => {
                // If severity column exists, filter for critical/warning
                if (d.severity !== undefined) {
                  return d.severity === "critical" || d.severity === "warning";
                }
                // If severity doesn't exist, include all notifications
                return true;
              });
              
              alertRows.push(
                ...filteredData.map((d: any) => ({
                  id: d.id,
                  title: d.title ?? undefined,
                  message: d.message ?? undefined,
                  severity: d.severity ?? "info", // Default to "info" if severity doesn't exist
                  created_at: d.created_at,
                  type: "notification",
                  isOverdue: false,
                  isMissed: false,
                } satisfies AlertRow))
              );
            }
          } catch (err: any) {
            // Silently catch exceptions - notifications are not critical
            console.debug("Notifications fetch exception (expected if table doesn't exist):", err.message);
          }
        }

        if (companyId) {
          // Fetch overdue tasks (due date before today)
          const { data: overdueTasks, error: overdueError } = await supabase
            .from("checklist_tasks")
            .select("id, custom_name, template_id, due_date, due_time, status, site_id, template: task_templates(name)")
            .eq("company_id", companyId)
            .in("status", ["pending", "in_progress"])
            .lt("due_date", todayIso)
            .limit(20);

          // Fetch late tasks (due today but past due time)
          const now = new Date();
          const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
          const { data: lateTasks, error: lateError } = await supabase
            .from("checklist_tasks")
            .select("id, custom_name, template_id, due_date, due_time, status, site_id, template: task_templates(name)")
            .eq("company_id", companyId)
            .eq("due_date", todayIso)
            .in("status", ["pending", "in_progress"])
            .not("due_time", "is", null)
            .lt("due_time", currentTime)
            .limit(20);

          // Fetch missed tasks (yesterday's incomplete tasks)
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayIso = yesterday.toISOString().split("T")[0];
          const { data: missedTasks, error: missedError } = await supabase
            .from("checklist_tasks")
            .select("id, custom_name, template_id, due_date, due_time, status, site_id, template: task_templates(name, is_critical)")
            .eq("company_id", companyId)
            .eq("due_date", yesterdayIso)
            .in("status", ["pending", "in_progress"])
            .limit(20);

          // Fetch tasks with notes from checklist_tasks table
          const { data: taskNotes, error: taskError } = await supabase
            .from("checklist_tasks")
            .select("id, custom_name, task_data, template_id, due_date, due_time, status, site_id")
            .eq("company_id", companyId)
            .eq("due_date", todayIso)
            .in("status", ["pending", "in_progress"]);

          // Process overdue tasks
          if (!overdueError && overdueTasks && overdueTasks.length > 0) {
            const siteIds = [...new Set(overdueTasks.map((t: any) => t.site_id).filter(Boolean))];
            const sitesMap = new Map<string, string>();
            
            if (siteIds.length > 0) {
              const { data: sites } = await supabase
                .from("sites")
                .select("id, name")
                .in("id", siteIds);
              
              if (sites) {
                sites.forEach((s: any) => sitesMap.set(s.id, s.name));
              }
            }

            alertRows.push(
              ...overdueTasks.map((task: any) => ({
                id: `overdue-${task.id}`,
                title: task.custom_name || task.template?.name || "Overdue Task",
                message: `Task overdue since ${task.due_date}`,
                severity: "critical",
                created_at: task.due_date,
                type: "task-note" as const,
                site_name: task.site_id ? sitesMap.get(task.site_id) ?? null : null,
                due_time: task.due_time,
                isOverdue: true,
              } satisfies AlertRow))
            );
          }

          // Process late tasks
          if (!lateError && lateTasks && lateTasks.length > 0) {
            const siteIds = [...new Set(lateTasks.map((t: any) => t.site_id).filter(Boolean))];
            const sitesMap = new Map<string, string>();
            
            if (siteIds.length > 0) {
              const { data: sites } = await supabase
                .from("sites")
                .select("id, name")
                .in("id", siteIds);
              
              if (sites) {
                sites.forEach((s: any) => sitesMap.set(s.id, s.name));
              }
            }

            alertRows.push(
              ...lateTasks.map((task: any) => ({
                id: `late-${task.id}`,
                title: task.custom_name || task.template?.name || "Late Task",
                message: `Task due at ${task.due_time} - now overdue`,
                severity: "warning",
                created_at: `${task.due_date}T${task.due_time || "00:00:00"}Z`,
                type: "task-note" as const,
                site_name: task.site_id ? sitesMap.get(task.site_id) ?? null : null,
                due_time: task.due_time,
                isOverdue: false,
              } satisfies AlertRow))
            );
          }

          // Process missed tasks
          if (!missedError && missedTasks && missedTasks.length > 0) {
            const siteIds = [...new Set(missedTasks.map((t: any) => t.site_id).filter(Boolean))];
            const sitesMap = new Map<string, string>();
            
            if (siteIds.length > 0) {
              const { data: sites } = await supabase
                .from("sites")
                .select("id, name")
                .in("id", siteIds);
              
              if (sites) {
                sites.forEach((s: any) => sitesMap.set(s.id, s.name));
              }
            }

            alertRows.push(
              ...missedTasks.map((task: any) => ({
                id: `missed-${task.id}`,
                title: task.custom_name || task.template?.name || "Missed Task",
                message: `Task was due yesterday and not completed`,
                severity: "critical",
                created_at: task.due_date,
                type: "task-note" as const,
                site_name: task.site_id ? sitesMap.get(task.site_id) ?? null : null,
                due_time: task.due_time,
                isMissed: true,
              } satisfies AlertRow))
            );
          }

          if (taskError) {
            console.warn("Error fetching task notes:", taskError);
            // Don't throw - continue with other alerts
          } else if (taskNotes && taskNotes.length > 0) {
            // Filter tasks that have notes in task_data or fetch template notes
            const tasksWithNotes = taskNotes.filter((task: any) => {
              // Check if task_data has notes
              if (task.task_data && typeof task.task_data === 'object') {
                if (task.task_data.notes || task.task_data.template_notes) {
                  return true;
                }
              }
              return false;
            });

            // Only process if we have tasks with notes
            if (tasksWithNotes.length > 0) {
              // Fetch sites separately to avoid relationship issues
            const siteIds = [...new Set(tasksWithNotes.map((t: any) => t.site_id).filter(Boolean))];
            let sitesMap = new Map<string, string>();
            
            if (siteIds.length > 0) {
              const { data: sites, error: sitesError } = await supabase
                .from("sites")
                .select("id, name")
                .in("id", siteIds);
              
              if (!sitesError && sites) {
                sitesMap = new Map(sites.map((s: any) => [s.id, s.name]));
              }
            }

            alertRows.push(
              ...tasksWithNotes.map((task: any) => {
                const dueTime = task.due_time ?? null;
                const timestamp = new Date(`${task.due_date}T${dueTime ?? "00:00:00"}Z`).toISOString();
                const siteName = task.site_id ? sitesMap.get(task.site_id) ?? null : null;
                // Extract notes from task_data
                const notes = task.task_data?.notes || task.task_data?.template_notes || null;
                return {
                  id: `task-note-${task.id}`,
                  title: task.custom_name ?? "Checklist note",
                  message: notes ?? undefined,
                  severity: "info",
                  created_at: timestamp,
                  type: "task-note",
                  site_name: siteName,
                  due_time: dueTime,
                  isOverdue: false,
                  isMissed: false,
                } satisfies AlertRow;
              })
            );
            }
          }

          const { data: breachActions, error: breachError } = await supabase
            .from("temperature_breach_actions")
            .select(
              "id, action_type, status, due_at, metadata, created_at, site_id, site:sites(name), temperature_log:temperature_logs(recorded_at, reading, unit, meta)"
            )
            .eq("company_id", companyId)
            .in("status", ["pending", "acknowledged"])
            .gte("created_at", since)
            .limit(50)
            .order("created_at", { ascending: false });

          if (breachError) throw breachError;

          alertRows.push(
            ...(breachActions || []).map((action: any) => {
              const log = action.temperature_log ?? {};
              const evaluation = log.meta?.evaluation ?? null;
              const due = action.due_at ? new Date(action.due_at).toISOString() : action.created_at;
              return {
                id: `temp-breach-${action.id}`,
                type: "temp-breach",
                title: `${action.action_type === "monitor" ? "Monitor" : "Callout"} temperature breach`,
                message:
                  evaluation?.reason ??
                  `Reading ${log.reading ?? ""}${log.unit ?? "°C"} recorded at ${
                    log.recorded_at ? new Date(log.recorded_at).toLocaleString() : ""}
                  }`,
                severity: action.action_type === "callout" ? "critical" : "warning",
                created_at: action.created_at,
                site_name: action.site?.name ?? null,
                due_time: due,
                action_type: action.action_type,
                status: action.status,
                isOverdue: false,
                isMissed: false,
              } satisfies AlertRow;
            })
          );
        }

        alertRows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (mounted) setAlerts(alertRows);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load alerts");
      } finally {
        if (mounted) {
          setLoading(false);
          isLoading = false;
        }
      }
    };
    
    load();
    
    // Set up realtime subscriptions with debouncing to prevent infinite loops
    let debounceTimeout: NodeJS.Timeout;
    const debouncedLoad = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        if (mounted) load();
      }, 500); // 500ms debounce
    };
    
    const channel = supabase
      .channel("dashboard-alerts-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, debouncedLoad)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, debouncedLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist_tasks" }, debouncedLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "temperature_breach_actions" }, debouncedLoad)
      .subscribe();
    
    return () => {
      mounted = false;
      clearTimeout(debounceTimeout);
      supabase.removeChannel(channel);
    };
  }, [companyId, since]);

  // Determine alert color and icon based on type and severity
  const getAlertStyle = (alert: AlertRow) => {
    // Missed tasks - red
    if (alert.isMissed) {
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/40',
        icon: AlertTriangle,
        iconColor: 'text-red-400',
        textColor: 'text-red-300',
        labelColor: 'text-red-400'
      }
    }
    
    // Overdue tasks - red
    if (alert.isOverdue) {
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/40',
        icon: AlertTriangle,
        iconColor: 'text-red-400',
        textColor: 'text-red-300',
        labelColor: 'text-red-400'
      }
    }
    
    // Callouts - red
    if (alert.type === 'temp-breach' && alert.action_type === 'callout') {
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/40',
        icon: Wrench,
        iconColor: 'text-red-400',
        textColor: 'text-red-300',
        labelColor: 'text-red-400'
      }
    }
    
    // Late tasks - amber/yellow
    if (alert.type === 'task-note' && alert.due_time) {
      const dueTime = new Date(`${alert.created_at.split('T')[0]}T${alert.due_time || '00:00:00'}Z`)
      const now = new Date()
      if (dueTime < now && !alert.isOverdue && !alert.isMissed) {
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/40',
          icon: Clock,
          iconColor: 'text-yellow-400',
          textColor: 'text-yellow-300',
          labelColor: 'text-yellow-400'
        }
      }
    }
    
    // Temperature breaches (monitor) - amber/yellow
    if (alert.type === 'temp-breach' && alert.action_type === 'monitor') {
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/40',
        icon: Thermometer,
        iconColor: 'text-yellow-400',
        textColor: 'text-yellow-300',
        labelColor: 'text-yellow-400'
      }
    }
    
    // Critical notifications - red
    if (alert.severity === 'critical') {
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/40',
        icon: AlertTriangle,
        iconColor: 'text-red-400',
        textColor: 'text-red-300',
        labelColor: 'text-red-400'
      }
    }
    
    // Warning notifications - amber/yellow
    if (alert.severity === 'warning') {
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/40',
        icon: AlertTriangle,
        iconColor: 'text-yellow-400',
        textColor: 'text-yellow-300',
        labelColor: 'text-yellow-400'
      }
    }
    
    // Default/info - blue/gray
    return {
      bg: 'bg-white/[0.05]',
      border: 'border-white/[0.1]',
      icon: Bell,
      iconColor: 'text-blue-400',
      textColor: 'text-white/80',
      labelColor: 'text-white/60'
    }
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Alerts Feed</h2>
          <p className="text-sm text-white/60 mt-1">Active alerts and notifications</p>
        </div>
        {alerts.length > 0 && (
          <button
            className="text-sm px-3 py-1.5 rounded-lg border border-white/20 text-white/60 hover:bg-white/10 transition-colors"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? "Collapse" : "Expand"}
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-400"></div>
              <span className="ml-3 text-white/60 text-sm">Loading alerts...</span>
            </div>
          )}
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          
          {!loading && alerts.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-sm text-white/60">No active alerts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 10).map((a) => {
                const style = getAlertStyle(a)
                const Icon = style.icon
                
                return (
                  <div
                    key={a.id}
                    className={`${style.bg} ${style.border} border rounded-lg p-3 transition-colors hover:opacity-90`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-4 h-4 ${style.iconColor} flex-shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className={`font-medium text-sm ${style.textColor} truncate`}>
                            {a.type === "task-note"
                              ? a.title || "Task Alert"
                              : a.type === "temp-breach"
                              ? a.title || "Temperature Breach"
                              : a.title || "Alert"}
                          </span>
                          <span className={`text-xs ${style.labelColor} flex-shrink-0`}>
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {a.message && (
                          <div className={`text-xs ${style.textColor} opacity-80 line-clamp-2 mb-1`}>
                            {a.message}
                          </div>
                        )}
                        {(a.site_name || a.due_time || a.action_type) && (
                          <div className={`flex items-center gap-2 flex-wrap text-xs ${style.labelColor} mt-1`}>
                            {a.site_name && <span>{a.site_name}</span>}
                            {a.type === "task-note" && a.due_time && (
                              <span>• Due {a.due_time}</span>
                            )}
                            {a.type === "temp-breach" && (
                              <>
                                {a.action_type && (
                                  <span className={`px-1.5 py-0.5 rounded ${
                                    a.action_type === 'callout' 
                                      ? 'bg-red-500/20 text-red-400' 
                                      : 'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {a.action_type === "monitor" ? "Monitor" : "Callout"}
                                  </span>
                                )}
                                {a.status && <span>• {a.status}</span>}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {alerts.length > 10 && (
                <div className="text-center pt-2">
                  <p className="text-xs text-white/40">
                    Showing 10 of {alerts.length} alerts
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}