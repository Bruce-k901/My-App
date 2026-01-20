"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format, addDays, startOfDay, setHours, setMinutes, isSameDay, parseISO } from "date-fns";
import { Calendar, Clock, Filter, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import { toast } from "sonner";
import TaskCompletionModal from "@/components/checklists/TaskCompletionModal";
import { ChecklistTaskWithTemplate } from "@/types/checklist-types";
import { enrichTemplateWithDefinition } from "@/lib/templates/enrich-template";

// ============================================================================
// TYPES
// ============================================================================

type CalendarItemType = "task" | "meeting" | "call" | "note" | "reminder" | "message";

interface CalendarItem {
  id: string;
  type: CalendarItemType;
  title: string;
  description?: string;
  scheduledAt: Date; // Local time for display
  scheduledAtUTC: Date; // UTC for storage
  timezone: string;
  duration?: number; // Minutes
  status: "pending" | "accepted" | "completed" | "in_progress" | "cancelled";
  participants?: Array<{
    id: string;
    name: string;
    avatar_url?: string;
    response_status?: "pending" | "accepted" | "declined";
  }>;
  assignees?: Array<{
    id: string;
    name: string;
    avatar_url?: string;
  }>;
  template_id?: string;
  template_name?: string;
  template_type?: string;
  source_message_id?: string;
  meeting_link?: string;
  meeting_location?: string;
}

interface FilterState {
  tasks: boolean;
  meetings: boolean;
  calls: boolean;
  notes: boolean;
  reminders: boolean;
  messages: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CalendarWidget() {
  const { companyId, siteId, userId, userProfile } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchInProgressRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSetItemsRef = useRef<Set<string>>(new Set()); // Track what we last set to prevent accumulation
  // Load filter preferences from localStorage
  const loadFilters = (): FilterState => {
    if (typeof window === "undefined") {
      return {
        tasks: true,
        meetings: true,
        calls: true,
        notes: true,
        reminders: true,
        messages: true,
      };
    }
    const saved = localStorage.getItem("calendarFilters");
    if (saved) {
      try {
        return { ...JSON.parse(saved) };
      } catch {
        // Invalid JSON, use defaults
      }
    }
    return {
      tasks: true,
      meetings: true,
      calls: true,
      notes: true,
      reminders: true,
      messages: true,
    };
  };

  const [filters, setFilters] = useState<FilterState>(loadFilters);
  const [showExpandedCalendar, setShowExpandedCalendar] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<ChecklistTaskWithTemplate | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Calculate date range (current day + 6 days forward) - memoized to prevent infinite loops
  const startDate = useMemo(() => startOfDay(currentDate), [currentDate]);
  const endDate = useMemo(() => addDays(startDate, 6), [startDate]);
  
  // Create stable date strings for dependency comparison
  const startDateStr = useMemo(() => format(startDate, "yyyy-MM-dd"), [startDate]);
  const endDateStr = useMemo(() => format(endDate, "yyyy-MM-dd"), [endDate]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchCalendarItems = useCallback(async () => {
    if (!companyId || !userId) {
      setLoading(false);
      setCalendarItems([]);
      fetchInProgressRef.current = false;
      return;
    }

    // Prevent multiple simultaneous fetches
    if (fetchInProgressRef.current) {
      console.log("⏸️ Fetch already in progress, skipping...");
      return;
    }

    fetchInProgressRef.current = true;
    setLoading(true);
    // Clear items immediately to prevent showing stale data
    setCalendarItems([]);
    try {
      // Note: We're working with due_date (DATE) and due_time (TEXT) fields
      // No need for complex timezone conversion - just use local dates

      // Fetch checklist_tasks (the main task table)
      // Note: The actual schema uses due_date (DATE) and due_time (TEXT), not scheduled_at_utc
      // We'll need to combine these for display
      // Fetch tasks assigned to user OR tasks in their company (if admin/manager)
      const userRole = userProfile?.app_role;
      const isAdminOrManager = userRole === "admin" || userRole === "manager";

      let tasksQuery = supabase
        .from("checklist_tasks")
        .select(`
          id,
          custom_name,
          due_date,
          due_time,
          status,
          priority,
          assigned_to_user_id,
          template_id,
          task_data,
          created_at,
          template:task_templates(
            id,
            name,
            category,
            asset_id
          ),
          assigned_to:profiles!assigned_to_user_id(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("company_id", companyId)
        .gte("due_date", format(startDate, "yyyy-MM-dd"))
        .lte("due_date", format(endDate, "yyyy-MM-dd"))
        .in("status", ["pending", "in_progress"]);

      // Filter by assignment if not admin/manager
      if (!isAdminOrManager) {
        tasksQuery = tasksQuery.or(`assigned_to_user_id.eq.${userId},assigned_to_user_id.is.null`);
      }

      const { data: tasks, error: tasksError } = await tasksQuery
        .order("due_date", { ascending: true })
        .order("due_time", { ascending: true });

      if (tasksError) {
        console.error("Error fetching tasks:", tasksError);
        throw tasksError;
      }

      // AGGRESSIVE: Deduplicate at database result level first
      const taskIdCounts = new Map<string, number>();
      tasks?.forEach((task: any) => {
        taskIdCounts.set(task.id, (taskIdCounts.get(task.id) || 0) + 1);
      });
      
      const duplicateTaskIds = Array.from(taskIdCounts.entries())
        .filter(([id, count]) => count > 1)
        .map(([id]) => id);
      
      if (duplicateTaskIds.length > 0) {
        console.error(`❌ DATABASE RETURNED DUPLICATE TASK IDS:`, duplicateTaskIds);
        duplicateTaskIds.forEach(id => {
          const count = taskIdCounts.get(id)!;
          const taskInstances = tasks?.filter((t: any) => t.id === id);
          console.error(`  - Task ID ${id} appears ${count} times:`, taskInstances);
        });
      }
      
      const uniqueTasks = tasks ? Array.from(
        new Map(tasks.map((task: any) => [task.id, task])).values()
      ) : [];
      
      console.log(`📊 Database returned ${tasks?.length || 0} tasks, ${uniqueTasks.length} unique after deduplication (${duplicateTaskIds.length} duplicate IDs found)`);

      // Extract asset IDs from tasks to check for archived assets
      const assetIds = new Set<string>();
      const calloutIds = new Set<string>();
      const calloutToAssetMap = new Map<string, string>();
      
      if (uniqueTasks) {
        uniqueTasks.forEach((task: any) => {
          // Asset ID from template
          if (task.template?.asset_id) {
            assetIds.add(task.template.asset_id);
          }
          // Asset ID from task_data
          const taskData = task.task_data || {};
          if (taskData.asset_id) {
            assetIds.add(taskData.asset_id);
          }
          // PPM overdue tasks: source_id IS the asset_id directly
          if (taskData.source_type === 'ppm_overdue' && taskData.source_id) {
            assetIds.add(taskData.source_id);
          }
          // PPM service tasks: source_id is the asset_id
          if (taskData.source_type === 'ppm_service' && taskData.source_id) {
            assetIds.add(taskData.source_id);
          }
          // Callout follow-up tasks: collect callout IDs to look up later
          if (taskData.source_type === 'callout_followup' && taskData.callout_id) {
            calloutIds.add(taskData.callout_id);
          }
        });
      }

      // Look up asset_ids from callouts
      if (calloutIds.size > 0) {
        const { data: callouts, error: calloutsError } = await supabase
          .from("callouts")
          .select("id, asset_id")
          .in("id", Array.from(calloutIds));

        if (calloutsError) {
          console.error("Error fetching callouts for archived check:", calloutsError);
        } else if (callouts) {
          callouts.forEach((callout: any) => {
            if (callout.asset_id) {
              assetIds.add(callout.asset_id);
              calloutToAssetMap.set(callout.id, callout.asset_id);
            }
          });
        }
      }

      // Fetch assets to check archived status
      // Query ALL assets (both archived and non-archived) to properly check archived field
      let archivedAssetIds = new Set<string>();
      if (assetIds.size > 0) {
        const { data: assets, error: assetsError } = await supabase
          .from("assets")
          .select("id, archived")
          .in("id", Array.from(assetIds));

        if (assetsError) {
          console.error("Error fetching assets for archived check:", assetsError);
          // On error, be conservative and exclude all tasks for these assets
          assetIds.forEach((assetId) => {
            archivedAssetIds.add(assetId);
          });
        } else if (assets) {
          // Check each asset's archived field
          assets.forEach((asset: any) => {
            // archived is a boolean field - check if it's true
            if (asset.archived === true) {
              archivedAssetIds.add(asset.id);
              console.log(`🏷️ Asset ${asset.id} is archived (archived=${asset.archived}) - excluding related tasks`);
            }
          });
          
          // Also check if any requested asset IDs are missing from results
          // This could happen if RLS blocks access or asset was deleted
          const foundAssetIds = new Set(assets.map((a: any) => a.id));
          assetIds.forEach((assetId) => {
            if (!foundAssetIds.has(assetId)) {
              console.warn(`⚠️ Asset ${assetId} not found in query results - may be archived or RLS blocked`);
              // Don't automatically exclude - could be RLS issue
            }
          });
        } else {
          // No assets returned - could be RLS issue or all archived
          console.warn("⚠️ No assets returned from query - may be RLS issue");
        }
      }

      // Transform tasks into CalendarItem format
      // Use a Map to track items by ID to prevent duplicates during transformation
      const itemsMap = new Map<string, CalendarItem>();

      if (uniqueTasks) {
        for (const task of uniqueTasks) {
          // Include task if:
          // 1. Assigned to current user
          // 2. Not assigned (null) and user is admin/manager
          // 3. Assigned to someone else but user is admin/manager
          const isAssignedToUser = task.assigned_to_user_id === userId;
          const isUnassigned = !task.assigned_to_user_id;

          if (!isAssignedToUser && !isUnassigned && !isAdminOrManager) {
            continue;
          }

          // Filter out tasks related to archived assets
          const taskData = task.task_data || {};
          const templateAssetId = task.template?.asset_id;
          const taskDataAssetId = taskData.asset_id;
          const ppmAssetId = (taskData.source_type === 'ppm_overdue' || taskData.source_type === 'ppm_service') 
            ? taskData.source_id 
            : null;
          
          // Check if task is related to an archived asset
          const calloutAssetId = taskData.callout_id ? calloutToAssetMap.get(taskData.callout_id) : null;
          const isArchivedAsset = 
            (templateAssetId && archivedAssetIds.has(templateAssetId)) ||
            (taskDataAssetId && archivedAssetIds.has(taskDataAssetId)) ||
            (ppmAssetId && archivedAssetIds.has(ppmAssetId)) ||
            (calloutAssetId && archivedAssetIds.has(calloutAssetId));

          if (isArchivedAsset) {
            console.log(`🚫 Skipping task ${task.id} - related to archived asset`, {
              templateAssetId,
              taskDataAssetId,
              ppmAssetId,
              calloutAssetId,
            });
            continue; // Skip tasks for archived assets
          }

          // Combine due_date and due_time to create scheduled time
          let scheduledAt: Date;
          if (task.due_time) {
            // Parse time (format: "HH:mm" or "HH:mm:ss")
            const [hours, minutes] = task.due_time.split(":").map(Number);
            scheduledAt = setMinutes(setHours(new Date(task.due_date), hours), minutes || 0);
          } else {
            // No time specified, use start of day
            scheduledAt = startOfDay(new Date(task.due_date));
          }

          // Store local time (no timezone conversion needed for date/time fields)
          const scheduledAtUTC = scheduledAt; // Keep for compatibility, but not actually UTC

          const calendarItem: CalendarItem = {
            id: task.id,
            type: "task",
            title: task.custom_name || task.template?.name || "Untitled Task",
            description: task.task_data?.description || task.template?.description,
            scheduledAt,
            scheduledAtUTC,
            timezone: userTimezone,
            status: task.status as any,
            assignees: task.assigned_to
              ? [
                  {
                    id: task.assigned_to.id,
                    name: task.assigned_to.full_name || "Unknown",
                    avatar_url: task.assigned_to.avatar_url || undefined,
                  },
                ]
              : [],
            template_id: task.template_id || undefined,
            template_name: task.template?.name,
            template_type: task.template?.category, // Using category as template type
          };

          // Only add if not already in map (prevents duplicates)
          if (!itemsMap.has(task.id)) {
            itemsMap.set(task.id, calendarItem);
          } else {
            console.warn(`⚠️ Duplicate task ID detected during transformation: ${task.id}`);
          }
        }
      }

      // TODO: Fetch meetings, calls, notes, reminders, messages
      // For now, we'll focus on tasks

      // Convert map to array - already deduplicated
      let uniqueItems = Array.from(itemsMap.values());

      // AGGRESSIVE: Final deduplication pass using Set
      const finalDeduplication = new Map<string, CalendarItem>();
      uniqueItems.forEach((item) => {
        if (!finalDeduplication.has(item.id)) {
          finalDeduplication.set(item.id, item);
        } else {
          console.error(`❌ DUPLICATE DETECTED IN FINAL PASS: ${item.id} - ${item.title}`);
        }
      });
      uniqueItems = Array.from(finalDeduplication.values());

      // AGGRESSIVE: One more deduplication pass using Map to verify
      const finalCheck = new Map<string, CalendarItem>();
      const duplicateIds: string[] = [];
      uniqueItems.forEach((item) => {
        if (finalCheck.has(item.id)) {
          duplicateIds.push(item.id);
          console.error(`❌ CRITICAL: Duplicate found in final pass: ${item.id} - ${item.title} - ${item.scheduledAt}`);
        } else {
          finalCheck.set(item.id, item);
        }
      });
      const finalUniqueItems = Array.from(finalCheck.values());

      if (duplicateIds.length > 0) {
        console.error(`❌ FOUND ${duplicateIds.length} DUPLICATES IN FINAL PASS:`, duplicateIds);
        // Log all items with duplicate IDs
        uniqueItems.forEach(item => {
          if (duplicateIds.includes(item.id)) {
            console.error(`  - Item: ${item.id} - ${item.title} - Date: ${format(item.scheduledAt, "yyyy-MM-dd HH:mm")}`);
          }
        });
      }

      console.log(`📅 Calendar: Final result - ${finalUniqueItems.length} unique items from ${uniqueTasks?.length || 0} tasks (${uniqueItems.length} before final check, ${duplicateIds.length} duplicates removed)`);

      // NUCLEAR: Verify no duplicates in final array
      const finalCheckSet = new Set<string>();
      const finalDuplicates: string[] = [];
      finalUniqueItems.forEach(item => {
        if (finalCheckSet.has(item.id)) {
          finalDuplicates.push(item.id);
        } else {
          finalCheckSet.add(item.id);
        }
      });
      
      if (finalDuplicates.length > 0) {
        console.error(`❌❌❌ CRITICAL: ${finalDuplicates.length} duplicates STILL in finalUniqueItems!`, finalDuplicates);
        // Remove duplicates one more time
        const trulyUnique = Array.from(new Map(finalUniqueItems.map(item => [item.id, item])).values());
        console.error(`❌❌❌ Removed duplicates, now ${trulyUnique.length} items`);
        setCalendarItems(trulyUnique);
        lastSetItemsRef.current = new Set(trulyUnique.map(item => item.id));
      } else {
        // AGGRESSIVE: Set with completely new array - React will handle batching
        setCalendarItems(finalUniqueItems);
        lastSetItemsRef.current = new Set(finalUniqueItems.map(item => item.id));
      }
    } catch (error: any) {
      console.error("Error fetching calendar items:", error);
      // Only show toast for actual errors, not schema issues
      if (error?.code !== '42703') {
        toast.error("Failed to load calendar items");
      }
      setCalendarItems([]); // Set empty array on error to prevent retry loop
      lastSetItemsRef.current = new Set();
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [companyId, userId, startDate, endDate, userTimezone, userProfile]);

  // NUCLEAR: Monitor calendarItems state and auto-fix duplicates
  useEffect(() => {
    // Skip if we just set these items (prevent infinite loop)
    const currentIds = new Set(calendarItems.map(item => item.id));
    const lastSetIds = lastSetItemsRef.current;
    
    // Check if current state matches what we last set
    if (currentIds.size === lastSetIds.size && 
        Array.from(currentIds).every(id => lastSetIds.has(id))) {
      // State matches what we set - no duplicates
      return;
    }
    
    const ids = new Set<string>();
    const duplicates: CalendarItem[] = [];
    
    calendarItems.forEach(item => {
      if (ids.has(item.id)) {
        duplicates.push(item);
      } else {
        ids.add(item.id);
      }
    });
    
    if (duplicates.length > 0) {
      console.error(`❌❌❌ STATE HAS ${duplicates.length} DUPLICATES! Auto-fixing...`, duplicates.map(d => d.id));
      const fixed = Array.from(new Map(calendarItems.map(item => [item.id, item])).values());
      console.error(`❌❌❌ Fixed: ${calendarItems.length} -> ${fixed.length}`);
      setCalendarItems(fixed);
      lastSetItemsRef.current = new Set(fixed.map(item => item.id));
    }
  }, [calendarItems]);

  useEffect(() => {
    if (companyId && userId) {
      // Reset fetch flag and clear items
      fetchInProgressRef.current = false;
      setCalendarItems([]);
      lastSetItemsRef.current = new Set();
      fetchCalendarItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, userId, startDateStr, endDateStr]); // Use stable date strings, fetchCalendarItems is stable via useCallback

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  useEffect(() => {
    if (!companyId || !userId) return;

    let isMounted = true;

    // Subscribe to task updates
    const tasksChannel = supabase
      .channel(`calendar-tasks-${companyId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checklist_tasks",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          if (!isMounted) return;
          console.log("Calendar task update:", payload);
          // Clear existing timeout
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
          }
          // Debounce refetch to prevent multiple rapid calls
          debounceTimeoutRef.current = setTimeout(() => {
            if (isMounted && companyId && userId && !fetchInProgressRef.current) {
              fetchCalendarItems();
            }
          }, 300);
        }
      )
      .subscribe();

    // Also subscribe to asset archive/unarchive changes
    const assetsChannel = supabase
      .channel(`calendar-assets-${companyId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "assets",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          if (!isMounted) return;
          // Only refetch if archived status changed
          const oldArchived = payload.old?.archived;
          const newArchived = payload.new?.archived;
          if (oldArchived !== newArchived) {
            console.log("Asset archived status changed:", payload);
            // Clear existing timeout
            if (debounceTimeoutRef.current) {
              clearTimeout(debounceTimeoutRef.current);
            }
            // Debounce refetch to prevent multiple rapid calls
            debounceTimeoutRef.current = setTimeout(() => {
              if (isMounted && companyId && userId && !fetchInProgressRef.current) {
                fetchCalendarItems();
              }
            }, 300);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      // Clear any pending timeouts
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(assetsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, userId]); // Only re-subscribe if companyId or userId changes

  // ============================================================================
  // FILTER LOGIC
  // ============================================================================

  // NUCLEAR: Filter items and deduplicate by ID - use Map for guaranteed uniqueness
  const filteredItems = useMemo(() => {
    // CRITICAL: Deduplicate by ID using Map - this MUST happen first
    const uniqueMap = new Map<string, CalendarItem>();
    const duplicateIds: string[] = [];
    
    calendarItems.forEach((item) => {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      } else {
        duplicateIds.push(item.id);
        console.error(`❌ DUPLICATE IN STATE: ${item.id} - ${item.title} - REMOVING`);
      }
    });

    if (duplicateIds.length > 0) {
      console.error(`❌ FOUND ${duplicateIds.length} DUPLICATES IN calendarItems STATE:`, duplicateIds);
    }

    // Convert to array and apply filters
    const uniqueItems = Array.from(uniqueMap.values());
    const filtered = uniqueItems.filter((item) => {
      // Apply filters
      if (item.type === "task" && !filters.tasks) return false;
      if (item.type === "meeting" && !filters.meetings) return false;
      if (item.type === "call" && !filters.calls) return false;
      if (item.type === "note" && !filters.notes) return false;
      if (item.type === "reminder" && !filters.reminders) return false;
      if (item.type === "message" && !filters.messages) return false;
      return true;
    });
    
    console.log(`🔍 Filtered: ${calendarItems.length} items -> ${uniqueItems.length} unique -> ${filtered.length} after filters`);
    return filtered;
  }, [calendarItems, filters]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedSlot({ date, hour });
    setShowCreateModal(true);
  };

  const handleItemClick = async (item: CalendarItem) => {
    if (!item.id) {
      toast.error("Task ID not found");
      return;
    }

    try {
      // Fetch full task data with template
      const { data: taskData, error: taskError } = await supabase
        .from("checklist_tasks")
        .select(`
          *,
          template:task_templates(
            id,
            name,
            slug,
            description,
            category,
            frequency,
            compliance_standard,
            is_critical,
            evidence_types,
            repeatable_field_name,
            instructions,
            dayparts,
            recurrence_pattern,
            asset_id,
            time_of_day,
            template_fields (*)
          ),
          assigned_user:profiles!assigned_to_user_id(
            id,
            email,
            full_name
          )
        `)
        .eq("id", item.id)
        .single();

      if (taskError) {
        console.error("Error fetching task:", taskError);
        toast.error("Failed to load task details");
        return;
      }

      if (!taskData) {
        toast.error("Task not found");
        return;
      }

      // Enrich template with definition
      const enrichedTemplate = taskData.template
        ? enrichTemplateWithDefinition(taskData.template)
        : null;

      // Build ChecklistTaskWithTemplate object
      const fullTask: ChecklistTaskWithTemplate = {
        ...taskData,
        template: enrichedTemplate || {
          id: taskData.template_id || "",
          name: taskData.custom_name || "Untitled Task",
          slug: "",
          description: "",
          category: "task",
          fields: [],
        },
        assigned_user: taskData.assigned_user || undefined,
      };

      setSelectedTaskForModal(fullTask);
      setShowCompletionModal(true);
    } catch (error: any) {
      console.error("Error loading task:", error);
      toast.error("Failed to load task");
    }
  };

  const handleReschedule = async (itemId: string, newDate: Date, newHour: number) => {
    try {
      const newScheduledTime = new Date(newDate);
      newScheduledTime.setHours(newHour, 0, 0, 0);
      newScheduledTime.setMinutes(0, 0, 0);

      const newDueDate = format(newScheduledTime, "yyyy-MM-dd");
      const newDueTime = format(newScheduledTime, "HH:mm");

      const { error } = await supabase
        .from("checklist_tasks")
        .update({
          due_date: newDueDate,
          due_time: newDueTime,
        })
        .eq("id", itemId);

      if (error) throw error;

      toast.success("Task rescheduled");
      fetchCalendarItems();
    } catch (error: any) {
      console.error("Error rescheduling:", error);
      toast.error("Failed to reschedule task");
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <DndProvider backend={HTML5Backend}>
      <section className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-4 sm:p-6 shadow-[0_0_12px_rgba(236,72,153,0.05)] fade-in-soft">
        <CalendarHeader
          filters={filters}
          onFilterChange={setFilters}
          onExpandClick={() => setShowExpandedCalendar(true)}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />

        {loading ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-[#EC4899] border-t-transparent rounded-full animate-spin"></div>
              <div className="text-gray-400">Loading calendar...</div>
            </div>
          </div>
        ) : calendarItems.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <div className="text-gray-400 mb-2">No items scheduled for this week</div>
              <button
                onClick={() => handleSlotClick(currentDate, 9)}
                className="px-4 py-2 rounded-lg bg-transparent text-[#EC4899] border border-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out text-sm font-medium"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Create New Item
              </button>
            </div>
          </div>
        ) : (
          <WeekView
            startDate={startDate}
            items={filteredItems}
            onSlotClick={handleSlotClick}
            onItemClick={handleItemClick}
            onReschedule={handleReschedule}
            key={`week-${startDateStr}`}
          />
        )}

        {showExpandedCalendar && (
          <CalendarModal
            onClose={() => setShowExpandedCalendar(false)}
            items={filteredItems}
            onSlotClick={handleSlotClick}
            onItemClick={handleItemClick}
            onReschedule={handleReschedule}
          />
        )}

        {showCreateModal && selectedSlot && (
          <CreateItemModal
            scheduledDate={selectedSlot.date}
            scheduledHour={selectedSlot.hour}
            onClose={() => {
              setShowCreateModal(false);
              setSelectedSlot(null);
            }}
            onSuccess={() => {
              setShowCreateModal(false);
              setSelectedSlot(null);
              fetchCalendarItems();
            }}
            companyId={companyId}
            siteId={siteId}
            userId={userId}
          />
        )}

        {showCompletionModal && selectedTaskForModal && (
          <TaskCompletionModal
            task={selectedTaskForModal}
            isOpen={showCompletionModal}
            onClose={() => {
              setShowCompletionModal(false);
              setSelectedTaskForModal(null);
            }}
            onComplete={() => {
              fetchCalendarItems();
            }}
          />
        )}
      </section>
    </DndProvider>
  );
}

// ============================================================================
// CALENDAR HEADER COMPONENT
// ============================================================================

interface CalendarHeaderProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onExpandClick: () => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

function CalendarHeader({
  filters,
  onFilterChange,
  onExpandClick,
  currentDate,
  onDateChange,
}: CalendarHeaderProps) {
  const filterTypes: Array<{ key: keyof FilterState; label: string; color: string }> = [
    { key: "tasks", label: "Tasks", color: "purple" },
    { key: "meetings", label: "Meetings", color: "blue" },
    { key: "calls", label: "Calls", color: "emerald" },
    { key: "notes", label: "Notes", color: "gray" },
    { key: "reminders", label: "Reminders", color: "yellow" },
    { key: "messages", label: "Messages", color: "pink" },
  ];

  const toggleFilter = (key: keyof FilterState) => {
    const newFilters = {
      ...filters,
      [key]: !filters[key],
    };
    onFilterChange(newFilters);
    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("calendarFilters", JSON.stringify(newFilters));
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = addDays(currentDate, direction === "next" ? 7 : -7);
    onDateChange(newDate);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="p-1.5 sm:p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-semibold text-white">Daily Notes & Actions</h3>
          <p className="text-xs text-slate-400 hidden sm:block">7-day calendar view</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Week Navigation */}
        <button
          onClick={() => navigateWeek("prev")}
          className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>
        <span className="text-sm text-gray-300 px-3">
          {format(currentDate, "MMM dd")} - {format(addDays(currentDate, 6), "MMM dd, yyyy")}
        </span>
        <button
          onClick={() => navigateWeek("next")}
          className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        {/* Expand Calendar Button */}
        <button
          onClick={onExpandClick}
          className="px-3 py-2 rounded-lg bg-transparent text-[#EC4899] border border-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out text-sm font-medium"
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          Full Calendar
        </button>
      </div>

      {/* Filter Toggles */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400 mr-2">Filters:</span>
        {filterTypes.map(({ key, label, color }) => {
          const isActive = filters[key];
          const colorClasses: Record<string, { active: string; inactive: string }> = {
            purple: {
              active: "bg-purple-500/20 text-purple-400 border-purple-500/30",
              inactive: "bg-white/[0.03] text-gray-400 border-white/[0.06]",
            },
            blue: {
              active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
              inactive: "bg-white/[0.03] text-gray-400 border-white/[0.06]",
            },
            emerald: {
              active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
              inactive: "bg-white/[0.03] text-gray-400 border-white/[0.06]",
            },
            gray: {
              active: "bg-gray-500/20 text-gray-400 border-gray-500/30",
              inactive: "bg-white/[0.03] text-gray-400 border-white/[0.06]",
            },
            yellow: {
              active: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
              inactive: "bg-white/[0.03] text-gray-400 border-white/[0.06]",
            },
            pink: {
              active: "bg-pink-500/20 text-pink-400 border-pink-500/30",
              inactive: "bg-white/[0.03] text-gray-400 border-white/[0.06]",
            },
          };
          return (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all border ${
                isActive ? colorClasses[color].active : colorClasses[color].inactive
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// WEEK VIEW COMPONENT
// ============================================================================

interface WeekViewProps {
  startDate: Date;
  items: CalendarItem[];
  onSlotClick: (date: Date, hour: number) => void;
  onItemClick: (item: CalendarItem) => void;
  onReschedule: (itemId: string, date: Date, hour: number) => void;
}

function WeekView({ startDate, items, onSlotClick, onItemClick, onReschedule }: WeekViewProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  // CRITICAL: Deduplicate items FIRST before any processing
  const uniqueItemsMap = new Map<string, CalendarItem>();
  const duplicateCount = new Map<string, number>();
  
  items.forEach((item) => {
    if (!uniqueItemsMap.has(item.id)) {
      uniqueItemsMap.set(item.id, item);
      duplicateCount.set(item.id, 1);
    } else {
      duplicateCount.set(item.id, (duplicateCount.get(item.id) || 1) + 1);
      console.error(`❌ DUPLICATE IN INPUT ARRAY: ${item.id} - ${item.title} (seen ${duplicateCount.get(item.id)} times)`);
    }
  });
  
  const deduplicatedItems = Array.from(uniqueItemsMap.values());
  const totalDuplicates = Array.from(duplicateCount.values()).filter(count => count > 1).reduce((sum, count) => sum + count - 1, 0);
  
  if (totalDuplicates > 0) {
    console.error(`❌ WeekView: Found ${totalDuplicates} duplicate items in input! ${items.length} items -> ${deduplicatedItems.length} unique`);
  } else {
    console.log(`🔍 WeekView: Received ${items.length} items, ${deduplicatedItems.length} unique after deduplication`);
  }

  // Group items by day and sort chronologically within each day
  const itemsByDay: Record<string, CalendarItem[]> = {};
  const seenItemIds = new Set<string>();
  const itemIdToDayMap = new Map<string, string>(); // Track which day each item is assigned to

  weekDays.forEach((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    itemsByDay[dayKey] = [];
  });

  deduplicatedItems.forEach((item) => {
    // AGGRESSIVE: Skip if we've already seen this item ID
    if (seenItemIds.has(item.id)) {
      const assignedDay = itemIdToDayMap.get(item.id);
      console.error(`❌ DUPLICATE ITEM IN PROCESSING: ${item.id} - ${item.title} - Already assigned to day ${assignedDay}`);
      return;
    }
    seenItemIds.add(item.id);

    const itemDate = format(item.scheduledAt, "yyyy-MM-dd");
    if (itemsByDay[itemDate]) {
      // Check if item is already in this day's array
      if (itemsByDay[itemDate].find(existing => existing.id === item.id)) {
        console.error(`❌ DUPLICATE IN DAY ARRAY: ${item.id} - ${item.title} - Day ${itemDate}`);
        return;
      }
      itemsByDay[itemDate].push(item);
      itemIdToDayMap.set(item.id, itemDate);
    }
  });

  // Sort items chronologically within each day
  Object.keys(itemsByDay).forEach((dayKey) => {
    itemsByDay[dayKey].sort((a, b) => {
      return a.scheduledAt.getTime() - b.scheduledAt.getTime();
    });
  });

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 border-b border-white/[0.06]">
        {/* Day headers with + button */}
        {weekDays.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const handleAddClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            // Default to 9am when adding from day header
            onSlotClick(day, 9);
          };

          return (
            <div
              key={dayKey}
              className="p-2 border-r border-white/[0.06] text-center last:border-r-0"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex-1">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">
                    {format(day, "EEE")}
                  </div>
                  <div
                    className={`text-sm font-semibold mt-1 ${
                      isSameDay(day, new Date()) ? "text-[#EC4899]" : "text-white"
                    }`}
                  >
                    {format(day, "MMM d")}
                  </div>
                </div>
                <button
                  onClick={handleAddClick}
                  className="p-1 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-[#EC4899]/50 transition-colors flex-shrink-0"
                  title="Add item"
                >
                  <Plus className="w-3 h-3 text-gray-400 hover:text-[#EC4899]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Day columns with items in chronological order */}
      <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        <div className="grid grid-cols-7">
          {(() => {
            // GLOBAL: Track all rendered item IDs across ALL days to prevent cross-day duplicates
            const globallyRenderedIds = new Set<string>();
            
            return weekDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayItems = itemsByDay[dayKey] || [];

              // NUCLEAR: First pass - deduplicate by ID using Map (guaranteed uniqueness)
              const uniqueDayItemsMap = new Map<string, CalendarItem>();
              dayItems.forEach((item) => {
                if (!uniqueDayItemsMap.has(item.id)) {
                  uniqueDayItemsMap.set(item.id, item);
                } else {
                  console.error(`❌ DUPLICATE IN DAY COLUMN: ${item.id} - ${item.title} - Day ${dayKey} - REMOVING`);
                }
              });
              
              // NUCLEAR: Second pass - remove items already rendered in another day
              const finalDayItems: CalendarItem[] = [];
              const seenInThisDay = new Set<string>();
              Array.from(uniqueDayItemsMap.values()).forEach((item) => {
                // Double-check: item should not be in globallyRenderedIds OR seenInThisDay
                if (globallyRenderedIds.has(item.id)) {
                  console.error(`❌ CROSS-DAY DUPLICATE: ${item.id} - ${item.title} - Already rendered in another day - REMOVING from ${dayKey}`);
                  return;
                }
                if (seenInThisDay.has(item.id)) {
                  console.error(`❌ DUPLICATE IN SAME DAY: ${item.id} - ${item.title} - Day ${dayKey} - REMOVING`);
                  return;
                }
                seenInThisDay.add(item.id);
                globallyRenderedIds.add(item.id);
                finalDayItems.push(item);
              });
              
              if (dayItems.length !== finalDayItems.length) {
                console.error(`❌ Day ${dayKey} had ${dayItems.length} items, ${finalDayItems.length} after deduplication (removed ${dayItems.length - finalDayItems.length} duplicates)`);
              }

              return (
                <DroppableDayColumn
                  key={dayKey}
                  date={day}
                  onDrop={onReschedule}
                  onSlotClick={onSlotClick}
                >
                  {finalDayItems.length === 0 ? (
                    <div className="text-xs text-gray-500 text-center py-4">No items</div>
                  ) : (
                    <div className="space-y-1">
                      {finalDayItems.map((item) => {
                        // Use day + item.id as key to ensure uniqueness across days
                        // This prevents React from reusing components incorrectly
                        const uniqueKey = `${dayKey}-${item.id}`;
                        return (
                          <DraggableCalendarItem
                            key={uniqueKey}
                            item={item}
                            onClick={() => onItemClick(item)}
                          />
                        );
                      })}
                    </div>
                  )}
                </DroppableDayColumn>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DRAGGABLE CALENDAR ITEM COMPONENT
// ============================================================================

interface DraggableCalendarItemProps {
  item: CalendarItem;
  onClick: () => void;
}

function DraggableCalendarItem({ item, onClick }: DraggableCalendarItemProps) {
  const [{ isDragging }, drag] = useDrag({
    type: "CALENDAR_ITEM",
    item: { id: item.id, type: item.type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <CalendarItemComponent item={item} onClick={onClick} />
    </div>
  );
}

// ============================================================================
// DROPPABLE DAY COLUMN COMPONENT
// ============================================================================

interface DroppableDayColumnProps {
  date: Date;
  onDrop: (itemId: string, date: Date, hour: number) => void;
  onSlotClick: (date: Date, hour: number) => void;
  children: React.ReactNode;
}

function DroppableDayColumn({
  date,
  onDrop,
  onSlotClick,
  children,
}: DroppableDayColumnProps) {
  const [{ isOver }, drop] = useDrop({
    accept: "CALENDAR_ITEM",
    drop: (item: { id: string; type: CalendarItemType }) => {
      // When dropping, default to 9am when rescheduling
      onDrop(item.id, date, 9);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      className={`border-r border-white/[0.06] last:border-r-0 min-h-[400px] p-1 transition-colors ${
        isOver ? "bg-[#EC4899]/10" : ""
      }`}
      onClick={(e) => {
        // Only trigger if clicking on empty space, not on items
        if (e.target === e.currentTarget || (e.target as HTMLElement).textContent === "No items") {
          onSlotClick(date, 9); // Default to 9am
        }
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// CALENDAR ITEM COMPONENT
// ============================================================================

interface CalendarItemComponentProps {
  item: CalendarItem;
  onClick: () => void;
}

function CalendarItemComponent({ item, onClick }: CalendarItemComponentProps) {
  
  const itemColors: Record<CalendarItemType, string> = {
    task: "bg-purple-500/20 border-purple-500",
    meeting: "bg-blue-500/20 border-blue-500",
    call: "bg-emerald-500/20 border-emerald-500",
    note: "bg-gray-500/20 border-gray-500",
    reminder: "bg-yellow-500/20 border-yellow-500",
    message: "bg-pink-500/20 border-pink-500",
  };

  const statusIcons: Record<string, string> = {
    pending: "⏳",
    accepted: "✓",
    completed: "✓",
    in_progress: "▶",
    cancelled: "✗",
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`${itemColors[item.type]} border rounded p-2 mb-1 cursor-pointer hover:opacity-80 transition-opacity`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-white truncate leading-tight">{item.title}</div>
          {item.scheduledAt && (
            <div className="text-[10px] text-gray-400 mt-0.5">
              {format(item.scheduledAt, "h:mm a")}
            </div>
          )}
        </div>
        {(item.participants?.length || item.assignees?.length) && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {item.assignees?.slice(0, 2).map((assignee) => (
              <div
                key={assignee.id}
                className="w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center text-[8px] text-white"
                title={assignee.name}
              >
                {assignee.avatar_url ? (
                  <img src={assignee.avatar_url} alt={assignee.name} className="w-full h-full rounded-full" />
                ) : (
                  assignee.name.charAt(0).toUpperCase()
                )}
              </div>
            ))}
            {(item.assignees?.length || 0) > 2 && (
              <span className="text-[8px] text-gray-400">+{(item.assignees?.length || 0) - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CALENDAR MODAL (EXPANDED VIEW)
// ============================================================================

interface CalendarModalProps {
  onClose: () => void;
  items: CalendarItem[];
  onSlotClick: (date: Date, hour: number) => void;
  onItemClick: (item: CalendarItem) => void;
  onReschedule: (itemId: string, date: Date, hour: number) => void;
}

function CalendarModal({
  onClose,
  items,
  onSlotClick,
  onItemClick,
  onReschedule,
}: CalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  // Get first day of month and number of days
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const firstDayOfWeek = monthStart.getDay();

  // Generate calendar days
  const calendarDays: (Date | null)[] = [];
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  }

  // Group items by date
  const itemsByDate: Record<string, CalendarItem[]> = {};
  items.forEach((item) => {
    const dateKey = format(item.scheduledAt, "yyyy-MM-dd");
    if (!itemsByDate[dateKey]) {
      itemsByDate[dateKey] = [];
    }
    itemsByDate[dateKey].push(item);
  });

  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === "next" ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0b0d13] border border-white/[0.06] rounded-2xl p-6 w-full max-w-7xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold text-white">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth("prev")}
                className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => navigateMonth("next")}
                className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1.5 rounded-lg bg-transparent text-[#EC4899] border border-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out text-sm"
              >
                Today
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Month Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-400">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="min-h-[100px] p-2"></div>;
            }

            const dateKey = format(day, "yyyy-MM-dd");
            const dayItems = itemsByDate[dateKey] || [];
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

            return (
              <div
                key={dateKey}
                className={`min-h-[100px] p-2 border border-white/[0.06] rounded-lg ${
                  isToday ? "ring-2 ring-[#EC4899]" : ""
                } ${isCurrentMonth ? "bg-white/[0.02]" : "bg-white/[0.01] opacity-50"}`}
                onClick={() => {
                  // Switch to week view for this day
                  setCurrentMonth(day);
                  onClose();
                }}
              >
                <div
                  className={`text-sm font-semibold mb-1 ${
                    isToday ? "text-[#EC4899]" : isCurrentMonth ? "text-white" : "text-gray-500"
                  }`}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayItems.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemClick(item);
                      }}
                      className="text-xs p-1 rounded bg-purple-500/20 border border-purple-500/30 text-white truncate cursor-pointer hover:opacity-80"
                    >
                      {format(item.scheduledAt, "h:mm a")} {item.title}
                    </div>
                  ))}
                  {dayItems.length > 3 && (
                    <div className="text-xs text-gray-400">+{dayItems.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CREATE ITEM MODAL
// ============================================================================

interface CreateItemModalProps {
  scheduledDate: Date;
  scheduledHour: number;
  onClose: () => void;
  onSuccess: () => void;
  companyId: string | null;
  siteId: string | null;
  userId: string | null;
}

function CreateItemModal({
  scheduledDate,
  scheduledHour,
  onClose,
  onSuccess,
  companyId,
  siteId,
  userId,
}: CreateItemModalProps) {
  const [itemType, setItemType] = useState<CalendarItemType>("task");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const scheduledTime = new Date(scheduledDate);
  scheduledTime.setHours(scheduledHour, 0, 0, 0);
  scheduledTime.setMinutes(0, 0, 0);

  const handleCreate = async () => {
    if (!title.trim() || !companyId) {
      toast.error("Please enter a title");
      return;
    }

    setLoading(true);
    try {
      const dueDate = format(scheduledTime, "yyyy-MM-dd");
      const dueTime = format(scheduledTime, "HH:mm");

      // Create task in checklist_tasks table
      const { error } = await supabase.from("checklist_tasks").insert({
        company_id: companyId,
        site_id: siteId,
        custom_name: title,
        custom_instructions: description || null,
        due_date: dueDate,
        due_time: dueTime,
        status: "pending",
        priority: "medium",
        assigned_to_user_id: userId,
      });

      if (error) throw error;

      toast.success("Item created successfully");
      onSuccess();
    } catch (error: any) {
      console.error("Error creating item:", error);
      toast.error("Failed to create item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0b0d13] border border-white/[0.06] rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Create New Item</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Scheduled Time Display */}
          <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Scheduled for</div>
            <div className="text-white font-medium">
              {format(scheduledTime, "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </div>
          </div>

          {/* Item Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "task", label: "Task", color: "purple" },
                { value: "meeting", label: "Meeting", color: "blue" },
                { value: "call", label: "Call", color: "emerald" },
                { value: "note", label: "Note", color: "gray" },
                { value: "reminder", label: "Reminder", color: "yellow" },
                { value: "message", label: "Message", color: "pink" },
              ].map(({ value, label, color }) => {
                const isActive = itemType === value;
                const colorClasses: Record<string, { active: string; inactive: string }> = {
                  purple: {
                    active: "bg-purple-500/20 text-purple-400 border-purple-500/30",
                    inactive: "bg-white/[0.03] text-gray-400 border-white/[0.06] hover:bg-white/[0.06]",
                  },
                  blue: {
                    active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                    inactive: "bg-white/[0.03] text-gray-400 border-white/[0.06] hover:bg-white/[0.06]",
                  },
                  emerald: {
                    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                    inactive: "bg-white/[0.03] text-gray-400 border-white/[0.06] hover:bg-white/[0.06]",
                  },
                  gray: {
                    active: "bg-gray-500/20 text-gray-400 border-gray-500/30",
                    inactive: "bg-white/[0.03] text-gray-400 border-white/[0.06] hover:bg-white/[0.06]",
                  },
                  yellow: {
                    active: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                    inactive: "bg-white/[0.03] text-gray-400 border-white/[0.06] hover:bg-white/[0.06]",
                  },
                  pink: {
                    active: "bg-pink-500/20 text-pink-400 border-pink-500/30",
                    inactive: "bg-white/[0.03] text-gray-400 border-white/[0.06] hover:bg-white/[0.06]",
                  },
                };
                return (
                  <button
                    key={value}
                    onClick={() => setItemType(value as CalendarItemType)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      isActive ? colorClasses[color].active : colorClasses[color].inactive
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter item title"
              className="w-full px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50"
              autoFocus
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
              rows={3}
              className="w-full px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] text-white rounded-lg hover:bg-white/[0.08] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading || !title.trim()}
            className="flex-1 px-4 py-2.5 bg-transparent border border-[#EC4899] text-[#EC4899] rounded-lg hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

