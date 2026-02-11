'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { ShoppingCart, Clock, Truck } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface PendingOrder {
  id: string;
  order_number: string;
  supplier_name: string;
  expected_date: string | null;
  status: string;
  total_items: number;
}

export default function PendingOrdersWidget({ companyId, siteId }: WidgetProps) {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.stockly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchPendingOrders() {
      try {
        let query = supabase
          .from('purchase_orders')
          .select(`
            id,
            order_number,
            expected_date,
            status,
            supplier:suppliers(name),
            lines:purchase_order_lines(count)
          `)
          .eq('company_id', companyId)
          .in('status', ['pending', 'ordered', 'partially_received'])
          .order('expected_date', { ascending: true, nullsFirst: false })
          .limit(5);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            console.debug('purchase_orders table not available');
            setLoading(false);
            return;
          }
          throw error;
        }

        const formattedOrders: PendingOrder[] = (data || []).map((order: any) => ({
          id: order.id,
          order_number: order.order_number || 'No PO#',
          supplier_name: order.supplier?.name || 'Unknown Supplier',
          expected_date: order.expected_date,
          status: order.status,
          total_items: order.lines?.[0]?.count || 0,
        }));

        setOrders(formattedOrders);

        // Get total count
        let countQuery = supabase
          .from('purchase_orders')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', ['pending', 'ordered', 'partially_received']);

        if (siteId && siteId !== 'all') {
          countQuery = countQuery.eq('site_id', siteId);
        }

        const { count } = await countQuery;
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error fetching pending orders:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPendingOrders();
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No ETA';
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ordered':
        return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'partially_received':
        return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      default:
        return 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <WidgetCard
      title="Pending Orders"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <ShoppingCart className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      badge={
        totalCount > 0 && (
          <span className="px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-full">
            {totalCount}
          </span>
        )
      }
      viewAllHref="/dashboard/stockly/orders"
    >
      {orders.length === 0 ? (
        <WidgetEmptyState
          icon={<ShoppingCart className="w-8 h-8" />}
          message="No pending orders"
          actionLabel="Place order"
          actionHref="/dashboard/stockly/orders/new"
        />
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/stockly/orders/${order.id}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                  {order.supplier_name}
                </p>
                <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40">
                  <span>{order.order_number}</span>
                  <span>•</span>
                  <span>{order.total_items} items</span>
                </div>
              </div>
              <div className="flex flex-col items-end ml-2 flex-shrink-0">
                <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusColor(order.status))}>
                  {order.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40 mt-1">
                  {formatDate(order.expected_date)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
