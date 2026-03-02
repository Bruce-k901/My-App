// @salsa - SALSA Compliance: Supplier approval status & risk management panel
'use client';

import { useState } from 'react';
import { ShieldCheck, ShieldAlert, Shield, AlertTriangle, Calendar, Star } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import type { SupplierApprovalStatus, RiskRating } from '@/lib/types/stockly';

// @salsa
const APPROVAL_STATUSES: { value: SupplierApprovalStatus; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'approved', label: 'Approved', icon: ShieldCheck, color: 'text-emerald-500' },
  { value: 'conditional', label: 'Conditional', icon: ShieldAlert, color: 'text-amber-500' },
  { value: 'pending', label: 'Pending Review', icon: Shield, color: 'text-blue-400' },
  { value: 'suspended', label: 'Suspended', icon: ShieldAlert, color: 'text-red-500' },
  { value: 'rejected', label: 'Rejected', icon: ShieldAlert, color: 'text-red-700' },
];

const RISK_RATINGS: { value: RiskRating; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

interface SupplierApprovalPanelProps {
  supplierId: string;
  approvalStatus: SupplierApprovalStatus;
  riskRating: RiskRating;
  nextReviewDate: string | null;
  approvedAt: string | null;
  onUpdated: () => void;
}

export default function SupplierApprovalPanel({
  supplierId,
  approvalStatus,
  riskRating,
  nextReviewDate,
  approvedAt,
  onUpdated,
}: SupplierApprovalPanelProps) {
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedReviewDate, setSelectedReviewDate] = useState(nextReviewDate || '');

  const statusInfo = APPROVAL_STATUSES.find((s) => s.value === approvalStatus) || APPROVAL_STATUSES[2];
  const StatusIcon = statusInfo.icon;
  const riskInfo = RISK_RATINGS.find((r) => r.value === riskRating) || RISK_RATINGS[1];

  // @salsa — Handle approval action
  async function handleApprovalAction(action: string, newStatus: SupplierApprovalStatus) {
    setSaving(true);
    try {
      const res = await fetch(`/api/stockly/suppliers/${supplierId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          new_status: newStatus,
          next_review_date: selectedReviewDate || null,
          notes: notes || null,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success(`Supplier ${newStatus}`);
      setNotes('');
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update approval');
    } finally {
      setSaving(false);
    }
  }

  // @salsa — Handle risk rating change
  async function handleRiskChange(newRisk: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/stockly/suppliers/${supplierId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'risk_updated',
          risk_rating: newRisk,
          notes: `Risk rating changed to ${newRisk}`,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success('Risk rating updated');
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update risk');
    } finally {
      setSaving(false);
    }
  }

  // @salsa — Handle review date change
  async function handleReviewDateSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/stockly/suppliers/${supplierId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review_scheduled',
          next_review_date: selectedReviewDate || null,
          notes: `Next review date set to ${selectedReviewDate}`,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success('Review date updated');
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update review date');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-theme-surface border border-theme rounded-xl p-5">
        <h3 className="text-sm font-semibold text-theme-primary mb-4">Approval Status</h3>
        <div className="flex items-center gap-3 mb-4">
          <StatusIcon className={`w-8 h-8 ${statusInfo.color}`} />
          <div>
            <p className={`text-lg font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
            {approvedAt && (
              <p className="text-xs text-theme-tertiary">
                Approved: {new Date(approvedAt).toLocaleDateString('en-GB')}
              </p>
            )}
          </div>
        </div>

        {/* Approval actions */}
        <div className="flex flex-wrap gap-2">
          {approvalStatus !== 'approved' && (
            <Button
              onClick={() => handleApprovalAction('approved', 'approved')}
              disabled={saving}
              variant="outline"
              className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              Approve
            </Button>
          )}
          {approvalStatus !== 'conditional' && (
            <Button
              onClick={() => handleApprovalAction('conditional', 'conditional')}
              disabled={saving}
              variant="outline"
              className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
            >
              <ShieldAlert className="w-4 h-4 mr-1.5" />
              Conditional
            </Button>
          )}
          {approvalStatus !== 'suspended' && (
            <Button
              onClick={() => handleApprovalAction('suspended', 'suspended')}
              disabled={saving}
              variant="outline"
              className="text-red-500 border-red-500/30 hover:bg-red-500/10"
            >
              <ShieldAlert className="w-4 h-4 mr-1.5" />
              Suspend
            </Button>
          )}
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label className="block text-xs text-theme-tertiary mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for approval decision..."
            rows={2}
            className="w-full px-3 py-2 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-1 focus:ring-module-fg/50 resize-none"
          />
        </div>
      </div>

      {/* Risk Rating */}
      <div className="bg-theme-surface border border-theme rounded-xl p-5">
        <h3 className="text-sm font-semibold text-theme-primary mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-theme-tertiary" />
          Risk Rating
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {RISK_RATINGS.map((risk) => (
            <button
              key={risk.value}
              onClick={() => handleRiskChange(risk.value)}
              disabled={saving}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                riskRating === risk.value
                  ? risk.color
                  : 'bg-theme-button border-theme text-theme-tertiary hover:border-theme-secondary'
              }`}
            >
              {risk.label}
            </button>
          ))}
        </div>
      </div>

      {/* Next Review Date */}
      <div className="bg-theme-surface border border-theme rounded-xl p-5">
        <h3 className="text-sm font-semibold text-theme-primary mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-theme-tertiary" />
          Next Review Date
        </h3>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedReviewDate}
            onChange={(e) => setSelectedReviewDate(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleReviewDateSave}
            disabled={saving || selectedReviewDate === (nextReviewDate || '')}
            variant="outline"
          >
            Save
          </Button>
        </div>
        {nextReviewDate && (
          <p className="text-xs text-theme-tertiary mt-2">
            Current: {new Date(nextReviewDate).toLocaleDateString('en-GB')}
          </p>
        )}
      </div>
    </div>
  );
}

// @salsa — Exported badge component for use on supplier list/cards
export function ApprovalStatusBadge({ status }: { status: SupplierApprovalStatus | undefined }) {
  const info = APPROVAL_STATUSES.find((s) => s.value === (status || 'pending')) || APPROVAL_STATUSES[2];
  const Icon = info.icon;
  const bgMap: Record<string, string> = {
    approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    conditional: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    pending: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    suspended: 'bg-red-500/15 text-red-400 border-red-500/25',
    rejected: 'bg-red-700/15 text-red-600 border-red-700/25',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${bgMap[status || 'pending'] || bgMap.pending}`}>
      <Icon className="w-3 h-3" />
      {info.label}
    </span>
  );
}

export function RiskRatingBadge({ rating }: { rating: RiskRating | undefined }) {
  const info = RISK_RATINGS.find((r) => r.value === (rating || 'medium')) || RISK_RATINGS[1];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${info.color}`}>
      {info.label} Risk
    </span>
  );
}
