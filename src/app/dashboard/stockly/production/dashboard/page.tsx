"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Package,
  AlertTriangle,
  DollarSign,
  Loader2,
  RefreshCw,
  Printer
} from 'lucide-react';
import ProductionTimeline from '@/components/stockly/production/ProductionTimeline';
import OrderBookGrid from '@/components/stockly/production/OrderBookGrid';
import CapacityStatus from '@/components/stockly/production/CapacityStatus';
import IngredientPullList from '@/components/stockly/production/IngredientPullList';

interface WeekSummary {
  orderCount: number;
  itemCount: number;
  revenue: number;
  alertCount: number;
}

interface DayData {
  date: string;
  dayName: string;
  orderCount: number;
  itemCount: number;
  revenue: number;
  hasAlerts: boolean;
  alertCount: number;
}

interface DashboardData {
  weekSummary: WeekSummary;
  days: DayData[];
}

export default function ProductionDashboardPage() {
  const { companyId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [orderBookData, setOrderBookData] = useState<any>(null);
  const [orderBookLoading, setOrderBookLoading] = useState(false);
  const [capacityData, setCapacityData] = useState<any>(null);
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [ingredientData, setIngredientData] = useState<any>(null);
  const [ingredientLoading, setIngredientLoading] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    // Start with Monday of current week
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  useEffect(() => {
    if (companyId) {
      loadDashboardData();
    }
  }, [companyId, currentWeekStart]);

  // Set selected day to today or first day with orders
  useEffect(() => {
    if (data && !selectedDay) {
      const today = new Date().toISOString().split('T')[0];
      const todayData = data.days.find(d => d.date === today);
      if (todayData && todayData.orderCount > 0) {
        setSelectedDay(today);
      } else {
        const firstDayWithOrders = data.days.find(d => d.orderCount > 0);
        if (firstDayWithOrders) {
          setSelectedDay(firstDayWithOrders.date);
        } else if (data.days.length > 0) {
          setSelectedDay(data.days[0].date);
        }
      }
    }
  }, [data, selectedDay]);

  // Load timeline, order book, capacity, and ingredients when day is selected
  useEffect(() => {
    if (selectedDay) {
      loadTimeline(selectedDay);
      loadOrderBook(selectedDay);
      loadCapacity(selectedDay);
      loadIngredients(selectedDay);
    }
  }, [selectedDay]);

  function getWeekRange(start: Date) {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }

  function formatWeekRange(start: Date, end: Date) {
    const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  }

  async function loadDashboardData() {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const { start, end } = getWeekRange(currentWeekStart);
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      const response = await fetch(
        `/api/stockly/production/dashboard?startDate=${startStr}&endDate=${endStr}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load dashboard data');
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error('Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Set empty data structure on error
      setData({
        weekSummary: { orderCount: 0, itemCount: 0, revenue: 0, alertCount: 0 },
        days: []
      });
    } finally {
      setLoading(false);
    }
  }

  function handlePrevWeek() {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
    setSelectedDay(null); // Reset selection
  }

  function handleNextWeek() {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
    setSelectedDay(null); // Reset selection
    setTimelineData(null); // Clear timeline
    setOrderBookData(null); // Clear order book
    setCapacityData(null); // Clear capacity
    setIngredientData(null); // Clear ingredients
  }

  async function loadTimeline(date: string) {
    if (!companyId) return;
    
    setTimelineLoading(true);
    try {
      const response = await fetch(
        `/api/stockly/production/timeline?date=${date}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load timeline');
      }

      const result = await response.json();
      if (result.success) {
        setTimelineData(result.data);
      } else {
        throw new Error('Failed to load timeline');
      }
    } catch (error) {
      console.error('Error loading timeline:', error);
      setTimelineData(null);
    } finally {
      setTimelineLoading(false);
    }
  }

  async function loadOrderBook(date: string) {
    if (!companyId) return;
    
    setOrderBookLoading(true);
    try {
      const response = await fetch(
        `/api/stockly/production/order-book?date=${date}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load order book');
      }

      const result = await response.json();
      if (result.success) {
        setOrderBookData(result.data);
      } else {
        throw new Error('Failed to load order book');
      }
    } catch (error) {
      console.error('Error loading order book:', error);
      setOrderBookData(null);
    } finally {
      setOrderBookLoading(false);
    }
  }

  async function loadCapacity(date: string) {
    if (!companyId) return;
    
    setCapacityLoading(true);
    try {
      const response = await fetch(
        `/api/stockly/production/capacity?date=${date}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load capacity data');
      }

      const result = await response.json();
      if (result.success) {
        setCapacityData(result.data);
      } else {
        throw new Error('Failed to load capacity data');
      }
    } catch (error) {
      console.error('Error loading capacity:', error);
      setCapacityData(null);
    } finally {
      setCapacityLoading(false);
    }
  }

  async function loadIngredients(date: string) {
    if (!companyId) return;
    
    setIngredientLoading(true);
    try {
      const response = await fetch(
        `/api/stockly/production/ingredients?date=${date}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load ingredient data');
      }

      const result = await response.json();
      if (result.success) {
        setIngredientData(result.data);
      } else {
        throw new Error('Failed to load ingredient data');
      }
    } catch (error) {
      console.error('Error loading ingredients:', error);
      setIngredientData(null);
    } finally {
      setIngredientLoading(false);
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  const { start, end } = getWeekRange(currentWeekStart);
  const selectedDayData = data?.days.find(d => d.date === selectedDay);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#EC4899] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Production Planning</h1>
          <p className="text-white/50 text-sm mt-1">
            Transform orders into actionable production plans
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Plan
          </button>
          <button
            className="px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Week
          </button>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevWeek}
            className="px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev Week
          </button>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#EC4899]" />
            <span className="text-white font-medium">
              Week of {formatWeekRange(start, end)}
            </span>
          </div>
          
          <button
            onClick={handleNextWeek}
            className="px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2"
          >
            Next Week
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Overview Metrics */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-5 h-5 text-blue-400" />
              <span className="text-white/60 text-sm">Orders This Week</span>
            </div>
            <p className="text-2xl font-bold text-white">{data.weekSummary.orderCount}</p>
            <p className="text-white/40 text-xs mt-1">Across all days</p>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-5 h-5 text-purple-400" />
              <span className="text-white/60 text-sm">Items to Produce</span>
            </div>
            <p className="text-2xl font-bold text-white">{data.weekSummary.itemCount}</p>
            <p className="text-white/40 text-xs mt-1">Total items</p>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-white/60 text-sm">Weekly Revenue</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(data.weekSummary.revenue)}</p>
            <p className="text-white/40 text-xs mt-1">Total value</p>
          </div>

          <div className={`bg-white/[0.03] border rounded-xl p-5 ${
            data.weekSummary.alertCount > 0 
              ? 'border-amber-500/30 bg-amber-500/5' 
              : 'border-white/[0.06]'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className={`w-5 h-5 ${
                data.weekSummary.alertCount > 0 ? 'text-amber-400' : 'text-white/40'
              }`} />
              <span className="text-white/60 text-sm">Capacity Alerts</span>
            </div>
            <p className={`text-2xl font-bold ${
              data.weekSummary.alertCount > 0 ? 'text-amber-400' : 'text-white'
            }`}>
              {data.weekSummary.alertCount}
            </p>
            {data.weekSummary.alertCount > 0 && (
              <p className="text-amber-400/60 text-xs mt-1 cursor-pointer hover:text-amber-400">
                View Details
              </p>
            )}
          </div>
        </div>
      )}

      {/* Day Tabs */}
      {data && data.days.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2">
          <div className="flex gap-2 overflow-x-auto">
            {data.days.map((day) => (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day.date)}
                className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg transition-all duration-200 ${
                  selectedDay === day.date
                    ? 'bg-[#EC4899]/20 border border-[#EC4899] text-white'
                    : 'bg-white/[0.02] border border-white/[0.06] text-white/60 hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{day.dayName.slice(0, 3)}</span>
                  {day.hasAlerts && (
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  )}
                </div>
                <div className="text-xs text-white/40">
                  {day.orderCount} {day.orderCount === 1 ? 'order' : 'orders'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Day Detail View Placeholder */}
      {selectedDayData && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {selectedDayData.dayName} {new Date(selectedDayData.date).toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'long' 
            })}
          </h2>
          
          {selectedDayData.orderCount === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">No orders scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-white/60 text-sm mb-1">Orders</p>
                  <p className="text-xl font-bold text-white">{selectedDayData.orderCount}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-1">Items</p>
                  <p className="text-xl font-bold text-white">{selectedDayData.itemCount}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-1">Revenue</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(selectedDayData.revenue)}</p>
                </div>
              </div>
              
              {selectedDayData.hasAlerts && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="text-amber-400 font-medium">Capacity conflicts detected</span>
                  </div>
                  <p className="text-amber-400/60 text-sm mt-2">
                    Some equipment may be overloaded. Review the capacity status.
                  </p>
                </div>
              )}

              {/* Production Timeline */}
              <div className="pt-4 border-t border-white/[0.06]">
                <ProductionTimeline
                  date={selectedDayData.date}
                  schedule={timelineData?.schedule || []}
                  loading={timelineLoading}
                  hasConflicts={timelineData?.hasConflicts || false}
                />
              </div>

              {/* Order Book Grid */}
              <div className="pt-6">
                <OrderBookGrid
                  date={selectedDayData.date}
                  data={orderBookData}
                  loading={orderBookLoading}
                />
              </div>

              {/* Capacity Status */}
              <div className="pt-6">
                <CapacityStatus
                  date={selectedDayData.date}
                  data={capacityData}
                  loading={capacityLoading}
                />
              </div>

              {/* Ingredient Pull List */}
              <div className="pt-6">
                <IngredientPullList
                  date={selectedDayData.date}
                  data={ingredientData}
                  loading={ingredientLoading}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {!data && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
          <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">No production data available</h3>
          <p className="text-white/60 text-sm">
            Production plans will appear here once orders are confirmed.
          </p>
        </div>
      )}
    </div>
  );
}

