'use client';

import { useState, useEffect } from 'react';
import { WidgetCard, CountBadge, MiniItem } from '../WidgetCard';
import { useWidgetSize } from '../WidgetSizeContext';
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
          .select('id, expected_delivery, supplier_id')
          .eq('company_id', companyId)
          .in('status', ['pending_approval', 'approved', 'sent', 'acknowledged', 'partial_received'])
          .order('expected_delivery', { ascending: true })
          .limit(10);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          // Table may not exist yet — degrade gracefully
          setLoading(false);
          return;
        }

        // Fetch supplier names separately (FK to view doesn't support joins)
        const supplierIds = [...new Set((data || []).map((o: any) => o.supplier_id).filter(Boolean))];
        const supplierMap = new Map<string, string>();
        if (supplierIds.length > 0) {
          const { data: suppliers } = await supabase
            .from('suppliers')
            .select('id, name')
            .in('id', supplierIds);
          (suppliers || []).forEach((s: any) => supplierMap.set(s.id, s.name));
        }

        const formatted: PendingOrder[] = (data || []).map((order: any) => {
          const expectedDate = order.expected_delivery;
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
            supplierName: supplierMap.get(order.supplier_id) || 'Unknown Supplier',
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
          .in('status', ['pending_approval', 'approved', 'sent', 'acknowledged', 'partial_received']);

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

  const { maxItems } = useWidgetSize();

  if (loading) {
    return (
      <WidgetCard title="Pending Orders" module="stockly" viewAllHref="/dashboard/stockly/orders">
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
      <WidgetCard title="Pending Orders" module="stockly" viewAllHref="/dashboard/stockly/orders">
        <div className="text-center py-4">
          <div className="text-[rgb(var(--text-disabled))] text-xs">No pending orders</div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Pending Orders" module="stockly" viewAllHref="/dashboard/stockly/orders">
      <CountBadge count={totalCount} label="awaiting delivery" status="warning" />
      <div className="mt-2">
        {orders.slice(0, maxItems).map((order) => (
          <MiniItem
            key={order.id}
            text={order.supplierName}
            sub={order.dueDate}
            status={order.isDueToday ? 'good' : 'neutral'}
            href="/dashboard/stockly/orders"
          />
        ))}
      </div>
    </WidgetCard>
  );
}
