// @salsa - SALSA Compliance: Recall detail page with tabs
'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import {
  Shield,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
} from '@/components/ui/icons';
import RecallAffectedBatchesPanel from '@/components/stockly/RecallAffectedBatchesPanel';
import RecallNotificationsPanel from '@/components/stockly/RecallNotificationsPanel';
import RecallReportView from '@/components/stockly/RecallReportView';
import type { Recall, RecallStatus } from '@/lib/types/stockly';

const STATUS_FLOW: RecallStatus[] = ['draft', 'active', 'investigating', 'notified', 'resolved', 'closed'];

const STATUS_LABELS: Record<RecallStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  investigating: 'Investigating',
  notified: 'Notified',
  resolved: 'Resolved',
  closed: 'Closed',
};

type TabType = 'overview' | 'batches' | 'notifications' | 'trace' | 'report';

export default function RecallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { companyId } = useAppContext();
  const [recall, setRecall] = useState<(Recall & { affected_batches?: any[]; notifications?: any[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('overview');
  const [updating, setUpdating] = useState(false);
  const [traceResults, setTraceResults] = useState<any>(null);
  const [tracing, setTracing] = useState(false);

  // Form state for investigation fields
  const [rootCause, setRootCause] = useState('');
  const [correctiveActions, setCorrectiveActions] = useState('');
  const [notes, setNotes] = useState('');

  const fetchRecall = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/stockly/recalls/${id}`);
    const json = await res.json();
    if (json.success) {
      setRecall(json.data);
      setRootCause(json.data.root_cause || '');
      setCorrectiveActions(json.data.corrective_actions || '');
      setNotes(json.data.notes || '');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchRecall(); }, [fetchRecall]);

  // @salsa — Update recall fields
  async function handleUpdate(fields: Record<string, any>) {
    setUpdating(true);
    const res = await fetch(`/api/stockly/recalls/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (res.ok) await fetchRecall();
    setUpdating(false);
  }

  // @salsa — Advance status
  async function handleStatusChange(newStatus: RecallStatus) {
    await handleUpdate({ status: newStatus });
  }

  // @salsa — Run trace
  async function handleTrace() {
    setTracing(true);
    const res = await fetch(`/api/stockly/recalls/${id}/trace`);
    const json = await res.json();
    if (json.success) setTraceResults(json.data);
    setTracing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-stockly-dark dark:text-stockly" />
      </div>
    );
  }

  if (!recall) {
    return (
      <div className="p-6 text-center">
        <p className="text-theme-secondary">Recall not found</p>
        <Link href="/dashboard/stockly/recalls" className="text-sm text-stockly-dark dark:text-stockly hover:underline mt-2 inline-block">
          Back to recalls
        </Link>
      </div>
    );
  }

  const currentStatusIdx = STATUS_FLOW.indexOf(recall.status);
  const nextStatus = currentStatusIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentStatusIdx + 1] : null;

  // SALSA 3-day notification check
  const daysSinceInitiated = recall.initiated_at
    ? Math.floor((new Date().getTime() - new Date(recall.initiated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const salsaOverdue = !recall.salsa_notified && recall.status !== 'draft' && daysSinceInitiated > 3;

  const tabs: { value: TabType; label: string }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'batches', label: `Affected Batches (${recall.affected_batches?.length || 0})` },
    { value: 'notifications', label: `Notifications (${recall.notifications?.length || 0})` },
    { value: 'trace', label: 'Trace' },
    { value: 'report', label: 'Report' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/stockly/recalls"
          className="flex items-center gap-1 text-sm text-theme-secondary hover:text-theme-primary transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to recalls
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-theme-primary flex items-center gap-2">
                <Shield className="w-6 h-6 text-stockly-dark dark:text-stockly" />
                {recall.recall_code}
              </h1>
              <span className={`text-xs px-2 py-1 rounded capitalize font-medium ${
                recall.status === 'active' || recall.status === 'investigating'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : recall.status === 'resolved' || recall.status === 'closed'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}>
                {STATUS_LABELS[recall.status]}
              </span>
            </div>
            <h2 className="text-lg text-theme-secondary mt-1">{recall.title}</h2>
          </div>
          {nextStatus && recall.status !== 'closed' && (
            <Button
              onClick={() => handleStatusChange(nextStatus)}
              disabled={updating}
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Move to {STATUS_LABELS[nextStatus]}
            </Button>
          )}
        </div>
      </div>

      {/* SALSA overdue warning */}
      {salsaOverdue && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-300">SALSA Notification Overdue</p>
            <p className="text-sm text-red-600 dark:text-red-400">
              SALSA must be notified within 3 working days. This recall was initiated {daysSinceInitiated} days ago.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
            onClick={() => handleUpdate({ salsa_notified: true, salsa_notified_at: new Date().toISOString() })}
            disabled={updating}
          >
            Mark as Notified
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-theme">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.value
                ? 'border-stockly-dark dark:border-stockly text-stockly-dark dark:text-stockly'
                : 'border-transparent text-theme-tertiary hover:text-theme-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Status flow */}
          <div className="bg-theme-surface-elevated rounded-lg p-4 border border-theme">
            <h3 className="text-sm font-medium text-theme-tertiary uppercase mb-3">Workflow</h3>
            <div className="flex items-center gap-1">
              {STATUS_FLOW.map((s, i) => {
                const isActive = s === recall.status;
                const isPast = STATUS_FLOW.indexOf(s) < currentStatusIdx;
                return (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`px-3 py-1.5 rounded text-xs font-medium ${
                      isActive
                        ? 'bg-stockly-dark dark:bg-stockly text-white dark:text-gray-900'
                        : isPast
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-theme-surface text-theme-tertiary'
                    }`}>
                      {isPast && <CheckCircle className="w-3 h-3 inline mr-1" />}
                      {STATUS_LABELS[s]}
                    </div>
                    {i < STATUS_FLOW.length - 1 && (
                      <div className={`w-6 h-0.5 ${isPast ? 'bg-emerald-400' : 'bg-theme-border'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-theme-surface-elevated rounded-lg p-4 border border-theme space-y-3">
              <h3 className="text-sm font-medium text-theme-tertiary uppercase">Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-theme-secondary">Type</span><span className="text-theme-primary capitalize">{recall.recall_type}</span></div>
                <div className="flex justify-between"><span className="text-theme-secondary">Severity</span><span className="text-theme-primary capitalize">{recall.severity.replace('_', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-theme-secondary">Initiated</span><span className="text-theme-primary">{new Date(recall.initiated_at).toLocaleDateString('en-GB')}</span></div>
                {recall.reason && <div><span className="text-theme-secondary">Reason: </span><span className="text-theme-primary">{recall.reason}</span></div>}
                {recall.description && <div><span className="text-theme-secondary">Description: </span><span className="text-theme-primary">{recall.description}</span></div>}
              </div>
            </div>

            <div className="bg-theme-surface-elevated rounded-lg p-4 border border-theme space-y-3">
              <h3 className="text-sm font-medium text-theme-tertiary uppercase">Regulatory</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-theme-secondary">FSA Notified</span>
                  {recall.fsa_notified ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> Yes</span>
                  ) : (
                    <button onClick={() => handleUpdate({ fsa_notified: true, fsa_notified_at: new Date().toISOString() })} className="text-xs text-blue-600 hover:underline">Mark notified</button>
                  )}
                </div>
                {recall.fsa_reference && <div className="flex justify-between"><span className="text-theme-secondary">FSA Ref</span><span className="text-theme-primary">{recall.fsa_reference}</span></div>}
                <div className="flex justify-between items-center">
                  <span className="text-theme-secondary">SALSA Notified</span>
                  {recall.salsa_notified ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> Yes</span>
                  ) : (
                    <button onClick={() => handleUpdate({ salsa_notified: true, salsa_notified_at: new Date().toISOString() })} className="text-xs text-blue-600 hover:underline">Mark notified</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Investigation fields */}
          <div className="bg-theme-surface-elevated rounded-lg p-4 border border-theme space-y-3">
            <h3 className="text-sm font-medium text-theme-tertiary uppercase">Investigation</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">Root Cause</label>
                <textarea
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded border border-theme bg-theme-surface text-theme-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">Corrective Actions</label>
                <textarea
                  value={correctiveActions}
                  onChange={(e) => setCorrectiveActions(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded border border-theme bg-theme-surface text-theme-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded border border-theme bg-theme-surface text-theme-primary text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUpdate({ root_cause: rootCause, corrective_actions: correctiveActions, notes })}
                disabled={updating}
              >
                {updating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Save Investigation
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'batches' && (
        <RecallAffectedBatchesPanel
          recallId={id}
          affectedBatches={recall.affected_batches || []}
          onUpdated={fetchRecall}
        />
      )}

      {tab === 'notifications' && (
        <RecallNotificationsPanel
          recallId={id}
          notifications={recall.notifications || []}
          onUpdated={fetchRecall}
        />
      )}

      {tab === 'trace' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-theme-primary">Auto-Trace Affected Customers</h3>
            <Button onClick={handleTrace} disabled={tracing || (recall.affected_batches?.length || 0) === 0}>
              {tracing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Run Trace
            </Button>
          </div>

          {(recall.affected_batches?.length || 0) === 0 && (
            <p className="text-sm text-theme-tertiary py-4 text-center">Add affected batches first to run a trace</p>
          )}

          {traceResults && (
            <div className="space-y-4">
              <div className="bg-theme-surface-elevated rounded-lg p-4 border border-theme">
                <p className="text-sm text-theme-secondary mb-2">
                  Traced {traceResults.batches_traced} affected batch(es). Found {traceResults.customers.length} potentially affected customer(s).
                </p>
              </div>

              {traceResults.customers.length > 0 && (
                <div className="space-y-2">
                  {traceResults.customers.map((c: any, i: number) => (
                    <div key={i} className="p-3 bg-theme-surface-elevated rounded-lg border border-theme">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-theme-primary">{c.customer_name}</span>
                        <span className="text-xs text-theme-tertiary">Total: {c.total_quantity} units</span>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {c.batches.map((b: any, j: number) => (
                          <p key={j} className="text-xs text-theme-secondary">
                            Batch {b.batch_code}: {b.quantity} {b.unit || 'units'} on {new Date(b.dispatch_date).toLocaleDateString('en-GB')}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'report' && (
        <RecallReportView recallId={id} />
      )}
    </div>
  );
}
