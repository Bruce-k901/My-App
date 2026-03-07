'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download } from '@/components/ui/icons';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { format as formatDate } from 'date-fns';

interface BluePlasterRecord {
  id: string;
  completed_at: string;
  completed_by: string | null;
  site_id: string;
  completion_notes: string | null;
  // Parsed from completion_notes
  fields: {
    person_name?: string;
    incident_date?: string;
    incident_time?: string;
    injury_description?: string;
    body_location?: string;
    plaster_type?: string;
    applied_by_name?: string;
    removal_replacement_time?: string;
    notes?: string;
  };
  completed_by_profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
  site?: {
    name: string;
  } | null;
}

function parseCompletionFields(completionNotes: string | null): BluePlasterRecord['fields'] {
  if (!completionNotes) return {};
  try {
    const parsed = JSON.parse(completionNotes);
    const cfv = parsed?.custom_field_values || {};
    return {
      person_name: cfv.person_name || '',
      incident_date: cfv.incident_date || '',
      incident_time: cfv.incident_time || '',
      injury_description: cfv.injury_description || '',
      body_location: cfv.body_location || '',
      plaster_type: cfv.plaster_type || '',
      applied_by_name: cfv.applied_by_name || '',
      removal_replacement_time: cfv.removal_replacement_time || '',
      notes: cfv.notes || '',
    };
  } catch {
    return {};
  }
}

