'use client';

import React, { useState, useEffect } from 'react';
// Temporarily removing icons to debug
// import { Clock, MapPin, User, CheckCircle, XCircle } from '@/components/ui/icons';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
// import { Button } from '@/components/ui';
import { format as formatDate } from 'date-fns';


interface AttendanceRecord {
  id: string;
  user_id: string;
  company_id: string;
  site_id: string | null;
  clock_in_time: string;
  clock_out_time: string | null;
  shift_status: 'on_shift' | 'off_shift';
  total_hours: number | null;
  shift_notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  sites?: {
    name: string;
  };
}

export default function AttendanceLogsPage() {
  const { profile, companyId, siteId } = useAppContext();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('week');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(siteId || null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(profile?.id || null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);

  // Hooks must be called unconditionally - move useEffect before early return
  useEffect(() => {
    if (companyId) {
      loadSites();
      loadUsers();
      loadAttendance();
    }
    }, [companyId, filter, selectedSiteId, selectedUserId, startDate, endDate]);

  // Safety check - ensure we have required context (after hooks)
  if (!companyId) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-theme-primary h-full">
        <div>Loading...</div>
      </div>
    );
  }

  async function loadSites() {
    if (!companyId) return;
    
    const { data } = await supabase
      .from('sites')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name');
    
    if (data) {
      setSites(data);
    }
  }

  async function loadUsers() {
    if (!companyId) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('company_id', companyId)
      .order('full_name');
    
    if (data) {
      setUsers(data);
    }
  }

  async function loadAttendance() {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Starting to load attendance...');

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      if (!user) {
        console.error('❌ User not authenticated');
        setLoading(false);
        return;
      }

      // Calculate date range based on filter
      const now = new Date();
      let startDateFilter: Date;
      
      switch (filter) {
        case 'today':
          startDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDateFilter = new Date(now);
          startDateFilter.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDateFilter = new Date(now);
          startDateFilter.setMonth(now.getMonth() - 1);
          break;
        case 'custom':
          // Use custom date range if provided
          if (startDate) {
            startDateFilter = new Date(startDate);
            startDateFilter.setHours(0, 0, 0, 0);
          } else {
            startDateFilter = new Date(0); // All time if no start date
          }
          break;
        default:
          startDateFilter = new Date(0); // All time
      }

      let query = supabase
        .from('staff_attendance')
        .select(`
          *,
          profiles:user_id (full_name, email),
          sites:site_id (name)
        `)
        .eq('company_id', companyId)
        .gte('clock_in_time', startDateFilter.toISOString());

      // Apply end date filter if custom range is selected
      if (filter === 'custom' && endDate) {
        const endDateFilter = new Date(endDate);
        endDateFilter.setHours(23, 59, 59, 999);
        query = query.lte('clock_in_time', endDateFilter.toISOString());
      }

      query = query.order('clock_in_time', { ascending: false }).limit(100);

      // Apply site filter
      if (selectedSiteId) {
        query = query.eq('site_id', selectedSiteId);
      }

      // Apply user filter (if manager/admin viewing)
      if (selectedUserId) {
        query = query.eq('profile_id', selectedUserId);
      } else if (profile?.app_role?.toLowerCase() === 'staff') {
        // Staff can only see their own records
        query = query.eq('profile_id', profile.id);
      }

      console.log('📊 Executing query with filters:', {
        companyId,
        selectedSiteId,
        selectedUserId,
        filter,
        startDateFilter: startDateFilter.toISOString()
      });

      const { data, error } = await query;

      console.log('📊 Query result:', { data: data?.length || 0, error });

      if (error) {
        console.error('❌ Supabase error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        console.error('💥 Full error object:', error);
        console.error('Error type:', typeof error);
        console.error('Error keys:', Object.keys(error || {}));
        return;
      }

      console.log('✅ Successfully loaded attendance:', data?.length || 0, 'records');
      setAttendance(data || []);
    } catch (error: any) {
      console.error('💥 Full error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(hours: number | null): string {
    if (hours === null) return '—';
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  }

  function formatDateTime(dateString: string | null): string {
    if (!dateString) return '—';
    try {
      return formatDate(new Date(dateString), 'd MMM yyyy, HH:mm');
    } catch (e) {
      return 'Invalid Date';
    }
  }

  const isManager = profile?.app_role && ['manager', 'general_manager', 'admin', 'owner'].includes(profile.app_role.toLowerCase());

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            {/* <Clock className="w-8 h-8 text-module-fg" /> */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-theme-primary">Attendance Register</h1>
          </div>
          <p className="text-theme-tertiary text-sm sm:text-base">View clock-in and clock-out records</p>
        </div>

        {/* Filters */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Time Filter */}
            <div>
              <label className="block text-sm text-theme-secondary mb-2">Time Period</label>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'today', 'week', 'month', 'custom'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilter(f);
                      if (f !== 'custom') {
                        setStartDate('');
                        setEndDate('');
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filter === f
                        ? 'bg-transparent text-module-fg border border-module-fg shadow-[0_0_12px_rgba(var(--module-fg),0.7)]'
                        : 'bg-transparent border border-white/[0.1] text-theme-secondary hover:border-white/[0.2] hover:text-white'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              
              {/* Custom Date Range */}
              {filter === 'custom' && (
                <div className="flex gap-4 mt-3 flex-wrap">
                  <div>
                    <label className="block text-xs text-theme-tertiary mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-module-fg/[0.50] focus:border-module-fg/[0.50] transition-all hover:border-white/[0.2]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-theme-tertiary mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-module-fg/[0.50] focus:border-module-fg/[0.50] transition-all hover:border-white/[0.2]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Site Filter */}
            {isManager && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-theme-secondary mb-2">Site</label>
                <select
                  value={selectedSiteId || ''}
                  onChange={(e) => setSelectedSiteId(e.target.value || null)}
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-module-fg/[0.50] focus:border-module-fg/[0.50] transition-all hover:border-white/[0.2]"
                >
                  <option value="" className="bg-[rgb(var(--surface-elevated))]">All Sites</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id} className="bg-[rgb(var(--surface-elevated))]">
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* User Filter */}
            {isManager && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-theme-secondary mb-2">Staff Member</label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(e.target.value || null)}
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-module-fg/[0.50] focus:border-module-fg/[0.50] transition-all hover:border-white/[0.2]"
                >
                  <option value="" className="bg-[rgb(var(--surface-elevated))]">All Staff</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id} className="bg-[rgb(var(--surface-elevated))]">
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Refresh Button */}
            <div className="flex items-end">
              <button
                onClick={loadAttendance}
                className="px-4 py-2 bg-transparent text-module-fg border border-module-fg rounded-lg hover:shadow-[0_0_12px_rgba(var(--module-fg),0.7)] transition-all whitespace-nowrap"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-module-fg border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-theme-tertiary">Loading attendance records...</p>
            </div>
          ) : attendance.length === 0 ? (
            <div className="p-12 text-center text-theme-tertiary">
              {/* <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" /> */}
              <p>No attendance records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.05] border-b border-white/[0.06]">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Date</th>
                    {isManager && (
                      <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Staff</th>
                    )}
                    <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Site</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Clock In</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Clock Out</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Duration</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => {
                    if (!record || !record.id) return null;
                    return (
                      <tr
                        key={record.id}
                        className="border-b border-white/[0.05] hover:bg-white/[0.05] transition-colors"
                      >
                        <td className="py-3 px-4 text-theme-secondary text-sm">
                          {record.clock_in_time ? formatDate(new Date(record.clock_in_time), 'd MMM yyyy') : '—'}
                        </td>
                        {isManager && (
                          <td className="py-3 px-4 text-theme-secondary text-sm">
                            <div className="flex items-center gap-2">
                              {record.profiles?.full_name || 'Unknown'}
                            </div>
                          </td>
                        )}
                        <td className="py-3 px-4 text-theme-secondary text-sm">
                          <div className="flex items-center gap-2">
                            {record.sites?.name || 'Unknown Site'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-theme-secondary text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-green-500">●</span>
                            {formatDateTime(record.clock_in_time)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-theme-secondary text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-orange-500">●</span>
                            {formatDateTime(record.clock_out_time)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-theme-secondary text-sm font-mono">
                          {formatDuration(record.total_hours)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              record.shift_status === 'on_shift'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-white/10 text-theme-tertiary border border-white/20'
                            }`}
                          >
                            {record.shift_status === 'on_shift' ? 'On Shift' : 'Completed'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {!loading && attendance.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-4">
              <div className="text-theme-tertiary text-sm mb-1">Total Records</div>
              <div className="text-2xl font-bold text-theme-primary">{attendance.length}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-4">
              <div className="text-theme-tertiary text-sm mb-1">Active Shifts</div>
              <div className="text-2xl font-bold text-green-400">
                {attendance.filter((r) => r.shift_status === 'on_shift').length}
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-4">
              <div className="text-theme-tertiary text-sm mb-1">Total Hours</div>
              <div className="text-2xl font-bold text-theme-primary">
                {formatDuration(
                  attendance
                    .filter((r) => r.total_hours !== null)
                    .reduce((sum, r) => sum + (r.total_hours || 0), 0)
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

