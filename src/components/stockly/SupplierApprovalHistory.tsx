// @salsa - SALSA Compliance: Supplier approval audit trail timeline
'use client';

import { ShieldCheck, ShieldAlert, Shield, AlertTriangle, Calendar, Clock } from '@/components/ui/icons';
import type { SupplierApprovalLog } from '@/lib/types/stockly';

// @salsa
const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  approved: { icon: ShieldCheck, color: 'text-emerald-400', label: 'Approved' },
  conditional: { icon: ShieldAlert, color: 'text-amber-400', label: 'Conditionally Approved' },
  suspended: { icon: ShieldAlert, color: 'text-red-400', label: 'Suspended' },
  rejected: { icon: ShieldAlert, color: 'text-red-600', label: 'Rejected' },
  review_scheduled: { icon: Calendar, color: 'text-blue-400', label: 'Review Scheduled' },
  risk_updated: { icon: AlertTriangle, color: 'text-orange-400', label: 'Risk Updated' },
  created: { icon: Shield, color: 'text-theme-tertiary', label: 'Created' },
};

interface SupplierApprovalHistoryProps {
  log: SupplierApprovalLog[];
}

export default function SupplierApprovalHistory({ log }: SupplierApprovalHistoryProps) {
  if (log.length === 0) {
    return (
      <div className="bg-theme-surface border border-theme rounded-xl p-8 text-center">
        <Clock className="w-8 h-8 text-theme-tertiary mx-auto mb-3" />
        <p className="text-theme-secondary text-sm">No approval history yet</p>
        <p className="text-theme-tertiary text-xs mt-1">Actions will appear here when the supplier is reviewed</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {log.map((entry, index) => {
        const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.created;
        const Icon = config.icon;

        return (
          <div key={entry.id} className="flex gap-3 py-3">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-theme-button border border-theme`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              {index < log.length - 1 && (
                <div className="w-px flex-1 bg-theme-border mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-theme-primary">{config.label}</p>
                <time className="text-xs text-theme-tertiary">
                  {new Date(entry.performed_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>

              {/* Status change */}
              {entry.old_status && entry.new_status && entry.old_status !== entry.new_status && (
                <p className="text-xs text-theme-secondary mt-0.5">
                  Status: {entry.old_status} → {entry.new_status}
                </p>
              )}

              {/* Risk change */}
              {entry.old_risk_rating && entry.new_risk_rating && entry.old_risk_rating !== entry.new_risk_rating && (
                <p className="text-xs text-theme-secondary mt-0.5">
                  Risk: {entry.old_risk_rating} → {entry.new_risk_rating}
                </p>
              )}

              {/* Notes */}
              {entry.notes && (
                <p className="text-xs text-theme-tertiary mt-1 italic">{entry.notes}</p>
              )}

              {/* Performed by */}
              {entry.performed_by_profile?.full_name && (
                <p className="text-xs text-theme-tertiary mt-0.5">
                  by {entry.performed_by_profile.full_name}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
