'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, FileText, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  getCustomerProfile,
  getOrders,
  getProductCatalog,
  type Customer,
  type Order,
  type Product,
} from '@/lib/order-book/customer';
import { format, parseISO } from 'date-fns';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  async function loadOrder() {
    try {
      setLoading(true);

      const customerData = await getCustomerProfile();
      if (!customerData) {
        router.push('/customer/login');
        return;
      }
      setCustomer(customerData);

      const ordersData = await getOrders({
        customer_id: customerData.id,
      });

      const foundOrder = ordersData.find((o) => o.id === orderId);
      if (!foundOrder) {
        router.push('/customer/orders');
        return;
      }

      // Fetch order items directly from the database for this specific order
      const itemsResponse = await fetch(`/api/order-book/orders/${orderId}/items`);
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        foundOrder.items = itemsData.data || [];
        console.log(`[Order Detail] Loaded ${foundOrder.items.length} items directly from database`);
      } else {
        console.error('Failed to load order items:', await itemsResponse.json());
        foundOrder.items = [];
      }

      setOrder(foundOrder);

      // Load products
      const productsData = await getProductCatalog(customerData.supplier_id);
      const sorted = productsData.sort((a, b) => {
        if (a.category !== b.category) {
          return (a.category || 'Other').localeCompare(b.category || 'Other');
        }
        return a.name.localeCompare(b.name);
      });
      setProducts(sorted);
    } catch (error) {
      console.error('Error loading order:', error);
      router.push('/customer/orders');
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE, d MMMM yyyy');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#EC4899] animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <p className="text-white/60">Order not found</p>
        <Link
          href="/customer/orders"
          className="text-[#EC4899] hover:text-[#EC4899]/80 text-sm mt-4 inline-block"
        >
          ← Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/customer/orders"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Order Details</h1>
            <p className="text-white/60 text-sm mt-1">Order #{order.order_number}</p>
          </div>
          <span
            className={`text-sm px-3 py-1.5 rounded ${
              order.status === 'confirmed'
                ? 'bg-green-500/20 text-green-300'
                : order.status === 'locked'
                ? 'bg-blue-500/20 text-blue-300'
                : order.status === 'delivered'
                ? 'bg-purple-500/20 text-purple-300'
                : 'bg-yellow-500/20 text-yellow-300'
            }`}
          >
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Order Info */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-white/60 mb-1">Order Date</div>
            <div className="text-white font-medium">{formatDate(order.order_date)}</div>
          </div>
          <div>
            <div className="text-sm text-white/60 mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Delivery Date
            </div>
            <div className="text-white font-medium">{formatDate(order.delivery_date)}</div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden mb-6">
        <h2 className="text-lg font-semibold text-white p-4 sm:p-6 pb-4 border-b border-white/[0.06]">
          Order Items
        </h2>
        {!order.items || order.items.length === 0 ? (
          <div className="p-6 text-center text-white/60">
            <p>No items in this order</p>
            {order.id && (
              <p className="text-xs mt-2 text-white/40">
                Order ID: {order.id}
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="bg-white/[0.05] border-b border-white/[0.1]">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Product</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-white">Quantity</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-white">Unit Price</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-white">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items && order.items.length > 0 ? (
                  // Sort items by product name for consistent display
                  [...order.items].sort((a: any, b: any) => {
                    const nameA = a.product?.name || products.find(p => p.id === a.product_id)?.name || '';
                    const nameB = b.product?.name || products.find(p => p.id === b.product_id)?.name || '';
                    return nameA.localeCompare(nameB);
                  }).map((item: any) => {
                    // Use product info from the item (from API join) first, fallback to products array
                    const productFromItem = item.product;
                    const productFromCatalog = products.find(p => p.id === item.product_id);
                    const product = productFromItem || productFromCatalog;
                    
                    const productName = product?.name || productFromItem?.name || 'Unknown Product';
                    const productUnit = product?.unit || productFromItem?.unit || '';
                    const lineTotal = item.line_total ?? (item.quantity * item.unit_price);
                    
                    return (
                      <tr
                        key={item.id || item.product_id}
                        className="border-b border-white/[0.06] hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-white text-sm">
                              {productName}
                            </div>
                            {productUnit && (
                              <div className="text-xs text-white/60 mt-0.5">
                                {productUnit}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[#10B981] text-base font-semibold">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-white/80">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">
                          {formatCurrency(lineTotal)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-white/60">
                      No items found in this order
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Summary */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60">Subtotal</span>
          <span className="text-white font-medium">{formatCurrency(order.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <span className="text-lg font-semibold text-white">Total</span>
          <span className="text-2xl font-bold text-[#EC4899]">{formatCurrency(order.total)}</span>
        </div>
      </div>

      {/* Invoice Download (if available) */}
      {order.status === 'delivered' && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#EC4899]" />
            Invoice
          </h2>
          <p className="text-white/60 text-sm mb-4">
            Your invoice is available for download.
          </p>
          <Button
            variant="ghost"
            className="bg-transparent text-[#EC4899] border border-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] min-h-[44px]"
            disabled
          >
            <Download className="w-4 h-4 mr-2" />
            Download Invoice (Coming Soon)
          </Button>
        </div>
      )}
    </div>
  );
}

