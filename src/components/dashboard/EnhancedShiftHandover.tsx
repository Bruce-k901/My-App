"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import { Calendar, Clock, MessageSquare, Plus, X, CheckCircle2, Send, Bell, FileText, Users, History, Zap } from '@/components/ui/icons';
import { toast } from "sonner";
import TimePicker from "@/components/ui/TimePicker";
import { usePanelStore } from "@/lib/stores/panel-store";

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

interface MentionedMessage {
  id: string;
  content: string;
  sender_name: string;
  sender_id: string;
  channel_id: string;
  conversation_name?: string;
  created_at: string;
  channel_type?: string;
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

export default function EnhancedShiftHandover() {
  const { companyId, siteId, userProfile, userId } = useAppContext();
  const { setMessagingOpen } = usePanelStore();
  const [notes, setNotes] = useState("");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [sentMessages, setSentMessages] = useState<MessageItem[]>([]);
  const [mentionedMessages, setMentionedMessages] = useState<MentionedMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"notes" | "tasks" | "reminders" | "messages">("notes");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [showMessageHistory, setShowMessageHistory] = useState(false);
  
  // Form states
  const [newTask, setNewTask] = useState<Partial<TaskItem>>({
    title: "",
    dueDate: new Date().toISOString().split("T")[0],
    dueTime: "",
    assignedTo: "",
    priority: "medium",
  });
  const [newReminder, setNewReminder] = useState<Partial<ReminderItem>>({
    title: "",
    date: new Date().toISOString().split("T")[0],
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
        const errorMessage = error?.message || error?.code || 'Unknown error';
        const errorDetails = {
          message: error?.message || null,
          code: error?.code || null,
          details: error?.details || null,
          hint: error?.hint || null
        };
        console.error("Failed to load users:", errorMessage, errorDetails);
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

  // Load handover data and sent messages
  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split("T")[0];
      let q = supabase.from("profile_settings").select("id,value,company_id,key").eq("key", `handover:${today}`);
      if (companyId) q = q.eq("company_id", companyId);
      const { data } = await q.limit(1).maybeSingle();
      
      if (data?.value) {
        const handoverData = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        setNotes(handoverData.notes || "");
        setTasks(handoverData.tasks || []);
        setReminders(handoverData.reminders || []);
        setMessages(handoverData.messages || []);
      }

      // Load sent messages from notifications (look for handover messages by checking message content)
      if (companyId) {
        try {
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
              // Extract original message (before the --- separator)
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
          console.error("Failed to load sent messages:", error);
        }
      }
    };
    load();
  }, [companyId]);