export default function BluePlasterRegisterPage() {
  const { profile, companyId, siteId } = useAppContext();
  const [records, setRecords] = useState<BluePlasterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);
  const [exporting, setExporting] = useState(false);

  const loadRecords = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Find the blue plaster template
      const { data: template } = await supabase
        .from('task_templates')
        .select('id')
        .eq('slug', 'blue_plaster_record')
        .maybeSingle();

      if (!template) {
        // Template not found — may not be migrated yet
        setRecords([]);
        setLoading(false);
        return;
      }

      // 2. Calculate date range
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
          if (startDate) {
            startDateFilter = new Date(startDate);
            startDateFilter.setHours(0, 0, 0, 0);
          } else {
            startDateFilter = new Date(0);
          }
          break;
        default:
          startDateFilter = new Date(0);
      }

      // 3. Query completed blue plaster tasks
      let query = supabase
        .from('checklist_tasks')
        .select('id, completed_at, completed_by, site_id, completion_notes')
        .eq('company_id', companyId)
        .eq('template_id', template.id)
        .eq('status', 'completed')
        .gte('completed_at', startDateFilter.toISOString());

      if (filter === 'custom' && endDate) {
        const endDateFilter = new Date(endDate);
        endDateFilter.setHours(23, 59, 59, 999);
        query = query.lte('completed_at', endDateFilter.toISOString());
      }

      if (selectedSiteId) {
        query = query.eq('site_id', selectedSiteId);
      }

      query = query.order('completed_at', { ascending: false }).limit(500);

      const { data: tasks, error } = await query;

      if (error) {
        console.error('Failed to load blue plaster records:', error);
        setRecords([]);
        return;
      }

      if (!tasks || tasks.length === 0) {
        setRecords([]);
        return;
      }

      // 4. Get unique profile IDs and site IDs for enrichment
      const profileIds = [...new Set(tasks.map(t => t.completed_by).filter(Boolean))] as string[];
      const siteIds = [...new Set(tasks.map(t => t.site_id).filter(Boolean))] as string[];

      const [profilesResult, sitesResult] = await Promise.all([
        profileIds.length > 0
          ? supabase.from('profiles').select('id, full_name, email').in('id', profileIds)
          : { data: [] },
        siteIds.length > 0
          ? supabase.from('sites').select('id, name').in('id', siteIds)
          : { data: [] },
      ]);

      const profilesMap = new Map((profilesResult.data || []).map(p => [p.id, p]));
      const sitesMap = new Map((sitesResult.data || []).map(s => [s.id, s]));

      // 5. Build records with parsed fields
      const enriched: BluePlasterRecord[] = tasks.map(task => ({
        id: task.id,
        completed_at: task.completed_at || '',
        completed_by: task.completed_by,
        site_id: task.site_id,
        completion_notes: task.completion_notes,
        fields: parseCompletionFields(task.completion_notes),
        completed_by_profile: task.completed_by ? profilesMap.get(task.completed_by) || null : null,
        site: task.site_id ? sitesMap.get(task.site_id) || null : null,
      }));

      setRecords(enriched);
    } catch (err) {
      console.error('Error loading blue plaster records:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, filter, selectedSiteId, startDate, endDate]);

  useEffect(() => {
    if (companyId) {
      loadSites();
      loadRecords();
    }
  }, [companyId, loadRecords]);

  async function loadSites() {
    if (!companyId) return;
    const { data } = await supabase
      .from('sites')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name');
    if (data) setSites(data);
  }

  function exportCsv() {
    if (records.length === 0) return;
    setExporting(true);

    try {
      const headers = [
        'Date',
        'Time',
        'Person',
        'Injury',
        'Body Location',
        'Plaster Type',
        'Applied By',
        'Removal/Replacement Time',
        'Notes',
        'Site',
        'Recorded By',
      ];

      const rows = records.map(r => [
        r.fields.incident_date || '',
        r.fields.incident_time || '',
        r.fields.person_name || '',
        r.fields.injury_description || '',
        r.fields.body_location || '',
        r.fields.plaster_type || '',
        r.fields.applied_by_name || '',
        r.fields.removal_replacement_time || '',
        (r.fields.notes || '').replace(/"/g, '""'),
        r.site?.name || '',
        r.completed_by_profile?.full_name || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blue_plaster_register_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const isManager = profile?.app_role && ['manager', 'general_manager', 'admin', 'owner'].includes(profile.app_role.toLowerCase());

  // Summary stats
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setMonth(now.getMonth() - 1);

  const thisWeekCount = records.filter(r => r.completed_at && new Date(r.completed_at) >= weekAgo).length;
  const thisMonthCount = records.filter(r => r.completed_at && new Date(r.completed_at) >= monthAgo).length;

  if (!companyId) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-theme-primary h-full">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-module-fg" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-theme-primary">Blue Plaster Register</h1>
          </div>
          <p className="text-theme-tertiary text-sm sm:text-base">
            Track blue plaster usage for SALSA compliance
          </p>
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
            {isManager && sites.length > 1 && (
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

            {/* Action buttons */}
            <div className="flex items-end gap-2">
              <button
                onClick={loadRecords}
                className="px-4 py-2 bg-transparent text-module-fg border border-module-fg rounded-lg hover:shadow-[0_0_12px_rgba(var(--module-fg),0.7)] transition-all whitespace-nowrap"
              >
                Refresh
              </button>
              {records.length > 0 && (
                <button
                  onClick={exportCsv}
                  disabled={exporting}
                  className="px-4 py-2 bg-transparent text-module-fg border border-module-fg rounded-lg hover:shadow-[0_0_12px_rgba(var(--module-fg),0.7)] transition-all whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-module-fg border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-theme-tertiary">Loading blue plaster records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-theme-tertiary">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No blue plaster records found</p>
              <p className="text-xs mt-2">Records will appear here once staff complete Blue Plaster tasks</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.05] border-b border-white/[0.06]">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Person</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Injury</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Body Location</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Plaster Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Applied By</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Removed / Replaced</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Notes</th>
                    {isManager && (
                      <th className="text-left py-3 px-4 text-sm font-semibold text-theme-secondary">Site</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-white/[0.05] hover:bg-white/[0.05] transition-colors"
                    >
                      <td className="py-3 px-4 text-theme-secondary text-sm whitespace-nowrap">
                        {record.fields.incident_date
                          ? formatDate(new Date(record.fields.incident_date + 'T00:00:00'), 'd MMM yyyy')
                          : record.completed_at
                            ? formatDate(new Date(record.completed_at), 'd MMM yyyy')
                            : '-'}
                      </td>
                      <td className="py-3 px-4 text-theme-secondary text-sm whitespace-nowrap">
                        {record.fields.incident_time || '-'}
                      </td>
                      <td className="py-3 px-4 text-theme-primary text-sm font-medium">
                        {record.fields.person_name || '-'}
                      </td>
                      <td className="py-3 px-4 text-theme-secondary text-sm max-w-[200px] truncate" title={record.fields.injury_description}>
                        {record.fields.injury_description || '-'}
                      </td>
                      <td className="py-3 px-4 text-theme-secondary text-sm">
                        {record.fields.body_location || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {record.fields.plaster_type ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            record.fields.plaster_type === 'Blue Metal-Detectable'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-white/10 text-theme-tertiary border border-white/20'
                          }`}>
                            {record.fields.plaster_type}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-theme-secondary text-sm">
                        {record.fields.applied_by_name || '-'}
                      </td>
                      <td className="py-3 px-4 text-theme-secondary text-sm whitespace-nowrap">
                        {record.fields.removal_replacement_time || '-'}
                      </td>
                      <td className="py-3 px-4 text-theme-tertiary text-sm max-w-[150px] truncate" title={record.fields.notes}>
                        {record.fields.notes || '-'}
                      </td>
                      {isManager && (
                        <td className="py-3 px-4 text-theme-secondary text-sm">
                          {record.site?.name || '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {!loading && records.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-4">
              <div className="text-theme-tertiary text-sm mb-1">Total Records</div>
              <div className="text-2xl font-bold text-theme-primary">{records.length}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-4">
              <div className="text-theme-tertiary text-sm mb-1">This Week</div>
              <div className="text-2xl font-bold text-theme-primary">{thisWeekCount}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-4">
              <div className="text-theme-tertiary text-sm mb-1">This Month</div>
              <div className="text-2xl font-bold text-theme-primary">{thisMonthCount}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
