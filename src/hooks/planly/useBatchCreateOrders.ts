'use client';

import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  default_ship_state: 'baked' | 'frozen';
  can_ship_frozen: boolean;
}

interface SaveWeekInput {
  customerId: string;
  siteId: string;
  weekStart: Date;
  cells: Record<string, number>;
  prices: Record<string, number>;
  shipStates: Record<string, 'baked' | 'frozen'>;
  products: Product[];
}

interface BatchOrderResult {
  created: number;
  updated: number;
  skipped: number;
}

export function useBatchCreateOrders() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = useSWRConfig();

  const saveWeek = async (input: SaveWeekInput): Promise<BatchOrderResult | null> => {
    const { customerId, siteId, weekStart, cells, prices, shipStates, products } = input;

    setIsLoading(true);
    setError(null);

    try {
      // Generate week dates
      const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

      // Group cells by date
      const ordersByDate: Record<
        string,
        Array<{
          product_id: string;
          quantity: number;
          unit_price_snapshot: number;
          ship_state: 'baked' | 'frozen';
        }>
      > = {};

      // Initialize all dates
      for (const date of weekDates) {
        const dateStr = format(date, 'yyyy-MM-dd');
        ordersByDate[dateStr] = [];
      }

      // Group cells by date
      for (const [key, quantity] of Object.entries(cells)) {
        if (quantity <= 0) continue;

        const [productId, dateStr] = key.split(':');

        const line = {
          product_id: productId,
          quantity,
          unit_price_snapshot: prices[productId] || 0,
          ship_state: shipStates[productId] || 'baked',
        };

        if (!ordersByDate[dateStr]) {
          ordersByDate[dateStr] = [];
        }
        ordersByDate[dateStr].push(line);
      }

      // Build orders array
      const orders = Object.entries(ordersByDate).map(([delivery_date, lines]) => ({
        delivery_date,
        lines,
      }));

      // Make batch request
      const res = await fetch('/api/planly/orders/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          site_id: siteId,
          orders,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save orders');
      }

      const result: BatchOrderResult = await res.json();

      // Invalidate relevant caches
      mutate(
        (key: unknown) =>
          typeof key === 'string' && key.includes('/api/planly/orders'),
        undefined,
        { revalidate: true }
      );

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { saveWeek, isLoading, error };
}
