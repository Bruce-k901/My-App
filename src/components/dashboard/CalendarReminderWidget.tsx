"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Calendar, Bell, Wrench, Clock, ChevronRight, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import Link from "next/link";

interface CalendarReminder {
  id: string;
  asset_id: string;
  asset_name?: string;
  callout_id?: string;
  reminder_date: string;
  reminder_type: string;
  title: string;
  description?: string;
  dismissed: boolean;
}

export default function CalendarReminderWidget() {
  const [reminders, setReminders] = useState<CalendarReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const { companyId, siteId } = useAppContext();

  const loadReminders = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      // Get upcoming reminders for the next 7 days
      let query = supabase
        .from('calendar_reminders')
        .select(`
          id,
          asset_id,
          callout_id,
          reminder_date,
          reminder_type,
          title,
          description,
          dismissed,
          assets(name)
        `)
        .eq('company_id', companyId)
        .eq('dismissed', false)
        .gte('reminder_date', today)
        .lte('reminder_date', nextWeekStr)
        .order('reminder_date', { ascending: true })
        .limit(5);

      // Filter by site if selected
      if (siteId) {
        query = query.eq('site_id', siteId);
      }

      const { data, error } = await query;

      if (error) {
        // If table doesn't exist, just show empty state
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.log('calendar_reminders table not available');
          setReminders([]);
          return;
        }
        throw error;
      }

      const transformedReminders = (data || []).map((r: any) => ({
        id: r.id,
        asset_id: r.asset_id,
        asset_name: r.assets?.name || 'Unknown Asset',
        callout_id: r.callout_id,
        reminder_date: r.reminder_date,
        reminder_type: r.reminder_type,
        title: r.title,
        description: r.description,
        dismissed: r.dismissed
      }));

      setReminders(transformedReminders);
    } catch (error) {
      console.error("Error loading calendar reminders:", error);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, siteId]);

  useEffect(() => {
    if (companyId) {
      loadReminders();
    } else {
      setLoading(false);
    }
  }, [companyId, siteId, loadReminders]);

  const dismissReminder = async (reminderId: string) => {
    try {
      await supabase
        .from('calendar_reminders')
        .update({ dismissed: true })
        .eq('id', reminderId);

      // Remove from local state
      setReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (error) {
      console.error("Error dismissing reminder:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    }
  };

  const getReminderTypeIcon = (type: string) => {
    switch (type) {
      case 'service_booked':
        return <Wrench className="w-4 h-4 text-cyan-400" />;
      case 'ppm_due':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <Bell className="w-4 h-4 text-pink-400" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white">
            Upcoming Reminders
          </h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600 dark:border-cyan-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white">
            Upcoming Reminders
          </h3>
        </div>
        {reminders.length > 0 && (
          <span className="text-xs bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 px-2 py-1 rounded-full">
            {reminders.length} upcoming
          </span>
        )}
      </div>

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-gray-100 dark:bg-white/[0.05] rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6 text-gray-400 dark:text-white/40" />
          </div>
          <p className="text-sm text-gray-500 dark:text-white/60">No upcoming reminders</p>
          <p className="text-xs text-gray-400 dark:text-white/40 mt-1">Service reminders will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="group flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
            >
              <div className="mt-0.5">
                {getReminderTypeIcon(reminder.reminder_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                    {reminder.title}
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-white/60 mt-0.5">
                  {reminder.asset_name}
                </p>
                <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                  {formatDate(reminder.reminder_date)}
                </p>
              </div>
              <button
                onClick={() => dismissReminder(reminder.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                title="Dismiss reminder"
              >
                <X className="w-4 h-4 text-gray-400 dark:text-white/40" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* View All Link */}
      {reminders.length > 0 && (
        <Link
          href="/dashboard/assets"
          className="flex items-center justify-center gap-1 mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.06] text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
        >
          View all assets
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
