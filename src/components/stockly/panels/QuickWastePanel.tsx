"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { ModuleReferences } from '@/lib/module-references';
import { StockItemSelector } from '@/components/stockly/StockItemSelector';
import { toast } from 'sonner';
import { 
  Trash2, 
  Plus, 
  Loader2,
  Check,
  X,
  AlertTriangle
} from '@/components/ui/icons';

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
  current_stock?: number; // Current stock level
  stock_warning?: boolean; // True if quantity > current stock
}

const WASTE_REASONS = [
  { value: 'expired', label: 'Expired', icon: '📅' },
  { value: 'damaged', label: 'Damaged', icon: '💔' },
  { value: 'quality', label: 'Quality/Spoiled', icon: '🤢' },
  { value: 'spillage', label: 'Spillage', icon: '💧' },
  { value: 'overproduction', label: 'Overproduction', icon: '📦' },
  { value: 'temperature_breach', label: 'Temperature Breach', icon: '🌡️' },
  { value: 'pest_damage', label: 'Pest Damage', icon: '🐛' },
  { value: 'theft', label: 'Theft/Loss', icon: '🚨' },
  { value: 'prep_waste', label: 'Prep Waste', icon: '🔪' },
  { value: 'customer_return', label: 'Customer Return', icon: '↩️' },
  { value: 'other', label: 'Other', icon: '📝' },
];

// Valid waste reasons according to database constraint
const VALID_WASTE_REASONS = new Set([
  'expired', 'damaged', 'spillage', 'overproduction', 
  'quality', 'customer_return', 'temperature_breach', 
  'pest_damage', 'theft', 'prep_waste', 'other'
]);

// Normalize old/invalid reason values to valid ones
function normalizeWasteReason(reason: string): string {
  // Map old/invalid values to valid ones
  if (reason === 'spoiled') return 'quality';
  if (VALID_WASTE_REASONS.has(reason)) return reason;
  return 'other'; // Default fallback
}

interface QuickWastePanelProps {
  onComplete: () => void;
  onCancel: () => void;
  taskId?: string; // Optional taskId for linking waste to tasks
}

