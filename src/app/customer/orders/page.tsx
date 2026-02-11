'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Calendar, ChevronLeft, ChevronRight, Repeat, RotateCcw } from '@/components/ui/icons';
import { Button } from '@/components/ui';
import {
  getProductCatalog,
  getCustomerProfile,
  getOrders,
  getStandingOrders,
  createOrder,
  createStandingOrder,
  updateStandingOrder,
  type Product,
  type Customer,
  type OrderItem,
  type Order,
} from '@/lib/order-book/customer';
import { format, addDays, parseISO, nextMonday, startOfWeek } from 'date-fns';

interface GridQuantity {
  [productId: string]: {
    [date: string]: number;
  };
}

export default function OrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerPricing, setCustomerPricing] = useState<Map<string, number>>(new Map());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [gridQuantities, setGridQuantities] = useState<GridQuantity>({});
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, [weekOffset]);

  async function loadData() {
    try {
      setLoading(true);

      const customerData = await getCustomerProfile();
      if (!customerData) {
        router.push('/customer/login');
        return;
      }
      setCustomer(customerData);

      // Load products and customer pricing in parallel
      const [productsData, pricingResponse] = await Promise.all([
        getProductCatalog(customerData.site_id),
        fetch(`/api/customer/pricing?customer_id=${customerData.id}`),
      ]);

      const sorted = productsData.sort((a, b) => {
        if (a.category !== b.category) {
          return (a.category || 'Other').localeCompare(b.category || 'Other');
        }
        return a.name.localeCompare(b.name);
      });
      setProducts(sorted);

      // Load customer-specific pricing (must complete before calculations)
      const pricingMap = new Map<string, number>();
      if (pricingResponse.ok) {
        const pricingData = await pricingResponse.json();
        pricingData.data?.forEach((p: any) => {
          pricingMap.set(p.product_id, p.custom_price);
        });
        // Pricing loaded
      } else {
        console.warn('[Pricing] Failed to load:', pricingResponse.status);
      }
      setCustomerPricing(pricingMap);

      // Generate 7 days starting from Monday with 3-day lead time
      const MIN_LEAD_TIME_DAYS = 3;
      const dates: string[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let startDate = nextMonday(today);
      const daysUntilMonday = Math.ceil(
        (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilMonday < MIN_LEAD_TIME_DAYS) {
        startDate = addDays(startDate, 7);
      }
      
      // Apply week offset (can go back in time with negative offset, or forward up to 4 weeks)
      const MAX_WEEKS_AHEAD = 4;
      if (weekOffset !== 0) {
        // Clamp forward offset to max 4 weeks, but allow unlimited backward offset
        const actualOffset = weekOffset > 0 ? Math.min(weekOffset, MAX_WEEKS_AHEAD) : weekOffset;
        startDate = addDays(startDate, actualOffset * 7);
      }
      
      for (let i = 0; i < 7; i++) {
        const date = addDays(startDate, i);
        dates.push(format(date, 'yyyy-MM-dd'));
      }
      setAvailableDates(dates);

      // Load existing orders for this week
      const ordersData = await getOrders({
        customer_id: customerData.id,
      });

      const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 7);
      
      const weekOrders = ordersData.filter((order) => {
        const orderDate = parseISO(order.delivery_date);
        return orderDate >= weekStart && orderDate < weekEnd;
      });

      // Group orders by delivery_date and keep only the most recent one per date
      // This handles duplicate orders for the same date
      const ordersByDate = new Map<string, Order>();
      weekOrders.forEach((order) => {
        const existing = ordersByDate.get(order.delivery_date);
        // Use order_date to determine which order is more recent
        if (!existing || new Date(order.order_date) > new Date(existing.order_date)) {
          ordersByDate.set(order.delivery_date, order);
        }
      });
      const uniqueOrders = Array.from(ordersByDate.values());
      
      if (weekOrders.length > uniqueOrders.length) {
        console.warn(`[Orders Page] Found ${weekOrders.length} orders but ${uniqueOrders.length} unique delivery dates. Removed ${weekOrders.length - uniqueOrders.length} duplicate orders.`);
      }

      // Populate grid with existing orders - fetch ALL items for each order using dedicated endpoint
      const prePopulated: GridQuantity = {};
      const savedOrderData = new Map<string, {
        total: number;
        items: Map<string, { quantity: number; unit_price: number; line_total: number }>;
      }>();
      
      // Fetch all items for all orders in parallel to avoid timeouts
      if (uniqueOrders.length > 0) {
        const itemsPromises = uniqueOrders.map(async (order) => {
          try {
            const itemsResponse = await fetch(`/api/customer/orders/${order.id}/items`, {
              signal: AbortSignal.timeout(15000), // 15 second timeout (increased for better reliability)
            });
            if (itemsResponse.ok) {
              const itemsData = await itemsResponse.json();
              return { orderId: order.id, deliveryDate: order.delivery_date, items: itemsData.data || [] };
            } else {
              // Fallback to items from order if items endpoint fails
              console.warn(`[Orders Page] Failed to load items for order ${order.id} (status: ${itemsResponse.status}), using items from order object`);
              return { orderId: order.id, deliveryDate: order.delivery_date, items: order.items || [] };
            }
          } catch (error: any) {
            if (error.name === 'TimeoutError' || error.name === 'AbortError') {
              console.warn(`[Orders Page] Timeout loading items for order ${order.id}, using items from order object`);
            } else {
              console.error(`[Orders Page] Error loading items for order ${order.id}:`, error);
            }
            // Fallback to items from order
            return { orderId: order.id, deliveryDate: order.delivery_date, items: order.items || [] };
          }
        });

        const itemsResults = await Promise.all(itemsPromises);
        
        // Populate grid with ALL items from all orders
        // If multiple orders exist for same date, the last one processed wins (which should be the most recent)
        itemsResults.forEach(({ orderId, deliveryDate, items }) => {
          console.log(`[Orders Page] Loaded ${items.length} items for order ${orderId} (${deliveryDate})`);
          items.forEach((item: any) => {
            if (!prePopulated[item.product_id]) {
              prePopulated[item.product_id] = {};
            }
            // Only set if not already set, or if this is a newer order (handled by sorting above)
            if (!prePopulated[item.product_id][deliveryDate] || prePopulated[item.product_id][deliveryDate] === 0) {
              prePopulated[item.product_id][deliveryDate] = item.quantity || 0;
            }
          });
        });
      }

      // If no orders for this week, check for standing orders and pre-populate
      if (weekOrders.length === 0) {
        const standingOrders = await getStandingOrders({
          customer_id: customerData.id,
        });

        if (standingOrders.length > 0) {
          const standingOrder = standingOrders[0];

          // Pre-populate based on standing order delivery days
          standingOrder.items?.forEach((item) => {
            if (!prePopulated[item.product_id]) {
              prePopulated[item.product_id] = {};
            }
            // Apply to all delivery days from standing order
            standingOrder.delivery_days?.forEach((day) => {
              // Find dates that match this day of week
              dates.forEach((dateStr) => {
                const date = parseISO(dateStr);
                const dayName = format(date, 'EEEE').toLowerCase();
                if (dayName === day.toLowerCase()) {
                  prePopulated[item.product_id][dateStr] = item.quantity || 0;
                }
              });
            });
          });
        }
      }

      setGridQuantities(prePopulated);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function updateQuantity(productId: string, date: string, quantity: number) {
    setGridQuantities((prev) => {
      const updated = { ...prev };
      if (!updated[productId]) {
        updated[productId] = {};
      }
      updated[productId] = { ...updated[productId], [date]: quantity };
      if (quantity === 0) {
        delete updated[productId][date];
        if (Object.keys(updated[productId]).length === 0) {
          delete updated[productId];
        }
      }
      return updated;
    });
  }

  function getQuantity(productId: string, date: string): number {
    return gridQuantities[productId]?.[date] || 0;
  }

  function getProductPrice(productId: string): number {
    // Exact same logic as API: customerPricing?.custom_price || product.base_price
    const customPrice = customerPricing.get(productId);
    if (customPrice !== undefined && customPrice !== null) {
      return customPrice;
    }
    // Fall back to base price
    const product = products.find((p) => p.id === productId);
    const price = product?.base_price || 0;
    return price;
  }

  function getTotalForDate(date: string): number {
    // Always calculate using current pricing (same as API will use when saving)
    // This ensures order pad shows what WILL be saved, not what WAS saved
    let total = 0;
    products.forEach((product) => {
      const qty = getQuantity(product.id, date);
      if (qty > 0) {
        const price = getProductPrice(product.id);
        const lineTotal = qty * price;
        total += lineTotal;
      }
    });
    return Math.round(total * 100) / 100;
  }

  function getTotalForProduct(productId: string): number {
    const product = products.find((p) => p.id === productId);
    if (!product) return 0;
    const price = getProductPrice(productId);
    return availableDates.reduce((total, date) => {
      const qty = getQuantity(productId, date);
      return total + price * qty;
    }, 0);
  }

  function getGrandTotal(): number {
    return availableDates.reduce((total, date) => total + getTotalForDate(date), 0);
  }

  async function handleSubmit() {
    if (!customer) {
      setError('Customer not found');
      return;
    }

    // Collect orders by date - use Map to prevent duplicate products per date
    const ordersByDateMap: { [date: string]: Map<string, number> } = {};

    Object.keys(gridQuantities).forEach((productId) => {
      Object.keys(gridQuantities[productId]).forEach((date) => {
        const quantity = gridQuantities[productId][date];
        if (quantity > 0) {
          if (!ordersByDateMap[date]) {
            ordersByDateMap[date] = new Map();
          }
          // Store quantity (will overwrite if duplicate, ensuring single entry per product)
          ordersByDateMap[date].set(productId, quantity);
        }
      });
    });

    // Convert to array format for API
    const ordersByDate: { [date: string]: OrderItem[] } = {};
    Object.keys(ordersByDateMap).forEach((date) => {
      ordersByDate[date] = Array.from(ordersByDateMap[date].entries()).map(([product_id, quantity]) => ({
        product_id,
        quantity,
      }));
    });

    const datesWithOrders = Object.keys(ordersByDate).filter(
      (date) => ordersByDate[date].length > 0
    );

    if (datesWithOrders.length === 0) {
      setError('Please add at least one item to your order');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create/update orders for each date sequentially
      for (const date of datesWithOrders) {
        const itemsForDate = ordersByDate[date];
        console.log(`[Orders Page] Saving order for ${date}: ${itemsForDate.length} items`, itemsForDate);
        try {
          const savedOrder = await createOrder({
            site_id: customer.site_id,
            customer_id: customer.id,
            delivery_date: date,
            items: itemsForDate,
          });
          console.log(`[Orders Page] ✅ Order saved for ${date}:`, savedOrder?.id);
        } catch (orderError: any) {
          console.error(`[Orders Page] ❌ Failed to save order for ${date}:`, orderError);
          throw new Error(`Failed to save order for ${date}: ${orderError.message}`);
        }
      }

      // Reload data to refresh grid
      await loadData();
      setSubmitting(false);
      
      // Trigger dashboard refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('orders-updated'));
      }
      
      // Show success message
      alert(`✅ Successfully saved ${datesWithOrders.length} order(s)!`);
    } catch (error: any) {
      console.error('[Orders Page] Error saving orders:', error);
      setError(error.message || 'Failed to save orders. Please try again.');
      setSubmitting(false);
      alert(`❌ Error: ${error.message || 'Failed to save orders. Please try again.'}`);
    }
  }

  async function handleSaveAsStandingOrder() {
    if (!customer) {
      setError('Customer not found');
      return;
    }

    // Collect orders by date - use Map to prevent duplicate products per date
    const ordersByDateMap: { [date: string]: Map<string, number> } = {};

    Object.keys(gridQuantities).forEach((productId) => {
      Object.keys(gridQuantities[productId]).forEach((date) => {
        const quantity = gridQuantities[productId][date];
        if (quantity > 0) {
          if (!ordersByDateMap[date]) {
            ordersByDateMap[date] = new Map();
          }
          // Store quantity (will overwrite if duplicate, ensuring single entry per product)
          ordersByDateMap[date].set(productId, quantity);
        }
      });
    });

    // Convert to array format
    const ordersByDate: { [date: string]: OrderItem[] } = {};
    Object.keys(ordersByDateMap).forEach((date) => {
      ordersByDate[date] = Array.from(ordersByDateMap[date].entries()).map(([product_id, quantity]) => ({
        product_id,
        quantity,
      }));
    });

    const datesWithOrders = Object.keys(ordersByDate).filter(
      (date) => ordersByDate[date].length > 0
    );

    if (datesWithOrders.length === 0) {
      setError('Please add at least one item to save as standing order');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Extract delivery days from dates (Mon, Tue, Wed, etc.)
      const deliveryDays: string[] = [];
      datesWithOrders.forEach((dateStr) => {
        const date = parseISO(dateStr);
        const dayName = format(date, 'EEEE').toLowerCase();
        if (!deliveryDays.includes(dayName)) {
          deliveryDays.push(dayName);
        }
      });

      // Collect all items (combine quantities across days - use max quantity for each product)
      const itemsMap: { [productId: string]: number } = {};
      datesWithOrders.forEach((date) => {
        ordersByDate[date].forEach((item) => {
          if (!itemsMap[item.product_id] || itemsMap[item.product_id] < item.quantity) {
            itemsMap[item.product_id] = item.quantity;
          }
        });
      });

      const standingOrderItems: OrderItem[] = Object.keys(itemsMap).map((productId) => ({
        product_id: productId,
        quantity: itemsMap[productId],
      }));

      // Check if standing order already exists
      const existingStandingOrders = await getStandingOrders({
        customer_id: customer.id,
      });

      if (existingStandingOrders.length > 0) {
        // Update existing standing order
        await updateStandingOrder(existingStandingOrders[0].id, {
          delivery_days: deliveryDays,
          items: standingOrderItems,
        });
      } else {
        // Create new standing order (backend will find/create supplier automatically)
        await createStandingOrder({
          customer_id: customer.id,
          delivery_days: deliveryDays,
          items: standingOrderItems,
        });
      }

      // Copy current week's orders to next 4 weeks using batch endpoint
      // Use the dates currently displayed in availableDates (the week being viewed)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate maximum allowed date (4 weeks from today)
      const MAX_WEEKS_AHEAD = 4;
      const maxAllowedDate = addDays(today, MAX_WEEKS_AHEAD * 7);
      maxAllowedDate.setHours(23, 59, 59, 999);

      // Build all orders to create/update
      const ordersToCreate: Array<{
        customer_id: string;
        site_id: string;
        delivery_date: string;
        items: OrderItem[];
      }> = [];
      
      // Track delivery dates to prevent duplicates
      const deliveryDatesSet = new Set<string>();

      // Copy orders for each of the next 4 weeks
      for (let weekNum = 1; weekNum <= 4; weekNum++) {
        // For each date in the current week being viewed
        for (const sourceDateStr of availableDates) {
          const sourceDate = parseISO(sourceDateStr);
          const targetDate = addDays(sourceDate, weekNum * 7);
          const targetDateStr = format(targetDate, 'yyyy-MM-dd');
          
          // Only create if target date is in the future AND within 4 weeks limit
          if (targetDate > today && targetDate <= maxAllowedDate) {
            // Skip if we've already added an order for this date (prevent duplicates)
            if (deliveryDatesSet.has(targetDateStr)) {
              console.warn(`[Orders Page] Skipping duplicate date: ${targetDateStr}`);
              continue;
            }
            deliveryDatesSet.add(targetDateStr);
            
            // Get items for this date from current grid (what's on screen)
            const itemsForDate: OrderItem[] = [];
            Object.keys(gridQuantities).forEach((productId) => {
              const quantity = gridQuantities[productId]?.[sourceDateStr];
              if (quantity && quantity > 0) {
                itemsForDate.push({
                  product_id: productId,
                  quantity,
                });
              }
            });
            
            // Add to batch if there are items
            if (itemsForDate.length > 0) {
              ordersToCreate.push({
                customer_id: customer.id,
                site_id: customer.site_id,
                delivery_date: targetDateStr,
                items: itemsForDate,
              });
            }
          }
        }
      }

      // Create all orders in a single batch API call
      if (ordersToCreate.length > 0) {
        console.log(`[Orders Page] Saving ${ordersToCreate.length} orders as standing order`);
        ordersToCreate.forEach((order, idx) => {
          console.log(`[Orders Page] Order ${idx + 1} (${order.delivery_date}): ${order.items.length} items`, order.items.map(i => `${i.product_id}: ${i.quantity}`));
        });
        
        const response = await fetch('/api/customer/orders/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: customer.id,
            site_id: customer.site_id,
            orders: ordersToCreate.map(o => ({
              delivery_date: o.delivery_date,
              items: o.items,
            })),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create orders');
        }
      }

      // Reload data to refresh grid
      await loadData();
      setSubmitting(false);
      
      // Trigger dashboard refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('orders-updated'));
      }
      
      alert(`✅ Successfully created standing order for ${ordersToCreate.length} date(s)!`);
    } catch (error: any) {
      console.error('Error saving standing order:', error);
      setError(error.message || 'Failed to save standing order. Please try again.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'EEE d MMM');
  };

  const hasAnyOrders = Object.keys(gridQuantities).some(
    (productId) => Object.keys(gridQuantities[productId] || {}).length > 0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/customer/dashboard"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">My Orders</h1>
            <p className="text-white/60 text-sm mt-2">
              View and edit your orders for the week
            </p>
          </div>
          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(weekOffset - 1)}
              className="p-2 rounded-lg border border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setWeekOffset(Math.min(weekOffset + 1, 4))}
              disabled={weekOffset >= 4}
              className="p-2 rounded-lg border border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Next week"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden mb-6">
        <div className="overflow-auto max-h-[calc(100vh-350px)] order-book-scrollbar">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-white/[0.05] border-b border-white/[0.1]">
                <th className="sticky left-0 z-30 bg-white/[0.05] px-4 py-3 text-left text-sm font-semibold text-white border-r border-white/[0.1] min-w-[200px]">
                  Product
                </th>
                {availableDates.map((date) => (
                  <th
                    key={date}
                    className="bg-white/[0.05] px-3 py-3 text-center text-xs font-semibold text-white/80 min-w-[100px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Calendar className="w-4 h-4 text-[#D37E91]" />
                      <span>{formatDate(date)}</span>
                    </div>
                  </th>
                ))}
                <th className="bg-white/[0.05] px-4 py-3 text-right text-sm font-semibold text-white min-w-[120px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const productsByBakeGroup = products
                  .filter((p) => p.is_active && p.is_available)
                  .reduce((acc, product) => {
                    const groupName = product.bake_group_name || 'Other';
                    if (!acc[groupName]) {
                      acc[groupName] = {
                        products: [],
                        priority: product.bake_group_priority || 999
                      };
                    }
                    acc[groupName].products.push(product);
                    return acc;
                  }, {} as Record<string, { products: Product[]; priority: number }>);

                // Sort groups by priority, then alphabetically
                const sortedGroups = Object.keys(productsByBakeGroup).sort((a, b) => {
                  const priorityA = productsByBakeGroup[a].priority;
                  const priorityB = productsByBakeGroup[b].priority;
                  if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                  }
                  return a.localeCompare(b);
                });

                let rowIndex = 0;
                return sortedGroups.flatMap((groupName) => {
                  const groupProducts = productsByBakeGroup[groupName].products.sort((a, b) =>
                    a.name.localeCompare(b.name)
                  );
                  return [
                    <tr key={`bakegroup-${groupName}`} className="bg-white/[0.08] border-b border-white/[0.15]">
                      <td colSpan={availableDates.length + 2} className="sticky left-0 z-10 px-4 py-2 text-left text-xs font-bold uppercase text-[#D37E91] bg-white/[0.08]">
                        {groupName}
                      </td>
                    </tr>,
                    ...groupProducts.map((product, idx) => {
                      const hasValue = availableDates.some(date => getQuantity(product.id, date) > 0);
                      return (
                        <tr
                          key={product.id}
                          className={`border-b border-white/[0.06] hover:bg-white/[0.02] ${
                            idx % 2 === 0 ? 'bg-white/[0.01]' : ''
                          }`}
                        >
                          <td className="sticky left-0 z-10 bg-inherit px-4 py-3 border-r border-white/[0.1]">
                            <div>
                              <div className="font-medium text-white text-sm">{product.name}</div>
                              <div className="text-xs text-white/60 mt-0.5">
                                {formatCurrency(getProductPrice(product.id))} / {product.unit}
                              </div>
                            </div>
                          </td>
                          {availableDates.map((date) => {
                            const quantity = getQuantity(product.id, date);
                            const hasValueForCell = quantity > 0;
                            return (
                              <td key={date} className="px-2 py-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={quantity || ''}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    updateQuantity(product.id, date, value);
                                  }}
                                  className={`w-full px-2 py-2 rounded text-center text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#10B981]/50 min-h-[44px] ${
                                    hasValueForCell
                                      ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                                      : 'bg-white/[0.03] border-white/[0.1] text-white'
                                  }`}
                                  placeholder="0"
                                />
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-right text-sm font-medium text-white/80 bg-white/[0.02]">
                            {getTotalForProduct(product.id) > 0 && (
                              <span className="text-[#10B981]">
                                {formatCurrency(getTotalForProduct(product.id))}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    }),
                  ];
                });
              })()}
              {/* Totals Row */}
              <tr className="bg-white/[0.05] border-t-2 border-white/[0.1] font-semibold">
                <td className="sticky left-0 z-10 bg-white/[0.05] px-4 py-3 text-white border-r border-white/[0.1]">
                  Total
                </td>
                {availableDates.map((date) => {
                  const total = getTotalForDate(date);
                  return (
                    <td key={date} className="px-2 py-3 text-center">
                      {total > 0 && (
                        <span className="text-[#D37E91] text-sm font-semibold">
                          {formatCurrency(total)}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right text-lg font-bold text-[#D37E91] bg-white/[0.05]">
                  {formatCurrency(getGrandTotal())}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary and Submit */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white mb-1">
              Grand Total: <span className="text-[#D37E91]">{formatCurrency(getGrandTotal())}</span>
            </div>
            {!hasAnyOrders && (
              <p className="text-sm text-white/60">Enter quantities above to place your order</p>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleSubmit}
              variant="primary"
              className="min-h-[44px] bg-transparent text-[#D37E91] border border-[#D37E91] hover:shadow-[0_0_12px_rgba(211,126,145,0.7)] whitespace-nowrap"
              disabled={submitting || !hasAnyOrders}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving Orders...
                </>
              ) : (
                'Save Orders'
              )}
            </Button>
            <Button
              onClick={async () => {
                if (confirm('Are you sure you want to clear all quantities? This cannot be undone.')) {
                  setGridQuantities({});
                  setError(null);
                  console.log('[Orders Page] Grid cleared - reloading data');
                  // Reload data to refresh from database
                  await loadData();
                  // Trigger a page refresh to update dashboard if needed
                  if (typeof window !== 'undefined') {
                    // Dispatch a custom event that dashboard can listen to
                    window.dispatchEvent(new CustomEvent('orders-updated'));
                  }
                }
              }}
              variant="ghost"
              className="min-h-[44px] bg-transparent text-red-400 border border-red-400/50 hover:bg-red-400/10 hover:border-red-400 whitespace-nowrap"
              disabled={submitting}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Save as Standing Order */}
        {hasAnyOrders && (
          <div className="pt-4 border-t border-white/[0.06]">
            <Button
              onClick={handleSaveAsStandingOrder}
              variant="ghost"
              className="w-full sm:w-auto min-h-[44px] bg-transparent text-[#10B981] border border-[#10B981] hover:shadow-[0_0_12px_rgba(16,185,129,0.7)]"
              disabled={submitting}
            >
              <Repeat className="w-4 h-4 mr-2" />
              Save as Standing Order
            </Button>
            <p className="text-xs text-white/50 mt-2">
              This will create a standing order and automatically generate the same orders for the next 4 weeks
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
