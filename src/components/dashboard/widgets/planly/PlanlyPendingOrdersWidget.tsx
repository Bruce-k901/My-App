'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { ShoppingBag, Calendar, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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

    async function fetchOrders() {
      try {
        let query = supabase
          .from('planly_customer_orders')
          .select(`
            id,
            order_number,
            delivery_date,
            status,
            customer:planly_customers(name),
            lines:planly_customer_order_lines(count)
          `)
          .eq('company_id', companyId)
          .in('status', ['pending', 'confirmed', 'in_production'])
          .order('delivery_date', { ascending: true, nullsFirst: false })
          .limit(5);

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

        const formattedOrders: CustomerOrder[] = (data || []).map((order: any) => ({
          id: order.id,
          order_number: order.order_number || 'No Order#',
          customer_name: order.customer?.name || 'Unknown Customer',
          delivery_date: order.delivery_date,
          total_items: order.lines?.[0]?.count || 0,
          status: order.status,
        }));

        setOrders(formattedOrders);

        // Get total count
        let countQuery = supabase
          .from('planly_customer_orders')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', ['pending', 'confirmed', 'in_production']);

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

    fetchOrders();
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
        return 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400';
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
                  <User className="w-3 h-3 text-[rgb(var(--text-tertiary))] dark:text-white/40" />
                  <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                    {order.customer_name}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40 mt-0.5">
                  <span>{order.order_number}</span>
                  <span>•</span>
                  <span>{order.total_items} items</span>
                </div>
              </div>
              <div className="flex flex-col items-end ml-2 flex-shrink-0">
                <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusColor(order.status))}>
                  {order.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40 mt-1 flex items-center gap-1">
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
