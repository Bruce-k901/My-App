'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Minus, Plus, Check, X, Loader2 } from '@/components/ui/icons';
import { Button } from '@/components/ui';
import Link from 'next/link';
import { format } from 'date-fns';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product: {
    id: string;
    name: string;
    unit: string;
  };
}

interface Order {
  id: string;
  order_number?: string;
  delivery_date: string;
  items: OrderItem[];
}

export default function WasteLogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [soldQuantities, setSoldQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (orderId) {
      loadOrder();
      loadExistingLog();
    } else {
      loadPendingOrders();
    }
  }, [orderId]);

  async function loadOrder() {
    if (!orderId) return;
    
    try {
      setLoading(true);
      
      // Get customer profile first to verify access
      const customerResponse = await fetch('/api/customer/profile');
      if (!customerResponse.ok) throw new Error('Failed to load customer');

      const customerResult = await customerResponse.json();
      const customer = customerResult.data;

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Get orders for this customer (planly orders)
      const response = await fetch(`/api/customer/orders?customer_id=${customer.id}`);
      if (!response.ok) throw new Error('Failed to load orders');

      const result = await response.json();
      const orders = result.data || [];
      const foundOrder = orders.find((o: Order) => o.id === orderId);

      if (!foundOrder) {
        throw new Error('Order not found or you do not have access to it');
      }

      // If items weren't loaded, fetch them separately
      if (!foundOrder.items || foundOrder.items.length === 0) {
        const itemsResponse = await fetch(`/api/customer/orders/${orderId}/items`);
        if (itemsResponse.ok) {
          const itemsResult = await itemsResponse.json();
          if (itemsResult.data && itemsResult.data.length > 0) {
            foundOrder.items = itemsResult.data;
          }
        }
      }
      
      // Ensure items exist and have product data
      if (!foundOrder.items || foundOrder.items.length === 0) {
        throw new Error('Order has no items');
      }
      
      // Verify all items have product data
      const missingProducts = foundOrder.items.filter((item: OrderItem) => !item.product);
      if (missingProducts.length > 0) {
        console.warn(`Warning: ${missingProducts.length} items missing product data`);
      }
      
      setOrder(foundOrder);
      
      // Initialize sold quantities to 0 (user will input actual sold amounts)
      const initial: Record<string, number> = {};
      foundOrder.items.forEach((item: OrderItem) => {
        initial[item.id] = 0;
      });
      setSoldQuantities(initial);
    } catch (error: any) {
      console.error('Error loading order:', error);
      alert(error.message || 'Failed to load order. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function loadExistingLog() {
    if (!orderId) return;
    
    try {
      const response = await fetch(`/api/customer/waste/log?order_id=${orderId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.items) {
          const quantities: Record<string, number> = {};
          result.data.items.forEach((item: any) => {
            quantities[item.order_item_id] = item.sold_qty;
          });
          setSoldQuantities(quantities);
        }
      }
    } catch (error) {
      console.error('Error loading existing log:', error);
    }
  }

  async function loadPendingOrders() {
    try {
      setLoading(true);
      const response = await fetch('/api/customer/waste/pending');
      if (!response.ok) throw new Error('Failed to load pending orders');
      
      const result = await response.json();
      if (result.data && result.data.length > 0) {
        // Load the first pending order
        const firstOrder = result.data[0];
        router.push(`/customer/waste/log?order_id=${firstOrder.order_id}`);
      }
    } catch (error) {
      console.error('Error loading pending orders:', error);
    } finally {
      setLoading(false);
    }
  }

  function updateSoldQty(itemId: string, value: number) {
    const item = order?.items.find(i => i.id === itemId);
    if (!item) return;
    
    const clamped = Math.max(0, Math.min(value, item.quantity));
    setSoldQuantities({ ...soldQuantities, [itemId]: clamped });
  }

  function increment(itemId: string) {
    const current = soldQuantities[itemId] || 0;
    updateSoldQty(itemId, current + 1);
  }

  function decrement(itemId: string) {
    const current = soldQuantities[itemId] || 0;
    updateSoldQty(itemId, current - 1);
  }

  function setSoldAll(itemId: string) {
    const item = order?.items.find(i => i.id === itemId);
    if (item) {
      setSoldQuantities({ ...soldQuantities, [itemId]: item.quantity });
    }
  }

  function setSoldNone(itemId: string) {
    setSoldQuantities({ ...soldQuantities, [itemId]: 0 });
  }

  function calculateWaste(item: OrderItem) {
    const sold = soldQuantities[item.id] || 0;
    return item.quantity - sold;
  }

  function calculateWastePercent(item: OrderItem) {
    if (item.quantity === 0) return 0;
    return Math.round((calculateWaste(item) / item.quantity) * 100);
  }

  function calculateWasteCost(item: OrderItem) {
    return calculateWaste(item) * item.unit_price;
  }

  function getWasteStatus(item: OrderItem) {
    const percent = calculateWastePercent(item);
    if (percent < 10) return 'success';
    if (percent < 20) return 'warning';
    return 'error';
  }

  async function handleSubmit(status: 'draft' | 'submitted') {
    if (!order) return;

    // Validate: Check for high waste warnings
    const highWasteItems: Array<{ name: string; percent: number }> = [];
    order.items.forEach((item) => {
      const wastePercent = calculateWastePercent(item);
      if (wastePercent > 30) {
        highWasteItems.push({
          name: item.product.name,
          percent: wastePercent,
        });
      }
    });

    if (status === 'submitted' && highWasteItems.length > 0) {
      const warningMessage = `⚠️ High waste detected:\n\n${highWasteItems.map(i => `• ${i.name}: ${i.percent}% waste`).join('\n')}\n\nAre you sure you want to submit this report?`;
      if (!confirm(warningMessage)) {
        return;
      }
    }

    try {
      setSubmitting(true);

      const items = order.items.map((item) => ({
        order_item_id: item.id,
        product_id: item.product_id,
        ordered_qty: item.quantity,
        sold_qty: soldQuantities[item.id] || 0,
        unit_price: item.unit_price,
      }));

      const response = await fetch('/api/customer/waste/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          items,
          status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save waste log');
      }

      if (status === 'submitted') {
        alert('✅ Waste report submitted successfully! Redirecting to insights...');
        router.push('/customer/waste/insights');
      } else {
        alert('✅ Draft saved successfully. You can continue editing later.');
      }
    } catch (error: any) {
      console.error('Error saving waste log:', error);
      alert(`Failed to save waste log: ${error.message || 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
          <p className="text-theme-tertiary mb-4">No order found</p>
          <Link href="/customer/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalOrdered = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalSold = order.items.reduce((sum, item) => sum + (soldQuantities[item.id] || 0), 0);
  const totalWaste = totalOrdered - totalSold;
  const wastePercent = totalOrdered > 0 ? Math.round((totalWaste / totalOrdered) * 100) : 0;
  const wasteCost = order.items.reduce((sum, item) => sum + calculateWasteCost(item), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/customer/dashboard" className="inline-flex items-center gap-2 text-theme-tertiary hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary mb-2">End of Day Report</h1>
        <p className="text-theme-tertiary text-sm sm:text-base">
          {format(new Date(order.delivery_date), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 sm:p-6 mb-6">
        <div className="text-sm text-theme-secondary mb-1">Today's delivery from supplier</div>
        <div className="text-lg font-semibold text-theme-primary">Order for {format(new Date(order.delivery_date), 'd MMM yyyy')}</div>
        <div className="text-sm text-green-400 mt-1">✓ Delivered</div>
      </div>

      {/* Product Log Form */}
      <div className="space-y-4 mb-6">
        {order.items?.map((item) => {
          const waste = calculateWaste(item);
          const wastePercent = calculateWastePercent(item);
          const wasteCost = calculateWasteCost(item);
          const status = getWasteStatus(item);

          return (
            <div key={item.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-theme-primary">{item.product.name}</h3>
                  <p className="text-sm text-theme-tertiary">Ordered: {item.quantity} {item.product.unit}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  How many sold?
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => decrement(item.id)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Minus className="w-4 h-4 text-theme-primary" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={soldQuantities[item.id] || 0}
                    onChange={(e) => updateSoldQty(item.id, parseInt(e.target.value) || 0)}
                    className="w-20 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-theme-primary text-center focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50"
                  />
                  <button
                    onClick={() => increment(item.id)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4 text-theme-primary" />
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setSoldAll(item.id)}
                    className="text-xs px-3 py-1 bg-green-500/20 text-green-300 rounded hover:bg-module-fg/10 transition-colors"
                  >
                    <Check className="w-3 h-3 inline mr-1" />
                    Sold All
                  </button>
                  <button
                    onClick={() => setSoldNone(item.id)}
                    className="text-xs px-3 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition-colors"
                  >
                    <X className="w-3 h-3 inline mr-1" />
                    None
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-theme-tertiary">Unsold:</span>
                  <div className="text-right">
                    <div className={`text-lg font-semibold ${
                      status === 'success' ? 'text-green-400' :
                      status === 'warning' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {waste} units ({wastePercent}%)
                    </div>
                    <div className="text-sm text-theme-tertiary">
                      £{wasteCost.toFixed(2)} waste
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily Summary */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 sm:p-6 mb-6">
        <h3 className="text-lg font-semibold text-theme-primary mb-4">Daily Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-theme-tertiary">Total Ordered:</span>
            <span className="text-theme-primary">{totalOrdered} units</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-theme-tertiary">Total Sold:</span>
            <span className="text-green-400 font-semibold">{totalSold} units</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-white/[0.06]">
            <span className="text-theme-tertiary">Total Waste:</span>
            <div className="text-right">
              <div className={`font-semibold ${
                wastePercent < 15 ? 'text-green-400' :
                wastePercent < 25 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {totalWaste} units ({wastePercent}%)
              </div>
              <div className="text-xs text-theme-tertiary">£{wasteCost.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => handleSubmit('draft')}
          disabled={submitting}
          className="flex-1"
        >
          Save Draft
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleSubmit('submitted')}
          disabled={submitting}
          className="flex-1"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Report ✓'
          )}
        </Button>
      </div>
    </div>
  );
}

