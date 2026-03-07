"use client";

import { useState, useMemo, useCallback } from 'react';
import { format, isValid, parseISO, addDays } from 'date-fns';
import { Package } from '@/components/ui/icons';
import { PackingPlanHeader } from '@/components/planly/packing-plan/PackingPlanHeader';
import { PackingPlanGrid } from '@/components/planly/packing-plan/PackingPlanGrid';
import { usePackingPlan, PackingPlanData } from '@/hooks/planly/usePackingPlan';
import { useAppContext } from '@/context/AppContext';
import '@/styles/packing-plan-print.css';

// Safe date formatting helper
function safeFormatDate(dateString: string, formatStr: string, fallback: string = 'Invalid date'): string {
  try {
    const date = parseISO(dateString);
    if (isValid(date)) {
      return format(date, formatStr);
    }
    return fallback;
  } catch {
    return fallback;
  }
}

interface GroupedProducts {
  id: string;
  name: string;
  icon?: string;
  priority?: number;
  products: Array<{
    id: string;
    name: string;
    bake_group_id?: string;
    sort_order?: number;
  }>;
}

function buildPackingGrid(data: PackingPlanData) {
  // Build quantity lookup map
  const quantityMap = new Map<string, number>();
  data.orderItems.forEach((item) => {
    const key = `${item.customer_id}-${item.product_id}`;
    quantityMap.set(key, (quantityMap.get(key) || 0) + item.quantity);
  });

  // Group products by bake group
  const groupedProducts: GroupedProducts[] = data.bakeGroups
    .map((bg) => ({
      id: bg.id,
      name: bg.name,
      icon: getBakeGroupIcon(bg.name),
      priority: bg.priority,
      products: data.products
        .filter((p) => p.bake_group_id === bg.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.products.length > 0);

  // Add ungrouped products
  const ungroupedProducts = data.products.filter((p) => !p.bake_group_id);
  if (ungroupedProducts.length > 0) {
    groupedProducts.push({
      id: 'ungrouped',
      name: 'Other',
      icon: '📦',
      priority: 999,
      products: ungroupedProducts.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  return {
    groupedProducts,
    customers: data.customers,
    products: data.products,
    quantityMap,
  };
}

// Map common bake group names to icons
function getBakeGroupIcon(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('croissant') || lowerName.includes('viennoiserie')) return '🥐';
  if (lowerName.includes('swirl') || lowerName.includes('danish')) return '🌀';
  if (lowerName.includes('cookie') || lowerName.includes('biscuit')) return '🍪';
  if (lowerName.includes('bread') || lowerName.includes('loaf')) return '🍞';
  if (lowerName.includes('cake') || lowerName.includes('muffin')) return '🧁';
  if (lowerName.includes('bun')) return '🥯';
  if (lowerName.includes('tart') || lowerName.includes('pie')) return '🥧';
  return '📦';
}

export default function PackingPlanPage() {
  const { siteId } = useAppContext();
  const [deliveryDate, setDeliveryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [transposed, setTransposed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data, isLoading, error, mutate } = usePackingPlan(deliveryDate, siteId || undefined);

  const gridData = useMemo(() => {
    if (!data || !data.orderItems || data.orderItems.length === 0) return null;
    return buildPackingGrid(data);
  }, [data]);

  const handleRefresh = useCallback(() => {
    mutate();
  }, [mutate]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleTranspose = useCallback(() => {
    setTransposed((prev) => !prev);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!siteId || isGenerating) return;

    try {
      setIsGenerating(true);

      // Generate orders for the next 7 days
      const today = new Date();
      const endDate = addDays(today, 7);

      const response = await fetch('/api/planly/standing-orders/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: format(today, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          site_id: siteId,
          auto_confirm: true, // Auto-confirm orders
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate orders');
      }

      const result = await response.json();

      // Show success message
      alert(
        `✅ Generated ${result.generated} orders from standing orders\n` +
        (result.skipped > 0 ? `⏭️ Skipped ${result.skipped} (already exist)` : '')
      );

      // Refresh the packing plan
      mutate();
    } catch (error: any) {
      console.error('Error generating orders:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [siteId, mutate, isGenerating]);

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-tertiary">Please select a site</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 packing-plan-container print-content">
      {/* Screen Header */}
      <div className="print:hidden">
        <PackingPlanHeader
          selectedDate={deliveryDate}
          onDateChange={setDeliveryDate}
          onRefresh={handleRefresh}
          onPrint={handlePrint}
          onGenerate={handleGenerate}
          transposed={transposed}
          onTranspose={handleTranspose}
          orderCount={data?.orderCount || 0}
          isLoading={isLoading}
          isGenerating={isGenerating}
        />
      </div>

      {/* Print-only Header - single line layout */}
      <div className="hidden print:flex print-header">
        <h1>Packing Plan</h1>
        <span>{safeFormatDate(deliveryDate, 'EEEE, d MMMM yyyy')}</span>
        <span>{data?.orderCount || 0} orders</span>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-theme-tertiary">Loading packing plan...</div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-red-500 dark:text-red-400">Error loading packing plan</div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!gridData || !data?.orderItems || data.orderItems.length === 0 || !gridData?.customers || gridData.customers.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 text-theme-tertiary">
          <Package className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg">No orders for {safeFormatDate(deliveryDate, 'd MMMM yyyy')}</p>
          <p className="text-sm mt-1">Select a different date or place some orders first</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && gridData && gridData.customers.length > 0 && (
        <PackingPlanGrid
          groupedProducts={gridData.groupedProducts}
          customers={gridData.customers}
          products={gridData.products}
          quantityMap={gridData.quantityMap}
          transposed={transposed}
        />
      )}
    </div>
  );
}
