'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { Package, Calendar, CheckCircle } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Delivery {
  id: string;
  supplier_name: string;
  received_date: string;
  invoice_number: string | null;
  status: string;
  total_value: number | null;
}

export default function RecentDeliveriesWidget({ companyId, siteId }: WidgetProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.stockly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchDeliveries() {
      try {
        let query = supabase
          .from('deliveries')
          .select(`
            id,
            received_date,
            invoice_number,
            status,
            total_value,
            supplier:suppliers(name)
          `)
          .eq('company_id', companyId)
          .order('received_date', { ascending: false })
          .limit(5);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            console.debug('deliveries table not available');
            setLoading(false);
            return;
          }
          throw error;
        }

        const formattedDeliveries: Delivery[] = (data || []).map((delivery: any) => ({
          id: delivery.id,
          supplier_name: delivery.supplier?.name || 'Unknown Supplier',
          received_date: delivery.received_date,
          invoice_number: delivery.invoice_number,
          status: delivery.status,
          total_value: delivery.total_value,
        }));

        setDeliveries(formattedDeliveries);
      } catch (err) {
        console.error('Error fetching deliveries:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDeliveries();
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <WidgetCard
      title="Recent Deliveries"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <Package className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      viewAllHref="/dashboard/stockly/deliveries"
    >
      {deliveries.length === 0 ? (
        <WidgetEmptyState
          icon={<Package className="w-8 h-8" />}
          message="No recent deliveries"
          actionLabel="Receive delivery"
          actionHref="/dashboard/stockly/deliveries"
        />
      ) : (
        <div className="space-y-2">
          {deliveries.map((delivery) => (
            <Link
              key={delivery.id}
              href={`/dashboard/stockly/deliveries/${delivery.id}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                    {delivery.supplier_name}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
                    <Calendar className="w-3 h-3" />
                    {formatDate(delivery.received_date)}
                    {delivery.invoice_number && (
                      <>
                        <span className="mx-1">•</span>
                        <span>{delivery.invoice_number}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {delivery.total_value !== null && (
                <span className="text-sm font-medium text-green-600 dark:text-green-400 ml-2 flex-shrink-0">
                  {formatCurrency(delivery.total_value)}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