  // Load @mentioned messages
  useEffect(() => {
    const loadMentionedMessages = async () => {
      if (!userId || !companyId) return;

      try {
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.toISOString();
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        const todayEndISO = todayEnd.toISOString();

        // Query messages where current user is mentioned (check metadata.mentions array)
        // Fetch messages and channels separately to avoid relationship query issues
        const { data: messagesData, error } = await supabase
          .from("messaging_messages")
          .select(`
            id,
            content,
            sender_profile_id,
            channel_id,
            created_at,
            metadata
          `)
          .gte("created_at", todayStart)
          .lte("created_at", todayEndISO)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;

        if (!messagesData || messagesData.length === 0) {
          setMentionedMessages([]);
          return;
        }

        // Fetch channels separately to get company_id and filter by company
        const channelIds = [...new Set(messagesData.map((msg: any) => msg.channel_id).filter(Boolean))];
        const { data: channelsData } = await supabase
          .from("messaging_channels")
          .select("id, name, channel_type, company_id")
          .in("id", channelIds)
          .eq("company_id", companyId); // Filter by company_id at query level

        if (!channelsData || channelsData.length === 0) {
          setMentionedMessages([]);
          return;
        }

        // Create channel map for quick lookup
        const channelsMap = new Map(channelsData.map((ch: any) => [ch.id, ch]));

        // Filter messages where user is mentioned AND belong to user's company
        const mentioned = messagesData
          .filter((msg: any) => {
            // Check if message belongs to user's company (channel must be in channelsData)
            if (!channelsMap.has(msg.channel_id)) return false;
            // Check if user is mentioned
            const mentions = msg.metadata?.mentions || [];
            return Array.isArray(mentions) && mentions.includes(userId);
          })
          .map((msg: any) => {
            const channel = channelsMap.get(msg.channel_id);
            return {
              id: msg.id,
              content: msg.content,
              sender_name: msg.metadata?.sender_name || "Unknown",
              sender_id: msg.sender_profile_id || msg.sender_id, // Backward compatibility
              channel_id: msg.channel_id,
              conversation_name: channel?.name || 
                (channel?.channel_type === 'direct' ? 'Direct Message' : 'Group Chat'),
              created_at: msg.created_at,
              channel_type: channel?.channel_type,
            };
          });

        setMentionedMessages(mentioned);
      } catch (error: any) {
        console.error("Failed to load mentioned messages:", error);
      }
    };

    loadMentionedMessages();

    // Subscribe to new messages with mentions
    if (userId && companyId) {
      const channel = supabase
        .channel(`mentioned-messages-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messaging_messages",
          },
          async (payload) => {
            const msg = payload.new as any;
            const mentions = msg.metadata?.mentions || [];
            if (Array.isArray(mentions) && mentions.includes(userId)) {
              // Verify message belongs to user's company
              const { data: channelData } = await supabase
                .from("messaging_channels")
                .select("company_id")
                .eq("id", msg.channel_id)
                .single();
              
              if (channelData?.company_id === companyId) {
                // Reload mentioned messages
                loadMentionedMessages();
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId, companyId]);

  const save = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const handoverData = {
        notes,
        tasks,
        reminders,
        messages,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.id || null,
      };
      
      const row = { 
        key: `handover:${today}`, 
        value: handoverData, 
        company_id: companyId 
      } as any;
      
      await supabase.from("profile_settings").upsert(row, { onConflict: "key,company_id" });
      setSavedAt(new Date().toLocaleTimeString());
      toast.success("Handover notes saved");
      
      // Dispatch custom event to notify calendar page of the update
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("handover-saved"));
        // Also use localStorage as a backup signal
        localStorage.setItem("handover_updated", Date.now().toString());
      }
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    }
    setSaving(false);
  };

  const addTaskFromTemplate = (template: TaskTemplate) => {
    const task: TaskItem = {
      id: `task-${Date.now()}`,
      title: template.name,
      dueDate: new Date().toISOString().split("T")[0],
      dueTime: "",
      assignedTo: "",
      priority: "medium",
    };
    
    setTasks([...tasks, task]);
    save();
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
      dueDate: new Date().toISOString().split("T")[0],
      dueTime: "",
      assignedTo: "",
      priority: "medium",
    });
    setShowTaskForm(false);
    save();
  };

  const createTaskInSystem = async (task: TaskItem) => {
    try {
      // Create task in checklist_tasks table
      const { error } = await supabase.from("checklist_tasks").insert({
        company_id: companyId,
        site_id: siteId,
        custom_name: task.title,
        due_date: task.dueDate,
        due_time: task.dueTime || null,
        status: "pending",
        priority: task.priority,
        assigned_to_user_id: task.assignedTo || null,
        task_data: {
          created_from_handover: true,
          handover_date: new Date().toISOString().split("T")[0],
        },
      });

      if (error) throw error;
      
      toast.success("Task created successfully");
      // Remove from local tasks list
      setTasks(tasks.filter(t => t.id !== task.id));
      save();
    } catch (error: any) {
      toast.error(`Failed to create task: ${error.message}`);
    }
  };

  const createReminderNotification = async (reminder: ReminderItem) => {
    try {
      // Validate required fields
      if (!companyId) {
        const errorMessage = "Company ID is missing. Cannot create reminder notification.";
        console.error(errorMessage);
        toast.error(errorMessage);
        return false;
      }

      const reminderDateTime = new Date(`${reminder.date}T${reminder.time || "09:00"}`);
      const now = new Date();
      
      // Only create notification if reminder is in the future
      if (reminderDateTime <= now) {
        return false;
      }

      // Create notification for the reminder using 'task' type (compatible with existing schema)
      // Store reminder details in message including the scheduled date/time
      const reminderMessage = `Reminder: ${reminder.title}\nScheduled for ${new Date(reminder.date).toLocaleDateString()}${reminder.time ? ` at ${reminder.time}` : ""}\nRepeat: ${reminder.repeat}\n[Handover Reminder ID: ${reminder.id}]`;
      
      // Type assertion needed because TypeScript types are out of sync with actual database schema
      // The database has due_date, status, priority columns, but types don't reflect this
      const notificationData = {
        company_id: companyId,
        site_id: siteId || null,
        type: "task", // Using existing type
        title: `Reminder: ${reminder.title}`,
        message: reminderMessage,
        severity: "info", // Required field - must be 'info', 'warning', or 'critical'
        recipient_role: null as string | null,
        // These fields exist in DB but not in TypeScript types yet
        status: "active",
        due_date: reminder.date,
        priority: "medium",
      } as any;
      
      const { error } = await supabase.from("notifications").insert(notificationData);

      if (error) {
        // Extract meaningful error information
        const errorMessage = error.message || "Unknown error";
        const errorCode = error.code || "unknown";
        const errorDetails = error.details || null;
        const errorHint = error.hint || null;
        
        const fullError = {
          message: errorMessage,
          code: errorCode,
          details: errorDetails,
          hint: errorHint,
        };
        
        console.error("Failed to create reminder notification:", fullError);
        
        // Show user-friendly error message
        const userMessage = errorHint 
          ? `Failed to schedule reminder: ${errorHint}`
          : errorMessage 
          ? `Failed to schedule reminder: ${errorMessage}`
          : "Failed to schedule reminder. Please try again.";
        
        toast.error(userMessage);
        throw error;
      }
      return true;
    } catch (error: any) {
      // Handle non-Supabase errors
      if (error?.message || error?.code) {
        // Already handled above, just return false
        return false;
      }
      
      // Handle unexpected errors
      const errorMessage = error?.toString() || "Unknown error occurred";
      console.error("Failed to create reminder notification:", {
        error,
        message: errorMessage,
        stack: error?.stack,
      });
      
      toast.error("Failed to schedule reminder. Please try again.");
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
    
    // Create calendar notification
    const notificationCreated = await createReminderNotification(reminder);
    if (notificationCreated) {
      reminder.notificationCreated = true;
      toast.success("Reminder scheduled");
    }
    
    setReminders([...reminders, reminder]);
    setNewReminder({
      title: "",
      date: new Date().toISOString().split("T")[0],
      time: "",
      repeat: "once",
    });
    setShowReminderForm(false);
    save();
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
      // Create notification for managers/owners/staff
      const recipientRole = message.recipient === "manager" 
        ? "manager" 
        : message.recipient === "owner" 
        ? "admin" 
        : "staff";

      // Store sender info in message text for tracking
      const messageWithSender = `${message.message}\n\n---\nFrom: ${userProfile?.full_name || userProfile?.email || "Unknown"}\n[Handover Message ID: ${message.id}]`;

      const { error, data } = await supabase.from("notifications").insert({
        company_id: companyId,
        site_id: siteId,
        type: "task", // Using existing type
        title: message.subject,
        message: messageWithSender,
        severity: message.urgent ? "critical" : "info", // Required field - must be 'info', 'warning', or 'critical'
        status: "active",
        priority: message.urgent ? "urgent" : "medium",
      }).select().single();

      if (error) throw error;
      
      // Mark message as sent and add to history
      const sentMessage: MessageItem = {
        ...message,
        sent: true,
        sentAt: new Date().toISOString(),
      };
      setSentMessages([sentMessage, ...sentMessages]);
      
      toast.success(`Message sent to ${message.recipient}`);
      // Remove from local messages list
      setMessages(messages.filter(m => m.id !== message.id));
      save();
    } catch (error: any) {
      toast.error(`Failed to send message: ${error.message}`);
    }
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    save();
  };

  const removeReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
    save();
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

  return (
    <section className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-4 sm:p-6 shadow-[0_0_12px_rgba(211,126,145,0.05)] fade-in-soft">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-[#D37E91]/15 border border-[#D37E91]/20">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#D37E91]" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-semibold text-white">Daily Notes & Actions</h3>
            <p className="text-xs text-slate-400 hidden sm:block">Notes, tasks, reminders, and messages</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {savedAt && <span className="text-xs text-slate-400">Saved at {savedAt}</span>}
          <Link
            href="/dashboard/calendar"
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-transparent border border-[#D37E91] text-[#D37E91] rounded-lg hover:shadow-[0_0_12px_rgba(211,126,145,0.7)] transition-all duration-200 ease-in-out text-xs sm:text-sm font-medium whitespace-nowrap"
          >
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Calendar & Diary</span>
            <span className="xs:hidden">Calendar</span>
          </Link>
          <Link
            href="/dashboard/tasks/my-tasks"
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-transparent border border-[#D37E91] text-[#D37E91] rounded-lg hover:shadow-[0_0_12px_rgba(211,126,145,0.7)] transition-all duration-200 ease-in-out text-xs sm:text-sm font-medium whitespace-nowrap"
          >
            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">My Tasks</span>
            <span className="xs:hidden">Tasks</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 mb-4 border-b border-white/10 overflow-x-auto">
        {[
          { id: "notes", label: "Notes", icon: FileText },
          { id: "tasks", label: `Tasks (${tasks.length})`, icon: CheckCircle2 },
          { id: "reminders", label: `Reminders (${reminders.length})`, icon: Bell },
          { id: "messages", label: `Messages (${messages.length}${mentionedMessages.length > 0 ? ` • @${mentionedMessages.length}` : ''})`, icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-[#D37E91] text-[#D37E91]"
                  : "border-transparent text-slate-400 hover:text-slate-300"
              }`}
            >
              <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.id === "notes" ? "Notes" : tab.id === "tasks" ? `Tasks` : tab.id === "reminders" ? "Reminders" : "Messages"}</span>
            </button>
          );
        })}
      </div>

      {/* Notes Tab */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={save}
            placeholder="Key updates for the next shift, important information, issues to follow up..."
            className="w-full h-24 sm:h-32 bg-black/30 border border-white/10 rounded-xl p-3 sm:p-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40 resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg bg-[#D37E91]/15 border border-[#D37E91]/30 text-[#D37E91] hover:bg-[#D37E91]/25 disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          {/* Quick-add Task Templates */}
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
            <div className="text-center py-8 text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No tasks created yet</p>
            </div>
          )}
          
          {tasks.map((task) => (
            <div key={task.id} className="bg-black/30 border border-white/10 rounded-lg p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white mb-1 text-sm sm:text-base break-words">{task.title}</h4>
                  <div className="flex items-center gap-2 sm:gap-4 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
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
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => createTaskInSystem(task)}
                    className="px-2 sm:px-3 py-1 text-xs rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors whitespace-nowrap"
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
            <div className="bg-black/30 border border-white/10 rounded-lg p-3 sm:p-4 space-y-3">
              <input
                type="text"
                placeholder="Task title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
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
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
              >
                <option value="">Assign to (optional)</option>
                {/* Staff */}
                {users.filter(u => !u.app_role || u.app_role.toLowerCase() === 'staff').length > 0 && (
                  <optgroup label="Staff">
                    {users.filter(u => !u.app_role || u.app_role.toLowerCase() === 'staff').map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))}
                  </optgroup>
                )}
                {/* Managers */}
                {users.filter(u => u.app_role && u.app_role.toLowerCase() === 'manager').length > 0 && (
                  <optgroup label="Managers">
                    {users.filter(u => u.app_role && u.app_role.toLowerCase() === 'manager').map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))}
                  </optgroup>
                )}
                {/* Owner/Admin */}
                {users.filter(u => u.app_role && (u.app_role.toLowerCase() === 'admin' || u.app_role.toLowerCase() === 'owner')).length > 0 && (
                  <optgroup label="Owner/Admin">
                    {users.filter(u => u.app_role && (u.app_role.toLowerCase() === 'admin' || u.app_role.toLowerCase() === 'owner')).map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={addTask}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#D37E91]/15 border border-[#D37E91]/30 text-[#D37E91] hover:bg-[#D37E91]/25 transition-colors"
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
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-white/20 rounded-lg text-slate-400 hover:border-[#D37E91]/30 hover:text-[#D37E91] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          )}
        </div>
      )}

      {/* Reminders Tab */}
      {activeTab === "reminders" && (
        <div className="space-y-4">
          {reminders.length === 0 && !showReminderForm && (
            <div className="text-center py-8 text-slate-400">
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
                      <Calendar className="w-3 h-3" />
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
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={newReminder.date}
                  onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                  className="px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
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
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
              >
                <option value="once">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={addReminder}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#D37E91]/15 border border-[#D37E91]/30 text-[#D37E91] hover:bg-[#D37E91]/25 transition-colors"
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
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-white/20 rounded-lg text-slate-400 hover:border-[#D37E91]/30 hover:text-[#D37E91] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Reminder
            </button>
          )}
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === "messages" && (
        <div className="space-y-4">
          {/* Message History Toggle */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowMessageHistory(!showMessageHistory)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showMessageHistory
                  ? "bg-[#D37E91]/15 border border-[#D37E91]/30 text-[#D37E91]"
                  : "bg-white/5 border border-white/10 text-slate-400 hover:text-slate-300"
              }`}
            >
              <History className="w-4 h-4" />
              {showMessageHistory ? "Hide" : "Show"} History ({sentMessages.length})
            </button>
          </div>

          {/* Message History */}
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

          {/* @Mentioned Messages */}
          {mentionedMessages.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-[#D37E91] mb-3 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#D37E91]/15 border border-[#D37E91]/30 text-[#D37E91] text-xs font-bold">
                  @
                </span>
                Messages Mentioning You ({mentionedMessages.length})
              </h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {mentionedMessages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => setMessagingOpen(true)}
                    className="block w-full text-left bg-[#D37E91]/10 border border-[#D37E91]/20 rounded-lg p-3 hover:bg-[#D37E91]/15 hover:border-[#D37E91]/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-white text-sm truncate">
                            {msg.sender_name}
                          </h5>
                          <span className="text-xs text-[#D37E91]/70">
                            in {msg.conversation_name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mb-1 line-clamp-2">{msg.content}</p>
                        <div className="text-xs text-slate-500">
                          {new Date(msg.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Draft Messages */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-3">Draft Messages</h4>
            {messages.length === 0 && !showMessageForm && (
              <div className="text-center py-8 text-slate-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No messages prepared</p>
              </div>
            )}
            
            {messages.map((message) => (
            <div key={message.id} className={`bg-black/30 border rounded-lg p-4 ${message.urgent ? "border-red-500/30" : "border-white/10"}`}>
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
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
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
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
              />
              <textarea
                placeholder="Message"
                value={newMessage.message}
                onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40 resize-none"
              />
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={newMessage.urgent}
                  onChange={(e) => setNewMessage({ ...newMessage, urgent: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-black/50 text-[#D37E91] focus:ring-[#D37E91]/40"
                />
                Mark as urgent
              </label>
              <div className="flex gap-2">
                <button
                  onClick={addMessage}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#D37E91]/15 border border-[#D37E91]/30 text-[#D37E91] hover:bg-[#D37E91]/25 transition-colors"
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
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-white/20 rounded-lg text-slate-400 hover:border-[#D37E91]/30 hover:text-[#D37E91] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Message
            </button>
          )}
          </div>
        </div>
      )}
    </section>
  );
}

