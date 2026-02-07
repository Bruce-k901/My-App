'use client';

import { useState, useEffect } from 'react';
import { WidgetCard, CountBadge, MiniItem } from '../WidgetCard';
import { supabase } from '@/lib/supabase';

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

    async function fetchPendingOrders() {
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const weekFromNow = new Date(today);
        weekFromNow.setDate(today.getDate() + 7);

        let query = supabase
          .from('planly_customer_orders')
          .select(`
            id,
            delivery_date,
            customer:planly_customers(id, name)
          `)
          .eq('company_id', companyId)
          .in('status', ['pending', 'confirmed'])
          .order('delivery_date', { ascending: true })
          .limit(3);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            console.debug('planly_customer_orders table not available');
            setLoading(false);
            return;
          }
          throw error;
        }

        const formatted: CustomerOrder[] = (data || []).map((order: any) => {
          const deliveryDate = new Date(order.delivery_date);
          const daysUntil = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          let dueLabel: string;
          if (daysUntil <= 0) {
            dueLabel = 'Due today';
          } else if (daysUntil === 1) {
            dueLabel = 'Due tomorrow';
          } else {
            dueLabel = `Due ${deliveryDate.toLocaleDateString('en-GB', { weekday: 'short' })}`;
          }

          return {
            id: order.id,
            customerName: order.customer?.name || 'Unknown Customer',
            dueDate: dueLabel,
            isUrgent: daysUntil <= 2,
          };
        });

        setOrders(formatted);

        // Get total count
        let countQuery = supabase
          .from('planly_customer_orders')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', ['pending', 'confirmed']);

        if (siteId && siteId !== 'all') {
          countQuery = countQuery.eq('site_id', siteId);
        }

        const { count } = await countQuery;
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error fetching customer orders:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPendingOrders();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <WidgetCard title="Pending Customer Orders" module="planly" viewAllHref="/dashboard/planly/order-book">
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
      <WidgetCard title="Pending Customer Orders" module="planly" viewAllHref="/dashboard/planly/order-book">
        <div className="text-center py-4">
          <div className="text-white/40 text-xs">No pending customer orders</div>
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
          />
        ))}
      </div>
    </WidgetCard>
  );
}
