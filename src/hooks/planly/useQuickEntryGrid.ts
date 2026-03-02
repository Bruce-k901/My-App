'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { format, addDays, subWeeks } from 'date-fns';
import { toast } from 'sonner';

interface BakeGroup {
  id: string;
  name: string;
  sort_order: number;
}

interface Product {
  id: string;
  name: string;
  default_ship_state: 'baked' | 'frozen';
  can_ship_frozen: boolean;
  bake_group?: BakeGroup | null;
}

interface OrderHistoryResponse {
  products: Product[];
  prices: Record<string, number>;
}

interface ExistingOrder {
  id: string;
  delivery_date: string;
  lines: {
    product_id: string;
    quantity: number;
    unit_price_snapshot: number;
    ship_state: 'baked' | 'frozen';
  }[];
}

export function useQuickEntryGrid(siteId: string, weekStart: Date | null) {
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cells, setCells] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [shipStates, setShipStates] = useState<Record<string, 'baked' | 'frozen'>>({});
  const [originalCells, setOriginalCells] = useState<Record<string, number>>({});
  const [existingOrderIds, setExistingOrderIds] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Calculate if there are unsaved changes
  const isDirty = useMemo(() => {
    const cellKeys = new Set([...Object.keys(cells), ...Object.keys(originalCells)]);
    for (const key of cellKeys) {
      if ((cells[key] || 0) !== (originalCells[key] || 0)) {
        return true;
      }
    }
    return false;
  }, [cells, originalCells]);

  // Generate week dates from weekStart
  const getWeekDates = useCallback((): Date[] => {
    if (!weekStart) return [];
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Load customer products and prices when customer changes
  useEffect(() => {
    if (!customerId || !siteId) {
      setProducts([]);
      setCells({});
      setPrices({});
      setShipStates({});
      setOriginalCells({});
      return;
    }

    loadCustomerData();
  }, [customerId, siteId]);

  // Load existing orders when week changes
  useEffect(() => {
    if (!customerId || !weekStart) return;
    loadExistingOrders();
  }, [customerId, weekStart]);

  const loadCustomerData = async () => {
    if (!customerId || !siteId) return;

    console.log('loadCustomerData called - customerId:', customerId, 'siteId:', siteId);
    setIsLoading(true);
    try {
      const url = `/api/planly/customers/${customerId}/order-history?siteId=${siteId}&months=3`;
      console.log('Fetching:', url);
      const res = await fetch(url);
      console.log('Response status:', res.status);

      if (res.ok) {
        const data: OrderHistoryResponse = await res.json();
        console.log('Loaded products:', data.products?.length, 'prices:', Object.keys(data.prices || {}).length);
        setProducts(data.products || []);
        setPrices(data.prices || {});

        // Set default ship states
        const defaultStates: Record<string, 'baked' | 'frozen'> = {};
        for (const product of data.products || []) {
          defaultStates[product.id] = product.default_ship_state;
        }
        setShipStates(defaultStates);
      } else {
        const errorText = await res.text();
        console.error('API error response:', errorText);
        toast.error('Failed to load customer products');
      }
    } catch (err) {
      console.error('Failed to load customer products:', err);
      toast.error('Failed to load customer products');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExistingOrders = async () => {
    if (!customerId || !weekStart) return;

    const weekDates = getWeekDates();
    if (weekDates.length === 0) return;

    const startDate = format(weekDates[0], 'yyyy-MM-dd');
    const endDate = format(weekDates[6], 'yyyy-MM-dd');

    try {
      const res = await fetch(
        `/api/planly/orders?customerId=${customerId}&startDate=${startDate}&endDate=${endDate}`
      );
      if (res.ok) {
        const orders: ExistingOrder[] = await res.json();

        const newCells: Record<string, number> = {};
        const newOrderIds: Record<string, string> = {};

        for (const order of orders) {
          newOrderIds[order.delivery_date] = order.id;
          for (const line of order.lines || []) {
            const key = `${line.product_id}:${order.delivery_date}`;
            newCells[key] = line.quantity;
          }
        }

        setCells(newCells);
        setOriginalCells({ ...newCells });
        setExistingOrderIds(newOrderIds);
      }
    } catch (err) {
      console.error('Failed to load existing orders:', err);
    }
  };

  const setCustomer = useCallback((id: string, name: string) => {
    setCustomerId(id);
    setCustomerName(name);
    // Reset grid when customer changes
    setCells({});
    setOriginalCells({});
    setExistingOrderIds({});
  }, []);

  const updateCell = useCallback((productId: string, date: string, value: number) => {
    setCells((prev) => ({
      ...prev,
      [`${productId}:${date}`]: value,
    }));
  }, []);

  const copyLastWeek = useCallback(async () => {
    if (!customerId || !weekStart) return;

    const lastWeekStart = subWeeks(weekStart, 1);
    const startDate = format(lastWeekStart, 'yyyy-MM-dd');
    const endDate = format(addDays(lastWeekStart, 6), 'yyyy-MM-dd');

    try {
      const res = await fetch(
        `/api/planly/orders?customerId=${customerId}&startDate=${startDate}&endDate=${endDate}`
      );
      if (res.ok) {
        const orders: ExistingOrder[] = await res.json();

        if (orders.length === 0) {
          toast.info('No orders found from last week');
          return;
        }

        const newCells: Record<string, number> = { ...cells };

        for (const order of orders) {
          // Calculate which day of week this was
          const orderDate = new Date(order.delivery_date);
          const dayOffset = Math.round(
            (orderDate.getTime() - lastWeekStart.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (dayOffset >= 0 && dayOffset < 7) {
            // Map to current week
            const currentDate = format(addDays(weekStart, dayOffset), 'yyyy-MM-dd');

            for (const line of order.lines || []) {
              const key = `${line.product_id}:${currentDate}`;
              newCells[key] = line.quantity;
            }
          }
        }

        setCells(newCells);
        toast.success('Copied orders from last week');
      }
    } catch (err) {
      console.error('Failed to copy last week:', err);
      toast.error('Failed to copy last week orders');
    }
  }, [customerId, weekStart, cells]);

  const copyDownColumn = useCallback(
    (dayIndex: number) => {
      if (!weekStart || products.length === 0) return;

      const date = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');

      // Find first non-zero value in this column
      let sourceValue = 0;
      for (const product of products) {
        const key = `${product.id}:${date}`;
        if (cells[key] && cells[key] > 0) {
          sourceValue = cells[key];
          break;
        }
      }

      if (sourceValue === 0) {
        toast.info('No value to copy in this column');
        return;
      }

      const newCells = { ...cells };
      for (const product of products) {
        const key = `${product.id}:${date}`;
        newCells[key] = sourceValue;
      }

      setCells(newCells);
      toast.success(`Filled column with ${sourceValue}`);
    },
    [weekStart, products, cells]
  );

  const copyAcrossRow = useCallback(
    (productId: string) => {
      if (!weekStart) return;

      const weekDates = getWeekDates();

      // Find first non-zero value in this row
      let sourceValue = 0;
      for (const date of weekDates) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const key = `${productId}:${dateStr}`;
        if (cells[key] && cells[key] > 0) {
          sourceValue = cells[key];
          break;
        }
      }

      if (sourceValue === 0) {
        toast.info('No value to copy in this row');
        return;
      }

      const newCells = { ...cells };
      for (const date of weekDates) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const key = `${productId}:${dateStr}`;
        newCells[key] = sourceValue;
      }

      setCells(newCells);
      toast.success(`Filled row with ${sourceValue}`);
    },
    [weekStart, cells, getWeekDates]
  );

  const clearAll = useCallback(() => {
    setCells({});
    toast.success('Cleared all entries');
  }, []);

  const markSaved = useCallback(() => {
    setOriginalCells({ ...cells });
  }, [cells]);

  const calculateRowTotal = useCallback(
    (productId: string): { quantity: number; value: number } => {
      const weekDates = getWeekDates();
      let quantity = 0;

      for (const date of weekDates) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const key = `${productId}:${dateStr}`;
        quantity += cells[key] || 0;
      }

      const price = prices[productId] || 0;
      return { quantity, value: quantity * price };
    },
    [cells, prices, getWeekDates]
  );

  const calculateDayTotal = useCallback(
    (date: Date): { quantity: number; value: number } => {
      const dateStr = format(date, 'yyyy-MM-dd');
      let quantity = 0;
      let value = 0;

      for (const product of products) {
        const key = `${product.id}:${dateStr}`;
        const qty = cells[key] || 0;
        quantity += qty;
        value += qty * (prices[product.id] || 0);
      }

      return { quantity, value };
    },
    [products, cells, prices]
  );

  const calculateGrandTotal = useCallback((): {
    quantity: number;
    value: number;
    days: number;
  } => {
    const weekDates = getWeekDates();
    let quantity = 0;
    let value = 0;
    const daysWithOrders = new Set<string>();

    for (const date of weekDates) {
      const dateStr = format(date, 'yyyy-MM-dd');
      for (const product of products) {
        const key = `${product.id}:${dateStr}`;
        const qty = cells[key] || 0;
        if (qty > 0) {
          quantity += qty;
          value += qty * (prices[product.id] || 0);
          daysWithOrders.add(dateStr);
        }
      }
    }

    return { quantity, value, days: daysWithOrders.size };
  }, [products, cells, prices, getWeekDates]);

  return {
    customerId,
    customerName,
    products,
    cells,
    prices,
    shipStates,
    isDirty,
    isLoading,
    existingOrderIds,
    setCustomer,
    updateCell,
    copyLastWeek,
    copyDownColumn,
    copyAcrossRow,
    clearAll,
    markSaved,
    getWeekDates,
    calculateRowTotal,
    calculateDayTotal,
    calculateGrandTotal,
  };
}
