'use client';

import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Minus,
} from '@/components/ui/icons';
import type {
  EmployeeCompliance,
  ComplianceItem,
  ComplianceStatus,
  ComplianceActionType,
} from '@/types/compliance';

interface EmployeeComplianceDetailProps {
  employee: EmployeeCompliance;
  onAction: (actionType: ComplianceActionType, meta?: Record<string, string>) => void;
}

const STATUS_CONFIG: Record<ComplianceStatus, { icon: React.ElementType; color: string; label: string }> = {
  compliant: { icon: CheckCircle, color: 'text-emerald-500', label: 'Compliant' },
  expiring_soon: { icon: Clock, color: 'text-amber-500', label: 'Expiring Soon' },
  action_required: { icon: AlertTriangle, color: 'text-red-500', label: 'Action Required' },
  expired: { icon: XCircle, color: 'text-red-500', label: 'Expired' },
  missing: { icon: XCircle, color: 'text-red-500', label: 'Missing' },
  not_applicable: { icon: Minus, color: 'text-theme-secondary', label: 'N/A' },
};

const CATEGORY_LABELS: Record<string, string> = {
  right_to_work: 'Right to Work',
  dbs: 'DBS Checks',
  training: 'Mandatory Training',
  documents: 'Employment Documents',
  probation: 'Probation',
};

const ACTION_BUTTON_CLS =
  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors bg-teamly/10 text-teamly hover:bg-teamly/20';

function StatusBadge({ status }: { status: ComplianceStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

function ItemRow({
  item,
  onAction,
}: {
  item: ComplianceItem;
  onAction: (actionType: ComplianceActionType, meta?: Record<string, string>) => void;
}) {
  const needsAction = item.status !== 'compliant' && item.status !== 'not_applicable';

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <StatusBadge status={item.status} />
        <span className="text-sm text-theme-primary truncate">{item.label}</span>
        {item.detail && (
          <span className="text-xs text-theme-secondary hidden sm:inline">
            {item.detail}
          </span>
        )}
        {item.expiryDate && (
          <span className={`text-xs ${
            item.daysUntilExpiry !== undefined && item.daysUntilExpiry <= 30
              ? 'text-red-500 font-medium'
              : 'text-theme-secondary'
          }`}>
            {item.daysUntilExpiry !== undefined && item.daysUntilExpiry < 0
              ? `Expired ${item.expiryDate}`
              : `Expires ${item.expiryDate}`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {item.actionType && needsAction && (
          <button
            onClick={() => onAction(item.actionType!, item.actionMeta)}
            className={ACTION_BUTTON_CLS}
          >
            {item.actionType === 'update_rtw' && 'Update RTW'}
            {item.actionType === 'update_dbs' && 'Update DBS'}
            {item.actionType === 'upload_doc' && 'Upload'}
            {item.actionType === 'update_field' && 'Update'}
            {item.actionType === 'record_training' && 'Record'}
            {item.actionType === 'assign_training' && 'Assign'}
          </button>
        )}
        {/* For compliant training items, still allow recording updated cert */}
        {item.actionType === 'record_training' && item.status === 'compliant' && (
          <button
            onClick={() => onAction('record_training', item.actionMeta)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-hover transition-colors"
          >
            Update
          </button>
        )}
      </div>
    </div>
  );
}

export function EmployeeComplianceDetail({
  employee,
  onAction,
}: EmployeeComplianceDetailProps) {
  // Group items by category
  const grouped = employee.items.reduce<Record<string, ComplianceItem[]>>((acc, item) => {
    const key = item.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const categoryOrder = ['right_to_work', 'dbs', 'training', 'documents', 'probation'];

  return (
    <div className="space-y-4 px-4 pb-4">
      {categoryOrder.map((cat) => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;

        return (
          <div key={cat}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-theme-secondary mb-2">
              {CATEGORY_LABELS[cat]}
            </h4>
            <div className="rounded-lg border border-theme bg-theme-surface-elevated p-3 divide-y divide-theme">
              {items.map((item, i) => (
                <ItemRow key={`${cat}-${i}`} item={item} onAction={onAction} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
