'use client';

import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { useOrderBook } from '@/hooks/planly/useOrderBook';
import { OrderBookEntry } from '@/types/planly';

interface OrderBookProps {
  deliveryDate: string;
  siteId?: string;
}

export function OrderBook({ deliveryDate, siteId }: OrderBookProps) {
  const { data, isLoading, error } = useOrderBook(deliveryDate, siteId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-tertiary">Loading order book...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 dark:text-red-400">Error loading order book</div>
      </div>
    );
  }

  const orderBook = data as { date: string; orders: OrderBookEntry[] } | undefined;

  if (!orderBook || !orderBook.orders || orderBook.orders.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-theme-tertiary">
          No orders for {format(new Date(deliveryDate), 'd MMMM yyyy')}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-theme-primary">
          Order Book - {format(new Date(deliveryDate), 'd MMMM yyyy')}
        </h2>
        <div className="text-theme-tertiary text-sm">
          {orderBook.orders.length} {orderBook.orders.length === 1 ? 'order' : 'orders'}
        </div>
      </div>

      {orderBook.orders.map((order) => (
        <Card key={order.customer_id} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-theme-primary">{order.customer_name}</h3>
              <div className="text-sm text-theme-tertiary">
                {order.products.length} {order.products.length === 1 ? 'product' : 'products'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-theme-primary">£{order.total_value.toFixed(2)}</div>
              {order.is_locked && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">Locked</div>
              )}
            </div>
          </div>

          <div className="border-t border-theme pt-4 mt-4">
            <div className="space-y-2">
              {order.products.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="text-theme-primary">
                    {product.product_name} × {product.quantity}
                  </div>
                  <div className="text-theme-tertiary">
                    £{product.unit_price.toFixed(2)} each
                    {product.is_locked && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">🔒</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
