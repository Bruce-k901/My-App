"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MessageSquare, Plus, X, CheckCircle2, Send, Bell, FileText, Users, History, Zap, Phone, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import CreateTaskModal, { type ModalContext } from "@/components/tasks/CreateTaskModal";
import TimePicker from "@/components/ui/TimePicker";

interface TaskItem {
  id: string;
  title: string;
  dueDate: string;
  dueTime: string;
  assignedTo: string;
  assignedToName?: string;
  priority: "low" | "medium" | "high";
}

interface ReminderItem {
  id: string;
  title: string;
  date: string;
  time: string;
  repeat: "once" | "daily" | "weekly";
  notificationCreated?: boolean;
}

interface MessageItem {
  id: string;
  recipient: "manager" | "owner" | "all_staff";
  subject: string;
  message: string;
  urgent: boolean;
  sent?: boolean;
  sentAt?: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  app_role?: string;
}

interface TaskTemplate {
  id: string;
  name: string;
  category: string;
}

interface CalendarEvent {
  id?: string;
  date: string;
  type: "task" | "reminder" | "message" | "meeting" | "call" | "note";
  title: string;
  color: string;
  dueTime?: string;
  priority?: string;
  metadata?: any;
  source?: "handover" | "tasks_table";
}

export default function ManagerCalendarPage() {
  const { companyId, siteId, userProfile } = useAppContext();
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksFromTable, setTasksFromTable] = useState<any[]>([]); // Tasks from tasks table
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [sentMessages, setSentMessages] = useState<MessageItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"calendar" | "notes" | "tasks" | "reminders" | "messages">("calendar");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [showMessageHistory, setShowMessageHistory] = useState(false);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState<ModalContext | undefined>();
  
  // Form states
  const [newTask, setNewTask] = useState<Partial<TaskItem>>({
    title: "",
    dueDate: selectedDate || new Date().toISOString().split("T")[0],
    dueTime: "",
    assignedTo: "",
    priority: "medium",
  });
  const [newReminder, setNewReminder] = useState<Partial<ReminderItem>>({
    title: "",
    date: selectedDate || new Date().toISOString().split("T")[0],
    time: "",
    repeat: "once",
  });
  const [newMessage, setNewMessage] = useState<Partial<MessageItem>>({
    recipient: "manager",
    subject: "",
    message: "",
    urgent: false,
  });

  // Initialize currentDate on client mount to avoid hydration mismatch
  useEffect(() => {
    if (currentDate === null) {
      setCurrentDate(new Date());
    }
  }, [currentDate]);

  // Helper to get current date with fallback (prevents null errors during initial render)
  const getCurrentDate = () => currentDate || new Date();

  // Load users and templates
  useEffect(() => {
    const loadUsers = async () => {
      if (!companyId) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email, app_role")
          .eq("company_id", companyId)
          .order("full_name");
        
        if (error) throw error;
        setUsers(data || []);
      } catch (error: any) {
        console.error("Failed to load users:", error);
      }
    };

    const loadTemplates = async () => {
      if (!companyId) return;
      try {
        const { data, error } = await supabase
          .from("task_templates")
          .select("id, name, category")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name")
          .limit(10);
        
        if (error) throw error;
        setTaskTemplates(data || []);
      } catch (error: any) {
        console.error("Failed to load templates:", error);
      }
    };

    loadUsers();
    loadTemplates();
  }, [companyId]);

  // Load calendar data
  const loadCalendarData = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const date = getCurrentDate();
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Calculate date range for current month plus some buffer
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week
      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End of week
      
      // Load handover data from profile_settings
      // Get all handover entries for the date range (tasks can have any dueDate)
      console.log('📅 Starting to load handover data for company:', companyId);
      const { data: handoverData, error: handoverError } = await supabase
        .from("profile_settings")
        .select("key, value")
        .eq("company_id", companyId)
        .like("key", "handover:%");
      
      if (handoverError) {
        console.error("❌ Error loading handover data:", handoverError);
      } else {
        console.log('📅 Handover data query result:', {
          found: handoverData?.length || 0,
          keys: handoverData?.map((h: any) => h.key) || [],
        });
      }
      
      const data: any[] = handoverData || [];
      console.log('📅 Processing handover data array, length:', data.length);
      
      if (data && data.length > 0) {
        const allNotes: Record<string, string> = {};
        const allTasks: TaskItem[] = [];
        const allReminders: ReminderItem[] = [];
        const allMessages: MessageItem[] = [];
        
        data.forEach((item) => {
          try {
            const handoverData = typeof item.value === "string" ? JSON.parse(item.value) : item.value;
            const dateKey = item.key.replace("handover:", "");
            
            if (handoverData.notes) {
              allNotes[dateKey] = handoverData.notes;
            }
            // Tasks have their own dueDate, so include all tasks regardless of which date they were created on
            // Filter tasks by assignedTo to show only tasks assigned to current user (or unassigned if admin/manager)
            if (handoverData.tasks && Array.isArray(handoverData.tasks)) {
              const userTasks = handoverData.tasks.filter((task: any) => {
                // Show task if:
                // 1. Assigned to current user
                // 2. Not assigned (empty string or null)
                // 3. User is admin/manager (show all)
                if (!task.assignedTo || task.assignedTo === '') return true; // Unassigned tasks
                if (task.assignedTo === userProfile?.id) return true; // Assigned to current user
                // For admins/managers, show all tasks
                const isAdminOrManager = userProfile?.app_role === 'admin' || userProfile?.app_role === 'manager';
                return isAdminOrManager;
              });
              allTasks.push(...userTasks);
            }
            // Reminders have their own date, so include all reminders regardless of which date they were created on
            if (handoverData.reminders && Array.isArray(handoverData.reminders)) {
              allReminders.push(...handoverData.reminders);
            }
            // Messages are global, include all
            if (handoverData.messages && Array.isArray(handoverData.messages)) {
              allMessages.push(...handoverData.messages);
            }
          } catch (parseError) {
            console.error("Error parsing handover data:", parseError, item);
          }
        });
        
        // Merge handover tasks with existing tasks (don't overwrite, append)
        setNotes(allNotes);
        setTasks(prevTasks => {
          // Combine previous tasks with new handover tasks, avoiding duplicates
          const combined = [...prevTasks];
          allTasks.forEach(newTask => {
            if (!combined.find(t => t.id === newTask.id)) {
              combined.push(newTask);
            }
          });
          return combined;
        });
        setReminders(allReminders);
        setMessages(allMessages);
        
        console.log('📅✅ Loaded handover data:', {
          notesCount: Object.keys(allNotes).length,
          tasksCount: allTasks.length,
          remindersCount: allReminders.length,
          messagesCount: allMessages.length,
          userProfileId: userProfile?.id,
          filteredTasks: allTasks.filter(t => t.assignedTo === userProfile?.id).length,
          allTaskIds: allTasks.map(t => ({ id: t.id, title: t.title, assignedTo: t.assignedTo })),
        });
      } else {
        console.log('📅 No handover data found in profile_settings');
      }

      // Load tasks from tasks table
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];
      
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, due_date, due_time, metadata, status, priority, assigned_to")
        .eq("company_id", companyId)
        .gte("due_date", startDateStr)
        .lte("due_date", endDateStr)
        .order("due_date", { ascending: true })
        .order("due_time", { ascending: true });
      
      if (tasksError) {
        console.error("Error loading tasks from table:", tasksError);
      } else {
        setTasksFromTable(tasksData || []);
      }

      // Load sent messages
      const { data: sentData } = await supabase
        .from("notifications")
        .select("*")
        .eq("company_id", companyId)
        .eq("type", "task")
        .like("message", "%[Handover Message ID:%")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (sentData) {
        const formatted = sentData.map((n: any) => {
          const messageParts = n.message.split("\n\n---\n");
          const originalMessage = messageParts[0] || n.message;
          
          return {
            id: n.id,
            recipient: n.recipient_role === "manager" ? "manager" : n.recipient_role === "admin" ? "owner" : "all_staff",
            subject: n.title,
            message: originalMessage,
            urgent: n.severity === "critical" || n.priority === "urgent",
            sent: true,
            sentAt: n.created_at,
          };
        });
        setSentMessages(formatted);
      }
    } catch (error: any) {
      console.error("Failed to load calendar data:", error);
    }
  }, [companyId]);

  useEffect(() => {
    loadCalendarData();
  }, [companyId, currentDate]);

  // Add a refresh function that can be called manually
  const refreshCalendar = useCallback(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Expose refresh function on window for debugging or external access
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).refreshCalendar = refreshCalendar;
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).refreshCalendar;
      }
    };
  }, [refreshCalendar]);

  // Refresh data when page becomes visible (e.g., when navigating from widget)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadCalendarData();
      }
    };

    const handleFocus = () => {
      loadCalendarData();
    };

    // Listen for custom event dispatched from the widget when data is saved
    const handleHandoverUpdate = () => {
      loadCalendarData();
    };

    // Listen for storage changes (if widget uses localStorage to signal updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'handover_updated') {
        loadCalendarData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("handover-saved", handleHandoverUpdate);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("handover-saved", handleHandoverUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [companyId, loadCalendarData]);

  // Update form dates when selected date changes
  useEffect(() => {
    if (selectedDate) {
      setNewTask({ ...newTask, dueDate: selectedDate });
      setNewReminder({ ...newReminder, date: selectedDate });
    }
  }, [selectedDate]);

  const save = async (dateKey?: string) => {
    setSaving(true);
    try {
      const date = dateKey || selectedDate || new Date().toISOString().split("T")[0];
      const handoverData = {
        notes: notes[date] || "",
        tasks: tasks.filter(t => t.dueDate === date),
        reminders: reminders.filter(r => r.date === date),
        messages: messages,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.id || null,
      };
      
      const row = { 
        key: `handover:${date}`, 
        value: handoverData, 
        company_id: companyId 
      } as any;
      
      await supabase.from("profile_settings").upsert(row, { onConflict: "key,company_id" });
      toast.success("Saved");
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    }
    setSaving(false);
  };

  const addTaskFromTemplate = (template: TaskTemplate) => {
    const task: TaskItem = {
      id: `task-${Date.now()}`,
      title: template.name,
      dueDate: selectedDate || new Date().toISOString().split("T")[0],
      dueTime: "",
      assignedTo: "",
      priority: "medium",
    };
    
    setTasks([...tasks, task]);
    save(selectedDate || undefined);
    toast.success(`Task "${template.name}" added`);
  };

  const addTask = () => {
    if (!newTask.title?.trim()) {
      toast.error("Task title is required");
      return;
    }
    
    const assignedUser = users.find(u => u.id === newTask.assignedTo);
    const task: TaskItem = {
      id: `task-${Date.now()}`,
      title: newTask.title!,
      dueDate: newTask.dueDate || new Date().toISOString().split("T")[0],
      dueTime: newTask.dueTime || "",
      assignedTo: newTask.assignedTo || "",
      assignedToName: assignedUser?.full_name || assignedUser?.email,
      priority: newTask.priority || "medium",
    };
    
    setTasks([...tasks, task]);
    setNewTask({
      title: "",
      dueDate: selectedDate || new Date().toISOString().split("T")[0],
      dueTime: "",
      assignedTo: "",
      priority: "medium",
    });
    setShowTaskForm(false);
    save(newTask.dueDate);
  };

  const createTaskInSystem = async (task: TaskItem) => {
    try {
      // Ensure date is in YYYY-MM-DD format
      const dueDate = task.dueDate || new Date().toISOString().split("T")[0];
      
      // Ensure time is in HH:MM format (24-hour) or null
      let dueTime: string | null = null;
      if (task.dueTime && task.dueTime.trim()) {
        // Validate and format time (HH:MM)
        const timeMatch = task.dueTime.match(/^(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            dueTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          } else {
            toast.error("Invalid time format. Please use HH:MM (24-hour format)");
            return;
          }
        } else {
          toast.error("Invalid time format. Please use HH:MM (24-hour format)");
          return;
        }
      }

      const { error } = await supabase.from("checklist_tasks").insert({
        company_id: companyId,
        site_id: siteId,
        custom_name: task.title,
        due_date: dueDate,
        due_time: dueTime,
        status: "pending",
        priority: task.priority,
        assigned_to_user_id: task.assignedTo || null,
        generated_at: new Date().toISOString(), // Explicitly set generation time
        task_data: {
          created_from_handover: true,
          handover_date: new Date().toISOString().split("T")[0],
          created_from_calendar: true,
        },
      });

      if (error) throw error;
      
      toast.success(`Task "${task.title}" created for ${new Date(dueDate).toLocaleDateString()}${dueTime ? ` at ${dueTime}` : ""}`);
      setTasks(tasks.filter(t => t.id !== task.id));
      save(dueDate);
    } catch (error: any) {
      console.error("Failed to create task:", error);
      toast.error(`Failed to create task: ${error.message}`);
    }
  };

  const createReminderNotification = async (reminder: ReminderItem) => {
    try {
      // Ensure date is in YYYY-MM-DD format
      const reminderDate = reminder.date || new Date().toISOString().split("T")[0];
      
      // Ensure time is in HH:MM format (24-hour) or default to 09:00
      let reminderTime = "09:00";
      if (reminder.time && reminder.time.trim()) {
        const timeMatch = reminder.time.match(/^(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            reminderTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          } else {
            console.warn("Invalid time format, using default 09:00");
          }
        } else {
          console.warn("Invalid time format, using default 09:00");
        }
      }

      const reminderDateTime = new Date(`${reminderDate}T${reminderTime}`);
      const now = new Date();
      
      // Only create notification if reminder is in the future
      if (reminderDateTime <= now) {
        console.warn("Reminder date/time is in the past, skipping notification creation");
        return false;
      }

      const reminderMessage = `Reminder: ${reminder.title}\nScheduled for ${new Date(reminderDate).toLocaleDateString()}${reminderTime ? ` at ${reminderTime}` : ""}\nRepeat: ${reminder.repeat}\n[Handover Reminder ID: ${reminder.id}]`;
      
      const { error } = await supabase.from("notifications").insert({
        company_id: companyId,
        site_id: siteId,
        type: "task",
        title: `Reminder: ${reminder.title}`,
        message: reminderMessage,
        severity: "info", // Required field - must be 'info', 'warning', or 'critical'
        status: "active",
        due_date: reminderDate, // This will be used to filter notifications by date
        priority: reminder.repeat === "daily" ? "high" : "medium", // Daily reminders get higher priority
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Failed to create reminder notification:", error);
      return false;
    }
  };

  const addReminder = async () => {
    if (!newReminder.title?.trim()) {
      toast.error("Reminder title is required");
      return;
    }
    
    const reminder: ReminderItem = {
      id: `reminder-${Date.now()}`,
      title: newReminder.title!,
      date: newReminder.date || new Date().toISOString().split("T")[0],
      time: newReminder.time || "",
      repeat: newReminder.repeat || "once",
    };
    
    const notificationCreated = await createReminderNotification(reminder);
    if (notificationCreated) {
      reminder.notificationCreated = true;
      toast.success("Reminder scheduled");
    }
    
    setReminders([...reminders, reminder]);
    setNewReminder({
      title: "",
      date: selectedDate || new Date().toISOString().split("T")[0],
      time: "",
      repeat: "once",
    });
    setShowReminderForm(false);
    save(reminder.date);
  };

  const addMessage = () => {
    if (!newMessage.subject?.trim() || !newMessage.message?.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    
    const message: MessageItem = {
      id: `message-${Date.now()}`,
      recipient: newMessage.recipient || "manager",
      subject: newMessage.subject!,
      message: newMessage.message!,
      urgent: newMessage.urgent || false,
    };
    
    setMessages([...messages, message]);
    setNewMessage({
      recipient: "manager",
      subject: "",
      message: "",
      urgent: false,
    });
    setShowMessageForm(false);
    save();
  };

  const sendMessage = async (message: MessageItem) => {
    try {
      const recipientRole = message.recipient === "manager" 
        ? "manager" 
        : message.recipient === "owner" 
        ? "admin" 
        : "staff";

      const messageWithSender = `${message.message}\n\n---\nFrom: ${userProfile?.full_name || userProfile?.email || "Unknown"}\n[Handover Message ID: ${message.id}]`;

      const { error, data } = await supabase.from("notifications").insert({
        company_id: companyId,
        site_id: siteId,
        type: "task",
        title: message.subject,
        message: messageWithSender,
        severity: message.urgent ? "critical" : "info", // Required field - must be 'info', 'warning', or 'critical'
        status: "active",
        priority: message.urgent ? "urgent" : "medium",
      }).select().single();

      if (error) throw error;
      
      const sentMessage: MessageItem = {
        ...message,
        sent: true,
        sentAt: new Date().toISOString(),
      };
      setSentMessages([sentMessage, ...sentMessages]);
      
      toast.success(`Message sent to ${message.recipient}`);
      setMessages(messages.filter(m => m.id !== message.id));
      save();
    } catch (error: any) {
      toast.error(`Failed to send message: ${error.message}`);
    }
  };

  const removeTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    setTasks(tasks.filter(t => t.id !== id));
    if (task) save(task.dueDate);
  };

  const removeReminder = (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    setReminders(reminders.filter(r => r.id !== id));
    if (reminder) save(reminder.date);
  };

  const removeMessage = (id: string) => {
    setMessages(messages.filter(m => m.id !== id));
    save();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-400 border-red-500/30 bg-red-500/10";
      case "medium": return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
      default: return "text-blue-400 border-blue-500/30 bg-blue-500/10";
    }
  };

  // Calendar functions
  const getDaysInMonth = () => {
    const date = getCurrentDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split("T")[0];
    const events: CalendarEvent[] = [];
    
    // Handover tasks
    tasks.filter(t => t.dueDate === dateStr).forEach(task => {
      events.push({
        id: task.id,
        date: dateStr,
        type: "task",
        title: task.title,
        color: task.priority === "high" ? "red" : task.priority === "medium" ? "yellow" : "blue",
        dueTime: task.dueTime,
        priority: task.priority,
        source: "handover",
      });
    });
    
    // Tasks from tasks table
    tasksFromTable.filter(t => t.due_date === dateStr).forEach(task => {
      const taskType = task.metadata?.task_type || "task";
      let color = "blue";
      let type: "task" | "meeting" | "call" | "note" = "task";
      
      switch (taskType) {
        case "meeting":
          type = "meeting";
          color = "purple";
          break;
        case "call":
          type = "call";
          color = "green";
          break;
        case "note":
          type = "note";
          color = "gray";
          break;
        default:
          type = "task";
          color = task.priority === "high" || task.priority === "urgent" ? "red" 
            : task.priority === "medium" ? "yellow" 
            : "blue";
      }
      
      events.push({
        id: task.id,
        date: dateStr,
        type,
        title: task.title,
        color,
        dueTime: task.due_time || undefined,
        priority: task.priority || undefined,
        metadata: task.metadata,
        source: "tasks_table",
      });
    });
    
    // Handover reminders
    reminders.filter(r => r.date === dateStr).forEach(reminder => {
      events.push({
        id: reminder.id,
        date: dateStr,
        type: "reminder",
        title: reminder.title,
        color: "purple",
        dueTime: reminder.time,
        source: "handover",
      });
    });
    
    return events;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const date = getCurrentDate();
    setCurrentDate(new Date(date.getFullYear(), date.getMonth() + (direction === "next" ? 1 : -1), 1));
  };

  // Handle task click to open modal with existing task data
  const handleTaskClick = (event: CalendarEvent) => {
    if (!event.id) return;
    
    // Find the task in either tasksFromTable or tasks
    const taskFromTable = tasksFromTable.find(t => t.id === event.id);
    const taskFromHandover = tasks.find(t => t.id === event.id);
    
    if (taskFromTable) {
      // Open modal with task from tasks table
      const taskDate = taskFromTable.due_date ? new Date(taskFromTable.due_date) : new Date();
      setModalContext({
        source: 'calendar',
        taskId: event.id,
        existingData: taskFromTable,
      });
      setCreateTaskModalOpen(true);
    } else if (taskFromHandover) {
      // For handover tasks, we can still open modal but may need different handling
      const taskDate = taskFromHandover.dueDate ? new Date(taskFromHandover.dueDate) : new Date();
      setModalContext({
        source: 'calendar',
        preSelectedDate: taskDate,
      });
      setCreateTaskModalOpen(true);
    }
  };

  // Add real-time subscription for tasks table
  useEffect(() => {
    if (!companyId) return;
    
    const channel = supabase
      .channel('calendar-tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          loadCalendarData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, loadCalendarData]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const selectedDateTasks = tasks.filter(t => t.dueDate === selectedDate);
  const selectedDateTasksFromTable = tasksFromTable.filter(t => t.due_date === selectedDate);
  const selectedDateReminders = reminders.filter(r => r.date === selectedDate);
  const selectedDateNotes = selectedDate ? notes[selectedDate] || "" : "";

  return (
    <div className="w-full -mt-[72px] pt-[72px]">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
              <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Manager Calendar & Diary</h1>
              <p className="text-sm text-slate-400">Plan, organize, and track tasks, reminders, and messages</p>
            </div>
          </div>
          <Link
            href="/dashboard/tasks/my-tasks"
            className="inline-flex items-center gap-2 px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] rounded-lg hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out text-sm font-medium"
          >
            <CheckCircle2 className="w-4 h-4" />
            View My Tasks
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 border-b border-white/10 overflow-x-auto">
          {[
            { id: "calendar", label: "Calendar", icon: CalendarDays },
            { id: "notes", label: "Notes", icon: FileText },
            { id: "tasks", label: `Tasks (${tasks.length})`, icon: CheckCircle2 },
            { id: "reminders", label: `Reminders (${reminders.length})`, icon: Bell },
            { id: "messages", label: `Messages (${messages.length})`, icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-pink-500 text-pink-400"
                    : "border-transparent text-slate-400 hover:text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Calendar View */}
        {activeTab === "calendar" && (
          <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-6 shadow-[0_0_12px_rgba(236,72,153,0.05)]">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigateMonth("prev")}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-400" />
              </button>
              <h2 className="text-xl font-semibold text-white">
                {currentDate ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}` : ""}
              </h2>
              <button
                onClick={() => navigateMonth("next")}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-3 sm:mb-4">
              {dayNames.map(day => (
                <div key={day} className="text-center text-[10px] sm:text-xs font-medium text-slate-400 py-1 sm:py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {getDaysInMonth().map((date, idx) => {
                if (!date) {
                  return <div key={`empty-${idx}`} className="aspect-square" />;
                }
                
                const dateStr = date.toISOString().split("T")[0];
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                const isSelected = dateStr === selectedDate;
                const events = getEventsForDate(date);
                
                return (
                  <div
                    key={dateStr}
                    className={`aspect-square p-2 rounded-lg border transition-all relative group ${
                      isSelected
                        ? "bg-pink-500/20 border-pink-500/50 shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                        : isToday
                        ? "bg-blue-500/10 border-blue-500/30"
                        : "bg-black/20 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <button
                        onClick={() => setSelectedDate(dateStr)}
                        className={`text-sm font-medium ${isToday ? "text-blue-400" : "text-slate-300"}`}
                      >
                        {date.getDate()}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalContext({
                            source: 'calendar',
                            preSelectedDate: date
                          });
                          setCreateTaskModalOpen(true);
                        }}
                        className="
                          opacity-0 group-hover:opacity-100
                          transition-opacity duration-200
                          w-6 h-6 
                          rounded-full 
                          bg-[#EC4899] hover:bg-[#EC4899]/80
                          flex items-center justify-center
                          text-white
                          shadow-sm hover:shadow-md
                        "
                        aria-label="Create new task"
                        title="Create task or meeting"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div 
                      className="space-y-0.5"
                    >
                      {events.slice(0, 3).map((event, eIdx) => {
                        // Get icon based on type
                        const getEventIcon = () => {
                          switch (event.type) {
                            case "meeting":
                              return <Users className="w-2.5 h-2.5" />;
                            case "call":
                              return <Phone className="w-2.5 h-2.5" />;
                            case "note":
                              return <FileText className="w-2.5 h-2.5" />;
                            default:
                              return <CheckSquare className="w-2.5 h-2.5" />;
                          }
                        };
                        
                        // Determine color classes based on event type and color
                        const getColorClasses = () => {
                          if (event.color === "red") return "bg-red-500/20 text-red-400 border-red-500/30";
                          if (event.color === "yellow") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
                          if (event.color === "blue") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
                          if (event.color === "purple") return "bg-purple-500/20 text-purple-400 border-purple-500/30";
                          if (event.color === "green") return "bg-green-500/20 text-green-400 border-green-500/30";
                          return "bg-gray-500/20 text-gray-400 border-gray-500/30";
                        };
                        
                        return (
                          <div
                            key={eIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (event.id) {
                                handleTaskClick(event);
                              } else {
                                setSelectedDate(dateStr);
                              }
                            }}
                            className={`text-xs truncate px-1 py-0.5 rounded border cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 ${getColorClasses()}`}
                            title={`${event.title}${event.dueTime ? ` at ${event.dueTime}` : ''}`}
                          >
                            {getEventIcon()}
                            <span className="truncate">{event.title}</span>
                            {event.dueTime && (
                              <span className="text-[10px] opacity-75 ml-auto">{event.dueTime}</span>
                            )}
                          </div>
                        );
                      })}
                      {events.length > 3 && (
                        <div 
                          className="text-xs text-slate-400 cursor-pointer hover:text-slate-300"
                          onClick={() => setSelectedDate(dateStr)}
                        >
                          +{events.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Date Details */}
            {selectedDate && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </h3>
                
                {/* Notes for selected date */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                  <textarea
                    value={selectedDateNotes}
                    onChange={(e) => {
                      setNotes({ ...notes, [selectedDate]: e.target.value });
                      save(selectedDate);
                    }}
                    placeholder="Add notes for this date..."
                    className="w-full h-24 bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/40 resize-none"
                  />
                </div>

                {/* Tasks for selected date */}
                {(selectedDateTasks.length > 0 || selectedDateTasksFromTable.length > 0) && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Tasks</h4>
                    <div className="space-y-2">
                      {/* Handover tasks */}
                      {selectedDateTasks.map(task => (
                        <div 
                          key={task.id} 
                          className="bg-black/30 border border-white/10 rounded-lg p-3 flex items-center justify-between hover:bg-black/40 transition-colors cursor-pointer"
                          onClick={() => {
                            const taskDate = task.dueDate ? new Date(task.dueDate) : new Date();
                            setModalContext({
                              source: 'calendar',
                              preSelectedDate: taskDate,
                            });
                            setCreateTaskModalOpen(true);
                          }}
                        >
                          <div className="flex-1 flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="text-sm text-white">{task.title}</div>
                              {task.dueTime && (
                                <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                  <Clock className="w-3 h-3" />
                                  {task.dueTime}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              createTaskInSystem(task);
                            }}
                            className="px-2 py-1 text-xs rounded bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20"
                          >
                            Create
                          </button>
                        </div>
                      ))}
                      {/* Tasks from tasks table */}
                      {selectedDateTasksFromTable.map(task => {
                        const taskType = task.metadata?.task_type || "task";
                        const getTaskIcon = () => {
                          switch (taskType) {
                            case "meeting":
                              return <Users className="w-4 h-4 text-purple-400 flex-shrink-0" />;
                            case "call":
                              return <Phone className="w-4 h-4 text-green-400 flex-shrink-0" />;
                            case "note":
                              return <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />;
                            default:
                              return <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />;
                          }
                        };
                        
                        return (
                          <div 
                            key={task.id} 
                            className="bg-black/30 border border-white/10 rounded-lg p-3 flex items-center justify-between hover:bg-black/40 transition-colors cursor-pointer"
                            onClick={() => handleTaskClick({
                              id: task.id,
                              date: task.due_date,
                              type: taskType as any,
                              title: task.title,
                              color: task.priority === "high" ? "red" : "blue",
                              metadata: task.metadata,
                              source: "tasks_table",
                            })}
                          >
                            <div className="flex-1 flex items-center gap-2">
                              {getTaskIcon()}
                              <div className="flex-1">
                                <div className="text-sm text-white">{task.title}</div>
                                <div className="flex items-center gap-3 mt-1">
                                  {task.due_time && (
                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {task.due_time}
                                    </div>
                                  )}
                                  {task.metadata?.participants && Array.isArray(task.metadata.participants) && task.metadata.participants.length > 0 && (
                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      {task.metadata.participants.length} participant{task.metadata.participants.length > 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reminders for selected date */}
                {selectedDateReminders.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Reminders</h4>
                    <div className="space-y-2">
                      {selectedDateReminders.map(reminder => (
                        <div key={reminder.id} className="bg-black/30 border border-white/10 rounded-lg p-3">
                          <div className="text-sm text-white">{reminder.title}</div>
                          {reminder.time && (
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {reminder.time}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notes Tab - All Notes */}
        {activeTab === "notes" && (
          <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-6">
            <div className="space-y-4">
              {Object.keys(notes).length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No notes yet. Select a date on the calendar to add notes.</p>
                </div>
              ) : (
                Object.entries(notes).map(([date, note]) => (
                  <div key={date} className="bg-black/30 border border-white/10 rounded-lg p-4">
                    <div className="text-sm font-medium text-slate-300 mb-2">
                      {new Date(date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </div>
                    <textarea
                      value={note}
                      onChange={(e) => {
                        setNotes({ ...notes, [date]: e.target.value });
                        save(date);
                      }}
                      placeholder="Add notes..."
                      className="w-full h-32 bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/40 resize-none"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-6">
            <div className="space-y-4">
              {taskTemplates.length > 0 && !showTaskForm && (
                <div className="mb-4">
                  <p className="text-xs text-slate-400 mb-2">Quick-add from templates:</p>
                  <div className="flex flex-wrap gap-2">
                    {taskTemplates.slice(0, 5).map((template) => (
                      <button
                        key={template.id}
                        onClick={() => addTaskFromTemplate(template)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tasks.length === 0 && !showTaskForm && (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No tasks created yet</p>
                </div>
              )}
              
              {tasks.map((task) => (
                <div key={task.id} className="bg-black/30 border border-white/10 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">{task.title}</h4>
                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                        {task.dueTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.dueTime}
                          </span>
                        )}
                        {task.assignedToName && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {task.assignedToName}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded border text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => createTaskInSystem(task)}
                        className="px-3 py-1 text-xs rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors"
                      >
                        Create Task
                      </button>
                      <button
                        onClick={() => removeTask(task.id)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {showTaskForm ? (
                <div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      className="px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                    />
                    <TimePicker
                      value={newTask.dueTime}
                      onChange={(value) => setNewTask({ ...newTask, dueTime: value })}
                      className="w-full"
                    />
                  </div>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                  >
                    <option value="">Assign to (optional)</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email} {user.app_role ? `(${user.app_role})` : ""}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={addTask}
                      className="flex-1 px-4 py-2 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-400 hover:bg-pink-500/20 transition-colors"
                    >
                      Add Task
                    </button>
                    <button
                      onClick={() => setShowTaskForm(false)}
                      className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-white/20 rounded-lg text-slate-400 hover:border-pink-500/30 hover:text-pink-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
              )}
            </div>
          </div>
        )}

        {/* Reminders Tab */}
        {activeTab === "reminders" && (
          <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-6">
            <div className="space-y-4">
              {reminders.length === 0 && !showReminderForm && (
                <div className="text-center py-12 text-slate-400">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No reminders set</p>
                </div>
              )}
              
              {reminders.map((reminder) => (
                <div key={reminder.id} className="bg-black/30 border border-white/10 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-white">{reminder.title}</h4>
                        {reminder.notificationCreated && (
                          <span className="px-2 py-0.5 rounded text-xs bg-green-500/10 border border-green-500/30 text-green-400">
                            Scheduled
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {new Date(reminder.date).toLocaleDateString()}
                        </span>
                        {reminder.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {reminder.time}
                          </span>
                        )}
                        <span className="text-xs capitalize">{reminder.repeat}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeReminder(reminder.id)}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {showReminderForm ? (
                <div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Reminder title"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={newReminder.date}
                      onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                      className="px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                    />
                    <TimePicker
                      value={newReminder.time}
                      onChange={(value) => setNewReminder({ ...newReminder, time: value })}
                      className="w-full"
                    />
                  </div>
                  <select
                    value={newReminder.repeat}
                    onChange={(e) => setNewReminder({ ...newReminder, repeat: e.target.value as any })}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={addReminder}
                      className="flex-1 px-4 py-2 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-400 hover:bg-pink-500/20 transition-colors"
                    >
                      Add Reminder
                    </button>
                    <button
                      onClick={() => setShowReminderForm(false)}
                      className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowReminderForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-white/20 rounded-lg text-slate-400 hover:border-pink-500/30 hover:text-pink-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Reminder
                </button>
              )}
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setShowMessageHistory(!showMessageHistory)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    showMessageHistory
                      ? "bg-pink-500/10 border border-pink-500/30 text-pink-400"
                      : "bg-white/5 border border-white/10 text-slate-400 hover:text-slate-300"
                  }`}
                >
                  <History className="w-4 h-4" />
                  {showMessageHistory ? "Hide" : "Show"} History ({sentMessages.length})
                </button>
              </div>

              {showMessageHistory && sentMessages.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Sent Messages</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {sentMessages.map((message) => (
                      <div key={message.id} className={`bg-black/20 border rounded-lg p-3 ${message.urgent ? "border-red-500/20" : "border-white/5"}`}>
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium text-white text-sm">{message.subject}</h5>
                              {message.urgent && (
                                <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/10 border border-red-500/30 text-red-400">
                                  Urgent
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mb-1 line-clamp-2">{message.message}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span className="capitalize">{message.recipient.replace("_", " ")}</span>
                              {message.sentAt && (
                                <span>• {new Date(message.sentAt).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-xs bg-green-500/10 border border-green-500/30 text-green-400">
                            Sent
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Draft Messages</h4>
                {messages.length === 0 && !showMessageForm && (
                  <div className="text-center py-12 text-slate-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No messages prepared</p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div key={message.id} className={`bg-black/30 border rounded-lg p-4 mb-3 ${message.urgent ? "border-red-500/30" : "border-white/10"}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-white">{message.subject}</h4>
                          {message.urgent && (
                            <span className="px-2 py-0.5 rounded text-xs bg-red-500/10 border border-red-500/30 text-red-400">
                              Urgent
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300 mb-2">{message.message}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Users className="w-3 h-3" />
                          <span className="capitalize">{message.recipient.replace("_", " ")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => sendMessage(message)}
                          className="px-3 py-1 text-xs rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          Send
                        </button>
                        <button
                          onClick={() => removeMessage(message.id)}
                          className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {showMessageForm ? (
                  <div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-3">
                    <select
                      value={newMessage.recipient}
                      onChange={(e) => setNewMessage({ ...newMessage, recipient: e.target.value as any })}
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                    >
                      <option value="manager">Manager</option>
                      <option value="owner">Owner/Admin</option>
                      <option value="all_staff">All Staff</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Subject"
                      value={newMessage.subject}
                      onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                    />
                    <textarea
                      placeholder="Message"
                      value={newMessage.message}
                      onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40 resize-none"
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={newMessage.urgent}
                        onChange={(e) => setNewMessage({ ...newMessage, urgent: e.target.checked })}
                        className="w-4 h-4 rounded border-white/20 bg-black/50 text-pink-500 focus:ring-pink-500/40"
                      />
                      Mark as urgent
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={addMessage}
                        className="flex-1 px-4 py-2 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-400 hover:bg-pink-500/20 transition-colors"
                      >
                        Add Message
                      </button>
                      <button
                        onClick={() => setShowMessageForm(false)}
                        className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowMessageForm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-white/20 rounded-lg text-slate-400 hover:border-pink-500/30 hover:text-pink-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Message
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unified Create Task/Meeting Modal */}
      <CreateTaskModal
        isOpen={createTaskModalOpen}
        onClose={() => {
          setCreateTaskModalOpen(false);
          setModalContext(undefined);
        }}
        context={modalContext}
        onTaskCreated={(task) => {
          // Refresh calendar data
          loadCalendarData();
          toast.success(`${task.metadata?.task_type || 'Task'} created successfully!`);
          setCreateTaskModalOpen(false);
          setModalContext(undefined);
        }}
      />

      {/* Floating Action Button (FAB) for quick task creation */}
      <button
        onClick={() => {
          setModalContext({ source: 'manual' });
          setCreateTaskModalOpen(true);
        }}
        className="
          fixed bottom-8 right-8
          w-14 h-14
          rounded-full
          bg-[#EC4899] hover:bg-[#EC4899]/80
          shadow-lg hover:shadow-xl
          flex items-center justify-center
          text-white
          transition-all duration-200
          z-50
        "
        aria-label="Create task"
        title="Create task, meeting, call, or note"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

