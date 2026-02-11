"use client";

import { useState, useEffect, useRef } from 'react';

import { useAppContext } from '@/context/AppContext';

import { supabase } from '@/lib/supabase';

import { 
  ClipboardList, 
  Search, 
  Plus, 
  Loader2,
  Check,
  X,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus
} from '@/components/ui/icons';

interface StockItem {
  id: string;
  name: string;
  stock_unit: string;
  expected_quantity: number;
  unit_cost: number;
}

interface CountLine {
  stock_item_id: string;
  name: string;
  unit: string;
  expected: number;
  counted: number | null;
  variance: number;
  variance_value: number;
  unit_cost: number;
}

interface QuickStockCountPanelProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function QuickStockCountPanel({ onComplete, onCancel }: QuickStockCountPanelProps) {
  const { companyId, siteId, userId } = useAppContext();
  const [saving, setSaving] = useState(false);
  
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [lines, setLines] = useState<CountLine[]>([]);
  const [countNotes, setCountNotes] = useState('');
  
  const [itemSearch, setItemSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (companyId) {
      loadStockItems();
    }
  }, [companyId]);

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadStockItems() {
    const { data } = await supabase
      .from('stock_items')
      .select(`
        id, name, stock_unit,
        stock_levels(quantity),
        product_variants(unit_price)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');
    
    const items = (data || []).map(item => ({
      id: item.id,
      name: item.name,
      stock_unit: item.stock_unit,
      expected_quantity: item.stock_levels?.[0]?.quantity || 0,
      unit_cost: item.product_variants?.[0]?.unit_price || 0
    }));
    
    setStockItems(items);
  }

  function addLine(item: StockItem) {
    const newLine: CountLine = {
      stock_item_id: item.id,
      name: item.name,
      unit: item.stock_unit,
      expected: item.expected_quantity,
      counted: null,
      variance: 0,
      variance_value: 0,
      unit_cost: item.unit_cost
    };
    setLines([...lines, newLine]);
    setItemSearch('');
    setShowSearchResults(false);
    searchInputRef.current?.focus();
  }

  function updateLine(index: number, counted: number | null) {
    const updated = [...lines];
    updated[index].counted = counted;
    if (counted !== null) {
      updated[index].variance = counted - updated[index].expected;
      updated[index].variance_value = updated[index].variance * updated[index].unit_cost;
    } else {
      updated[index].variance = 0;
      updated[index].variance_value = 0;
    }
    setLines(updated);
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  const countedLines = lines.filter(l => l.counted !== null);
  const totalVariance = countedLines.reduce((sum, l) => sum + l.variance_value, 0);
  const shrinkageCount = countedLines.filter(l => l.variance < 0).length;
  const overageCount = countedLines.filter(l => l.variance > 0).length;

  const filteredItems = stockItems.filter(item =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase()) &&
    !lines.some(l => l.stock_item_id === item.id)
  ).slice(0, 8);

  async function handleSave() {
    if (!companyId || countedLines.length === 0) return;
    setSaving(true);

    try {
      // Generate count number
      const { data: countData } = await supabase.rpc('stockly.generate_count_number', {
        p_company_id: companyId
      });

      // Create stock count record
      const { data: stockCount, error: countError } = await supabase
        .from('stock_counts')
        .insert({
          company_id: companyId,
          site_id: siteId,
          count_number: countData || `SC-${Date.now()}`,
          count_type: 'spot',
          status: 'approved',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
          counted_by: userId,
          approved_by: userId,
          total_items: lines.length,
          items_counted: countedLines.length,
          variance_value: totalVariance,
          notes: countNotes || 'Quick spot check'
        })
        .select()
        .single();

      if (countError) throw countError;

      // Create count items
      const items = lines.map(line => ({
        stock_count_id: stockCount.id,
        stock_item_id: line.stock_item_id,
        expected_quantity: line.expected,
        counted_quantity: line.counted,
        unit_cost: line.unit_cost,
        is_counted: line.counted !== null,
        counted_at: line.counted !== null ? new Date().toISOString() : null,
        counted_by: line.counted !== null ? userId : null
      }));

      await supabase
        .from('stock_count_items')
        .insert(items);

      // Update stock levels for counted items with variance
      for (const line of countedLines) {
        if (line.variance !== 0) {
          // Update stock level to counted amount
          const { data: existing } = await supabase
            .from('stock_levels')
            .select('id')
            .eq('stock_item_id', line.stock_item_id)
            .eq('site_id', siteId)
            .single();

          if (existing) {
            await supabase
              .from('stock_levels')
              .update({ 
                quantity: line.counted,
                last_count_date: new Date().toISOString().split('T')[0],
                last_count_quantity: line.counted
              })
              .eq('id', existing.id);
          }

          // Record adjustment movement
          await supabase
            .from('stock_movements')
            .insert({
              company_id: companyId,
              stock_item_id: line.stock_item_id,
              movement_type: 'count_adjustment',
              quantity: line.variance,
              unit_cost: line.unit_cost,
              reference_type: 'stock_count',
              reference_id: stockCount.id,
              notes: `Spot check adjustment`
            });
        }
      }

      onComplete();
    } catch (error) {
      console.error('Error saving stock count:', error);
      alert('Failed to save count');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with inline search */}
      <div className="p-4 border-b border-white/10">
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              ref={searchInputRef}
              type="text"
              value={itemSearch}
              onChange={(e) => {
                setItemSearch(e.target.value);
                setShowSearchResults(e.target.value.length > 0);
              }}
              onFocus={() => {
                if (itemSearch.length > 0) {
                  setShowSearchResults(true);
                }
              }}
              placeholder="Search and add items..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-magenta-500 transition-colors"
            />
          </div>

          {/* Inline search results dropdown */}
          {showSearchResults && filteredItems.length > 0 && (
            <div
              ref={searchResultsRef}
              className="absolute z-50 w-full mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl max-h-64 overflow-y-auto"
            >
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => addLine(item)}
                  className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors text-left first:rounded-t-lg last:rounded-b-lg"
                >
                  <span className="text-white text-sm font-medium">{item.name}</span>
                  <span className="text-white/40 text-xs">
                    {item.expected_quantity} {item.stock_unit}
                  </span>
                </button>
              ))}
            </div>
          )}

          {showSearchResults && itemSearch.length > 0 && filteredItems.length === 0 && (
            <div
              ref={searchResultsRef}
              className="absolute z-50 w-full mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl p-4 text-center"
            >
              <p className="text-white/40 text-sm">No items found</p>
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Summary Stats - Compact horizontal layout */}
          {countedLines.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 text-center">
                <p className="text-white/40 text-[10px] uppercase tracking-wide mb-0.5">Counted</p>
                <p className="text-lg font-bold text-white">{countedLines.length}</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-center">
                <p className="text-red-400/60 text-[10px] uppercase tracking-wide mb-0.5">Shrinkage</p>
                <p className="text-lg font-bold text-red-400">{shrinkageCount}</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5 text-center">
                <p className="text-green-400/60 text-[10px] uppercase tracking-wide mb-0.5">Overage</p>
                <p className="text-lg font-bold text-green-400">{overageCount}</p>
              </div>
            </div>
          )}

          {/* Items list - Compact table-like layout */}
          {lines.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-lg p-12 text-center">
              <ClipboardList className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm mb-1">No items to count</p>
              <p className="text-white/30 text-xs">Search above to add items for spot check</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Table header for larger screens */}
              <div className="hidden md:grid md:grid-cols-12 gap-2 px-3 py-2 text-xs text-white/40 uppercase tracking-wide border-b border-white/10">
                <div className="col-span-4">Item</div>
                <div className="col-span-2 text-right">Expected</div>
                <div className="col-span-2 text-right">Counted</div>
                <div className="col-span-2 text-right">Variance</div>
                <div className="col-span-2 text-right">Value</div>
              </div>

              {/* Items */}
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 hover:border-white/20 transition-colors"
                >
                  {/* Mobile layout */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{line.name}</p>
                        <p className="text-white/40 text-xs mt-0.5">
                          Expected: {line.expected} {line.unit}
                        </p>
                      </div>
                      <button
                        onClick={() => removeLine(idx)}
                        className="ml-2 p-1 text-white/40 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-white/40 mb-1 block">Actual Count</label>
                        <input
                          type="number"
                          step="0.01"
                          value={line.counted ?? ''}
                          onChange={(e) => updateLine(idx, e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="Enter..."
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-magenta-500"
                        />
                      </div>
                      
                      {line.counted !== null && (
                        <div className="text-right min-w-[80px]">
                          <div className="flex items-center justify-end gap-1 mb-0.5">
                            {line.variance < 0 ? (
                              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                            ) : line.variance > 0 ? (
                              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Minus className="w-3.5 h-3.5 text-white/40" />
                            )}
                            <span className={`text-sm font-semibold ${
                              line.variance < 0 ? 'text-red-400' : 
                              line.variance > 0 ? 'text-green-400' : 'text-white/40'
                            }`}>
                              {line.variance > 0 ? '+' : ''}{line.variance}
                            </span>
                          </div>
                          <p className={`text-xs ${
                            line.variance_value < 0 ? 'text-red-400' : 
                            line.variance_value > 0 ? 'text-green-400' : 'text-white/40'
                          }`}>
                            {line.variance_value >= 0 ? '+' : ''}£{line.variance_value.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop layout - table row */}
                  <div className="hidden md:grid md:grid-cols-12 gap-2 items-center">
                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => removeLine(idx)}
                        className="p-1 text-white/40 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-white font-medium text-sm truncate">{line.name}</p>
                    </div>
                    <div className="col-span-2 text-right text-white/60 text-sm">
                      {line.expected} {line.unit}
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        value={line.counted ?? ''}
                        onChange={(e) => updateLine(idx, e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Enter..."
                        className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-magenta-500"
                      />
                    </div>
                    {line.counted !== null ? (
                      <>
                        <div className="col-span-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {line.variance < 0 ? (
                              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                            ) : line.variance > 0 ? (
                              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Minus className="w-3.5 h-3.5 text-white/40" />
                            )}
                            <span className={`text-sm font-semibold ${
                              line.variance < 0 ? 'text-red-400' : 
                              line.variance > 0 ? 'text-green-400' : 'text-white/40'
                            }`}>
                              {line.variance > 0 ? '+' : ''}{line.variance}
                            </span>
                          </div>
                        </div>
                        <div className={`col-span-2 text-right text-sm font-medium ${
                          line.variance_value < 0 ? 'text-red-400' : 
                          line.variance_value > 0 ? 'text-green-400' : 'text-white/40'
                        }`}>
                          {line.variance_value >= 0 ? '+' : ''}£{line.variance_value.toFixed(2)}
                        </div>
                      </>
                    ) : (
                      <div className="col-span-4 text-right text-white/30 text-xs">—</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {lines.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Notes</label>
              <input
                type="text"
                value={countNotes}
                onChange={(e) => setCountNotes(e.target.value)}
                placeholder="Reason for spot check..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-magenta-500"
              />
            </div>
          )}

          {/* Total Variance - Compact */}
          {countedLines.length > 0 && (
            <div className={`border rounded-lg p-3 ${
              totalVariance < 0 
                ? 'bg-red-500/10 border-red-500/30' 
                : totalVariance > 0 
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-white/[0.03] border-white/[0.06]'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {totalVariance !== 0 && (
                    <AlertTriangle className={`w-4 h-4 ${
                      totalVariance < 0 ? 'text-red-400' : 'text-green-400'
                    }`} />
                  )}
                  <span className={`text-xs font-medium ${
                    totalVariance < 0 ? 'text-red-400' : 
                    totalVariance > 0 ? 'text-green-400' : 'text-white/60'
                  }`}>
                    Total Variance Value
                  </span>
                </div>
                <p className={`text-xl font-bold ${
                  totalVariance < 0 ? 'text-red-400' : 
                  totalVariance > 0 ? 'text-green-400' : 'text-white'
                }`}>
                  {totalVariance >= 0 ? '+' : ''}£{totalVariance.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 flex items-center gap-3 bg-[#0B0D13]/50 backdrop-blur-sm">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || countedLines.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-magenta-500 hover:bg-magenta-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save Count
            </>
          )}
        </button>
      </div>
    </div>
  );
}
