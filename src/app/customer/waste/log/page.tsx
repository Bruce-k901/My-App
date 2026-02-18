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
      
      // Get customer profile first to verify access (supports admin preview)
      const previewId = typeof window !== 'undefined' ? sessionStorage.getItem('admin_preview_customer_id') : null;
      const profileUrl = previewId ? `/api/customer/profile?customer_id=${previewId}` : '/api/customer/profile';
      const customerResponse = await fetch(profileUrl);
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
      const previewId = typeof window !== 'undefined' ? sessionStorage.getItem('admin_preview_customer_id') : null;
      const logParams = new URLSearchParams({ order_id: orderId! });
      if (previewId) logParams.set('customer_id', previewId);
      const response = await fetch(`/api/customer/waste/log?${logParams}`);
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
      const previewId = typeof window !== 'undefined' ? sessionStorage.getItem('admin_preview_customer_id') : null;
      const pendingUrl = previewId ? `/api/customer/waste/pending?customer_id=${previewId}` : '/api/customer/waste/pending';
      const response = await fetch(pendingUrl);
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

      const previewIdForSubmit = typeof window !== 'undefined' ? sessionStorage.getItem('admin_preview_customer_id') : null;
      const submitUrl = previewIdForSubmit ? `/api/customer/waste/log?customer_id=${previewIdForSubmit}` : '/api/customer/waste/log';
      const response = await fetch(submitUrl, {
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
          <Loader2 className="w-8 h-8 text-module-fg animate-spin" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-theme-button border border-theme rounded-xl p-8 text-center">
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
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <Link href="/customer/dashboard" className="inline-flex items-center gap-2 text-theme-tertiary hover:text-theme-primary mb-3">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary">End of Day Report</h1>
          <p className="text-theme-tertiary text-sm mt-1">
            {format(new Date(order.delivery_date), 'EEEE, d MMMM yyyy')} — Order for {format(new Date(order.delivery_date), 'd MMM yyyy')}
            <span className="text-green-600 dark:text-green-400 ml-2">✓ Delivered</span>
          </p>
        </div>
        {/* Summary stats inline */}
        <div className="flex items-center gap-4 text-sm">
          <div className="text-theme-tertiary">
            Ordered: <span className="text-theme-primary font-medium">{totalOrdered}</span>
          </div>
          <div className="text-theme-tertiary">
            Sold: <span className="text-green-600 dark:text-green-400 font-medium">{totalSold}</span>
          </div>
          <div className={`font-medium ${
            wastePercent < 15 ? 'text-green-600 dark:text-green-400' :
            wastePercent < 25 ? 'text-yellow-600 dark:text-yellow-400' :
            'text-red-600 dark:text-red-400'
          }`}>
            Waste: {totalWaste} ({wastePercent}%) · £{wasteCost.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Product Log Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {order.items?.map((item) => {
          const waste = calculateWaste(item);
          const wastePercent = calculateWastePercent(item);
          const wasteCost = calculateWasteCost(item);
          const status = getWasteStatus(item);

          return (
            <div key={item.id} className="bg-theme-button border border-theme rounded-xl p-4 flex flex-col">
              {/* Product header */}
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-theme-primary truncate">{item.product.name}</h3>
                  <p className="text-xs text-theme-tertiary">Ordered: {item.quantity} {item.product.unit}</p>
                </div>
                <div className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                  status === 'success' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' :
                  status === 'warning' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                  'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                }`}>
                  {wastePercent}%
                </div>
              </div>

              {/* Sold input */}
              <div className="mb-3">
                <label className="block text-xs text-theme-secondary mb-1.5">Sold</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => decrement(item.id)}
                    className="p-1.5 bg-theme-hover hover:bg-theme-muted rounded-lg transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5 text-theme-primary" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={soldQuantities[item.id] || 0}
                    onChange={(e) => updateSoldQty(item.id, parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1.5 bg-theme-button border border-theme rounded-lg text-theme-primary text-center text-sm focus:outline-none focus:ring-2 focus:ring-module-fg/50"
                  />
                  <button
                    onClick={() => increment(item.id)}
                    className="p-1.5 bg-theme-hover hover:bg-theme-muted rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-theme-primary" />
                  </button>
                  <div className="flex gap-1.5 ml-auto">
                    <button
                      onClick={() => setSoldAll(item.id)}
                      className="text-xs px-2 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded hover:bg-module-fg/10 transition-colors"
                      title="Sold All"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setSoldNone(item.id)}
                      className="text-xs px-2 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded hover:bg-red-500/30 transition-colors"
                      title="None Sold"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Waste result */}
              <div className="pt-3 border-t border-theme mt-auto flex items-center justify-between">
                <span className="text-xs text-theme-tertiary">Unsold:</span>
                <div className="text-right">
                  <span className={`text-sm font-semibold ${
                    status === 'success' ? 'text-green-600 dark:text-green-400' :
                    status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {waste} units
                  </span>
                  <span className="text-xs text-theme-tertiary ml-1.5">£{wasteCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-4 max-w-md mx-auto">
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