export default function QuickWastePanel({ onComplete, onCancel, taskId }: QuickWastePanelProps) {
  const { companyId, siteId, userId, profile } = useAppContext();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  const [lines, setLines] = useState<WasteLine[]>([]);
  const [wastageDate, setWastageDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [showItemSearch, setShowItemSearch] = useState(false);

  async function getStockItemDetails(stockItemId: string): Promise<StockItem | null> {
    if (!companyId) return null;

    try {
      // Get stock item basic info
      const { data: item, error: itemError } = await supabase
        .from('stock_items')
        .select('id, name, stock_unit')
        .eq('id', stockItemId)
        .eq('company_id', companyId)
        .maybeSingle();

      if (itemError) throw itemError;
      if (!item) return null;

      // Get stock level - filter by site_id only if it's not null
      let stockLevelQuery = supabase
        .from('stock_levels')
        .select('quantity')
        .eq('stock_item_id', stockItemId);
      
      if (siteId) {
        stockLevelQuery = stockLevelQuery.eq('site_id', siteId);
      }
      
      const { data: stockLevel } = await stockLevelQuery.maybeSingle();

      // Get product variant price (preferred or first available)
      // Use unit_cost or unit_price (actual columns in the table)
      let price = 0;
      try {
        const { data: variants, error: variantError } = await supabase
          .from('product_variants')
          .select('unit_cost, unit_price, is_preferred')
          .eq('stock_item_id', stockItemId)
          .eq('is_active', true)
          .order('is_preferred', { ascending: false })
          .limit(1);

        // Use unit_cost or unit_price
        if (!variantError && variants && variants.length > 0) {
          price = variants[0]?.unit_cost || variants[0]?.unit_price || 0;
        }
      } catch (error) {
        // If product_variants table doesn't exist or isn't accessible, default to 0
        console.warn('Could not fetch product variant price:', error);
        price = 0;
      }

      return {
        id: item.id,
        name: item.name,
        stock_unit: item.stock_unit,
        current_quantity: stockLevel?.quantity || 0,
        unit_cost: price
      };
    } catch (error) {
      console.error('Error fetching stock item details:', error);
      return null;
    }
  }

  async function handleItemSelect(stockItemId: string, stockItem: any) {
    // Get full stock item details with current stock and cost
    const itemDetails = await getStockItemDetails(stockItemId);
    
    if (!itemDetails) {
      // Fallback to provided stockItem data
      const newLine: WasteLine = {
        stock_item_id: stockItemId,
        name: stockItem.name || 'Unknown Item',
        quantity: 1,
        unit: stockItem.stock_unit || 'unit',
        unit_cost: stockItem.unit_cost || 0,
        total_value: stockItem.unit_cost || 0,
        reason: 'quality', // Changed from 'spoiled' to 'quality' (matches DB constraint)
        notes: '',
        current_stock: 0,
        stock_warning: false
      };
      setLines([...lines, newLine]);
    } else {
      const currentStock = itemDetails.current_quantity || 0;
      const newLine: WasteLine = {
        stock_item_id: itemDetails.id,
        name: itemDetails.name,
        quantity: 1,
        unit: itemDetails.stock_unit,
        unit_cost: itemDetails.unit_cost || 0,
        total_value: itemDetails.unit_cost || 0,
        reason: 'quality', // Changed from 'spoiled' to 'quality' (matches DB constraint)
        notes: '',
        current_stock: currentStock,
        stock_warning: 1 > currentStock // Warn if trying to waste more than available
      };
      setLines([...lines, newLine]);
    }
    
    setShowItemSearch(false);
  }

  function updateLine(index: number, updates: Partial<WasteLine>) {
    const updated = [...lines];
    updated[index] = { ...updated[index], ...updates };
    
    // Normalize reason if it's being updated
    if (updates.reason !== undefined) {
      updated[index].reason = normalizeWasteReason(updates.reason);
    }
    
    // Recalculate total
    updated[index].total_value = updated[index].quantity * updated[index].unit_cost;
    // Update stock warning if quantity changes
    if (updates.quantity !== undefined && updated[index].current_stock !== undefined) {
      updated[index].stock_warning = updated[index].quantity > updated[index].current_stock!;
    }
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
      // Normalize all reasons first to ensure they're valid
      const normalizedLines = lines.map(line => ({
        ...line,
        reason: normalizeWasteReason(line.reason)
      }));
      
      const linesByReason = normalizedLines.reduce((acc, line) => {
        const normalizedReason = normalizeWasteReason(line.reason);
        if (!acc[normalizedReason]) {
          acc[normalizedReason] = [];
        }
        acc[normalizedReason].push(line);
        return acc;
      }, {} as Record<string, typeof normalizedLines>);

      // Create a waste log for each reason
      for (const [reason, reasonLines] of Object.entries(linesByReason)) {
        // Normalize reason to ensure it's valid for database constraint
        const normalizedReason = normalizeWasteReason(reason);
        
        // Calculate total cost for this reason
        const totalCost = reasonLines.reduce((sum, line) => sum + line.total_value, 0);

        // Create waste log (site_id is now nullable)
        const { data: wasteLog, error: logError } = await supabase
          .from('waste_logs')
          .insert({
            company_id: companyId,
            site_id: siteId || null, // Explicitly set to null if not provided
            waste_date: wastageDate,
            waste_reason: normalizedReason, // Use normalized reason
            total_cost: totalCost,
            recorded_by: userId,
            notes: reasonLines.map(l => l.notes).filter(Boolean).join('; ') || null
          })
          .select()
          .single();

        if (logError) throw logError;

        // Link waste to task using module_references (if taskId exists)
        if (wasteLog && taskId && companyId) {
          try {
            await ModuleReferences.linkEntities(
              {
                source_module: 'checkly',
                source_table: 'checklist_tasks',
                source_id: taskId,
                target_module: 'stockly',
                target_table: 'waste_logs',
                target_id: wasteLog.id,
                link_type: 'generated_waste',
                metadata: {
                  cost: totalCost,
                },
              },
              companyId,
              profile?.id || null
            );
          } catch (linkError) {
            console.error('Error linking waste to task:', linkError);
            // Don't throw - waste log was created successfully, linking is optional
          }
        }

        // Create waste log lines
        for (const line of reasonLines) {
          await supabase
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

          // Update stock level - only filter by site_id if it's not null
          let stockLevelQuery = supabase
            .from('stock_levels')
            .select('id, quantity')
            .eq('stock_item_id', line.stock_item_id);
          
          if (siteId) {
            stockLevelQuery = stockLevelQuery.eq('site_id', siteId);
          }
          
          const { data: existing } = await stockLevelQuery.maybeSingle();

          if (existing) {
            await supabase
              .from('stock_levels')
              .update({ quantity: Math.max(0, existing.quantity - line.quantity) })
              .eq('id', existing.id);
          } else if (siteId) {
            // Create stock level entry if it doesn't exist (shouldn't happen, but handle it)
            await supabase
              .from('stock_levels')
              .insert({
                company_id: companyId,
                site_id: siteId,
                stock_item_id: line.stock_item_id,
                quantity: Math.max(0, -line.quantity) // Negative if wasting more than available
              });
          }

          // Record movement (use ref_type and ref_id, not reference_type/reference_id)
          try {
            const { error: movementError } = await supabase
              .from('stock_movements')
              .insert({
                company_id: companyId,
                stock_item_id: line.stock_item_id,
                movement_type: 'waste',
                quantity: -line.quantity,
                unit_cost: line.unit_cost,
                ref_type: 'waste_log',
                ref_id: wasteLog.id,
                notes: `${line.reason}: ${line.notes || 'No notes'}`
              });
            
            if (movementError) {
              console.error('Error recording stock movement:', movementError);
              // Don't throw - waste log was created successfully, movement is optional
            }
          } catch (error) {
            console.error('Error recording stock movement:', error);
            // Don't throw - waste log was created successfully, movement is optional
          }
        }
      }

      // Show success message with link to view waste records
      const totalWasteValue = lines.reduce((sum, line) => sum + line.total_value, 0);
      toast.success(`Waste recorded successfully! Total: £${totalWasteValue.toFixed(2)}`, {
        action: {
          label: 'View Records',
          onClick: () => router.push('/dashboard/stockly/waste')
        }
      });
      
      onComplete();
    } catch (error) {
      console.error('Error saving wastage:', error);
      toast.error('Failed to save wastage. Please try again.');
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="flex flex-col h-full">
      <div className="p-6 space-y-4 flex-1 overflow-y-auto">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Date</label>
          <input
            type="date"
            value={wastageDate}
            onChange={(e) => setWastageDate(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-theme-primary focus:outline-none focus:border-magenta-500"
          />
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-theme-secondary">Wasted Items</label>
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
              <p className="text-theme-tertiary text-sm">No waste items added</p>
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
                <div key={idx} className={`bg-white/[0.03] border rounded-lg p-3 ${
                  line.stock_warning ? 'border-red-500/50 bg-red-500/5' : 'border-white/[0.06]'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-theme-primary font-medium">{line.name}</p>
                      {line.current_stock !== undefined && (
                        <p className="text-xs text-theme-tertiary mt-0.5">
                          Available: {line.current_stock.toFixed(2)} {line.unit}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeLine(idx)}
                      className="p-1 text-theme-tertiary hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {line.stock_warning && (
                    <div className="mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Waste quantity exceeds available stock</span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-xs text-theme-tertiary">Quantity ({line.unit})</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                        className={`w-full px-2 py-1 bg-white/5 border rounded text-theme-primary text-sm ${
                          line.stock_warning ? 'border-red-500/50' : 'border-white/10'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-theme-tertiary">Value</label>
                      <p className="px-2 py-1 text-red-400 text-sm font-medium">
                        -£{line.total_value.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <label className="text-xs text-theme-tertiary">Reason</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {WASTE_REASONS.map(reason => (
                        <button
                          key={reason.value}
                          onClick={() => updateLine(idx, { reason: reason.value })}
                          className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                            line.reason === reason.value
                              ? 'bg-magenta-500/20 text-magenta-400 border border-magenta-500/50'
                              : 'bg-white/5 text-theme-tertiary border border-transparent hover:bg-white/10'
                          }`}
                        >
                          <span>{reason.icon}</span>
                          {reason.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-theme-tertiary">Notes</label>
                    <input
                      type="text"
                      value={line.notes}
                      onChange={(e) => updateLine(idx, { notes: e.target.value })}
                      placeholder="Optional details..."
                      className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-theme-primary text-sm placeholder:text-theme-disabled"
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
          className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-theme-primary rounded-lg transition-colors"
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
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              setShowItemSearch(false);
            }
          }}
        >
          <div 
            className="bg-[#1a1a2e] border border-white/20 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="text-lg font-semibold text-theme-primary">Select Item from Libraries</h3>
                <p className="text-sm text-theme-tertiary mt-1">Search across all libraries or existing stock items</p>
              </div>
              <button 
                onClick={() => setShowItemSearch(false)} 
                className="text-theme-tertiary hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 min-h-[500px]">
              <div className="mb-4">
                <p className="text-sm text-theme-tertiary mb-2">
                  Search existing stock items or create new ones from libraries
                </p>
              </div>
              <StockItemSelector
                onSelect={handleItemSelect}
                allowCreateFromLibrary={true}
                filterPurchasable={false}
                selectedItems={lines.map(l => l.stock_item_id)}
                className="w-full"
                defaultMode="stock"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
