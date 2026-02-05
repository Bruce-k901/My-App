"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { 
  Truck, 
  Search, 
  Plus, 
  Trash2, 
  Loader2,
  Check,
  X
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
}

interface StockItem {
  id: string;
  name: string;
  stock_unit: string;
}

interface DeliveryLine {
  stock_item_id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

interface QuickDeliveryPanelProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function QuickDeliveryPanel({ onComplete, onCancel }: QuickDeliveryPanelProps) {
  const { companyId, siteId } = useAppContext();
  const [saving, setSaving] = useState(false);
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<DeliveryLine[]>([]);
  
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  useEffect(() => {
    if (companyId) {
      loadSuppliers();
      loadStockItems();
    }
  }, [companyId]);

  async function loadSuppliers() {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');
    setSuppliers(data || []);
  }

  async function loadStockItems() {
    const { data } = await supabase
      .from('stock_items')
      .select('id, name, stock_unit')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');
    setStockItems(data || []);
  }

  function addLine(item: StockItem) {
    const newLine: DeliveryLine = {
      stock_item_id: item.id,
      name: item.name,
      quantity: 1,
      unit: item.stock_unit,
      unit_price: 0,
      total: 0
    };
    setLines([...lines, newLine]);
    setShowItemSearch(false);
    setItemSearch('');
  }

  function updateLine(index: number, updates: Partial<DeliveryLine>) {
    const updated = [...lines];
    updated[index] = { ...updated[index], ...updates };
    // Recalculate total
    updated[index].total = updated[index].quantity * updated[index].unit_price;
    setLines(updated);
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
  const vat = subtotal * 0.2;
  const total = subtotal + vat;

  async function handleSave() {
    if (!companyId || !supplierId || lines.length === 0) return;
    setSaving(true);

    try {
      // Create delivery
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          company_id: companyId,
          site_id: siteId,
          supplier_id: supplierId,
          delivery_date: deliveryDate,
          invoice_number: invoiceNumber || null,
          subtotal: subtotal,
          vat_total: vat,
          total: total,
          status: 'confirmed'
        })
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      // Create delivery lines
      const items = lines.map(line => ({
        delivery_id: delivery.id,
        stock_item_id: line.stock_item_id,
        description: line.name,
        quantity_ordered: line.quantity,
        quantity_received: line.quantity,
        unit_price: line.unit_price,
        line_total: line.total,
        match_status: 'matched'
      }));

      const { error: itemsError } = await supabase
        .from('delivery_lines')
        .insert(items);

      if (itemsError) throw itemsError;

      // Update stock levels
      for (const line of lines) {
        // Get current stock level
        const { data: existing } = await supabase
          .from('stock_levels')
          .select('id, quantity')
          .eq('stock_item_id', line.stock_item_id)
          .eq('site_id', siteId)
          .single();

        if (existing) {
          await supabase
            .from('stock_levels')
            .update({ quantity: existing.quantity + line.quantity })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('stock_levels')
            .insert({
              stock_item_id: line.stock_item_id,
              site_id: siteId,
              quantity: line.quantity
            });
        }

        // Record movement
        await supabase
          .from('stock_movements')
          .insert({
            company_id: companyId,
            stock_item_id: line.stock_item_id,
            movement_type: 'purchase',
            quantity: line.quantity,
            unit_cost: line.unit_price,
            ref_type: 'delivery',
            ref_id: delivery.id,
            to_site_id: siteId
          });
      }

      onComplete();
    } catch (error) {
      console.error('Error saving delivery:', error);
      alert('Failed to save delivery');
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
        {/* Supplier & Invoice */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Supplier *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-magenta-500"
            >
              <option value="">Select supplier...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Invoice #</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-magenta-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">Delivery Date</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-magenta-500"
          />
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-white/80">Items</label>
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
              <Truck className="w-10 h-10 text-white/20 mx-auto mb-2" />
              <p className="text-white/40 text-sm">No items added yet</p>
              <button
                onClick={() => setShowItemSearch(true)}
                className="mt-2 text-magenta-400 text-sm hover:underline"
              >
                Add your first item
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{line.name}</p>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <label className="text-xs text-white/40">Qty</label>
                          <input
                            type="number"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-white/40">Unit Price</label>
                          <input
                            type="number"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) => updateLine(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-white/40">Total</label>
                          <p className="px-2 py-1 text-white text-sm font-medium">
                            £{line.total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeLine(idx)}
                      className="p-1 text-white/40 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        {lines.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Subtotal</span>
              <span className="text-white">£{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">VAT (20%)</span>
              <span className="text-white">£{vat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t border-white/10 pt-2">
              <span className="text-white">Total</span>
              <span className="text-white">£{total.toFixed(2)}</span>
            </div>
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
          disabled={saving || !supplierId || lines.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-magenta-500 hover:bg-magenta-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          Save Delivery
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
                  <span className="text-white">{item.name}</span>
                  <span className="text-white/40 text-sm">{item.stock_unit}</span>
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
