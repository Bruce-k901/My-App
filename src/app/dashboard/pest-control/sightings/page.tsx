'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import EntityPageLayout from '@/components/layouts/EntityPageLayout';
import SightingFormModal from '@/components/pest-control/SightingFormModal';
import { Bug, Check, AlertTriangle, Clock, MapPin, Calendar, Eye, Send, Loader2 } from '@/components/ui/icons';

type FilterTab = 'all' | 'unresolved' | 'resolved';
type SeverityFilter = 'all' | 'low' | 'medium' | 'high' | 'critical';

export default function PestSightingsPage() {
  const { companyId, siteId } = useAppContext();
  const [sightings, setSightings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSighting, setEditingSighting] = useState<any>(null);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) fetchSightings();
  }, [companyId, siteId]);

  async function fetchSightings() {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('pest_sightings')
        .select('*')
        .eq('company_id', companyId)
        .order('sighting_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        if ((fetchError as any).code === '42P01') {
          // Table doesn't exist yet - show empty state
          setSightings([]);
          setError(null);
          return;
        }
        throw fetchError;
      }

      setSightings(data || []);
    } catch (err: any) {
      if ((err as any).code === '42P01') {
        setSightings([]);
        setError(null);
      } else {
        console.error('Error fetching sightings:', err);
        setError(err.message || 'Failed to load sightings');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkResolved(id: string) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('pest_sightings')
        .update({ resolved: true, resolved_date: today })
        .eq('id', id);

      if (error) throw error;
      toast.success('Sighting marked as resolved');
      fetchSightings();
    } catch (err: any) {
      console.error('Error resolving sighting:', err);
      toast.error(err.message || 'Failed to resolve sighting');
    }
  }

  function handleEdit(sighting: any) {
    setEditingSighting(sighting);
    setModalOpen(true);
  }

  function handleAddNew() {
    setEditingSighting(null);
    setModalOpen(true);
  }

  async function handleNotifyContractor(sightingId: string) {
    try {
      setNotifyingId(sightingId);
      const response = await fetch('/api/pest-control/notify-contractor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sightingId, companyId, siteId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to notify contractor');
      }

      if (result.skipped) {
        toast.info(`Email not configured — sighting marked as notified (${result.contractorName})`);
      } else {
        toast.success(`Notification sent to ${result.contractorName} (${result.contractorEmail})`);
      }
      fetchSightings();
    } catch (err: any) {
      console.error('Error notifying contractor:', err);
      toast.error(err.message || 'Failed to notify contractor');
    } finally {
      setNotifyingId(null);
    }
  }

  // Client-side filtering
  const filtered = sightings.filter(s => {
    // Tab filter
    if (filterTab === 'unresolved' && s.resolved) return false;
    if (filterTab === 'resolved' && !s.resolved) return false;

    // Severity filter
    if (severityFilter !== 'all' && s.severity !== severityFilter) return false;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      const pestType = (s.pest_type || '').toLowerCase().replace(/_/g, ' ');
      const location = (s.location_area || '').toLowerCase();
      const evidence = (s.evidence_type || '').toLowerCase().replace(/_/g, ' ');
      if (!pestType.includes(q) && !location.includes(q) && !evidence.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Counts for tabs
  const unresolvedCount = sightings.filter(s => !s.resolved).length;
  const resolvedCount = sightings.filter(s => s.resolved).length;

  if (loading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-6">
        <p className="text-theme-secondary text-center py-12">Loading pest sightings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-theme-secondary">{error}</p>
          <button
            onClick={fetchSightings}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium text-theme-secondary border border-theme hover:bg-theme-hover transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <EntityPageLayout
        title="Pest Sightings"
        onSearch={setSearch}
        searchPlaceholder="Search pest type, location, evidence..."
        onAdd={handleAddNew}
      >
        {/* Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-1 bg-theme-surface rounded-lg border border-theme p-1">
            <TabButton active={filterTab === 'all'} onClick={() => setFilterTab('all')}>
              All ({sightings.length})
            </TabButton>
            <TabButton active={filterTab === 'unresolved'} onClick={() => setFilterTab('unresolved')}>
              Unresolved ({unresolvedCount})
            </TabButton>
            <TabButton active={filterTab === 'resolved'} onClick={() => setFilterTab('resolved')}>
              Resolved ({resolvedCount})
            </TabButton>
          </div>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as SeverityFilter)}
            className="h-9 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary"
          >
            <option value="all">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-theme-surface rounded-xl border border-theme">
            <Bug className="w-10 h-10 text-theme-tertiary mx-auto mb-3" />
            <p className="text-theme-secondary text-sm">
              {sightings.length === 0
                ? 'No pest sightings logged yet. Click + to log the first sighting.'
                : 'No sightings match your current filters.'}
            </p>
          </div>
        )}

        {/* Desktop Table */}
        {filtered.length > 0 && (
          <div className="hidden md:block bg-theme-surface rounded-xl border border-theme overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme">
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">Pest Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">Evidence</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">Severity</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">Qty</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">Reported By</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-theme-hover transition-colors">
                      <td className="px-4 py-3 text-theme-primary whitespace-nowrap">
                        {formatDate(s.sighting_date)}
                        {s.sighting_time && (
                          <span className="text-theme-tertiary ml-1 text-xs">{s.sighting_time.slice(0, 5)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-theme-primary capitalize whitespace-nowrap">
                        {(s.pest_type || '').replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-theme-secondary capitalize whitespace-nowrap">
                        {(s.evidence_type || '-').replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-theme-primary max-w-[180px] truncate" title={s.location_area}>
                        {s.location_area}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <SeverityBadge severity={s.severity} />
                      </td>
                      <td className="px-4 py-3 text-theme-secondary capitalize whitespace-nowrap">
                        {(s.quantity_estimate || '-').replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ResolvedBadge resolved={s.resolved} />
                      </td>
                      <td className="px-4 py-3 text-theme-secondary whitespace-nowrap text-xs">
                        {s.reported_by_name || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(s)}
                            className="text-theme-tertiary hover:text-theme-primary transition-colors"
                            title="View / Edit"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!s.resolved && !s.contractor_notified && (
                            <button
                              onClick={() => handleNotifyContractor(s.id)}
                              disabled={notifyingId === s.id}
                              className="text-[#D37E91] hover:text-[#D37E91]/80 transition-colors disabled:opacity-50"
                              title="Notify Contractor"
                            >
                              {notifyingId === s.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {s.contractor_notified && (
                            <span className="text-[#D37E91]/60" title="Contractor notified">
                              <Send className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {!s.resolved && (
                            <button
                              onClick={() => handleMarkResolved(s.id)}
                              className="text-emerald-500 hover:text-emerald-400 transition-colors"
                              title="Mark as Resolved"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mobile Cards */}
        {filtered.length > 0 && (
          <div className="md:hidden space-y-3">
            {filtered.map(s => (
              <div
                key={s.id}
                className="bg-theme-surface rounded-xl border border-theme p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-theme-primary font-medium capitalize text-sm">
                      {(s.pest_type || '').replace(/_/g, ' ')}
                    </span>
                    <SeverityBadge severity={s.severity} />
                  </div>
                  <ResolvedBadge resolved={s.resolved} />
                </div>

                <div className="flex items-center gap-4 text-xs text-theme-secondary">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(s.sighting_date)}
                    {s.sighting_time && ` ${s.sighting_time.slice(0, 5)}`}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {s.location_area}
                  </span>
                </div>

                {s.evidence_type && (
                  <p className="text-xs text-theme-tertiary capitalize">
                    Evidence: {s.evidence_type.replace(/_/g, ' ')}
                  </p>
                )}

                {s.immediate_action_taken && (
                  <p className="text-xs text-theme-secondary line-clamp-2">
                    Action: {s.immediate_action_taken}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-theme-tertiary">
                    {s.reported_by_name || 'Unknown'}
                    {s.contractor_notified && (
                      <span className="ml-2 text-[#D37E91]/70 inline-flex items-center gap-0.5">
                        <Send className="w-3 h-3" /> Notified
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {!s.resolved && !s.contractor_notified && (
                      <button
                        onClick={() => handleNotifyContractor(s.id)}
                        disabled={notifyingId === s.id}
                        className="px-3 py-1 rounded-md text-xs text-[#D37E91] border border-[#D37E91]/30 hover:bg-[#D37E91]/10 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {notifyingId === s.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        Notify
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(s)}
                      className="px-3 py-1 rounded-md text-xs text-theme-secondary border border-theme hover:bg-theme-hover transition-colors"
                    >
                      View
                    </button>
                    {!s.resolved && (
                      <button
                        onClick={() => handleMarkResolved(s.id)}
                        className="px-3 py-1 rounded-md text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </EntityPageLayout>

      <SightingFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingSighting(null);
        }}
        onSaved={fetchSightings}
        sighting={editingSighting}
      />
    </>
  );
}

// --- Helper components ---

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? 'bg-checkly-dark/10 dark:bg-checkly/10 text-checkly-dark dark:text-checkly'
          : 'text-theme-tertiary hover:text-theme-secondary'
      }`}
    >
      {children}
    </button>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, string> = {
    low: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    high: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 font-bold',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border capitalize ${config[severity] || config.low}`}>
      {severity}
    </span>
  );
}

function ResolvedBadge({ resolved }: { resolved: boolean }) {
  if (resolved) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
        Resolved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
      Open
    </span>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
