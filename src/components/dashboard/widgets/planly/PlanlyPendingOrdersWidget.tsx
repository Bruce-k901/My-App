'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { ShoppingBag, Calendar, User } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface CustomerOrder {
  id: string;
  order_number: string;
  customer_name: string;
  delivery_date: string | null;
  total_items: number;
  status: string;
}

export default function PlanlyPendingOrdersWidget({ companyId, siteId }: WidgetProps) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No date set';
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'in_production':
        return 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400';
      default:
        return 'bg-theme-muted text-theme-secondary';
    }
  };

  return (
    <WidgetCard
      title="Pending Orders"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <ShoppingBag className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      badge={
        totalCount > 0 && (
          <span className="px-2 py-1 text-xs font-semibold bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 rounded-full">
            {totalCount}
          </span>
        )
      }
      viewAllHref="/dashboard/planly/orders"
    >
      {orders.length === 0 ? (
        <WidgetEmptyState
          icon={<ShoppingBag className="w-8 h-8" />}
          message="No pending orders"
          actionLabel="View orders"
          actionHref="/dashboard/planly/orders"
        />
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/planly/orders/${order.id}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary" />
                  <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                    {order.customer_name}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mt-0.5">
                  <span>{order.order_number}</span>
                  <span>•</span>
                  <span>{order.total_items} items</span>
                </div>
              </div>
              <div className="flex flex-col items-end ml-2 flex-shrink-0">
                <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusColor(order.status))}>
                  {order.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(order.delivery_date)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
