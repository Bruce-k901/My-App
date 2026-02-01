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
} from 'lucide-react';
import type { DailyAttendance, WeeklyHours } from '@/types/teamly';

export default function AttendancePage() {
  const { profile } = useAppContext();
  const [viewMode, setViewMode] = useState<'today' | 'week'>('today');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyData, setDailyData] = useState<DailyAttendance[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyHours[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isManager = profile?.app_role && ['admin', 'owner', 'manager'].includes(profile.app_role.toLowerCase());

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

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const stats = useMemo(() => {
    if (viewMode === 'today') {
      return {
        present: dailyData.filter(d => d.status === 'active' || d.status === 'completed').length,
        absent: dailyData.filter(d => d.status === 'absent').length,
        late: dailyData.filter(d => d.is_late).length,
        onBreak: dailyData.filter(d => d.is_on_break).length,
      };
    }
    return {
      totalHours: weeklyData.reduce((sum, w) => sum + w.total_hours, 0),
      overtime: weeklyData.reduce((sum, w) => sum + w.overtime_hours, 0),
      avgHours: weeklyData.length ? weeklyData.reduce((sum, w) => sum + w.total_hours, 0) / weeklyData.length : 0,
    };
  }, [dailyData, weeklyData, viewMode]);

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
    if (status === 'completed') return <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded text-xs border border-blue-200 dark:border-blue-500/20">Completed</span>;
    if (isLate) return <span className="px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded text-xs border border-red-200 dark:border-red-500/20">Late</span>;
    return <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-white/60 rounded text-xs border border-gray-200 dark:border-white/[0.06]">Absent</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Time & Attendance</h1>
          <p className="text-gray-600 dark:text-white/70">Track working hours and attendance</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-white/[0.06]">
            <button
              onClick={() => setViewMode('today')}
              className={`px-4 py-2 text-sm transition-colors ${
                viewMode === 'today' 
                  ? 'bg-transparent border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400' 
                  : 'bg-white dark:bg-white/[0.05] text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm transition-colors ${
                viewMode === 'week' 
                  ? 'bg-transparent border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400' 
                  : 'bg-white dark:bg-white/[0.05] text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Week
            </button>
          </div>
          
          <Link
            href="/dashboard/people/attendance"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] border border-gray-300 dark:border-white/[0.1] text-gray-600 hover:text-gray-900 dark:text-white/60 dark:hover:text-white rounded-lg transition-all duration-200 ease-in-out"
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
            siteId={profile?.home_site}
            onStatusChange={fetchDailyAttendance}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date Navigation */}
          <div className="flex items-center justify-between bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 shadow-sm dark:shadow-none">
            <button onClick={prevDay} className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-white/70" />
            </button>
            
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {viewMode === 'today' 
                  ? selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
                  : `Week of ${getWeekStart(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                }
              </p>
            </div>
            
            <button onClick={nextDay} className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-white/70" />
            </button>
          </div>

          {/* Stats */}
          {viewMode === 'today' ? (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 text-center shadow-sm dark:shadow-none">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.present}</p>
                <p className="text-xs text-gray-600 dark:text-white/70">Present</p>
              </div>
              <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 text-center shadow-sm dark:shadow-none">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.absent}</p>
                <p className="text-xs text-gray-600 dark:text-white/70">Absent</p>
              </div>
              <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 text-center shadow-sm dark:shadow-none">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.late}</p>
                <p className="text-xs text-gray-600 dark:text-white/70">Late</p>
              </div>
              <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 text-center shadow-sm dark:shadow-none">
                <Coffee className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.onBreak}</p>
                <p className="text-xs text-gray-600 dark:text-white/70">On Break</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 text-center shadow-sm dark:shadow-none">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(stats as any).totalHours?.toFixed(1)}h</p>
                <p className="text-xs text-gray-600 dark:text-white/70">Total Hours</p>
              </div>
              <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 text-center shadow-sm dark:shadow-none">
                <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(stats as any).overtime?.toFixed(1)}h</p>
                <p className="text-xs text-gray-600 dark:text-white/70">Overtime</p>
              </div>
              <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 text-center shadow-sm dark:shadow-none">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(stats as any).avgHours?.toFixed(1)}h</p>
                <p className="text-xs text-gray-600 dark:text-white/70">Avg/Person</p>
              </div>
            </div>
          )}

          {/* Data Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
            </div>
          ) : viewMode === 'today' ? (
            <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg overflow-hidden shadow-sm dark:shadow-none">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-white/60">Employee</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-white/60">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-white/60">Clock In</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-white/60">Clock Out</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-white/60">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/[0.06]">
                  {dailyData.map((row) => (
                    <tr key={row.profile_id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-gray-900 dark:text-white font-medium">{row.employee_name}</p>
                        <p className="text-gray-500 dark:text-white/50 text-xs">{row.position_title}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(row.status, row.is_late, row.is_on_break)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-white/70">
                        {formatTime(row.clock_in)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-white/70">
                        {formatTime(row.clock_out)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium">
                        {row.hours_worked?.toFixed(1) || '-'}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg overflow-hidden overflow-x-auto shadow-sm dark:shadow-none">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-white/60">Employee</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-gray-500 dark:text-white/60">Mon</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-gray-500 dark:text-white/60">Tue</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-gray-500 dark:text-white/60">Wed</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-gray-500 dark:text-white/60">Thu</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-gray-500 dark:text-white/60">Fri</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-gray-500 dark:text-white/60">Sat</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-gray-500 dark:text-white/60">Sun</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-white/60">Total</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-white/60">OT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/[0.06]">
                  {weeklyData.map((row) => (
                    <tr key={row.profile_id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{row.employee_name}</td>
                      <td className="px-3 py-3 text-center text-gray-700 dark:text-white/80">{row.mon_hours ? row.mon_hours.toFixed(1) : '-'}</td>
                      <td className="px-3 py-3 text-center text-gray-700 dark:text-white/80">{row.tue_hours ? row.tue_hours.toFixed(1) : '-'}</td>
                      <td className="px-3 py-3 text-center text-gray-700 dark:text-white/80">{row.wed_hours ? row.wed_hours.toFixed(1) : '-'}</td>
                      <td className="px-3 py-3 text-center text-gray-700 dark:text-white/80">{row.thu_hours ? row.thu_hours.toFixed(1) : '-'}</td>
                      <td className="px-3 py-3 text-center text-gray-700 dark:text-white/80">{row.fri_hours ? row.fri_hours.toFixed(1) : '-'}</td>
                      <td className="px-3 py-3 text-center text-gray-700 dark:text-white/80">{row.sat_hours ? row.sat_hours.toFixed(1) : '-'}</td>
                      <td className="px-3 py-3 text-center text-gray-700 dark:text-white/80">{row.sun_hours ? row.sun_hours.toFixed(1) : '-'}</td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium">{row.total_hours.toFixed(1)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${row.overtime_hours > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-white/50'}`}>
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

