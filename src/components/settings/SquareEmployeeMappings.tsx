'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  Users,
  RefreshCw,
} from '@/components/ui/icons';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface EmployeeMapping {
  id: string;
  pos_team_member_id: string;
  pos_team_member_name: string | null;
  profile_id: string | null;
  match_method: string;
  is_active: boolean;
  site_id: string | null;
  updated_at: string;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface SquareEmployeeMappingsProps {
  companyId: string;
  siteId: string;
}

export function SquareEmployeeMappings({ companyId, siteId }: SquareEmployeeMappingsProps) {
  const [mappings, setMappings] = useState<EmployeeMapping[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoMatching, setAutoMatching] = useState(false);

  useEffect(() => {
    loadData();
  }, [companyId]);

  async function loadData() {
    setLoading(true);
    try {
      const [mappingsRes, profilesRes] = await Promise.all([
        fetch(`/api/integrations/square/labor/match?companyId=${companyId}`),
        supabase.from('profiles').select('id, first_name, last_name').eq('company_id', companyId),
      ]);

      const mappingsData = await mappingsRes.json();
      if (mappingsData.data) setMappings(mappingsData.data);

      if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    } catch {
      console.error('Failed to load employee mappings');
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoMatch() {
    setAutoMatching(true);
    try {
      const res = await fetch('/api/integrations/square/labor/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, siteId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `${data.result.matched} matched, ${data.result.unmatched} unmatched of ${data.result.total} team members`,
        );
        loadData();
      } else {
        toast.error(data.error || 'Auto-match failed');
      }
    } catch {
      toast.error('Auto-match failed');
    } finally {
      setAutoMatching(false);
    }
  }

  async function handleManualMatch(mappingId: string, profileId: string | null) {
    try {
      const res = await fetch('/api/integrations/square/labor/match', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappingId, profileId: profileId || null }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Mapping updated');
        setMappings((prev) =>
          prev.map((m) =>
            m.id === mappingId
              ? { ...m, profile_id: profileId || null, match_method: profileId ? 'manual' : 'unmatched' }
              : m,
          ),
        );
      } else {
        toast.error(data.error || 'Failed to update');
      }
    } catch {
      toast.error('Failed to update mapping');
    }
  }

  const matched = mappings.filter((m) => m.profile_id);
  const unmatched = mappings.filter((m) => !m.profile_id);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading team members...
      </div>
    );
  }

  return (
    <div className="border border-theme rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.02] border-b border-theme">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary" />
          <span className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
            Employee Mappings
          </span>
          {mappings.length > 0 && (
            <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
              {matched.length}/{mappings.length} mapped
            </span>
          )}
        </div>
        <button
          onClick={handleAutoMatch}
          disabled={autoMatching}
          className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-1"
        >
          {autoMatching ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Auto-Match
        </button>
      </div>

      {/* Empty state */}
      {mappings.length === 0 && (
        <div className="p-4 text-center text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
          No team members found. Click Auto-Match to fetch Square team members.
        </div>
      )}

      {/* Mapping rows */}
      {mappings.length > 0 && (
        <div className="divide-y divide-white/[0.06]">
          {mappings.map((mapping) => (
            <div
              key={mapping.id}
              className="flex items-center justify-between p-3 gap-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                {mapping.profile_id ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-[rgb(var(--text-primary))] dark:text-white truncate">
                    {mapping.pos_team_member_name || mapping.pos_team_member_id}
                  </p>
                  <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
                    {mapping.match_method === 'auto_name'
                      ? 'Auto-matched'
                      : mapping.match_method === 'manual'
                        ? 'Manually mapped'
                        : 'Unmatched'}
                  </p>
                </div>
              </div>

              <select
                value={mapping.profile_id || ''}
                onChange={(e) => handleManualMatch(mapping.id, e.target.value || null)}
                className="text-xs bg-theme-surface-elevated border border-theme rounded px-2 py-1 text-[rgb(var(--text-primary))] dark:text-white min-w-[140px]"
              >
                <option value="">— Unmapped —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Stats footer */}
      {mappings.length > 0 && unmatched.length > 0 && (
        <div className="p-2 bg-amber-50/50 dark:bg-amber-900/5 border-t border-theme text-xs text-amber-700 dark:text-amber-400 text-center">
          {unmatched.length} team member{unmatched.length !== 1 ? 's' : ''} still unmapped — their timecards won&apos;t sync
        </div>
      )}
    </div>
  );
}
