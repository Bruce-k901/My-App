'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { TimeClock } from '@/components/time-clock';
import Link from 'next/link';
import { 
  Clock, 
  Users, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Coffee,
  TrendingUp
} from '@/components/ui/icons';
import type { DailyAttendance, WeeklyHours } from '@/types/teamly';

export default function AttendancePage() {
  const { profile, siteId } = useAppContext();
  const [viewMode, setViewMode] = useState<'today' | 'week'>('today');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyData, setDailyData] = useState<DailyAttendance[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteProfileIds, setSiteProfileIds] = useState<Set<string> | null>(null);

  const isManager = profile?.app_role && ['admin', 'owner', 'manager'].includes(profile.app_role.toLowerCase());

  // Fetch profile IDs for the selected site (for client-side filtering)
  useEffect(() => {
    if (!siteId || siteId === 'all' || !profile?.company_id) {
      setSiteProfileIds(null);
      return;
    }

    async function fetchSiteProfiles() {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', profile?.company_id)
        .eq('home_site', siteId);
      setSiteProfileIds(new Set((data || []).map((p: any) => p.id)));
    }

    fetchSiteProfiles();
  }, [siteId, profile?.company_id]);

  useEffect(() => {
    if (profile?.company_id) {
      if (viewMode === 'today') {
        fetchDailyAttendance();
      } else {
        fetchWeeklyHours();
      }
    }
  }, [profile?.company_id, viewMode, selectedDate]);

  const fetchDailyAttendance = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_daily_attendance', {
      p_company_id: profile?.company_id,
      p_date: selectedDate.toISOString().split('T')[0],
    });
    setDailyData(data || []);
    setLoading(false);
  };

  const fetchWeeklyHours = async () => {
    setLoading(true);
    const weekStart = getWeekStart(selectedDate);
    const { data } = await supabase.rpc('get_weekly_hours', {
      p_company_id: profile?.company_id,
      p_week_start: weekStart.toISOString().split('T')[0],
    });
    setWeeklyData(data || []);
    setLoading(false);
  };

  // Filter data by selected site and role
  // Staff members should only see their own attendance data
  const filteredDailyData = useMemo(() => {
    let data = dailyData;
    if (siteProfileIds) {
      data = data.filter(d => siteProfileIds.has(d.profile_id));
    }
    if (!isManager && profile?.id) {
      data = data.filter(d => d.profile_id === profile.id);
    }
    return data;
  }, [dailyData, siteProfileIds, isManager, profile?.id]);

  const filteredWeeklyData = useMemo(() => {
    let data = weeklyData;
    if (siteProfileIds) {
      data = data.filter(d => siteProfileIds.has(d.profile_id));
    }
    if (!isManager && profile?.id) {
      data = data.filter(d => d.profile_id === profile.id);
    }
    return data;
  }, [weeklyData, siteProfileIds, isManager, profile?.id]);

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const stats = useMemo(() => {
    if (viewMode === 'today') {
      return {
        present: filteredDailyData.filter(d => d.status === 'active' || d.status === 'completed').length,
        absent: filteredDailyData.filter(d => d.status === 'absent').length,
        late: filteredDailyData.filter(d => d.is_late).length,
        onBreak: filteredDailyData.filter(d => d.is_on_break).length,
      };
    }
    return {
      totalHours: filteredWeeklyData.reduce((sum, w) => sum + w.total_hours, 0),
      overtime: filteredWeeklyData.reduce((sum, w) => sum + w.overtime_hours, 0),
      avgHours: filteredWeeklyData.length ? filteredWeeklyData.reduce((sum, w) => sum + w.total_hours, 0) / filteredWeeklyData.length : 0,
    };
  }, [filteredDailyData, filteredWeeklyData, viewMode]);

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 1));
    setSelectedDate(d);
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 1));
    setSelectedDate(d);
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return new Date(time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string, isLate: boolean, isOnBreak: boolean) => {
    if (isOnBreak) return <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded text-xs border border-yellow-200 dark:border-yellow-500/20">On Break</span>;
    if (status === 'active') return <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded text-xs border border-green-200 dark:border-green-500/20">Working</span>;
    if (status === 'completed') return <span className="px-2 py-0.5 bg-module-fg/10 text-module-fg rounded text-xs border border-module-fg/20">Completed</span>;
    if (isLate) return <span className="px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded text-xs border border-red-200 dark:border-red-500/20">Late</span>;
    return <span className="px-2 py-0.5 bg-theme-button text-theme-secondary rounded text-xs border border-theme">Absent</span>;
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Time & Attendance</h1>
          <p className="text-theme-secondary">Track working hours and attendance</p>
        </div>
        
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-theme">
            <button
              onClick={() => setViewMode('today')}
              className={`px-4 py-2 text-sm transition-colors ${
                viewMode === 'today'
                  ? 'bg-transparent border border-module-fg text-module-fg'
 :'bg-theme-surface text-theme-secondary hover:text-theme-primary'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm transition-colors ${
                viewMode === 'week'
                  ? 'bg-transparent border border-module-fg text-module-fg'
 :'bg-theme-surface text-theme-secondary hover:text-theme-primary'
              }`}
            >
              Week
            </button>
          </div>

          <Link
            href="/dashboard/people/attendance"
            className="px-4 py-2 bg-theme-button hover:bg-theme-button-hover border border-theme text-theme-secondary hover:text-theme-primary rounded-lg transition-all duration-200 ease-in-out"
          >
            Timesheets
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Time Clock */}
        <div className="lg:col-span-1">
          <TimeClock
            profileId={profile?.id || ''}
            siteId={siteId && siteId !== 'all' ? siteId : profile?.home_site}
            onStatusChange={fetchDailyAttendance}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date Navigation */}
 <div className="flex items-center justify-between bg-theme-surface border border-theme rounded-lg p-4 shadow-sm dark:shadow-none">
            <button onClick={prevDay} className="p-2 hover:bg-theme-hover rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-theme-secondary" />
            </button>
            
            <div className="text-center">
              <p className="text-lg font-semibold text-theme-primary">
                {viewMode === 'today' 
                  ? selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
                  : `Week of ${getWeekStart(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                }
              </p>
            </div>
            
            <button onClick={nextDay} className="p-2 hover:bg-theme-hover rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-theme-secondary" />
            </button>
          </div>

          {/* Stats - only show team stats for managers */}
          {viewMode === 'today' && isManager ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
 <div className="bg-theme-surface border border-theme rounded-lg p-4 text-center shadow-sm dark:shadow-none">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-theme-primary">{stats.present}</p>
                <p className="text-xs text-theme-secondary">Present</p>
              </div>
 <div className="bg-theme-surface border border-theme rounded-lg p-4 text-center shadow-sm dark:shadow-none">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-theme-primary">{stats.absent}</p>
                <p className="text-xs text-theme-secondary">Absent</p>
              </div>
 <div className="bg-theme-surface border border-theme rounded-lg p-4 text-center shadow-sm dark:shadow-none">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-theme-primary">{stats.late}</p>
                <p className="text-xs text-theme-secondary">Late</p>
              </div>
 <div className="bg-theme-surface border border-theme rounded-lg p-4 text-center shadow-sm dark:shadow-none">
                <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-theme-primary">{stats.onBreak}</p>
                <p className="text-xs text-theme-secondary">On Break</p>
              </div>
            </div>
          ) : viewMode === 'week' && isManager ? (
            <div className="grid grid-cols-3 gap-4">
 <div className="bg-theme-surface border border-theme rounded-lg p-4 text-center shadow-sm dark:shadow-none">
                <Clock className="w-5 h-5 text-module-fg mx-auto mb-1" />
                <p className="text-2xl font-bold text-theme-primary">{(stats as any).totalHours?.toFixed(1)}h</p>
                <p className="text-xs text-theme-secondary">Total Hours</p>
              </div>
 <div className="bg-theme-surface border border-theme rounded-lg p-4 text-center shadow-sm dark:shadow-none">
                <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-theme-primary">{(stats as any).overtime?.toFixed(1)}h</p>
                <p className="text-xs text-theme-secondary">Overtime</p>
              </div>
 <div className="bg-theme-surface border border-theme rounded-lg p-4 text-center shadow-sm dark:shadow-none">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-theme-primary">{(stats as any).avgHours?.toFixed(1)}h</p>
                <p className="text-xs text-theme-secondary">Avg/Person</p>
              </div>
            </div>
          ) : null}

          {/* Data Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-module-fg" />
            </div>
          ) : viewMode === 'today' ? (
 <div className="bg-theme-surface border border-theme rounded-lg overflow-hidden overflow-x-auto shadow-sm dark:shadow-none">
              <table className="w-full min-w-[480px]">
                <thead className="bg-theme-button">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 text-left text-sm font-medium text-theme-tertiary">Employee</th>
                    <th className="px-2 sm:px-4 py-3 text-center text-sm font-medium text-theme-tertiary">Status</th>
                    <th className="px-2 sm:px-4 py-3 text-center text-sm font-medium text-theme-tertiary">Clock In</th>
                    <th className="px-2 sm:px-4 py-3 text-center text-sm font-medium text-theme-tertiary">Clock Out</th>
                    <th className="px-3 sm:px-4 py-3 text-right text-sm font-medium text-theme-tertiary">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {filteredDailyData.map((row) => (
                    <tr key={row.profile_id} className="hover:bg-theme-hover transition-colors">
                      <td className="px-3 sm:px-4 py-3">
                        <p className="text-theme-primary font-medium">{row.employee_name}</p>
                        <p className="text-theme-tertiary text-xs">{row.position_title}</p>
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-center">
                        {getStatusBadge(row.status, row.is_late, row.is_on_break)}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-center text-theme-secondary text-sm">
                        {formatTime(row.clock_in)}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-center text-theme-secondary text-sm">
                        <span className="inline-flex items-center gap-1">
                          {formatTime(row.clock_out)}
                          {row.notes?.includes('Auto clocked out') && (
                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded text-[10px] font-medium border border-amber-200 dark:border-amber-500/20">
                              System
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right text-theme-primary font-medium text-sm">
                        {row.hours_worked?.toFixed(1) || '-'}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-theme-surface border border-theme rounded-lg overflow-hidden overflow-x-auto shadow-sm dark:shadow-none">
              <table className="w-full min-w-[700px]">
                <thead className="bg-theme-button">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-theme-tertiary">Employee</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-theme-tertiary">Mon</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-theme-tertiary">Tue</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-theme-tertiary">Wed</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-theme-tertiary">Thu</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-theme-tertiary">Fri</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-theme-tertiary">Sat</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-theme-tertiary">Sun</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-theme-tertiary">Total</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-theme-tertiary">OT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {filteredWeeklyData.map((row) => (
                    <tr key={row.profile_id} className="hover:bg-theme-hover transition-colors">
                      <td className="px-4 py-3 text-theme-primary font-medium">{row.employee_name}</td>
                      <td className="px-3 py-3 text-center text-theme-secondary">{row.mon_hours ? row.mon_hours.toFixed(1) : '-'}</td>
                      <td className="px-3 py-3 text-center text-theme-secondary">{row.tue_hours ? row.tue_hours.toFixed(1) : '-'}</td>
                      <td className="px-3 py-3 text-center text-theme-secondary">{row.wed_hours ? row.wed_hours.toFixed(1) : '-'}</td>
                      <td className="px-3 py-3 text-center text-theme-secondary">{row.thu_hours ? row.thu_hours.toFixed(1) : '-'}</td>
                      <td className="px-3 py-3 text-center text-theme-secondary">{row.fri_hours ? row.fri_hours.toFixed(1) : '-'}</td>
                      <td className="px-3 py-3 text-center text-theme-secondary">{row.sat_hours ? row.sat_hours.toFixed(1) : '-'}</td>
                      <td className="px-3 py-3 text-center text-theme-secondary">{row.sun_hours ? row.sun_hours.toFixed(1) : '-'}</td>
                      <td className="px-4 py-3 text-right text-theme-primary font-medium">{row.total_hours.toFixed(1)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${row.overtime_hours > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-theme-tertiary'}`}>
                        {row.overtime_hours.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

