"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, TrendingUp, TrendingDown, RefreshCw, ShoppingCart, Trash2, ClipboardList, ArrowRightLeft, Loader2 } from '@/components/ui/icons';
import { formatDistanceToNow, format } from 'date-fns';

interface StockMovement {
  id: string;
  movement_type: string;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  notes: string | null;
  recorded_at: string;
  recorded_by: string | null;
  ref_type: string | null;
}

interface PriceChange {
  id: string;
  old_unit_cost: number | null;
  new_unit_cost: number;
  old_pack_cost: number | null;
  new_pack_cost: number | null;
  change_percent: number | null;
  change_source: string | null;
  changed_at: string;
  changed_by: string | null;
  notes: string | null;
}

interface IngredientHistoryPanelProps {
  ingredientId: string;
  companyId: string;
}

const MOVEMENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  purchase: { label: 'Purchase', icon: ShoppingCart, color: 'text-emerald-500' },
  waste: { label: 'Waste', icon: Trash2, color: 'text-red-500' },
  count_adjustment: { label: 'Stock Count', icon: ClipboardList, color: 'text-blue-500' },
  adjustment: { label: 'Adjustment', icon: RefreshCw, color: 'text-amber-500' },
  transfer_in: { label: 'Transfer In', icon: ArrowRightLeft, color: 'text-purple-500' },
  transfer_out: { label: 'Transfer Out', icon: ArrowRightLeft, color: 'text-purple-500' },
  production_out: { label: 'Production', icon: Package, color: 'text-orange-500' },
  production_in: { label: 'Produced', icon: Package, color: 'text-teal-500' },
  pos_drawdown: { label: 'Sale', icon: ShoppingCart, color: 'text-cyan-500' },
  internal_sale: { label: 'Internal Sale', icon: ShoppingCart, color: 'text-indigo-500' },
  staff_sale: { label: 'Staff Sale', icon: ShoppingCart, color: 'text-[#D37E91]' },
  return_supplier: { label: 'Return', icon: ArrowRightLeft, color: 'text-gray-500' },
};

