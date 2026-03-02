"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { useToast, ToastProvider } from "@/components/ui/ToastProvider";
import {
  Bell,
  BellOff,
  AlertTriangle,
  ClipboardCheck,
  Thermometer,
  MessageSquare,
  Wrench,
  Clock,
  CheckCircle,
  Check,
  Loader2,
  Filter,
  ArrowLeft,
} from "@/components/ui/icons";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type NotificationRow = {
  id: string;
  company_id: string;
  site_id: string | null;
  type: string;
  title: string;
  message: string;
  link: string | null;
  severity: "info" | "warning" | "critical" | string;
  read: boolean;
  recipient_role: "staff" | "manager" | "admin" | string;
  user_id?: string;
  metadata?: any;
  created_at: string;
  status?: string;
};

type FeedItem = {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  type: string;
  created_at: string;
  read: boolean;
  site_name?: string | null;
  due_time?: string | null;
  link?: string | null;
  metadata?: any;
  isOverdue?: boolean;
  isMissed?: boolean;
  isTask?: boolean;
  dbId?: string; // actual notification table id for mark-as-read
};

type FilterTab = "all" | "unread" | "critical" | "tasks" | "system";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function getItemIcon(item: FeedItem) {
  if (item.isOverdue || item.isMissed) return AlertTriangle;
  if (item.isTask) return ClipboardCheck;
  switch (item.type) {
    case "incident":
      return AlertTriangle;
    case "task":
    case "task_ready":
    case "task_late":
      return ClipboardCheck;
    case "temperature":
    case "temp-breach":
      return Thermometer;
    case "maintenance":
    case "ppm_due_soon":
    case "ppm_overdue":
    case "ppm_completed":
      return Wrench;
    case "message":
    case "message_mention":
      return MessageSquare;
    case "reminder":
      return Clock;
    case "system":
    case "digest":
      return Bell;
    default:
      return Bell;
  }
}

function getSeverityStyle(severity: string, isOverdue?: boolean, isMissed?: boolean) {
  if (isOverdue || isMissed || severity === "critical") {
    return {
      badge: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/40",
      icon: "text-red-600 dark:text-red-400",
      border: "border-l-red-500 dark:border-l-red-400",
    };
  }
  if (severity === "warning") {
    return {
      badge: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/40",
      icon: "text-amber-600 dark:text-amber-400",
      border: "border-l-amber-500 dark:border-l-amber-400",
    };
  }
  return {
    badge: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
    icon: "text-blue-600 dark:text-blue-400",
    border: "border-l-blue-400 dark:border-l-blue-500",
  };
}

const SYSTEM_TYPES = new Set(["system", "digest", "maintenance", "ppm_due_soon", "ppm_overdue", "ppm_completed"]);
const TASK_TYPES = new Set(["task", "task_ready", "task_late"]);

