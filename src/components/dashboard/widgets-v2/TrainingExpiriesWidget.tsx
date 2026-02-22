'use client';

import { useState, useEffect } from 'react';
import { WidgetCard, CountBadge, MiniItem } from '../WidgetCard';
import { useWidgetSize } from '../WidgetSizeContext';
import { supabase } from '@/lib/supabase';

// Cache table availability to avoid repeated 400s when table doesn't exist
let tableAvailable: boolean | null = null;

interface TrainingExpiriesWidgetProps {
  siteId: string;
  companyId: string;
}

interface ExpiringTraining {
  id: string;
  staffName: string;
  trainingName: string;
  daysUntil: number;
}

/**
 * TrainingExpiriesWidget - Shows staff with training expiring in 30 days
 */
export default function TrainingExpiriesWidget({ siteId, companyId }: TrainingExpiriesWidgetProps) {
  const [items, setItems] = useState<ExpiringTraining[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    // Table previously failed — skip the query entirely
    if (tableAvailable === false) {
      setLoading(false);
      return;
    }

    async function fetchExpiringTraining() {
      try {
        // Use the get_expiring_training RPC which handles joins server-side

        const { data, error } = await supabase.rpc('get_expiring_training', {
          p_company_id: companyId,
          p_days_ahead: 30,
        });

        if (error) {
          console.warn('[TrainingExpiries] RPC failed:', error.code, error.message, error.details, error.hint);
          tableAvailable = false;
          setLoading(false);
          return;
        }

        const allItems: ExpiringTraining[] = (data || []).map((record: any) => ({
          id: record.record_id,
          staffName: record.employee_name || 'Unknown',
          trainingName: record.course_name || 'Training',
          daysUntil: record.days_until_expiry,
        }));

        setTotalCount(allItems.length);
        setItems(allItems);
      } catch (err) {
        console.warn('[TrainingExpiries] Unexpected error:', err);
        tableAvailable = false;
      } finally {
        setLoading(false);
      }
    }

    fetchExpiringTraining();
  }, [companyId, siteId]);

  const { maxItems } = useWidgetSize();

  if (loading) {
    return (
      <WidgetCard title="Training Expiries" module="teamly" viewAllHref="/dashboard/people/training">
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
      <WidgetCard title="Training Expiries" module="teamly" viewAllHref="/dashboard/people/training">
        <div className="text-center py-4">
          <div className="text-[rgb(var(--text-disabled))] text-xs">No training expiring soon</div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Training Expiries" module="teamly" viewAllHref="/dashboard/people/training">
      <CountBadge count={totalCount} label="expiring within 30 days" status="warning" />
      <div className="mt-2">
        {items.slice(0, maxItems).map((item) => (
          <MiniItem
            key={item.id}
            text={`${item.staffName} — ${item.trainingName}`}
            sub={`${item.daysUntil} days`}
            status={item.daysUntil <= 7 ? 'urgent' : 'warning'}
            href="/dashboard/people/training"
          />
        ))}
      </div>
    </WidgetCard>
  );
}
