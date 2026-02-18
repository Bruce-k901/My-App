// @salsa - SALSA Compliance: SALSA audit readiness summary component
'use client';

import Link from 'next/link';

interface AuditSummaryData {
  suppliers: {
    total: number;
    approved: number;
    conditional: number;
    overdue_review: number;
    expired_documents: number;
  };
  batches: {
    active: number;
    expiring_soon: number;
    expired: number;
    quarantined: number;
  };
  calibrations: {
    total_probes: number;
    calibrated_current: number;
    overdue: number;
    due_soon: number;
  };
  non_conformances: {
    open: number;
    investigating: number;
    awaiting_closure: number;
    closed_this_month: number;
    overdue_corrective_actions: number;
  };
  recalls: {
    active: number;
    total: number;
    last_mock_exercise: string | null;
  };
  traceability: {
    dispatch_records_this_month: number;
    production_batches_this_month: number;
  };
  compliance_templates: {
    total_salsa_templates: number;
    completed_this_period: number;
    overdue: number;
  };
}

interface SALSAAuditSummaryProps {
  data: AuditSummaryData;
}

// @salsa — Status indicator helpers
function StatusDot({ status }: { status: 'good' | 'warning' | 'danger' }) {
  const colors = {
    good: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status]}`} />;
}

function SummaryCard({ title, href, status, children }: {
  title: string;
  href: string;
  status: 'good' | 'warning' | 'danger';
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block p-4 bg-theme-surface border border-theme rounded-xl hover:border-stockly-dark/30 dark:hover:border-stockly/30 transition-colors print:border-gray-300"
    >
      <div className="flex items-center gap-2 mb-3">
        <StatusDot status={status} />
        <h3 className="text-sm font-semibold text-theme-primary">{title}</h3>
      </div>
      <div className="space-y-1 text-sm">{children}</div>
    </Link>
  );
}

function Line({ label, value, variant }: { label: string; value: string | number; variant?: 'good' | 'warning' | 'danger' | 'neutral' }) {
  const colorClasses = {
    good: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
    neutral: 'text-theme-secondary',
  };
  return (
    <div className="flex justify-between">
      <span className="text-theme-tertiary">{label}</span>
      <span className={`font-medium ${colorClasses[variant || 'neutral']}`}>{value}</span>
    </div>
  );
}

export default function SALSAAuditSummary({ data }: SALSAAuditSummaryProps) {
  const { suppliers, batches, calibrations, non_conformances, recalls, traceability, compliance_templates } = data;

  // @salsa — Determine overall status per section
  const supplierStatus = suppliers.expired_documents > 0 || suppliers.overdue_review > 2 ? 'danger' : suppliers.overdue_review > 0 ? 'warning' : 'good';
  const batchStatus = batches.expired > 0 || batches.quarantined > 0 ? 'danger' : batches.expiring_soon > 0 ? 'warning' : 'good';
  const calStatus = calibrations.overdue > 0 ? 'danger' : calibrations.due_soon > 0 ? 'warning' : 'good';
  const ncStatus = non_conformances.overdue_corrective_actions > 0 ? 'danger' : non_conformances.open > 0 ? 'warning' : 'good';
  const recallStatus = recalls.active > 0 ? 'danger' : 'good';
  const traceStatus = 'good' as const;
  const templateStatus = compliance_templates.overdue > 0 ? 'danger' : 'good';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
      <SummaryCard title="Supplier Approval" href="/dashboard/stockly/suppliers" status={supplierStatus}>
        <Line label="Approved" value={suppliers.approved} variant="good" />
        <Line label="Conditional" value={suppliers.conditional} variant={suppliers.conditional > 0 ? 'warning' : 'neutral'} />
        <Line label="Overdue review" value={suppliers.overdue_review} variant={suppliers.overdue_review > 0 ? 'warning' : 'neutral'} />
        <Line label="Expired documents" value={suppliers.expired_documents} variant={suppliers.expired_documents > 0 ? 'danger' : 'neutral'} />
      </SummaryCard>

      <SummaryCard title="Batch Status" href="/dashboard/stockly/batches" status={batchStatus}>
        <Line label="Active batches" value={batches.active} variant="neutral" />
        <Line label="Expiring soon" value={batches.expiring_soon} variant={batches.expiring_soon > 0 ? 'warning' : 'neutral'} />
        <Line label="Expired" value={batches.expired} variant={batches.expired > 0 ? 'danger' : 'neutral'} />
        <Line label="Quarantined" value={batches.quarantined} variant={batches.quarantined > 0 ? 'danger' : 'neutral'} />
      </SummaryCard>

      <SummaryCard title="Calibration" href="/dashboard/assets" status={calStatus}>
        <Line label="Total probes" value={calibrations.total_probes} variant="neutral" />
        <Line label="Current" value={calibrations.calibrated_current} variant="good" />
        <Line label="Overdue" value={calibrations.overdue} variant={calibrations.overdue > 0 ? 'danger' : 'neutral'} />
        <Line label="Due soon" value={calibrations.due_soon} variant={calibrations.due_soon > 0 ? 'warning' : 'neutral'} />
      </SummaryCard>

      <SummaryCard title="Non-Conformances" href="/dashboard/stockly/non-conformances" status={ncStatus}>
        <Line label="Open" value={non_conformances.open} variant={non_conformances.open > 0 ? 'danger' : 'neutral'} />
        <Line label="Investigating" value={non_conformances.investigating} variant={non_conformances.investigating > 0 ? 'warning' : 'neutral'} />
        <Line label="Awaiting closure" value={non_conformances.awaiting_closure} variant="neutral" />
        <Line label="Overdue actions" value={non_conformances.overdue_corrective_actions} variant={non_conformances.overdue_corrective_actions > 0 ? 'danger' : 'neutral'} />
        <Line label="Closed this month" value={non_conformances.closed_this_month} variant="good" />
      </SummaryCard>

      <SummaryCard title="Recalls" href="/dashboard/stockly/recalls" status={recallStatus}>
        <Line label="Active" value={recalls.active > 0 ? `${recalls.active} active` : 'No active recalls'} variant={recalls.active > 0 ? 'danger' : 'good'} />
        <Line label="Total" value={recalls.total} variant="neutral" />
        <Line
          label="Last mock exercise"
          value={recalls.last_mock_exercise ? new Date(recalls.last_mock_exercise).toLocaleDateString() : 'Never'}
          variant={recalls.last_mock_exercise ? 'neutral' : 'warning'}
        />
      </SummaryCard>

      <SummaryCard title="Traceability" href="/dashboard/stockly/traceability" status={traceStatus}>
        <Line label="Dispatches this month" value={traceability.dispatch_records_this_month} variant="neutral" />
        <Line label="Production runs this month" value={traceability.production_batches_this_month} variant="neutral" />
      </SummaryCard>

      <SummaryCard title="Compliance Templates" href="/dashboard/checkly/compliance" status={templateStatus}>
        <Line label="SALSA templates" value={compliance_templates.total_salsa_templates} variant="neutral" />
        <Line label="Completed this period" value={compliance_templates.completed_this_period} variant={compliance_templates.completed_this_period > 0 ? 'good' : 'neutral'} />
        <Line label="Overdue" value={compliance_templates.overdue} variant={compliance_templates.overdue > 0 ? 'danger' : 'neutral'} />
      </SummaryCard>
    </div>
  );
}
