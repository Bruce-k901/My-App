// @salsa - SALSA Compliance: Non-conformance detail page with 5-step workflow
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { NonConformance, NonConformanceStatus } from '@/lib/types/stockly';
import NonConformanceStatusBadge from '@/components/stockly/NonConformanceStatusBadge';
import { useToast } from '@/components/ui/ToastProvider';

const WORKFLOW_STEPS: { status: NonConformanceStatus; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'investigating', label: 'Investigating' },
  { status: 'corrective_action', label: 'Corrective Action' },
  { status: 'verification', label: 'Verification' },
  { status: 'closed', label: 'Closed' },
];

export default function NonConformanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAppContext();
  const { showToast } = useToast();
  const [nc, setNc] = useState<NonConformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // @salsa — Editable fields
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [correctiveActionDue, setCorrectiveActionDue] = useState('');
  const [correctiveActionEvidence, setCorrectiveActionEvidence] = useState('');

  // @salsa — Fetch NC detail
  useEffect(() => {
    const fetchNC = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stockly/non-conformances/${id}`);
        const result = await res.json();
        if (result.success) {
          setNc(result.data);
          setRootCause(result.data.root_cause || '');
          setCorrectiveAction(result.data.corrective_action || '');
          setPreventiveAction(result.data.preventive_action || '');
          setCorrectiveActionDue(result.data.corrective_action_due || '');
          setCorrectiveActionEvidence(result.data.corrective_action_evidence || '');
        }
      } catch (err) {
        console.error('Failed to fetch non-conformance:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNC();
  }, [id]);

  // @salsa — Save changes with auto status transitions
  const handleSave = async (additionalFields?: Record<string, any>) => {
    if (!nc) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        root_cause: rootCause || null,
        corrective_action: correctiveAction || null,
        preventive_action: preventiveAction || null,
        corrective_action_due: correctiveActionDue || null,
        corrective_action_evidence: correctiveActionEvidence || null,
        ...additionalFields,
      };

      const res = await fetch(`/api/stockly/non-conformances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const result = await res.json();
      if (result.success) {
        setNc(result.data);
        showToast({ title: 'Non-conformance updated', type: 'success' });
      } else {
        showToast({ title: 'Failed to update', description: result.error, type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  // @salsa — Mark corrective action as completed
  const handleMarkCompleted = () => {
    handleSave({ corrective_action_completed_at: new Date().toISOString() });
  };

  // @salsa — Close non-conformance
  const handleClose = () => {
    handleSave({
      closed_at: new Date().toISOString(),
      closed_by: user?.id || null,
      corrective_action_verified_by: user?.id || null,
    });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-theme-surface rounded animate-pulse" />
          <div className="h-64 bg-theme-surface rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!nc) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-12">
        <p className="text-theme-tertiary">Non-conformance not found.</p>
      </div>
    );
  }

  const currentStepIndex = WORKFLOW_STEPS.findIndex(s => s.status === nc.status);
  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = nc.corrective_action_due && nc.corrective_action_due < todayStr && nc.status !== 'closed' && nc.status !== 'verification';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => router.back()} className="text-sm text-theme-tertiary hover:text-theme-secondary mb-2">&larr; Back to register</button>
          <h1 className="text-2xl font-bold text-theme-primary">{nc.nc_code}: {nc.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <NonConformanceStatusBadge status={nc.status} />
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              nc.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
              nc.severity === 'major' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {nc.severity.charAt(0).toUpperCase() + nc.severity.slice(1)}
            </span>
            {isOverdue && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                Overdue
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Workflow status bar */}
      <div className="mb-8">
        <div className="flex items-center gap-1">
          {WORKFLOW_STEPS.map((step, i) => (
            <div key={step.status} className="flex-1">
              <div className={`h-2 rounded-full ${
                i <= currentStepIndex
                  ? 'bg-stockly-dark dark:bg-stockly'
                  : 'bg-gray-200 dark:bg-neutral-700'
              }`} />
              <p className={`text-xs mt-1 text-center ${
                i === currentStepIndex
                  ? 'text-stockly-dark dark:text-stockly font-medium'
                  : i < currentStepIndex
                  ? 'text-theme-secondary'
                  : 'text-theme-tertiary'
              }`}>
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 1: Details */}
      <div className="bg-theme-surface border border-theme rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-theme-primary mb-4">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-theme-tertiary">Category</span>
            <p className="text-theme-primary font-medium capitalize">{nc.category.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <span className="text-theme-tertiary">Source</span>
            <p className="text-theme-primary font-medium capitalize">{nc.source.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <span className="text-theme-tertiary">Raised</span>
            <p className="text-theme-primary font-medium">{new Date(nc.raised_at).toLocaleDateString()}</p>
          </div>
          {nc.source_reference && (
            <div>
              <span className="text-theme-tertiary">Source Reference</span>
              <p className="text-theme-primary font-medium">{nc.source_reference}</p>
            </div>
          )}
          {nc.description && (
            <div className="col-span-2">
              <span className="text-theme-tertiary">Description</span>
              <p className="text-theme-primary mt-1">{nc.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Investigation & Corrective Action */}
      <div className="bg-theme-surface border border-theme rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-theme-primary mb-4">Investigation & Corrective Action</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Root Cause</label>
            <textarea
              value={rootCause}
              onChange={e => setRootCause(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-theme-bg border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
              placeholder="Identify the root cause of this non-conformance..."
              disabled={nc.status === 'closed'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Corrective Action</label>
            <textarea
              value={correctiveAction}
              onChange={e => setCorrectiveAction(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-theme-bg border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
              placeholder="Describe the corrective action taken..."
              disabled={nc.status === 'closed'}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Corrective Action Due</label>
              <input
                type="date"
                value={correctiveActionDue}
                onChange={e => setCorrectiveActionDue(e.target.value)}
                className="w-full px-3 py-2 bg-theme-bg border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
                disabled={nc.status === 'closed'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Evidence URL</label>
              <input
                type="text"
                value={correctiveActionEvidence}
                onChange={e => setCorrectiveActionEvidence(e.target.value)}
                className="w-full px-3 py-2 bg-theme-bg border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
                placeholder="Link to photo or document"
                disabled={nc.status === 'closed'}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Preventive Action</label>
            <textarea
              value={preventiveAction}
              onChange={e => setPreventiveAction(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-theme-bg border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
              placeholder="What will prevent this from happening again?"
              disabled={nc.status === 'closed'}
            />
          </div>

          {nc.status !== 'closed' && (
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleSave()}
                disabled={saving}
                className="px-4 py-2 bg-stockly-dark dark:bg-stockly text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {(nc.status === 'corrective_action') && (
                <button
                  onClick={handleMarkCompleted}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Mark Corrective Action Complete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Closure */}
      <div className="bg-theme-surface border border-theme rounded-xl p-6">
        <h2 className="text-lg font-semibold text-theme-primary mb-4">Closure</h2>
        {nc.status === 'closed' ? (
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-theme-tertiary">Closed at</span>
              <span className="text-theme-primary font-medium">{nc.closed_at ? new Date(nc.closed_at).toLocaleDateString() : '—'}</span>
            </div>
            {nc.corrective_action_completed_at && (
              <div className="flex justify-between">
                <span className="text-theme-tertiary">Corrective action completed</span>
                <span className="text-theme-primary font-medium">{new Date(nc.corrective_action_completed_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        ) : nc.status === 'verification' ? (
          <div className="space-y-3">
            <p className="text-sm text-theme-secondary">
              Corrective action has been completed. Verify the action was effective and close this non-conformance.
            </p>
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Closing...' : 'Verify & Close'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-theme-tertiary">
            Complete the corrective action and move to verification before closing.
          </p>
        )}
      </div>
    </div>
  );
}
