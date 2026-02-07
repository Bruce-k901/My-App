'use client';

import { useState, useEffect } from 'react';
import { WidgetCard, CountBadge, MiniItem } from '../WidgetCard';
import { supabase } from '@/lib/supabase';

interface PendingStockOrdersWidgetProps {
  siteId: string;
  companyId: string;
}

interface PendingOrder {
  id: string;
  supplierName: string;
  dueDate: string;
  isDueToday: boolean;
}

/**
 * PendingStockOrdersWidget - Shows pending purchase orders awaiting delivery
 */
export default function PendingStockOrdersWidget({ siteId, companyId }: PendingStockOrdersWidgetProps) {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchPendingOrders() {
      try {
        const today = new Date().toISOString().split('T')[0];

        let query = supabase
          .from('purchase_orders')
          .select(`
            id,
            expected_date,
            supplier:suppliers(id, name)
          `)
          .eq('company_id', companyId)
          .in('status', ['ordered', 'pending'])
          .order('expected_date', { ascending: true })
          .limit(3);

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

        const formatted: PendingOrder[] = (data || []).map((order: any) => {
          const expectedDate = order.expected_date;
          const isDueToday = expectedDate === today;
          const dueDateObj = new Date(expectedDate);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);

          let dueLabel: string;
          if (expectedDate === today) {
            dueLabel = 'Due today';
          } else if (expectedDate === tomorrow.toISOString().split('T')[0]) {
            dueLabel = 'Due tomorrow';
          } else {
            dueLabel = `Due ${dueDateObj.toLocaleDateString('en-GB', { weekday: 'short' })}`;
          }

          return {
            id: order.id,
            supplierName: order.supplier?.name || 'Unknown Supplier',
            dueDate: dueLabel,
            isDueToday,
          };
        });

        setOrders(formatted);

        // Get total count
        let countQuery = supabase
          .from('purchase_orders')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', ['ordered', 'pending']);

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
    return (
      <WidgetCard title="Pending Orders" module="stockly" viewAllHref="/dashboard/stockly/orders">
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
      <WidgetCard title="Pending Orders" module="stockly" viewAllHref="/dashboard/stockly/orders">
        <div className="text-center py-4">
          <div className="text-white/40 text-xs">No pending orders</div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Pending Orders" module="stockly" viewAllHref="/dashboard/stockly/orders">
      <CountBadge count={totalCount} label="awaiting delivery" status="warning" />
      <div className="mt-2">
        {orders.map((order) => (
          <MiniItem
            key={order.id}
            text={order.supplierName}
            sub={order.dueDate}
            status={order.isDueToday ? 'good' : 'neutral'}
          />
        ))}
      </div>
    </WidgetCard>
  );
}
