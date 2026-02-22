'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { Truck, Calendar, MapPin } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ScheduledDelivery {
  id: string;
  customer_name: string;
  delivery_date: string;
  delivery_time: string | null;
  item_count: number;
  address?: string;
}

export default function DeliveryScheduleWidget({ companyId, siteId }: WidgetProps) {
  const [deliveries, setDeliveries] = useState<ScheduledDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.planly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    // planly_customer_orders table not yet created — skip query to avoid 404
    setLoading(false);
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dateOnly = (d: Date) => d.toISOString().split('T')[0];

    if (dateOnly(date) === dateOnly(today)) return 'Today';
    if (dateOnly(date) === dateOnly(tomorrow)) return 'Tomorrow';
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    return time.slice(0, 5);
  };

  // Group deliveries by date
  const groupedDeliveries = deliveries.reduce((acc, delivery) => {
    const dateKey = formatDate(delivery.delivery_date);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(delivery);
    return acc;
  }, {} as Record<string, ScheduledDelivery[]>);

  return (
    <WidgetCard
      title="Delivery Schedule"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <Truck className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      badge={
        <span className="text-xs font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
          Next 3 days
        </span>
      }
      viewAllHref="/dashboard/planly/deliveries"
    >
      {deliveries.length === 0 ? (
        <WidgetEmptyState
          icon={<Truck className="w-8 h-8" />}
          message="No deliveries scheduled"
          actionLabel="View schedule"
          actionHref="/dashboard/planly/deliveries"
        />
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedDeliveries).map(([date, dateDeliveries]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3 h-3 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary" />
                <span className="text-xs font-semibold text-[rgb(var(--text-secondary))] dark:text-theme-tertiary uppercase">
                  {date}
                </span>
              </div>
              <div className="space-y-1">
                {dateDeliveries.map((delivery) => (
                  <Link
                    key={delivery.id}
                    href={`/dashboard/planly/orders/${delivery.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                        {delivery.customer_name}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
                        {delivery.item_count} items
                      </p>
                    </div>
                    {delivery.delivery_time && (
                      <span className="text-xs font-medium text-orange-600 dark:text-orange-400 ml-2 flex-shrink-0">
                        {formatTime(delivery.delivery_time)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
