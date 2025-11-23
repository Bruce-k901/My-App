'use client';

import React, { useState, useEffect } from 'react';
// Temporarily removing icons to debug
// import { Clock, MapPin, User, CheckCircle, XCircle } from 'lucide-react';
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
      <div className="min-h-screen bg-[#0B0D13] p-6 flex items-center justify-center">
        <div className="text-white">Loading...</div>
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
        query = query.eq('user_id', selectedUserId);
      } else if (profile?.app_role === 'Staff') {
        // Staff can only see their own records
        query = query.eq('user_id', profile.id);
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

  const isManager = profile?.app_role && ['Manager', 'General Manager', 'Admin', 'Owner'].includes(profile.app_role);

  return (
    <div className="min-h-screen bg-[#0B0D13] p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-2">
            {/* <Clock className="w-8 h-8 text-pink-500" /> */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Attendance Register</h1>
          </div>
          <p className="text-sm sm:text-base text-white/60">View clock-in and clock-out records</p>
        </div>

        {/* Filters */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Time Filter */}
            <div className="w-full sm:flex-1">
              <label className="block text-xs sm:text-sm text-white/80 mb-2">Time Period</label>
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
                    className={`min-h-[44px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all touch-manipulation ${
                      filter === f
                        ? 'bg-transparent text-[#EC4899] border border-[#EC4899] shadow-[0_0_12px_rgba(236,72,153,0.7)]'
                        : 'bg-transparent border border-white/[0.1] text-white/80 hover:border-white/[0.2] hover:text-white active:bg-white/[0.05]'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              
              {/* Custom Date Range */}
              {filter === 'custom' && (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-3">
                  <div className="flex-1">
                    <label className="block text-xs text-white/60 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full min-h-[44px] bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 focus:border-[#EC4899]/50 transition-all hover:border-white/[0.2] touch-manipulation"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-white/60 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full min-h-[44px] bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 focus:border-[#EC4899]/50 transition-all hover:border-white/[0.2] touch-manipulation"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Site Filter */}
            {isManager && (
              <div className="w-full sm:flex-1 sm:min-w-[200px]">
                <label className="block text-xs sm:text-sm text-white/80 mb-2">Site</label>
                <select
                  value={selectedSiteId || ''}
                  onChange={(e) => setSelectedSiteId(e.target.value || null)}
                  className="w-full min-h-[44px] bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 focus:border-[#EC4899]/50 transition-all hover:border-white/[0.2] touch-manipulation"
                >
                  <option value="" className="bg-[#0B0D13]">All Sites</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id} className="bg-[#0B0D13]">
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* User Filter */}
            {isManager && (
              <div className="w-full sm:flex-1 sm:min-w-[200px]">
                <label className="block text-xs sm:text-sm text-white/80 mb-2">Staff Member</label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(e.target.value || null)}
                  className="w-full min-h-[44px] bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 focus:border-[#EC4899]/50 transition-all hover:border-white/[0.2] touch-manipulation"
                >
                  <option value="" className="bg-[#0B0D13]">All Staff</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id} className="bg-[#0B0D13]">
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Refresh Button */}
            <div className="flex items-end w-full sm:w-auto">
              <button
                onClick={loadAttendance}
                className="w-full sm:w-auto min-h-[44px] px-4 sm:px-6 py-2.5 sm:py-3 bg-transparent text-[#EC4899] border border-[#EC4899] rounded-lg hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] active:bg-[#EC4899]/10 transition-all whitespace-nowrap touch-manipulation text-sm sm:text-base"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Table - Desktop, Cards - Mobile */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-[#EC4899] border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-sm sm:text-base text-white/60">Loading attendance records...</p>
            </div>
          ) : attendance.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-white/60">
              {/* <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" /> */}
              <p className="text-sm sm:text-base">No attendance records found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/[0.05] border-b border-white/[0.06]">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Date</th>
                      {isManager && (
                        <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Staff</th>
                      )}
                      <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Site</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Clock In</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Clock Out</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Duration</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Status</th>
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
                          <td className="py-3 px-4 text-white/80 text-sm">
                            {record.clock_in_time ? formatDate(new Date(record.clock_in_time), 'd MMM yyyy') : '—'}
                          </td>
                          {isManager && (
                            <td className="py-3 px-4 text-white/80 text-sm">
                              <div className="flex items-center gap-2">
                                {record.profiles?.full_name || 'Unknown'}
                              </div>
                            </td>
                          )}
                          <td className="py-3 px-4 text-white/80 text-sm">
                            <div className="flex items-center gap-2">
                              {record.sites?.name || 'Unknown Site'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-white/80 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-green-500">●</span>
                              {formatDateTime(record.clock_in_time)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-white/80 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-orange-500">●</span>
                              {formatDateTime(record.clock_out_time)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-white/80 text-sm font-mono">
                            {formatDuration(record.total_hours)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                record.shift_status === 'on_shift'
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : 'bg-white/10 text-white/60 border border-white/20'
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

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3 p-3">
                {attendance.map((record) => {
                  if (!record || !record.id) return null;
                  return (
                    <div
                      key={record.id}
                      className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-white font-semibold text-sm mb-1">
                            {record.clock_in_time ? formatDate(new Date(record.clock_in_time), 'd MMM yyyy') : '—'}
                          </div>
                          {isManager && (
                            <div className="text-white/80 text-xs mb-1">
                              {record.profiles?.full_name || 'Unknown'}
                            </div>
                          )}
                          <div className="text-white/60 text-xs">
                            {record.sites?.name || 'Unknown Site'}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            record.shift_status === 'on_shift'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-white/10 text-white/60 border border-white/20'
                          }`}
                        >
                          {record.shift_status === 'on_shift' ? 'On Shift' : 'Completed'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.1]">
                        <div>
                          <div className="text-xs text-white/60 mb-1">Clock In</div>
                          <div className="flex items-center gap-1.5 text-sm text-white/80">
                            <span className="text-green-500">●</span>
                            {formatDateTime(record.clock_in_time)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-white/60 mb-1">Clock Out</div>
                          <div className="flex items-center gap-1.5 text-sm text-white/80">
                            <span className="text-orange-500">●</span>
                            {formatDateTime(record.clock_out_time)}
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-white/[0.1]">
                        <div className="text-xs text-white/60 mb-1">Duration</div>
                        <div className="text-base font-mono text-white">{formatDuration(record.total_hours)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Summary Stats */}
        {!loading && attendance.length > 0 && (
          <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-4">
              <div className="text-white/60 text-xs sm:text-sm mb-1">Total Records</div>
              <div className="text-xl sm:text-2xl font-bold text-white">{attendance.length}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-4">
              <div className="text-white/60 text-xs sm:text-sm mb-1">Active Shifts</div>
              <div className="text-xl sm:text-2xl font-bold text-green-400">
                {attendance.filter((r) => r.shift_status === 'on_shift').length}
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-4">
              <div className="text-white/60 text-xs sm:text-sm mb-1">Total Hours</div>
              <div className="text-xl sm:text-2xl font-bold text-white">
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

