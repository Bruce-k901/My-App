'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Calendar, ChevronLeft, ChevronRight, Repeat } from '@/components/ui/icons';
import { Button } from '@/components/ui';
import {
  getProductCatalog,
  getCustomerProfile,
  getStandingOrders,
  createOrder,
  createStandingOrder,
  updateStandingOrder,
  type Product,
  type Customer,
  type OrderItem,
} from '@/lib/order-book/customer';
import { format, addDays, parseISO, nextMonday } from 'date-fns';

interface GridQuantity {
  [productId: string]: {
    [date: string]: number;
  };
}

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerPricing, setCustomerPricing] = useState<Map<string, number>>(new Map());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [gridQuantities, setGridQuantities] = useState<GridQuantity>({});
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = current week, 1 = next week, etc.

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

      // Load customer-specific pricing
      const pricingMap = new Map<string, number>();
      if (pricingResponse.ok) {
        const pricingData = await pricingResponse.json();
        pricingData.data?.forEach((p: any) => {
          pricingMap.set(p.product_id, p.custom_price);
        });
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
      
      // Apply week offset (0 = first available week, 1 = next week, etc.)
      if (weekOffset > 0) {
        startDate = addDays(startDate, weekOffset * 7);
      }
      
      for (let i = 0; i < 7; i++) {
        const date = addDays(startDate, i);
        dates.push(format(date, 'yyyy-MM-dd'));
      }
      setAvailableDates(dates);

      // Load standing orders and pre-populate grid
      const standingOrders = await getStandingOrders({
        customer_id: customerData.id,
      });

      if (standingOrders.length > 0) {
        const standingOrder = standingOrders[0];
        const prePopulated: GridQuantity = {};

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

        setGridQuantities(prePopulated);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function updateQuantity(productId: string, date: string, quantity: number) {
    setGridQuantities((prev) => {
      const newGrid = { ...prev };
      if (!newGrid[productId]) {
        newGrid[productId] = {};
      }
      if (quantity === 0 || isNaN(quantity)) {
        const { [date]: _, ...rest } = newGrid[productId];
        newGrid[productId] = rest;
        if (Object.keys(newGrid[productId]).length === 0) {
          const { [productId]: __, ...restProducts } = newGrid;
          return restProducts;
        }
      } else {
        newGrid[productId][date] = quantity;
      }
      return newGrid;
    });
  }

  function getQuantity(productId: string, date: string): number {
    return gridQuantities[productId]?.[date] || 0;
  }

  function getProductPrice(productId: string): number {
    const customPrice = customerPricing.get(productId);
    if (customPrice !== undefined && customPrice !== null) return customPrice;
    const product = products.find((p) => p.id === productId);
    return product?.base_price || 0;
  }

  function getTotalForDate(date: string): number {
    return products.reduce((total, product) => {
      const qty = getQuantity(product.id, date);
      return total + getProductPrice(product.id) * qty;
    }, 0);
  }

  function getTotalForProduct(productId: string): number {
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

    // Collect orders by date
    const ordersByDate: { [date: string]: OrderItem[] } = {};

    Object.keys(gridQuantities).forEach((productId) => {
      Object.keys(gridQuantities[productId]).forEach((date) => {
        const quantity = gridQuantities[productId][date];
        if (quantity > 0) {
          if (!ordersByDate[date]) {
            ordersByDate[date] = [];
          }
          ordersByDate[date].push({
            product_id: productId,
            quantity,
          });
        }
      });
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

      // Create orders for each date sequentially to avoid race condition with order number generation
      for (const date of datesWithOrders) {
        await createOrder({
          site_id: customer.site_id,
          customer_id: customer.id,
          delivery_date: date,
          items: ordersByDate[date],
        });
      }
      router.push('/customer/dashboard');
    } catch (error: any) {
      console.error('Error creating orders:', error);
      setError(error.message || 'Failed to create orders. Please try again.');
      setSubmitting(false);
    }
  }

  async function handleSaveAsStandingOrder() {
    if (!customer) {
      setError('Customer not found');
      return;
    }

    // Collect orders by date
    const ordersByDate: { [date: string]: OrderItem[] } = {};

    Object.keys(gridQuantities).forEach((productId) => {
      Object.keys(gridQuantities[productId]).forEach((date) => {
        const quantity = gridQuantities[productId][date];
        if (quantity > 0) {
          if (!ordersByDate[date]) {
            ordersByDate[date] = [];
          }
          ordersByDate[date].push({
            product_id: productId,
            quantity,
          });
        }
      });
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
        // Create new standing order
        await createStandingOrder({
          customer_id: customer.id,
          delivery_days: deliveryDays,
          items: standingOrderItems,
        });
      }

      router.push('/customer/dashboard');
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
          className="inline-flex items-center gap-2 text-theme-tertiary hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary">Place Order</h1>
            <p className="text-theme-tertiary text-sm mt-2">
              Enter quantities for each product and delivery date
            </p>
          </div>
          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
              disabled={weekOffset === 0}
              className="p-2 rounded-lg border border-white/[0.1] text-theme-tertiary hover:text-white hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              className="p-2 rounded-lg border border-white/[0.1] text-theme-tertiary hover:text-white hover:bg-white/[0.05] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                <th className="sticky left-0 z-30 bg-white/[0.05] px-4 py-3 text-left text-sm font-semibold text-theme-primary border-r border-white/[0.1] min-w-[200px]">
                  Product
                </th>
                {availableDates.map((date) => (
                  <th
                    key={date}
                    className="bg-white/[0.05] px-3 py-3 text-center text-xs font-semibold text-theme-secondary min-w-[100px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Calendar className="w-4 h-4 text-[#D37E91]" />
                      <span>{formatDate(date)}</span>
                    </div>
                  </th>
                ))}
                <th className="bg-white/[0.05] px-4 py-3 text-right text-sm font-semibold text-theme-primary min-w-[120px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Group products by category
                const productsByCategory = products
                  .filter((p) => p.is_active && p.is_available)
                  .reduce((acc, product) => {
                    const category = product.category || 'Other';
                    if (!acc[category]) {
                      acc[category] = [];
                    }
                    acc[category].push(product);
                    return acc;
                  }, {} as Record<string, Product[]>);

                // Sort categories (Cookies first, then Pastries)
                const categoryOrder = ['Cookies', 'Pastries', 'Other'];
                const sortedCategories = Object.keys(productsByCategory).sort((a, b) => {
                  const indexA = categoryOrder.indexOf(a);
                  const indexB = categoryOrder.indexOf(b);
                  if (indexA === -1 && indexB === -1) return a.localeCompare(b);
                  if (indexA === -1) return 1;
                  if (indexB === -1) return -1;
                  return indexA - indexB;
                });

                let rowIndex = 0;
                return sortedCategories.flatMap((category) => {
                  const categoryProducts = productsByCategory[category].sort((a, b) =>
                    a.name.localeCompare(b.name)
                  );
                  return [
                    // Category header row
                    <tr key={`category-${category}`} className="bg-white/[0.08] border-b-2 border-white/[0.15]">
                      <td
                        colSpan={availableDates.length + 2}
                        className="px-4 py-2 sticky left-0 z-10 bg-white/[0.08]"
                      >
                        <div className="text-sm font-semibold text-theme-primary uppercase tracking-wider">
                          {category}
                        </div>
                      </td>
                    </tr>,
                    // Product rows for this category
                    ...categoryProducts.map((product) => {
                      const idx = rowIndex++;
                      return (
                        <tr
                          key={product.id}
                          className={`border-b border-white/[0.06] hover:bg-white/[0.02] ${
                            idx % 2 === 0 ? 'bg-white/[0.01]' : ''
                          }`}
                        >
                          <td className="sticky left-0 z-10 bg-inherit px-4 py-3 border-r border-white/[0.1]">
                            <div>
                              <div className="font-medium text-theme-primary text-sm">{product.name}</div>
                              <div className="text-xs text-theme-tertiary mt-0.5">
                                {formatCurrency(getProductPrice(product.id))} / {product.unit}
                              </div>
                            </div>
                          </td>
                          {availableDates.map((date) => {
                            const quantity = getQuantity(product.id, date);
                            const hasValue = quantity > 0;
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
                                  className={`w-full px-2 py-2 border rounded text-center focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 focus:border-[#D37E91]/50 min-h-[44px] ${
                                    hasValue
                                      ? 'text-[#10B981] font-semibold text-base bg-[#10B981]/10 border-[#10B981]/30'
                                      : 'text-theme-primary text-sm bg-white/[0.03] border-white/[0.1]'
                                  }`}
                                  placeholder="0"
                                />
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-right text-sm font-medium text-theme-secondary bg-white/[0.02]">
                            {getTotalForProduct(product.id) > 0 && (
                              <span className="text-[#D37E91]">
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
                <td className="sticky left-0 z-10 bg-white/[0.05] px-4 py-3 text-theme-primary border-r border-white/[0.1]">
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
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-theme-primary mb-1">
              Grand Total: <span className="text-[#D37E91]">{formatCurrency(getGrandTotal())}</span>
            </div>
            {!hasAnyOrders && (
              <p className="text-sm text-theme-tertiary">Enter quantities above to place your order</p>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              variant="primary"
              className="min-h-[44px] bg-transparent text-[#D37E91] border border-[#D37E91] hover:shadow-module-glow whitespace-nowrap"
              disabled={submitting || !hasAnyOrders}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Orders...
                </>
              ) : (
                'Place Orders'
              )}
            </Button>
          </div>
        </div>

        {/* Save as Standing Order */}
        {hasAnyOrders && (
          <div className="pt-4 border-t border-white/[0.06]">
            <Button
              onClick={handleSaveAsStandingOrder}
              variant="ghost"
              className="w-full sm:w-auto min-h-[44px] bg-transparent text-[#10B981] border border-[#10B981] hover:shadow-module-glow"
              disabled={submitting}
            >
              <Repeat className="w-4 h-4 mr-2" />
              Save as Standing Order
            </Button>
            <p className="text-xs text-theme-tertiary mt-2">
              This will create a standing order that repeats every week for the days you've entered quantities
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
