'use client';

import React, { useState, useEffect } from 'react';
// Temporarily removing icons to debug
// import { Clock, MapPin, User, CheckCircle, XCircle } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
// import { Button } from '@/components/ui';
import { format as formatDate } from 'date-fns';
import { parseLocationFromNotes, reverseGeocode } from '@/lib/geocoding';

// Component to display location/address
function LocationDisplay({ notes }: { notes: string | null }) {
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchAddress() {
      if (!notes) {
        setAddress('—');
        return;
      }

      // Try to parse location from notes
      const location = parseLocationFromNotes(notes);
      if (!location) {
        // No coordinates found, return notes as-is (might be regular notes)
        setAddress(notes);
        return;
      }

      // Reverse geocode the coordinates
      setLoading(true);
      try {
        const result = await reverseGeocode(location.lat, location.lng);
        if (result.address && !result.error) {
          setAddress(result.address);
        } else {
          // Fallback: return formatted coordinates
          setAddress(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        // Fallback: return formatted coordinates
        setAddress(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
      } finally {
        setLoading(false);
      }
    }

    fetchAddress();
  }, [notes]);

  if (loading) {
    return <span className="text-white/40">Loading address...</span>;
  }

  return (
    <div className="truncate" title={address}>
      {address || '—'}
    </div>
  );
}

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
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('week');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(siteId || null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(profile?.id || null);
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);

  // Hooks must be called unconditionally - move useEffect before early return
  useEffect(() => {
    if (companyId) {
      loadSites();
      loadUsers();
      loadAttendance();
    }
  }, [companyId, filter, selectedSiteId, selectedUserId]);

  // Safety check - ensure we have required context (after hooks)
  if (!companyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 flex items-center justify-center">
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

      // Calculate date range based on filter
      const now = new Date();
      let startDate: Date;
      
      switch (filter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
        default:
          startDate = new Date(0); // All time
      }

      let query = supabase
        .from('staff_attendance')
        .select(`
          *,
          profiles:user_id (full_name, email),
          sites:site_id (name)
        `)
        .eq('company_id', companyId)
        .gte('clock_in_time', startDate.toISOString())
        .order('clock_in_time', { ascending: false })
        .limit(100);

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

      const { data, error } = await query;

      if (error) {
        console.error('Error loading attendance:', error);
        return;
      }

      setAttendance(data || []);
    } catch (error) {
      console.error('Error loading attendance:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            {/* <Clock className="w-8 h-8 text-pink-500" /> */}
            <h1 className="text-3xl font-bold text-white">Attendance Register</h1>
          </div>
          <p className="text-white/60">View clock-in and clock-out records</p>
        </div>

        {/* Filters */}
        <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-4 mb-6 space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Time Filter */}
            <div>
              <label className="block text-sm text-white/80 mb-2">Time Period</label>
              <div className="flex gap-2">
                {(['all', 'today', 'week', 'month'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filter === f
                        ? 'bg-pink-500 text-white'
                        : 'bg-white/[0.06] text-white/80 hover:bg-white/[0.1]'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Site Filter */}
            {isManager && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-white/80 mb-2">Site</label>
                <select
                  value={selectedSiteId || ''}
                  onChange={(e) => setSelectedSiteId(e.target.value || null)}
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                >
                  <option value="">All Sites</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* User Filter */}
            {isManager && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-white/80 mb-2">Staff Member</label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(e.target.value || null)}
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                >
                  <option value="">All Staff</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
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
                className="px-4 py-2 bg-transparent text-white border border-white/[0.2] rounded-lg hover:border-pink-500/40 hover:bg-white/[0.05] transition-all whitespace-nowrap"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-white/60">Loading attendance records...</p>
            </div>
          ) : attendance.length === 0 ? (
            <div className="p-12 text-center text-white/60">
              {/* <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" /> */}
              <p>No attendance records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.05] border-b border-white/[0.1]">
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
                    <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Notes</th>
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
                        <td className="py-3 px-4 text-white/60 text-sm max-w-xs truncate">
                          {record.shift_notes || '—'}
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
              <div className="text-white/60 text-sm mb-1">Total Records</div>
              <div className="text-2xl font-bold text-white">{attendance.length}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-4">
              <div className="text-white/60 text-sm mb-1">Active Shifts</div>
              <div className="text-2xl font-bold text-green-400">
                {attendance.filter((r) => r.shift_status === 'on_shift').length}
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-4">
              <div className="text-white/60 text-sm mb-1">Total Hours</div>
              <div className="text-2xl font-bold text-white">
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

