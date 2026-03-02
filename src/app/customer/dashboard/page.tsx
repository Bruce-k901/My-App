'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Calendar, Edit, SkipForward, Loader2 } from '@/components/ui/icons';
import { Button } from '@/components/ui';
import { MonthlySpendCard } from '@/components/customer/MonthlySpendCard';
import { WasteDashboardWidget } from '@/components/customer/WasteDashboardWidget';
import {
  getCustomerProfile,
  getStandingOrders,
  getOrders,
  type Customer,
  type StandingOrder,
  type Order,
} from '@/lib/order-book/customer';
import { format, parseISO, startOfWeek, addDays, isSameWeek } from 'date-fns';

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [standingOrder, setStandingOrder] = useState<StandingOrder | null>(null);
  const [upcomingOrders, setUpcomingOrders] = useState<Order[]>([]);
  const [orderDays, setOrderDays] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    loadDashboardData();
    
    // Listen for order updates from the orders page
    const handleOrdersUpdated = () => {
      console.log('[Dashboard] Orders updated event received, reloading data...');
      loadDashboardData();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('orders-updated', handleOrdersUpdated);
      
      return () => {
        window.removeEventListener('orders-updated', handleOrdersUpdated);
      };
    }
  }, [mounted]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError(null);

      // Load customer profile
      const customerData = await getCustomerProfile();
      if (!customerData) {
        router.push('/customer/login');
        return;
      }
      setCustomer(customerData);

      // Load standing orders
      const standingOrders = await getStandingOrders({
        customer_id: customerData.id,
      });
      if (standingOrders.length > 0) {
        setStandingOrder(standingOrders[0]); // Take first standing order
      }

      // Load upcoming orders (next 14 days)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 14);
      const orders = await getOrders({
        customer_id: customerData.id,
      });
      const upcoming = orders
        .filter((order) => {
          const deliveryDate = new Date(order.delivery_date);
          return deliveryDate >= today && deliveryDate <= futureDate;
        })
        .sort((a, b) => {
          return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
        })
        .slice(0, 5); // Show next 5
      setUpcomingOrders(upcoming);
      
      // Store all upcoming orders for message calculation
      const allUpcoming = orders
        .filter((order) => {
          const deliveryDate = new Date(order.delivery_date);
          return deliveryDate >= today && deliveryDate <= futureDate;
        })
        .sort((a, b) => {
          return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
        });
      
      // Extract unique delivery days from upcoming orders (next 7 days)
      const nextWeekEnd = new Date(today);
      nextWeekEnd.setDate(today.getDate() + 7);
      const nextWeekOrders = allUpcoming.filter((order) => {
        const deliveryDate = new Date(order.delivery_date);
        return deliveryDate >= today && deliveryDate <= nextWeekEnd;
      });
      
      const orderDaysSet = new Set<string>();
      nextWeekOrders.forEach((order) => {
        const deliveryDate = parseISO(order.delivery_date);
        const dayName = format(deliveryDate, 'EEEE').toLowerCase();
        orderDaysSet.add(dayName);
      });
      
      // Store order days for message
      setOrderDays(Array.from(orderDaysSet));
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEE d MMM');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-module-fg animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-module-fg animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Error Loading Dashboard</h2>
          <p className="text-theme-tertiary mb-4">{error}</p>
          <Button
            onClick={() => {
              setError(null);
              loadDashboardData();
            }}
            variant="primary"
            className="bg-transparent text-module-fg border border-module-fg hover:shadow-module-glow"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Welcome Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary mb-2">
          Welcome, {customer?.business_name || 'Customer'}
        </h1>
        <p className="text-theme-tertiary text-sm sm:text-base">
          Manage your orders and standing deliveries
        </p>
      </div>

      {/* Monthly Spend Summary */}
      <div className="mb-6">
        <MonthlySpendCard />
      </div>

      {/* Waste Tracking Widget - Optional, won't break page if it fails */}
      {mounted && (
        <div className="mb-6">
          <WasteDashboardWidget />
        </div>
      )}

      {/* Place Order */}
      <div className="bg-theme-button border border-theme rounded-xl p-4 sm:p-6 mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-theme-primary mb-4">Place Order</h2>
        <p className="text-theme-tertiary text-sm mb-4">
          {orderDays.length > 0
            ? `You have orders scheduled for ${orderDays
                .map((day) => day.charAt(0).toUpperCase() + day.slice(1).slice(0, 3))
                .join(', ')}. You can edit or add more items.`
            : standingOrder
            ? `Your standing order (${standingOrder.delivery_days
                .map((day) => day.charAt(0).toUpperCase() + day.slice(1).slice(0, 3))
                .join(', ')}) will be pre-filled, but you can edit anything.`
            : 'Enter quantities for products and delivery dates'}
        </p>
        <Link href="/customer/order/new">
          <Button
            variant="primary"
            className="w-full min-h-[44px] bg-transparent text-module-fg border border-module-fg hover:shadow-module-glow"
          >
            <Plus className="w-5 h-5 mr-2" />
            Place Order
          </Button>
        </Link>
      </div>

      {/* Upcoming Deliveries */}
      <div className="bg-theme-button border border-theme rounded-xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-theme-primary mb-4">Upcoming Deliveries</h2>

        {upcomingOrders.length === 0 ? (
          <div className="text-center py-8 text-theme-tertiary">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-theme-tertiary" />
            <p className="text-sm sm:text-base">No upcoming deliveries</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingOrders.map((order) => (
              <Link
                key={order.id}
                href={`/customer/orders/${order.id}`}
                className="block p-4 bg-theme-button border border-theme rounded-lg hover:bg-theme-hover hover:border-theme-hover transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-module-fg" />
                      <span className="font-medium text-theme-primary">{formatDate(order.delivery_date)}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          order.status === 'confirmed'
                            ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
                            : order.status === 'locked'
                            ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                            : 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300'
                        }`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-sm text-theme-tertiary">
                      Order #{order.order_number} • {formatCurrency(order.total)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {upcomingOrders.length > 0 && (
          <div className="mt-4 pt-4 border-t border-theme">
            <Link
              href="/customer/orders"
              className="text-module-fg hover:text-module-fg/80 text-sm font-medium transition-colors"
            >
              View all orders →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

