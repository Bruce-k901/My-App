"use client";

import { useState, useEffect } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MessageSquare, Plus, X, CheckCircle2, Send, Bell, FileText, Users, History, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

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
  date: string;
  type: "task" | "reminder" | "message";
  title: string;
  color: string;
}

export default function ManagerCalendarPage() {
  const { companyId, siteId, userProfile } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<TaskItem[]>([]);
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
  useEffect(() => {
    const load = async () => {
      if (!companyId) return;
      
      try {
        // Load all handover data for the current month
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split("T")[0];
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split("T")[0];
        
        const { data } = await supabase
          .from("profile_settings")
          .select("key,value")
          .eq("company_id", companyId)
          .like("key", "handover:%")
          .gte("key", `handover:${startOfMonth}`)
          .lte("key", `handover:${endOfMonth}`);
        
        if (data) {
          const allNotes: Record<string, string> = {};
          const allTasks: TaskItem[] = [];
          const allReminders: ReminderItem[] = [];
          const allMessages: MessageItem[] = [];
          
          data.forEach((item) => {
            const handoverData = typeof item.value === "string" ? JSON.parse(item.value) : item.value;
            const dateKey = item.key.replace("handover:", "");
            
            if (handoverData.notes) {
              allNotes[dateKey] = handoverData.notes;
            }
            if (handoverData.tasks) {
              allTasks.push(...handoverData.tasks);
            }
            if (handoverData.reminders) {
              allReminders.push(...handoverData.reminders);
            }
            if (handoverData.messages) {
              allMessages.push(...handoverData.messages);
            }
          });
          
          setNotes(allNotes);
          setTasks(allTasks);
          setReminders(allReminders);
          setMessages(allMessages);
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
    };
    
    load();
  }, [companyId, currentDate]);

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
        severity: "info",
        recipient_role: "staff",
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
        severity: message.urgent ? "critical" : "info",
        recipient_role: recipientRole,
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
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
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
    
    tasks.filter(t => t.dueDate === dateStr).forEach(task => {
      events.push({
        date: dateStr,
        type: "task",
        title: task.title,
        color: task.priority === "high" ? "red" : task.priority === "medium" ? "yellow" : "blue",
      });
    });
    
    reminders.filter(r => r.date === dateStr).forEach(reminder => {
      events.push({
        date: dateStr,
        type: "reminder",
        title: reminder.title,
        color: "purple",
      });
    });
    
    return events;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === "next" ? 1 : -1), 1));
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const selectedDateTasks = tasks.filter(t => t.dueDate === selectedDate);
  const selectedDateReminders = reminders.filter(r => r.date === selectedDate);
  const selectedDateNotes = selectedDate ? notes[selectedDate] || "" : "";

  return (
    <div className="min-h-screen bg-[#0B0D13] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
              <CalendarDays className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Manager Calendar & Diary</h1>
              <p className="text-sm text-slate-400">Plan, organize, and track tasks, reminders, and messages</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
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
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
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
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={() => navigateMonth("next")}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {getDaysInMonth().map((date, idx) => {
                if (!date) {
                  return <div key={`empty-${idx}`} className="aspect-square" />;
                }
                
                const dateStr = date.toISOString().split("T")[0];
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                const isSelected = dateStr === selectedDate;
                const events = getEventsForDate(date);
                
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square p-2 rounded-lg border transition-all ${
                      isSelected
                        ? "bg-pink-500/20 border-pink-500/50 shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                        : isToday
                        ? "bg-blue-500/10 border-blue-500/30"
                        : "bg-black/20 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? "text-blue-400" : "text-slate-300"}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {events.slice(0, 3).map((event, eIdx) => (
                        <div
                          key={eIdx}
                          className={`text-xs truncate px-1 py-0.5 rounded ${
                            event.color === "red" ? "bg-red-500/20 text-red-400"
                            : event.color === "yellow" ? "bg-yellow-500/20 text-yellow-400"
                            : event.color === "blue" ? "bg-blue-500/20 text-blue-400"
                            : "bg-purple-500/20 text-purple-400"
                          }`}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {events.length > 3 && (
                        <div className="text-xs text-slate-400">+{events.length - 3} more</div>
                      )}
                    </div>
                  </button>
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
                {selectedDateTasks.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Tasks</h4>
                    <div className="space-y-2">
                      {selectedDateTasks.map(task => (
                        <div key={task.id} className="bg-black/30 border border-white/10 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm text-white">{task.title}</div>
                            {task.dueTime && (
                              <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                {task.dueTime}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => createTaskInSystem(task)}
                            className="px-2 py-1 text-xs rounded bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20"
                          >
                            Create
                          </button>
                        </div>
                      ))}
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
                    <input
                      type="time"
                      value={newTask.dueTime}
                      onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })}
                      className="px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
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
                    <input
                      type="time"
                      value={newReminder.time}
                      onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                      className="px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
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
    </div>
  );
}

