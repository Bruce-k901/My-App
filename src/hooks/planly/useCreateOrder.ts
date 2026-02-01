'use client';

import { useState } from 'react';
import { useSWRConfig } from 'swr';

interface OrderLineInput {
  product_id: string;
  quantity: number;
  unit_price_snapshot: number;
  ship_state: 'baked' | 'frozen';
}

interface CreateOrderInput {
  customer_id: string;
  delivery_date: string;
  site_id: string;
  notes?: string;
  lines: OrderLineInput[];
}

interface CreateOrderResult {
  id: string;
  customer_id: string;
  delivery_date: string;
  status: string;
  total_value: number;
}

export function useCreateOrder() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = useSWRConfig();

  const createOrder = async (input: CreateOrderInput): Promise<CreateOrderResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Calculate total value
      const totalValue = input.lines.reduce(
        (sum, line) => sum + line.quantity * line.unit_price_snapshot,
        0
      );

      // Create order with lines in one request
      const res = await fetch('/api/planly/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: input.customer_id,
          delivery_date: input.delivery_date,
          site_id: input.site_id,
          notes: input.notes,
          status: 'confirmed',
          total_value: totalValue,
          lines: input.lines.map(line => ({
            product_id: line.product_id,
            quantity: line.quantity,
            unit_price_snapshot: line.unit_price_snapshot,
            ship_state: line.ship_state,
            is_locked: false,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create order');
      }

      const order = await res.json();

      // Invalidate relevant caches
      mutate(
        (key: unknown) => typeof key === 'string' && key.includes('/api/planly/orders'),
        undefined,
        { revalidate: true }
      );

      return { ...order, total_value: totalValue };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { createOrder, isLoading, error };
}