function matchesFilter(item: FeedItem, filter: FilterTab): boolean {
  switch (filter) {
    case "unread":
      return !item.read;
    case "critical":
      return item.severity === "critical" || !!item.isOverdue || !!item.isMissed;
    case "tasks":
      return !!item.isTask || TASK_TYPES.has(item.type);
    case "system":
      return SYSTEM_TYPES.has(item.type);
    default:
      return true;
  }
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

function NotificationsInner() {
  const { companyId, siteId, role, userId, profile: userProfile } = useAppContext();
  const { showToast } = useToast();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const since = useMemo(() => new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), []);

  /* ---------------------------------------------------------------- */
  /*  Role-based site access (from AlertsFeed pattern)                 */
  /* ---------------------------------------------------------------- */

  const getAccessibleSiteIds = useCallback(async () => {
    if (!userProfile || !companyId) return [];

    const { app_role } = userProfile;

    if (app_role === "Owner" || app_role === "Admin") {
      const { data: sites } = await supabase.from("sites").select("id").eq("company_id", companyId);
      return sites?.map((s: any) => s.id) || [];
    }

    if (app_role === "Regional Manager") {
      const { data: regions } = await supabase.from("regions").select("id").eq("regional_manager_id", userProfile.id);
      if (regions && regions.length > 0) {
        const { data: sites } = await supabase.from("sites").select("id").in("region_id", regions.map((r: any) => r.id));
        return sites?.map((s: any) => s.id) || [];
      }
    }

    if (app_role === "Area Manager") {
      const { data: areas } = await supabase.from("areas").select("id").eq("area_manager_id", userProfile.id);
      if (areas && areas.length > 0) {
        const { data: sites } = await supabase.from("sites").select("id").in("area_id", areas.map((a: any) => a.id));
        return sites?.map((s: any) => s.id) || [];
      }
    }

    // Manager / Staff: home site + borrowed sites
    const siteIds = new Set<string>();
    if (userProfile.home_site) siteIds.add(userProfile.home_site);

    const { data: assignments } = await supabase
      .from("employee_site_assignments")
      .select("borrowed_site_id")
      .eq("profile_id", userProfile.id)
      .eq("is_active", true)
      .lte("start_date", new Date().toISOString())
      .or("end_date.is.null,end_date.gte." + new Date().toISOString());

    assignments?.forEach((a: any) => {
      if (a.borrowed_site_id) siteIds.add(a.borrowed_site_id);
    });

    return Array.from(siteIds);
  }, [companyId, userProfile]);

  /* ---------------------------------------------------------------- */
  /*  Fetch all data                                                   */
  /* ---------------------------------------------------------------- */

  const loadAll = useCallback(async () => {
    if (!companyId || !userProfile) return;

    setLoading(true);
    try {
      const feedItems: FeedItem[] = [];
      const todayIso = new Date().toISOString().split("T")[0];
      const accessibleSiteIds = await getAccessibleSiteIds();

      // Helper: build a site-name lookup map
      const buildSiteMap = async (ids: string[]) => {
        const map = new Map<string, string>();
        if (ids.length === 0) return map;
        const { data: sites } = await supabase.from("sites").select("id, name").in("id", ids);
        sites?.forEach((s: any) => map.set(s.id, s.name));
        return map;
      };

      // 1. Notifications from DB
      try {
        let q = supabase
          .from("notifications")
          .select("*")
          .eq("company_id", companyId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(100);

        if (accessibleSiteIds.length > 0) {
          q = q.or(`site_id.in.(${accessibleSiteIds.join(",")}),site_id.is.null`);
        }
        if (userId) {
          q = q.or(`user_id.eq.${userId},user_id.is.null`);
        }

        const { data } = await q;
        if (data) {
          // Fetch site names for all notifications
          const notifSiteIds = [...new Set(data.map((n: any) => n.site_id).filter(Boolean))];
          const siteMap = await buildSiteMap(notifSiteIds as string[]);

          feedItems.push(
            ...data.map((n: any) => ({
              id: n.id,
              dbId: n.id,
              title: n.title || "Notification",
              message: n.message || "",
              severity: (n.severity || "info") as FeedItem["severity"],
              type: n.type || "system",
              created_at: n.created_at,
              read: !!n.read,
              site_name: n.site_id ? siteMap.get(n.site_id) ?? null : null,
              link: n.link || (n.metadata?.task_id ? `/dashboard/tasks/view/${n.metadata.task_id}` : null),
              metadata: n.metadata,
            }))
          );
        }
      } catch {
        // Notifications table might not exist yet
      }

      // 2. Overdue tasks (excludes ad-hoc/on-demand tasks)
      try {
        let overdueQ = supabase
          .from("checklist_tasks")
          .select("id, custom_name, template_id, due_date, due_time, status, site_id, task_data, template: task_templates(name)")
          .eq("company_id", companyId)
          .in("status", ["pending", "in_progress", "accepted"])
          .lt("due_date", todayIso)
          .limit(30);

        if (accessibleSiteIds.length > 0) overdueQ = overdueQ.in("site_id", accessibleSiteIds);

        const { data: overdueTasks } = await overdueQ;
        const filteredOverdue = (overdueTasks || []).filter((t: any) => t.task_data?.source_type !== 'ad_hoc');
        if (filteredOverdue.length > 0) {
          const siteMap = await buildSiteMap([...new Set(filteredOverdue.map((t: any) => t.site_id).filter(Boolean))]);
          feedItems.push(
            ...filteredOverdue.map((t: any) => ({
              id: `overdue-${t.id}`,
              title: t.custom_name || t.template?.name || "Overdue Task",
              message: `Task overdue since ${new Date(t.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
              severity: "critical" as const,
              type: "task_late",
              created_at: t.due_date,
              read: false,
              site_name: t.site_id ? siteMap.get(t.site_id) ?? null : null,
              due_time: t.due_time,
              link: `/dashboard/tasks/view/${t.id}`,
              isOverdue: true,
              isTask: true,
            }))
          );
        }
      } catch {}

      // 3. Late tasks (due today, past due time) — excludes ad-hoc/on-demand
      try {
        const currentTime = new Date().toTimeString().slice(0, 5);
        let lateQ = supabase
          .from("checklist_tasks")
          .select("id, custom_name, template_id, due_date, due_time, status, site_id, task_data, template: task_templates(name)")
          .eq("company_id", companyId)
          .eq("due_date", todayIso)
          .in("status", ["pending", "in_progress", "accepted"])
          .not("due_time", "is", null)
          .lt("due_time", currentTime)
          .limit(30);

        if (accessibleSiteIds.length > 0) lateQ = lateQ.in("site_id", accessibleSiteIds);

        const { data: lateTasks } = await lateQ;
        const filteredLate = (lateTasks || []).filter((t: any) => t.task_data?.source_type !== 'ad_hoc');
        if (filteredLate.length > 0) {
          const siteMap = await buildSiteMap([...new Set(filteredLate.map((t: any) => t.site_id).filter(Boolean))]);
          feedItems.push(
            ...filteredLate.map((t: any) => ({
              id: `late-${t.id}`,
              title: t.custom_name || t.template?.name || "Late Task",
              message: `Due at ${t.due_time} — now overdue`,
              severity: "warning" as const,
              type: "task_late",
              created_at: `${t.due_date}T${t.due_time || "00:00:00"}Z`,
              read: false,
              site_name: t.site_id ? siteMap.get(t.site_id) ?? null : null,
              due_time: t.due_time,
              link: `/dashboard/tasks/view/${t.id}`,
              isTask: true,
            }))
          );
        }
      } catch {}

      // 4. Missed tasks (yesterday, incomplete) — excludes ad-hoc/on-demand
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayIso = yesterday.toISOString().split("T")[0];

        let missedQ = supabase
          .from("checklist_tasks")
          .select("id, custom_name, template_id, due_date, due_time, status, site_id, task_data, template: task_templates(name)")
          .eq("company_id", companyId)
          .eq("due_date", yesterdayIso)
          .in("status", ["pending", "in_progress", "accepted"])
          .limit(30);

        if (accessibleSiteIds.length > 0) missedQ = missedQ.in("site_id", accessibleSiteIds);

        const { data: missedTasks } = await missedQ;
        const filteredMissed = (missedTasks || []).filter((t: any) => t.task_data?.source_type !== 'ad_hoc');
        if (filteredMissed.length > 0) {
          const siteMap = await buildSiteMap([...new Set(filteredMissed.map((t: any) => t.site_id).filter(Boolean))]);
          feedItems.push(
            ...filteredMissed.map((t: any) => ({
              id: `missed-${t.id}`,
              title: t.custom_name || t.template?.name || "Missed Task",
              message: "Due yesterday — not completed",
              severity: "critical" as const,
              type: "task_late",
              created_at: t.due_date,
              read: false,
              site_name: t.site_id ? siteMap.get(t.site_id) ?? null : null,
              due_time: t.due_time,
              link: `/dashboard/tasks/view/${t.id}`,
              isMissed: true,
              isTask: true,
            }))
          );
        }
      } catch {}

      // 5. Temperature breach actions
      try {
        const { data: breachActions } = await supabase
          .from("temperature_breach_actions")
          .select(
            "id, action_type, status, due_at, metadata, created_at, site_id, site:sites(name), temperature_log:temperature_logs(recorded_at, reading, unit, meta)"
          )
          .eq("company_id", companyId)
          .in("status", ["pending", "acknowledged"])
          .gte("created_at", since)
          .limit(30)
          .order("created_at", { ascending: false });

        if (breachActions) {
          feedItems.push(
            ...breachActions.map((a: any) => {
              const log = a.temperature_log ?? {};
              return {
                id: `temp-${a.id}`,
                title: `${a.action_type === "monitor" ? "Monitor" : "Callout"} — Temperature Breach`,
                message: log.meta?.evaluation?.reason || `Reading ${log.reading ?? "?"}${log.unit ?? "°C"}`,
                severity: (a.action_type === "callout" ? "critical" : "warning") as FeedItem["severity"],
                type: "temp-breach",
                created_at: a.created_at,
                read: false,
                site_name: a.site?.name ?? null,
              };
            })
          );
        }
      } catch {}

      // Sort by date descending
      feedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItems(feedItems);
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId, userId, userProfile, since, getAccessibleSiteIds]);

  /* ---------------------------------------------------------------- */
  /*  Load + realtime                                                  */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel("notifications-centre")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        loadAll();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAll]);

  /* ---------------------------------------------------------------- */
  /*  Actions                                                          */
  /* ---------------------------------------------------------------- */

  const markRead = async (item: FeedItem) => {
    if (!item.dbId) return;
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", item.dbId);
  };

  const markAllRead = async () => {
    if (!companyId) return;
    setMarkingAll(true);
    try {
      const unreadDbIds = items.filter((i) => !i.read && i.dbId).map((i) => i.dbId!);
      if (unreadDbIds.length > 0) {
        await supabase.from("notifications").update({ read: true }).in("id", unreadDbIds);
      }
      setItems((prev) => prev.map((n) => (n.dbId ? { ...n, read: true } : n)));
      showToast("All notifications marked as read", "info");
    } catch {
      showToast("Failed to mark all as read", "error");
    } finally {
      setMarkingAll(false);
    }
  };

  const acceptOpenShift = async (item: FeedItem) => {
    const meta = item.metadata || {};
    if (meta.kind !== "open_shift_offer" || !meta.shift_id) return;

    setAcceptingId(item.id);
    try {
      const { error } = await (supabase as any).rpc("claim_open_shift", { p_shift_id: meta.shift_id });
      if (error) throw error;
      if (item.dbId) await markRead(item);
      showToast("Shift accepted and added to your rota", "info");
    } catch (err: any) {
      showToast(err?.message || "Failed to accept shift", "error");
    } finally {
      setAcceptingId(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Computed                                                         */
  /* ---------------------------------------------------------------- */

  const filtered = useMemo(() => items.filter((i) => matchesFilter(i, activeFilter)), [items, activeFilter]);
  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);
  const criticalCount = useMemo(() => items.filter((i) => i.severity === "critical" || i.isOverdue || i.isMissed).length, [items]);

  const TABS: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "All", count: items.length },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "critical", label: "Critical", count: criticalCount },
    { key: "tasks", label: "Tasks" },
    { key: "system", label: "System" },
  ];

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-theme-surface">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-theme-surface-elevated border border-theme text-theme-secondary hover:text-theme-primary transition"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-theme-primary">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#D37E91] text-white text-xs font-semibold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-theme-tertiary mt-0.5">Last 14 days</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-theme-secondary hover:text-theme-primary bg-theme-surface-elevated border border-theme hover:border-theme-hover transition disabled:opacity-50"
            >
              {markingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                activeFilter === tab.key
                  ? "bg-teamly/15 text-teamly border border-teamly/30"
                  : "text-theme-tertiary hover:text-theme-secondary hover:bg-theme-hover border border-transparent"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeFilter === tab.key ? "bg-teamly/20 text-teamly" : "bg-theme-muted text-theme-tertiary"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-teamly" />
            <span className="ml-3 text-theme-tertiary text-sm">Loading notifications...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-theme-surface-elevated border border-theme flex items-center justify-center">
              {activeFilter === "all" ? (
                <BellOff size={24} className="text-theme-tertiary" />
              ) : (
                <Filter size={24} className="text-theme-tertiary" />
              )}
            </div>
            <p className="text-theme-secondary font-medium mb-1">
              {activeFilter === "all" ? "No notifications yet" : `No ${activeFilter} notifications`}
            </p>
            <p className="text-sm text-theme-tertiary">
              {activeFilter === "all"
                ? "Notifications will appear here as activity happens."
                : "Try a different filter to see more."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const Icon = getItemIcon(item);
              const style = getSeverityStyle(item.severity, item.isOverdue, item.isMissed);
              const isShiftOffer = item.metadata?.kind === "open_shift_offer" && item.metadata?.shift_id;

              return (
                <div
                  key={item.id}
                  className={`bg-theme-surface-elevated border border-theme rounded-lg p-4 transition hover:border-theme-hover ${
                    !item.read ? "border-l-[3px] " + style.border : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`mt-0.5 flex-shrink-0 ${style.icon}`}>
                      <Icon size={20} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm text-theme-primary truncate">{item.title}</span>
                          {!item.read && (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-teamly" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-md border font-medium ${style.badge}`}>
                            {item.isOverdue ? "OVERDUE" : item.isMissed ? "MISSED" : item.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-theme-tertiary whitespace-nowrap">{timeAgo(item.created_at)}</span>
                        </div>
                      </div>

                      {item.message && (
                        <p className="text-sm text-theme-secondary line-clamp-2 mb-1.5">{item.message}</p>
                      )}

                      {/* Metadata row */}
                      {(item.site_name || item.due_time) && (
                        <div className="flex items-center gap-2 text-xs text-theme-tertiary mb-2">
                          {item.site_name && <span>{item.site_name}</span>}
                          {item.site_name && item.due_time && <span>&middot;</span>}
                          {item.due_time && <span>Due {item.due_time}</span>}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        {isShiftOffer && (
                          <button
                            disabled={acceptingId === item.id}
                            onClick={() => acceptOpenShift(item)}
                            className="text-xs px-3 py-1.5 rounded-md border border-teamly text-teamly hover:bg-teamly/10 transition disabled:opacity-50"
                          >
                            {acceptingId === item.id ? "Accepting..." : "Accept shift"}
                          </button>
                        )}
                        {!item.read && item.dbId && (
                          <button
                            onClick={() => markRead(item)}
                            className="flex items-center gap-1 text-xs text-theme-tertiary hover:text-theme-secondary transition"
                          >
                            <Check size={12} />
                            Mark read
                          </button>
                        )}
                        {item.link && (
                          <Link
                            href={item.link}
                            className="text-xs text-teamly hover:text-teamly/80 transition"
                          >
                            View details
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page wrapper                                                       */
/* ------------------------------------------------------------------ */

export default function Page() {
  return (
    <AppProvider>
      <ToastProvider>
        <NotificationsInner />
      </ToastProvider>
    </AppProvider>
  );
}
