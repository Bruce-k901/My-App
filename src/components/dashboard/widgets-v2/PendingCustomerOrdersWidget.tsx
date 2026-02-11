'use client';

import { useState, useEffect } from 'react';
import { WidgetCard, CountBadge, MiniItem } from '../WidgetCard';

interface PendingCustomerOrdersWidgetProps {
  siteId: string;
  companyId: string;
}

interface CustomerOrder {
  id: string;
  customerName: string;
  dueDate: string;
  isUrgent: boolean;
}

/**
 * PendingCustomerOrdersWidget - Shows customer orders not yet scheduled/completed
 */
export default function PendingCustomerOrdersWidget({ siteId, companyId }: PendingCustomerOrdersWidgetProps) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    // planly_customer_orders table not yet created — skip query to avoid 404
    setLoading(false);
  }, [companyId, siteId]);

  if (loading) {
    return (
      <WidgetCard title="Pending Customer Orders" module="planly" viewAllHref="/dashboard/planly/order-book">
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
      <WidgetCard title="Pending Customer Orders" module="planly" viewAllHref="/dashboard/planly/order-book">
        <div className="text-center py-4">
          <div className="text-[rgb(var(--text-disabled))] text-xs">No pending customer orders</div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Pending Customer Orders" module="planly" viewAllHref="/dashboard/planly/order-book">
      <CountBadge count={totalCount} label="orders to schedule" status="warning" />
      <div className="mt-2">
        {orders.map((order) => (
          <MiniItem
            key={order.id}
            text={order.customerName}
            sub={order.dueDate}
            status={order.isUrgent ? 'warning' : 'neutral'}
            href="/dashboard/planly/order-book"
          />
        ))}
      </div>
    </WidgetCard>
  );
}
