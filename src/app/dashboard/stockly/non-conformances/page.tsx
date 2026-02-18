// @salsa - SALSA Compliance: Non-conformance register list page
'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { NonConformance, NonConformanceStatus, NonConformanceCategory, NonConformanceSeverity } from '@/lib/types/stockly';
import NonConformanceStatusBadge from '@/components/stockly/NonConformanceStatusBadge';
import NonConformanceForm from '@/components/stockly/NonConformanceForm';
import { Plus } from '@/components/ui/icons';
import Link from 'next/link';

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'corrective_action', label: 'Corrective Action' },
  { value: 'verification', label: 'Verification' },
  { value: 'closed', label: 'Closed' },
];

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'hygiene', label: 'Hygiene' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'allergen', label: 'Allergen' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'traceability', label: 'Traceability' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'labelling', label: 'Labelling' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Severities' },
  { value: 'minor', label: 'Minor' },
  { value: 'major', label: 'Major' },
  { value: 'critical', label: 'Critical' },
];

const SEVERITY_BADGE_CLASSES: Record<NonConformanceSeverity, string> = {
  minor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  major: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function NonConformancesPage() {
  const { companyId, siteId, user } = useAppContext();
  const [ncs, setNcs] = useState<NonConformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // @salsa — Fetch non-conformances
  useEffect(() => {
    if (!companyId) return;
    const fetchNCs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (categoryFilter !== 'all') params.append('category', categoryFilter);
        if (severityFilter !== 'all') params.append('severity', severityFilter);
        if (siteId && siteId !== 'all') params.append('site_id', siteId);

        const res = await fetch(`/api/stockly/non-conformances?${params}`);
        const result = await res.json();
        if (result.success) setNcs(result.data || []);
      } catch (err) {
        console.error('Failed to fetch non-conformances:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNCs();
  }, [companyId, siteId, statusFilter, categoryFilter, severityFilter]);

  // @salsa — Create new non-conformance
  const handleCreate = async (data: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/stockly/non-conformances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          site_id: siteId !== 'all' ? siteId : null,
          raised_by: user?.id || null,
          ...data,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setNcs(prev => [result.data, ...prev]);
        setShowForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // @salsa — Calculate days open
  const getDaysOpen = (nc: NonConformance) => {
    const start = new Date(nc.raised_at);
    const end = nc.closed_at ? new Date(nc.closed_at) : new Date();
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Non-Conformance Register</h1>
          <p className="text-sm text-theme-tertiary mt-1">Track and manage food safety non-conformances</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-stockly-dark dark:bg-stockly text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Non-Conformance
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 p-4 bg-theme-surface border border-theme rounded-xl">
          <h2 className="text-lg font-semibold text-theme-primary mb-4">Raise Non-Conformance</h2>
          <NonConformanceForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} loading={submitting} />
        </div>
      )}

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === tab.value
                ? 'bg-stockly-dark/10 dark:bg-stockly/10 text-stockly-dark dark:text-stockly font-medium'
                : 'text-theme-tertiary hover:text-theme-secondary hover:bg-theme-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-theme-surface border border-theme rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
        >
          {CATEGORY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-theme-surface border border-theme rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
        >
          {SEVERITY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-theme-surface border border-theme rounded-lg animate-pulse" />
          ))}
        </div>
      ) : ncs.length === 0 ? (
        <div className="text-center py-12 text-theme-tertiary">
          <p>No non-conformances found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-theme text-left">
                <th className="pb-3 font-medium text-theme-secondary">NC Code</th>
                <th className="pb-3 font-medium text-theme-secondary">Title</th>
                <th className="pb-3 font-medium text-theme-secondary">Category</th>
                <th className="pb-3 font-medium text-theme-secondary">Severity</th>
                <th className="pb-3 font-medium text-theme-secondary">Status</th>
                <th className="pb-3 font-medium text-theme-secondary">Raised</th>
                <th className="pb-3 font-medium text-theme-secondary">Due</th>
                <th className="pb-3 font-medium text-theme-secondary text-right">Days Open</th>
              </tr>
            </thead>
            <tbody>
              {ncs.map(nc => {
                const isOverdue = nc.corrective_action_due && nc.corrective_action_due < todayStr && nc.status !== 'closed' && nc.status !== 'verification';
                return (
                  <tr key={nc.id} className="border-b border-theme/50 hover:bg-theme-surface/50 transition-colors">
                    <td className="py-3">
                      <Link
                        href={`/dashboard/stockly/non-conformances/${nc.id}`}
                        className="text-stockly-dark dark:text-stockly font-medium hover:underline"
                      >
                        {nc.nc_code}
                      </Link>
                    </td>
                    <td className="py-3 text-theme-primary max-w-xs truncate">{nc.title}</td>
                    <td className="py-3 text-theme-tertiary capitalize">{nc.category.replace(/_/g, ' ')}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_BADGE_CLASSES[nc.severity]}`}>
                        {nc.severity.charAt(0).toUpperCase() + nc.severity.slice(1)}
                      </span>
                    </td>
                    <td className="py-3">
                      <NonConformanceStatusBadge status={nc.status} />
                    </td>
                    <td className="py-3 text-theme-tertiary">{new Date(nc.raised_at).toLocaleDateString()}</td>
                    <td className="py-3">
                      {nc.corrective_action_due ? (
                        <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-theme-tertiary'}>
                          {new Date(nc.corrective_action_due).toLocaleDateString()}
                          {isOverdue && ' (overdue)'}
                        </span>
                      ) : (
                        <span className="text-theme-tertiary">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right text-theme-secondary">{getDaysOpen(nc)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