export function IngredientHistoryPanel({ ingredientId, companyId }: IngredientHistoryPanelProps) {
  const [loading, setLoading] = useState(true);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceChange[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'movements' | 'prices'>('all');
  const [stockItemId, setStockItemId] = useState<string | null>(null);
  const [ingredientUnit, setIngredientUnit] = useState<string>('');

  // Check if this is a valid saved ingredient (not a temp ID)
  const isValidId = ingredientId && !ingredientId.startsWith('temp-') &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ingredientId);

  useEffect(() => {
    if (isValidId) {
      loadHistory();
    } else {
      setLoading(false);
    }
  }, [ingredientId, companyId, isValidId]);

  async function loadHistory() {
    setLoading(true);
    try {
      // Fetch the ingredient to get its unit
      const { data: ingredient } = await supabase
        .from('ingredients_library')
        .select('unit')
        .eq('id', ingredientId)
        .single();

      if (ingredient?.unit) {
        setIngredientUnit(ingredient.unit);
      }

      // First, find the stock_item_id for this ingredient (via public.stock_items view)
      const { data: stockItem, error: stockItemError } = await supabase
        .from('stock_items')
        .select('id')
        .eq('library_item_id', ingredientId)
        .eq('library_type', 'ingredients_library')
        .maybeSingle();

      let movements: StockMovement[] = [];

      if (stockItem && !stockItemError) {
        setStockItemId(stockItem.id);

        // Fetch stock movements for this stock item (via public.stock_movements view)
        const { data: movementsData, error: movementsError } = await supabase
          .from('stock_movements')
          .select('id, movement_type, quantity, unit_cost, total_cost, notes, recorded_at, recorded_by, ref_type')
          .eq('stock_item_id', stockItem.id)
          .order('recorded_at', { ascending: false })
          .limit(50);

        if (!movementsError && movementsData) {
          movements = movementsData;
        }
      }

      // Fetch price history for this ingredient (via public.ingredient_price_history view)
      const { data: priceData, error: priceError } = await supabase
        .from('ingredient_price_history')
        .select('id, old_unit_cost, new_unit_cost, old_pack_cost, new_pack_cost, change_percent, source, recorded_at, recorded_by, notes')
        .eq('ingredient_id', ingredientId)
        .order('recorded_at', { ascending: false })
        .limit(50);

      // Map the response to our interface (source -> change_source, recorded_at -> changed_at)
      const mappedPriceData: PriceChange[] = (priceData || []).map(p => ({
        id: p.id,
        old_unit_cost: p.old_unit_cost,
        new_unit_cost: p.new_unit_cost,
        old_pack_cost: p.old_pack_cost,
        new_pack_cost: p.new_pack_cost,
        change_percent: p.change_percent,
        change_source: p.source,
        changed_at: p.recorded_at,
        changed_by: p.recorded_by,
        notes: p.notes,
      }));

      setStockMovements(movements);
      setPriceHistory(mappedPriceData);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'dd MMM yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  const formatRelativeDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  const getMovementConfig = (type: string) => {
    return MOVEMENT_TYPE_CONFIG[type] || { label: type, icon: Package, color: 'text-gray-500' };
  };

  // Don't render anything for unsaved ingredients
  if (!isValidId) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
        <span className="ml-2 text-sm text-gray-500 dark:text-white/50">Loading history...</span>
      </div>
    );
  }

  const hasMovements = stockMovements.length > 0;
  const hasPrices = priceHistory.length > 0;
  const hasAnyHistory = hasMovements || hasPrices;

  if (!hasAnyHistory) {
    return (
      <div className="text-center py-6 text-sm text-gray-500 dark:text-white/40">
        No history recorded yet
      </div>
    );
  }

  // Combine and sort for "all" view
  const combinedHistory = [
    ...stockMovements.map(m => ({ type: 'movement' as const, data: m, date: m.recorded_at })),
    ...priceHistory.map(p => ({ type: 'price' as const, data: p, date: p.changed_at })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3 md:col-span-2 lg:col-span-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-gray-700 dark:text-white/80 uppercase">History</div>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2 py-1 text-xs rounded transition ${
              activeTab === 'all'
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-2 py-1 text-xs rounded transition ${
              activeTab === 'movements'
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            Stock
          </button>
          <button
            onClick={() => setActiveTab('prices')}
            className={`px-2 py-1 text-xs rounded transition ${
              activeTab === 'prices'
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            Prices
          </button>
        </div>
      </div>

      {activeTab === 'all' ? (
        // Combined feed view
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {combinedHistory.slice(0, 20).map((item, idx) => (
            <div key={`${item.type}-${item.type === 'movement' ? item.data.id : item.data.id}-${idx}`}>
              {item.type === 'movement' ? (
                <MovementItem movement={item.data as StockMovement} formatDate={formatDate} formatRelativeDate={formatRelativeDate} getMovementConfig={getMovementConfig} unit={ingredientUnit} />
              ) : (
                <PriceItem price={item.data as PriceChange} formatDate={formatDate} formatRelativeDate={formatRelativeDate} />
              )}
            </div>
          ))}
        </div>
      ) : (
        // Two-column layout for filtered views
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stock Movements Column */}
          {(activeTab === 'movements' || activeTab === 'all') && (
            <div className={activeTab === 'all' ? '' : 'md:col-span-2'}>
              {activeTab !== 'all' && (
                <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-2 flex items-center gap-1">
                  <Package size={12} />
                  Stock Movements
                </div>
              )}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stockMovements.length === 0 ? (
                  <div className="text-xs text-gray-400 dark:text-white/30 text-center py-4">
                    No stock movements recorded
                  </div>
                ) : (
                  stockMovements.slice(0, 20).map((movement) => (
                    <MovementItem
                      key={movement.id}
                      movement={movement}
                      formatDate={formatDate}
                      formatRelativeDate={formatRelativeDate}
                      getMovementConfig={getMovementConfig}
                      unit={ingredientUnit}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Price History Column */}
          {(activeTab === 'prices' || activeTab === 'all') && (
            <div className={activeTab === 'all' ? '' : 'md:col-span-2'}>
              {activeTab !== 'all' && (
                <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-2 flex items-center gap-1">
                  <TrendingUp size={12} />
                  Price Changes
                </div>
              )}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {priceHistory.length === 0 ? (
                  <div className="text-xs text-gray-400 dark:text-white/30 text-center py-4">
                    No price changes recorded
                  </div>
                ) : (
                  priceHistory.slice(0, 20).map((price) => (
                    <PriceItem
                      key={price.id}
                      price={price}
                      formatDate={formatDate}
                      formatRelativeDate={formatRelativeDate}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Movement item component
function MovementItem({
  movement,
  formatDate,
  formatRelativeDate,
  getMovementConfig,
  unit
}: {
  movement: StockMovement;
  formatDate: (d: string) => string;
  formatRelativeDate: (d: string) => string;
  getMovementConfig: (type: string) => { label: string; icon: React.ElementType; color: string };
  unit: string;
}) {
  const config = getMovementConfig(movement.movement_type);
  const Icon = config.icon;
  const isPositive = ['purchase', 'transfer_in', 'production_in', 'count_adjustment'].includes(movement.movement_type) && movement.quantity > 0;
  const isNegative = ['waste', 'transfer_out', 'production_out', 'pos_drawdown', 'internal_sale', 'staff_sale', 'return_supplier'].includes(movement.movement_type) || movement.quantity < 0;

  // Format quantity with unit - show whole numbers if no decimals needed
  const formatQuantity = (qty: number): string => {
    const absQty = Math.abs(qty);
    const formatted = absQty % 1 === 0 ? absQty.toFixed(0) : absQty.toFixed(2);
    return formatted;
  };

  // Clean up notes - remove any technical conversion info and extract just the delivery reference
  const cleanNotes = (notes: string | null): string | null => {
    if (!notes) return null;
    // Remove conversion calculations like "[Converted: 0.001 packs × 1000 pack_size]"
    let cleaned = notes.replace(/\s*\[Converted:.*?\]/gi, '').trim();
    // Also remove the old format "(qty: X packs × Y = Z base units)"
    cleaned = cleaned.replace(/\s*\(qty:.*?base units\)/gi, '').trim();
    return cleaned || null;
  };

  return (
    <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-white/[0.02] rounded-lg border border-gray-100 dark:border-white/[0.04]">
      <div className={`p-1.5 rounded-md bg-white dark:bg-white/[0.05] ${config.color}`}>
        <Icon size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700 dark:text-white/80">{config.label}</span>
          <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : isNegative ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-white/60'}`}>
            {isPositive ? '+' : isNegative ? '-' : ''}{formatQuantity(movement.quantity)}{unit && ` ${unit}`}
          </span>
          {movement.total_cost != null && movement.total_cost > 0 && (
            <span className="text-xs text-gray-500 dark:text-white/40">
              (£{movement.total_cost.toFixed(2)})
            </span>
          )}
        </div>
        {cleanNotes(movement.notes) && (
          <div className="text-xs text-gray-500 dark:text-white/40 truncate mt-0.5">{cleanNotes(movement.notes)}</div>
        )}
        <div className="text-[10px] text-gray-400 dark:text-white/30 mt-1" title={formatDate(movement.recorded_at)}>
          {formatRelativeDate(movement.recorded_at)}
        </div>
      </div>
    </div>
  );
}

// Price item component
function PriceItem({
  price,
  formatDate,
  formatRelativeDate
}: {
  price: PriceChange;
  formatDate: (d: string) => string;
  formatRelativeDate: (d: string) => string;
}) {
  const isIncrease = price.old_unit_cost != null && price.new_unit_cost > price.old_unit_cost;
  const isDecrease = price.old_unit_cost != null && price.new_unit_cost < price.old_unit_cost;
  const Icon = isIncrease ? TrendingUp : isDecrease ? TrendingDown : RefreshCw;

  return (
    <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-white/[0.02] rounded-lg border border-gray-100 dark:border-white/[0.04]">
      <div className={`p-1.5 rounded-md bg-white dark:bg-white/[0.05] ${isIncrease ? 'text-red-500' : isDecrease ? 'text-emerald-500' : 'text-blue-500'}`}>
        <Icon size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-700 dark:text-white/80">Price Change</span>
          {price.old_unit_cost != null && (
            <>
              <span className="text-xs text-gray-400 dark:text-white/30 line-through">
                £{price.old_unit_cost.toFixed(2)}
              </span>
              <span className="text-gray-400 dark:text-white/30">→</span>
            </>
          )}
          <span className={`text-xs font-semibold ${isIncrease ? 'text-red-600 dark:text-red-400' : isDecrease ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-white/60'}`}>
            £{price.new_unit_cost.toFixed(2)}
          </span>
          {price.change_percent != null && (
            <span className={`text-[10px] px-1 py-0.5 rounded ${isIncrease ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
              {isIncrease ? '+' : ''}{price.change_percent.toFixed(1)}%
            </span>
          )}
        </div>
        {price.change_source && (
          <div className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
            Source: {price.change_source}
          </div>
        )}
        {price.notes && (
          <div className="text-xs text-gray-500 dark:text-white/40 truncate mt-0.5">{price.notes}</div>
        )}
        <div className="text-[10px] text-gray-400 dark:text-white/30 mt-1" title={formatDate(price.changed_at)}>
          {formatRelativeDate(price.changed_at)}
        </div>
      </div>
    </div>
  );
}

export default IngredientHistoryPanel;
