"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { 
  Lightbulb,
  Loader2,
  Check,
  Clock,
  Package,
  Leaf,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface Suggestion {
  stock_item_id: string;
  item_name: string;
  current_quantity: number;
  suggested_quantity: number;
  unit_price: number;
  line_total: number;
  stock_unit: string;
  shelf_life_days: number | null;
  is_perishable: boolean;
  days_until_reorder: number | null;
  avg_daily_usage: number;
  suggestion_reason: string;
  priority_score: number;
  selected: boolean;
}

interface SmartOrderSuggestionsProps {
  supplierId: string;
  currentTotal: number;
  minimumOrder: number;
  onAddItems: (items: { stock_item_id: string; quantity: number; unit_price: number; name: string; unit: string }[]) => void;
  existingItemIds: string[]; // Items already in the order
}

export default function SmartOrderSuggestions({
  supplierId,
  currentTotal,
  minimumOrder,
  onAddItems,
  existingItemIds
}: SmartOrderSuggestionsProps) {
  const { companyId } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  
  const shortfall = Math.max(0, minimumOrder - currentTotal);
  const isAboveMinimum = currentTotal >= minimumOrder;

  useEffect(() => {
    if (supplierId && companyId && !isAboveMinimum) {
      loadSuggestions();
    }
  }, [supplierId, companyId, shortfall]);

  async function loadSuggestions() {
    if (!supplierId || !companyId) return;
    setLoading(true);
    
    try {
      // Try to use the smart function (try public wrapper first, then stockly)
      let data, error;
      const publicResult = await supabase.rpc('get_order_padding_suggestions', {
        p_supplier_id: supplierId,
        p_company_id: companyId,
        p_shortfall: shortfall
      });
      
      if (publicResult.error) {
        // Fallback to stockly schema
        const stocklyResult = await supabase.rpc('stockly.get_order_padding_suggestions', {
          p_supplier_id: supplierId,
          p_company_id: companyId,
          p_shortfall: shortfall
        });
        data = stocklyResult.data;
        error = stocklyResult.error;
      } else {
        data = publicResult.data;
        error = publicResult.error;
      }

      if (error) {
        console.error('Error loading smart suggestions:', error);
        // Fall back to basic query
        // Get stock items that have product variants for this supplier
        const { data: variantData } = await supabase
          .schema('stockly')
          .from('product_variants')
          .select('stock_item_id, unit_price')
          .eq('supplier_id', supplierId)
          .eq('is_discontinued', false);
        
        const supplierItemIds = (variantData || []).map(v => v.stock_item_id);
        
        if (supplierItemIds.length === 0) {
          setSuggestions([]);
          return;
        }
        
        const { data: basicData } = await supabase
          .schema('stockly')
          .from('stock_items')
          .select(`
            id, name, stock_unit, shelf_life_days, is_perishable,
            reorder_point, par_level, avg_daily_usage, days_until_reorder,
            stock_levels(quantity)
          `)
          .eq('company_id', companyId)
          .eq('is_active', true)
          .in('id', supplierItemIds)
          .limit(15);
        
        // Create a map of variant prices by stock_item_id
        const variantPriceMap = new Map(
          (variantData || []).map(v => [v.stock_item_id, v.unit_price])
        );
        
        const fallbackSuggestions = (basicData || [])
          .filter(item => {
            // Exclude items already in the order
            if (existingItemIds.includes(item.id)) return false;
            const qty = item.stock_levels?.[0]?.quantity || 0;
            const par = item.par_level || (item.reorder_point || 0) * 2;
            return qty < par;
          })
          .map(item => {
            const qty = item.stock_levels?.[0]?.quantity || 0;
            const suggestedQty = Math.max(1, (item.par_level || 10) - qty);
            const unitPrice = variantPriceMap.get(item.id) || 0;
            return {
              stock_item_id: item.id,
              item_name: item.name,
              current_quantity: qty,
              suggested_quantity: suggestedQty,
              unit_price: unitPrice,
              line_total: suggestedQty * unitPrice,
              stock_unit: item.stock_unit,
            shelf_life_days: item.shelf_life_days,
            is_perishable: item.is_perishable || false,
            days_until_reorder: item.days_until_reorder,
            avg_daily_usage: item.avg_daily_usage || 0,
            suggestion_reason: item.shelf_life_days && item.shelf_life_days > 90 
              ? `Long shelf life (${item.shelf_life_days} days)` 
              : 'Below target level',
            priority_score: item.shelf_life_days || 30,
            selected: false
            };
          })
          .map(s => ({ ...s, line_total: s.suggested_quantity * s.unit_price }));
        
        setSuggestions(fallbackSuggestions);
      } else {
        // Filter out items already in order
        const filtered = (data || [])
          .filter((s: any) => !existingItemIds.includes(s.stock_item_id))
          .map((s: any) => ({ ...s, selected: false }));
        
        setSuggestions(filtered);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(itemId: string) {
    setSuggestions(prev => prev.map(s => 
      s.stock_item_id === itemId ? { ...s, selected: !s.selected } : s
    ));
  }

  function selectRecommended() {
    let runningTotal = currentTotal;
    setSuggestions(prev => prev.map(s => {
      if (runningTotal < minimumOrder && s.line_total > 0) {
        runningTotal += s.line_total;
        return { ...s, selected: true };
      }
      return { ...s, selected: false };
    }));
  }

  function handleAddSelected() {
    const selectedItems = suggestions
      .filter(s => s.selected)
      .map(s => ({
        stock_item_id: s.stock_item_id,
        quantity: s.suggested_quantity,
        unit_price: s.unit_price,
        name: s.item_name,
        unit: s.stock_unit
      }));
    
    if (selectedItems.length > 0) {
      onAddItems(selectedItems);
      // Clear selections
      setSuggestions(prev => prev.map(s => ({ ...s, selected: false })));
    }
  }

  const selectedTotal = suggestions
    .filter(s => s.selected)
    .reduce((sum, s) => sum + s.line_total, 0);
  
  const newTotal = currentTotal + selectedTotal;
  const wouldMeetMinimum = newTotal >= minimumOrder;

  // Don't show if already above minimum
  if (isAboveMinimum) return null;

  // Don't show if no supplier selected
  if (!supplierId) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 font-medium">Smart Suggestions</span>
              <span className="text-yellow-400/60 text-sm">
                £{shortfall.toFixed(2)} below minimum
              </span>
            </div>
            <p className="text-yellow-400/60 text-xs">
              Items you'll need anyway - no wastage risk
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-yellow-400/60" />
        ) : (
          <ChevronDown className="w-5 h-5 text-yellow-400/60" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-yellow-500/20">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-4 text-center">
              <Package className="w-8 h-8 text-yellow-400/40 mx-auto mb-2" />
              <p className="text-yellow-400/60 text-sm">
                No additional items from this supplier
              </p>
            </div>
          ) : (
            <>
              {/* Quick action */}
              <div className="px-4 py-2 bg-yellow-500/5 flex items-center justify-between">
                <button
                  onClick={selectRecommended}
                  className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                >
                  <Sparkles className="w-4 h-4" />
                  Auto-select to reach minimum
                </button>
                {suggestions.some(s => s.selected) && (
                  <button
                    onClick={() => setSuggestions(prev => prev.map(s => ({ ...s, selected: false })))}
                    className="text-sm text-white/40 hover:text-white/60"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Suggestions list */}
              <div className="max-h-64 overflow-y-auto divide-y divide-yellow-500/10">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.stock_item_id}
                    className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors ${
                      suggestion.selected ? 'bg-yellow-500/10' : ''
                    }`}
                    onClick={() => toggleSelection(suggestion.stock_item_id)}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                      suggestion.selected 
                        ? 'bg-yellow-500 border-yellow-500' 
                        : 'border-yellow-500/40'
                    }`}>
                      {suggestion.selected && <Check className="w-3 h-3 text-black" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm truncate">
                          {suggestion.item_name}
                        </span>
                        {/* Badges */}
                        {suggestion.shelf_life_days && suggestion.shelf_life_days >= 180 && (
                          <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                            Long life
                          </span>
                        )}
                        {suggestion.days_until_reorder !== null && suggestion.days_until_reorder <= 14 && (
                          <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {suggestion.days_until_reorder}d
                          </span>
                        )}
                        {!suggestion.is_perishable && (
                          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                            Non-perishable
                          </span>
                        )}
                      </div>
                      <p className="text-white/40 text-xs mt-0.5">
                        {suggestion.suggestion_reason}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-white font-medium">
                        £{suggestion.line_total.toFixed(2)}
                      </p>
                      <p className="text-white/40 text-xs">
                        {suggestion.suggested_quantity} × £{suggestion.unit_price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer with totals */}
              {suggestions.some(s => s.selected) && (
                <div className="px-4 py-3 bg-yellow-500/10 border-t border-yellow-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white/60 text-sm">
                        {suggestions.filter(s => s.selected).length} items selected
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-white/40 text-xs">
                          Current: £{currentTotal.toFixed(2)}
                        </span>
                        <span className="text-white/40">→</span>
                        <span className={`text-sm font-medium ${wouldMeetMinimum ? 'text-green-400' : 'text-white'}`}>
                          New: £{newTotal.toFixed(2)}
                        </span>
                        {wouldMeetMinimum && (
                          <Check className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleAddSelected}
                      className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Add £{selectedTotal.toFixed(2)}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

