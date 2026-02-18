// @salsa - SALSA Compliance: Batch expiry alert dashboard widget
'use client';

import { useState, useEffect } from 'react';
import { Check, AlertTriangle, Clock } from '@/components/ui/icons';
import { WidgetCard, CountBadge, MiniItem } from '../WidgetCard';
import { useWidgetSize } from '../WidgetSizeContext';

interface ExpiryAlertWidgetProps {
  siteId: string;
  companyId: string;
}

interface ExpiryAlertItem {
  batch_id: string;
  batch_code: string;
  stock_item_name: string;
  quantity_remaining: number;
  unit: string;
  expiry_type: 'use_by' | 'best_before';
  expiry_date: string;
  days_until_expiry: number;
  severity: 'expired' | 'critical' | 'warning';
}

// @salsa — Format days until expiry as human-readable text
function formatExpiry(days: number, type: 'use_by' | 'best_before'): string {
  const label = type === 'use_by' ? 'UB' : 'BB';
  if (days < 0) return `${label} ${Math.abs(days)}d overdue`;
  if (days === 0) return `${label} today`;
  if (days === 1) return `${label} tomorrow`;
  return `${label} ${days}d`;
}

/**
 * ExpiryAlertWidget - Shows batches approaching or past use_by / best_before dates
 */
export default function ExpiryAlertWidget({ siteId, companyId }: ExpiryAlertWidgetProps) {
  const [alerts, setAlerts] = useState<ExpiryAlertItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchExpiryAlerts() {
      try {
        const params = new URLSearchParams({
          include_expired: 'true',
        });
        if (siteId && siteId !== 'all') {
          params.set('site_id', siteId);
        }

        const res = await fetch(`/api/stockly/batches/expiring?${params}`);
        if (!res.ok) {
          // API may fail if table doesn't exist yet — degrade gracefully
          setLoading(false);
          return;
        }

        const json = await res.json();
        if (!json.success) {
          setLoading(false);
          return;
        }

        setAlerts(json.data || []);
        setTotalCount(json.summary?.total || 0);
      } catch (err) {
        console.error('Error fetching expiry alerts:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchExpiryAlerts();
  }, [companyId, siteId]);

  const { maxItems } = useWidgetSize();

  if (loading) {
    return (
      <WidgetCard title="Batch Expiry Alerts" module="stockly" viewAllHref="/dashboard/stockly/batches">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-black/5 dark:bg-white/5 rounded w-24" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-3/4" />
        </div>
      </WidgetCard>
    );
  }

  if (totalCount === 0) {
    return (
      <WidgetCard title="Batch Expiry Alerts" module="stockly" viewAllHref="/dashboard/stockly/batches">
        <div className="flex items-center gap-2 py-4 justify-center">
          <div className="w-6 h-6 rounded-full bg-module-fg/10 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-module-fg" />
          </div>
          <span className="text-module-fg text-xs">All batches within date</span>
        </div>
      </WidgetCard>
    );
  }

  // @salsa — Map severity to widget status
  const severityToStatus = (severity: string): 'urgent' | 'warning' => {
    if (severity === 'expired' || severity === 'critical') return 'urgent';
    return 'warning';
  };

  // Count by severity for the badge
  const expiredCount = alerts.filter(a => a.severity === 'expired').length;
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  // Choose badge status based on most severe
  const badgeStatus = expiredCount > 0 || criticalCount > 0 ? 'urgent' : 'warning';
  const badgeLabel = expiredCount > 0
    ? `batch${totalCount !== 1 ? 'es' : ''} need attention`
    : `batch${totalCount !== 1 ? 'es' : ''} expiring soon`;

  return (
    <WidgetCard title="Batch Expiry Alerts" module="stockly" viewAllHref="/dashboard/stockly/batches">
      <CountBadge count={totalCount} label={badgeLabel} status={badgeStatus} />
      <div className="mt-2">
        {alerts.slice(0, maxItems).map((alert) => (
          <MiniItem
            key={`${alert.batch_id}-${alert.expiry_type}`}
            text={alert.stock_item_name}
            sub={formatExpiry(alert.days_until_expiry, alert.expiry_type)}
            status={severityToStatus(alert.severity)}
            href="/dashboard/stockly/batches"
          />
        ))}
      </div>
    </WidgetCard>
  );
}
