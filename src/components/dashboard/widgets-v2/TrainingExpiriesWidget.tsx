'use client';

import { useState, useEffect } from 'react';
import { WidgetCard, CountBadge, MiniItem } from '../WidgetCard';
import { supabase } from '@/lib/supabase';

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

    async function fetchExpiringTraining() {
      try {
        const today = new Date();
        const thirtyDaysLater = new Date(today);
        thirtyDaysLater.setDate(today.getDate() + 30);

        const todayStr = today.toISOString().split('T')[0];
        const futureStr = thirtyDaysLater.toISOString().split('T')[0];

        let query = supabase
          .from('training_records')
          .select(`
            id,
            expiry_date,
            training_type,
            profile:profiles(id, full_name, first_name, last_name)
          `)
          .eq('company_id', companyId)
          .gte('expiry_date', todayStr)
          .lte('expiry_date', futureStr)
          .order('expiry_date', { ascending: true })
          .limit(3);

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            console.debug('training_records table not available');
            setLoading(false);
            return;
          }
          throw error;
        }

        const formatted: ExpiringTraining[] = (data || []).map((record: any) => {
          const profile = record.profile || {};
          const staffName = profile.full_name ||
            (profile.first_name && profile.last_name
              ? `${profile.first_name} ${profile.last_name}`
              : 'Unknown');

          const expiryDate = new Date(record.expiry_date);
          const daysUntil = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          return {
            id: record.id,
            staffName,
            trainingName: record.training_type || 'Training',
            daysUntil,
          };
        });

        setItems(formatted);

        // Get total count
        let countQuery = supabase
          .from('training_records')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .gte('expiry_date', todayStr)
          .lte('expiry_date', futureStr);

        const { count } = await countQuery;
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error fetching training expiries:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchExpiringTraining();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <WidgetCard title="Training Expiries" module="teamly" viewAllHref="/dashboard/people/training">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-white/5 rounded w-24" />
          <div className="h-3 bg-white/5 rounded" />
          <div className="h-3 bg-white/5 rounded w-3/4" />
        </div>
      </WidgetCard>
    );
  }

  if (totalCount === 0) {
    return (
      <WidgetCard title="Training Expiries" module="teamly" viewAllHref="/dashboard/people/training">
        <div className="text-center py-4">
          <div className="text-white/40 text-xs">No training expiring soon</div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Training Expiries" module="teamly" viewAllHref="/dashboard/people/training">
      <CountBadge count={totalCount} label="expiring within 30 days" status="warning" />
      <div className="mt-2">
        {items.map((item) => (
          <MiniItem
            key={item.id}
            text={`${item.staffName} — ${item.trainingName}`}
            sub={`${item.daysUntil} days`}
            status={item.daysUntil <= 7 ? 'urgent' : 'warning'}
          />
        ))}
      </div>
    </WidgetCard>
  );
}
