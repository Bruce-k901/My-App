"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { 
  Trash2, 
  Search, 
  Plus, 
  Loader2,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';

interface StockItem {
  id: string;
  name: string;
  stock_unit: string;
  current_quantity?: number;
  unit_cost?: number;
}

interface WasteLine {
  stock_item_id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_value: number;
  reason: string;
  notes: string;
}

const WASTE_REASONS = [
  { value: 'expired', label: 'Expired', icon: '📅' },
  { value: 'damaged', label: 'Damaged', icon: '💔' },
  { value: 'spoiled', label: 'Spoiled', icon: '🤢' },
  { value: 'spillage', label: 'Spillage', icon: '💧' },
  { value: 'theft', label: 'Theft/Loss', icon: '🚨' },
  { value: 'other', label: 'Other', icon: '📝' },
];

interface QuickWastePanelProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function QuickWastePanel({ onComplete, onCancel }: QuickWastePanelProps) {
  const { companyId, siteId, userId } = useAppContext();
  const [saving, setSaving] = useState(false);
  
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [lines, setLines] = useState<WasteLine[]>([]);
  const [wastageDate, setWastageDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  useEffect(() => {
    if (companyId) {
      loadStockItems();
    }
  }, [companyId]);

  async function loadStockItems() {
    // Load items with current stock levels and costs
    const { data } = await supabase
      .schema('stockly')
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
      current_quantity: item.stock_levels?.[0]?.quantity || 0,
      unit_cost: item.product_variants?.[0]?.unit_price || 0
    }));
    
    setStockItems(items);
  }

  function addLine(item: StockItem) {
    const newLine: WasteLine = {
      stock_item_id: item.id,
      name: item.name,
      quantity: 1,
      unit: item.stock_unit,
      unit_cost: item.unit_cost || 0,
      total_value: item.unit_cost || 0,
      reason: 'spoiled',
      notes: ''
    };
    setLines([...lines, newLine]);
    setShowItemSearch(false);
    setItemSearch('');
  }

  function updateLine(index: number, updates: Partial<WasteLine>) {
    const updated = [...lines];
    updated[index] = { ...updated[index], ...updates };
    // Recalculate total
    updated[index].total_value = updated[index].quantity * updated[index].unit_cost;
    setLines(updated);
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  const totalValue = lines.reduce((sum, line) => sum + line.total_value, 0);

  async function handleSave() {
    if (!companyId || lines.length === 0) return;
    setSaving(true);

    try {
      // Group lines by reason to create waste logs
      const linesByReason = lines.reduce((acc, line) => {
        if (!acc[line.reason]) {
          acc[line.reason] = [];
        }
        acc[line.reason].push(line);
        return acc;
      }, {} as Record<string, typeof lines>);

      // Create a waste log for each reason
      for (const [reason, reasonLines] of Object.entries(linesByReason)) {
        // Calculate total cost for this reason
        const totalCost = reasonLines.reduce((sum, line) => sum + line.total_value, 0);

        // Create waste log
        const { data: wasteLog, error: logError } = await supabase
          .schema('stockly')
          .from('waste_logs')
          .insert({
            company_id: companyId,
            site_id: siteId,
            waste_date: wastageDate,
            waste_reason: reason,
            total_cost: totalCost,
            recorded_by: userId,
            notes: reasonLines.map(l => l.notes).filter(Boolean).join('; ') || null
          })
          .select()
          .single();

        if (logError) throw logError;

        // Create waste log lines
        for (const line of reasonLines) {
          await supabase
            .schema('stockly')
            .from('waste_log_lines')
            .insert({
              waste_log_id: wasteLog.id,
              stock_item_id: line.stock_item_id,
              quantity: line.quantity,
              unit_cost: line.unit_cost,
              line_cost: line.total_value,
              specific_reason: line.reason,
              notes: line.notes || null
            });

          // Update stock level
          const { data: existing } = await supabase
            .schema('stockly')
            .from('stock_levels')
            .select('id, quantity')
            .eq('stock_item_id', line.stock_item_id)
            .eq('site_id', siteId)
            .single();

          if (existing) {
            await supabase
              .schema('stockly')
              .from('stock_levels')
              .update({ quantity: Math.max(0, existing.quantity - line.quantity) })
              .eq('id', existing.id);
          }

          // Record movement
          await supabase
            .schema('stockly')
            .from('stock_movements')
            .insert({
              company_id: companyId,
              stock_item_id: line.stock_item_id,
              movement_type: 'waste',
              quantity: -line.quantity,
              unit_cost: line.unit_cost,
              reference_type: 'waste_log',
              reference_id: wasteLog.id,
              notes: `${line.reason}: ${line.notes || 'No notes'}`
            });
        }
      }

      onComplete();
    } catch (error) {
      console.error('Error saving wastage:', error);
      alert('Failed to save wastage');
    } finally {
      setSaving(false);
    }
  }

  const filteredItems = stockItems.filter(item =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase()) &&
    !lines.some(l => l.stock_item_id === item.id)
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 space-y-4 flex-1 overflow-y-auto">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">Date</label>
          <input
            type="date"
            value={wastageDate}
            onChange={(e) => setWastageDate(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-magenta-500"
          />
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-white/80">Wasted Items</label>
            <button
              onClick={() => setShowItemSearch(true)}
              className="flex items-center gap-1 text-sm text-magenta-400 hover:text-magenta-300"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {lines.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-lg p-8 text-center">
              <Trash2 className="w-10 h-10 text-white/20 mx-auto mb-2" />
              <p className="text-white/40 text-sm">No waste items added</p>
              <button
                onClick={() => setShowItemSearch(true)}
                className="mt-2 text-magenta-400 text-sm hover:underline"
              >
                Add an item
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-white font-medium">{line.name}</p>
                    <button
                      onClick={() => removeLine(idx)}
                      className="p-1 text-white/40 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-xs text-white/40">Quantity ({line.unit})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/40">Value</label>
                      <p className="px-2 py-1 text-red-400 text-sm font-medium">
                        -£{line.total_value.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <label className="text-xs text-white/40">Reason</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {WASTE_REASONS.map(reason => (
                        <button
                          key={reason.value}
                          onClick={() => updateLine(idx, { reason: reason.value })}
                          className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                            line.reason === reason.value
                              ? 'bg-magenta-500/20 text-magenta-400 border border-magenta-500/50'
                              : 'bg-white/5 text-white/60 border border-transparent hover:bg-white/10'
                          }`}
                        >
                          <span>{reason.icon}</span>
                          {reason.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-white/40">Notes</label>
                    <input
                      type="text"
                      value={line.notes}
                      onChange={(e) => updateLine(idx, { notes: e.target.value })}
                      placeholder="Optional details..."
                      className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm placeholder:text-white/30"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total */}
        {lines.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-medium">Total Waste Value</span>
            </div>
            <p className="text-2xl font-bold text-red-400">-£{totalValue.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 flex items-center gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || lines.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          Record Waste
        </button>
      </div>

      {/* Item Search Modal */}
      {showItemSearch && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-20">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl w-full max-w-md max-h-[60vh] flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <Search className="w-5 h-5 text-white/40" />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search stock items..."
                autoFocus
                className="flex-1 bg-transparent text-white placeholder:text-white/40 focus:outline-none"
              />
              <button onClick={() => setShowItemSearch(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {filteredItems.slice(0, 20).map(item => (
                <button
                  key={item.id}
                  onClick={() => addLine(item)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 rounded-lg text-left"
                >
                  <div>
                    <span className="text-white">{item.name}</span>
                    <span className="text-white/40 text-xs ml-2">
                      {item.current_quantity} in stock
                    </span>
                  </div>
                  <span className="text-white/40 text-sm">£{item.unit_cost?.toFixed(2)}/{item.stock_unit}</span>
                </button>
              ))}
              {filteredItems.length === 0 && (
                <p className="p-4 text-center text-white/40">No items found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
