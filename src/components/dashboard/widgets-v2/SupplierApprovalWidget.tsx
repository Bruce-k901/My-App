// @salsa - SALSA Compliance: Supplier approval status dashboard widget
'use client';

import { useState, useEffect } from 'react';
import { Check, AlertTriangle, Clock, Building2 } from '@/components/ui/icons';
import { WidgetCard, CountBadge, MiniItem } from '../WidgetCard';
import { useWidgetSize } from '../WidgetSizeContext';
import { supabase } from '@/lib/supabase';

interface SupplierApprovalWidgetProps {
  siteId: string;
  companyId: string;
}

// @salsa — Supplier approval status widget
export default function SupplierApprovalWidget({ siteId, companyId }: SupplierApprovalWidgetProps) {
  const [counts, setCounts] = useState({ approved: 0, conditional: 0, pending: 0, suspended: 0, overdue: 0 });
  const [overdueSuppliers, setOverdueSuppliers] = useState<Array<{ id: string; name: string; next_review_date: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchApprovalStatus() {
      try {
        const { data: suppliers, error } = await supabase
          .from('suppliers')
          .select('id, name, approval_status, next_review_date')
          .eq('company_id', companyId)
          .eq('is_active', true);

        if (error?.code === '42P01' || error) {
          setLoading(false);
          return;
        }

        const today = new Date().toISOString().split('T')[0];
        const approved = suppliers?.filter(s => s.approval_status === 'approved').length || 0;
        const conditional = suppliers?.filter(s => s.approval_status === 'conditional').length || 0;
        const pending = suppliers?.filter(s => !s.approval_status || s.approval_status === 'pending').length || 0;
        const suspended = suppliers?.filter(s => s.approval_status === 'suspended' || s.approval_status === 'rejected').length || 0;

        // @salsa — Find suppliers with overdue reviews
        const overdue = (suppliers || []).filter(s =>
          s.next_review_date && s.next_review_date < today
        );

        setCounts({ approved, conditional, pending, suspended, overdue: overdue.length });
        setOverdueSuppliers(overdue.slice(0, 5).map(s => ({
          id: s.id,
          name: s.name,
          next_review_date: s.next_review_date,
        })));
      } catch (err) {
        // Table may not exist
      } finally {
        setLoading(false);
      }
    }

    fetchApprovalStatus();
  }, [companyId]);

  const { maxItems } = useWidgetSize();

  if (loading) {
    return (
      <WidgetCard title="Supplier Approval" module="stockly" viewAllHref="/dashboard/stockly/suppliers">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-black/5 dark:bg-white/5 rounded w-24" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-3/4" />
        </div>
      </WidgetCard>
    );
  }

  const total = counts.approved + counts.conditional + counts.pending + counts.suspended;
  const needsAttention = counts.pending + counts.suspended + counts.overdue;

  if (total === 0) {
    return (
      <WidgetCard title="Supplier Approval" module="stockly" viewAllHref="/dashboard/stockly/suppliers">
        <div className="flex items-center gap-2 py-4 justify-center">
          <Building2 className="w-5 h-5 text-theme-tertiary" />
          <span className="text-theme-tertiary text-xs">No suppliers registered</span>
        </div>
      </WidgetCard>
    );
  }

  // @salsa — Badge status based on worst state
  const badgeStatus = counts.suspended > 0 || counts.overdue > 0 ? 'urgent'
    : counts.pending > 0 ? 'warning'
    : 'good';

  const badgeLabel = needsAttention > 0
    ? `supplier${needsAttention !== 1 ? 's' : ''} need attention`
    : `supplier${counts.approved !== 1 ? 's' : ''} approved`;

  const badgeCount = needsAttention > 0 ? needsAttention : counts.approved;

  return (
    <WidgetCard title="Supplier Approval" module="stockly" viewAllHref="/dashboard/stockly/suppliers">
      <CountBadge count={badgeCount} label={badgeLabel} status={badgeStatus} />

      {/* Summary row */}
      <div className="flex gap-3 mt-2 text-xs">
        <span className="text-emerald-500">{counts.approved} approved</span>
        {counts.conditional > 0 && <span className="text-amber-500">{counts.conditional} conditional</span>}
        {counts.pending > 0 && <span className="text-theme-tertiary">{counts.pending} pending</span>}
        {counts.suspended > 0 && <span className="text-red-500">{counts.suspended} suspended</span>}
      </div>

      {/* Overdue reviews */}
      {overdueSuppliers.length > 0 && (
        <div className="mt-2">
          {overdueSuppliers.slice(0, maxItems).map((supplier) => (
            <MiniItem
              key={supplier.id}
              text={supplier.name}
              sub={`Review overdue: ${new Date(supplier.next_review_date).toLocaleDateString('en-GB')}`}
              status="urgent"
              href={`/dashboard/stockly/suppliers/${supplier.id}`}
            />
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
