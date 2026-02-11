'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays } from 'date-fns';
import { Calendar, Plus, Loader2, AlertCircle } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Label from '@/components/ui/Label';
import Textarea from '@/components/ui/Textarea';
import Input from '@/components/ui/Input';
import { CustomerSelector } from './CustomerSelector';
import { ProductLineItem } from './ProductLineItem';
import { OrderSummary } from './OrderSummary';
import { useCreateOrder } from '@/hooks/planly/useCreateOrder';

interface OrderLine {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  ship_state: 'baked' | 'frozen';
  can_ship_frozen: boolean;
}

interface OrderEntryFormProps {
  siteId: string;
}

// Get tomorrow's date - only called on client
function getTomorrowDate(): string {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd');
}

export function OrderEntryForm({ siteId }: OrderEntryFormProps) {
  const router = useRouter();
  const { createOrder, isLoading, error } = useCreateOrder();

  // Form state - initialize with empty string to avoid hydration mismatch
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [notes, setNotes] = useState<string>('');

  // Set initial date on client side only to avoid hydration mismatch
  useEffect(() => {
    setDeliveryDate(getTomorrowDate());
  }, []);

  // Calculate totals
  const subtotal = orderLines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
  const lineCount = orderLines.filter(line => line.quantity > 0 && line.product_id).length;

  // Add new product line
  const handleAddLine = () => {
    setOrderLines([
      ...orderLines,
      {
        id: crypto.randomUUID(),
        product_id: '',
        product_name: '',
        quantity: 0,
        unit_price: 0,
        ship_state: 'baked',
        can_ship_frozen: false,
      },
    ]);
  };

  // Update a line
  const handleUpdateLine = (id: string, updates: Partial<OrderLine>) => {
    setOrderLines(lines =>
      lines.map(line => (line.id === id ? { ...line, ...updates } : line))
    );
  };

  // Remove a line
  const handleRemoveLine = (id: string) => {
    setOrderLines(lines => lines.filter(line => line.id !== id));
  };

  // Submit order
  const handleSubmit = async () => {
    if (!customerId || !deliveryDate || orderLines.length === 0) {
      return;
    }

    // Filter out empty lines
    const validLines = orderLines.filter(line => line.product_id && line.quantity > 0);

    if (validLines.length === 0) {
      return;
    }

    try {
      const order = await createOrder({
        customer_id: customerId,
        delivery_date: deliveryDate,
        site_id: siteId,
        notes,
        lines: validLines.map(line => ({
          product_id: line.product_id,
          quantity: line.quantity,
          unit_price_snapshot: line.unit_price,
          ship_state: line.ship_state,
        })),
      });

      if (order?.id) {
        router.push('/dashboard/planly/order-book');
      }
    } catch (err) {
      console.error('Failed to create order:', err);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Customer & Date Selection */}
      <Card className="p-6 bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06]">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Details</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Selector */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-white/80">Customer</Label>
              <CustomerSelector
                siteId={siteId}
                value={customerId}
                onChange={(id, name) => {
                  setCustomerId(id);
                  setCustomerName(name);
                }}
              />
            </div>

            {/* Delivery Date */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-white/80">Delivery Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#14B8A6]" />
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white flex-1"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-white/80">Order Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions..."
              className="bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40"
            />
          </div>
        </div>
      </Card>

      {/* Product Lines */}
      <Card className="p-6 bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Products</h2>
          <Button
            variant="outline"
            onClick={handleAddLine}
            className="h-9 px-3 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
        <div className="space-y-3">
          {orderLines.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-white/40">
              <p>No products added yet</p>
              <Button
                variant="ghost"
                onClick={handleAddLine}
                className="mt-2 text-[#14B8A6] hover:text-[#14B8A6]/80"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add your first product
              </Button>
            </div>
          ) : (
            orderLines.map((line, index) => (
              <ProductLineItem
                key={line.id}
                siteId={siteId}
                customerId={customerId}
                line={line}
                onUpdate={(updates) => handleUpdateLine(line.id, updates)}
                onRemove={() => handleRemoveLine(line.id)}
                autoFocus={index === orderLines.length - 1 && !line.product_id}
              />
            ))
          )}
        </div>
      </Card>

      {/* Order Summary */}
      <OrderSummary
        customerName={customerName}
        deliveryDate={deliveryDate ? new Date(deliveryDate) : new Date()}
        lineCount={lineCount}
        subtotal={subtotal}
      />

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !customerId || lineCount === 0}
          className="bg-[#14B8A6] hover:bg-[#14B8A6]/90 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Placing Order...
            </>
          ) : (
            'Place Order'
          )}
        </Button>
      </div>
    </div>
  );
}
