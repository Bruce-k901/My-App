"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { 
  User, 
  Search, 
  Plus, 
  Loader2,
  Check,
  X,
  ShoppingBag
} from '@/components/ui/icons';

interface StaffMember {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
}

interface StockItem {
  id: string;
  name: string;
  stock_unit: string;
  current_quantity?: number;
  unit_cost?: number;
  sell_price?: number;
}

interface PurchaseLine {
  stock_item_id: string;
  name: string;
  quantity: number;
  unit: string;
  cost_price: number;
  sell_price: number;
  line_cost: number;
  line_charge: number;
}

interface QuickStaffPurchasePanelProps {
  onComplete: () => void;
  onCancel: () => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'payroll', label: 'Deduct from Wages', icon: '📋' },
  { value: 'free', label: 'Free (Comp)', icon: '🎁' },
];

const DISCOUNT_OPTIONS = [
  { value: 0, label: 'Full Price' },
  { value: 25, label: '25% Off' },
  { value: 50, label: '50% Off' },
  { value: 75, label: '75% Off' },
  { value: 100, label: 'At Cost' },
];

export default function QuickStaffPurchasePanel({ onComplete, onCancel }: QuickStaffPurchasePanelProps) {
  const { companyId, siteId, userId } = useAppContext();
  const [saving, setSaving] = useState(false);
  
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  
  const [staffId, setStaffId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [showStaffSearch, setShowStaffSearch] = useState(false);
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [discountPercent, setDiscountPercent] = useState(50);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  useEffect(() => {
    if (companyId) {
      loadStaffMembers();
      loadStockItems();
    }
  }, [companyId]);

  async function loadStaffMembers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, auth_user_id, full_name, email')
      .eq('company_id', companyId)
      .order('full_name');

    if (error) {
      console.error('Error loading staff:', error);
      return;
    }

    const members = (data || []).map(p => ({
      id: p.id,
      auth_user_id: p.auth_user_id || p.id,
      name: p.full_name || p.email || 'Staff Member',
      email: p.email || ''
    }));

    setStaffMembers(members);
  }

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
      current_quantity: item.stock_levels?.[0]?.quantity || 0,
      unit_cost: item.product_variants?.[0]?.unit_price || 0,
      sell_price: (item.product_variants?.[0]?.unit_price || 0) * 2 // Default markup
    }));
    
    setStockItems(items);
  }

  function addLine(item: StockItem) {
    const newLine: PurchaseLine = {
      stock_item_id: item.id,
      name: item.name,
      quantity: 1,
      unit: item.stock_unit,
      cost_price: item.unit_cost || 0,
      sell_price: item.sell_price || item.unit_cost || 0,
      line_cost: item.unit_cost || 0,
      line_charge: calculateCharge(item.sell_price || item.unit_cost || 0, discountPercent)
    };
    setLines([...lines, newLine]);
    setShowItemSearch(false);
    setItemSearch('');
  }

  function calculateCharge(sellPrice: number, discount: number): number {
    return sellPrice * (1 - discount / 100);
  }

  function updateLine(index: number, updates: Partial<PurchaseLine>) {
    const updated = [...lines];
    updated[index] = { ...updated[index], ...updates };
    // Recalculate totals
    updated[index].line_cost = updated[index].quantity * updated[index].cost_price;
    updated[index].line_charge = updated[index].quantity * calculateCharge(updated[index].sell_price, discountPercent);
    setLines(updated);
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  // Recalculate charges when discount changes
  useEffect(() => {
    if (lines.length > 0) {
      setLines(lines.map(line => ({
        ...line,
        line_charge: line.quantity * calculateCharge(line.sell_price, discountPercent)
      })));
    }
  }, [discountPercent]);

  const totalCost = lines.reduce((sum, line) => sum + line.line_cost, 0);
  const totalCharge = paymentMethod === 'free' ? 0 : lines.reduce((sum, line) => sum + line.line_charge, 0);
  const totalDiscount = lines.reduce((sum, line) => sum + (line.quantity * line.sell_price), 0) - totalCharge;

  async function handleSave() {
    if (!companyId || lines.length === 0 || (!staffId && !staffName)) return;
    setSaving(true);

    try {
      // Generate transfer number
      const { data: transferNumber } = await supabase.rpc('stockly.generate_transfer_number', {
        p_company_id: companyId,
        p_type: 'staff_purchase'
      });

      // Create transfer record
      const { data: transfer, error: transferError } = await supabase
        .from('stock_transfers')
        .insert({
          company_id: companyId,
          site_id: siteId,
          transfer_type: 'staff_purchase',
          transfer_number: transferNumber,
          staff_user_id: staffId || null,
          staff_name: staffName || null,
          approved_by: userId,
          approved_at: new Date().toISOString(),
          cost_total: totalCost,
          charge_total: totalCharge,
          discount_percent: discountPercent,
          payment_method: paymentMethod,
          notes: notes || null,
          status: 'completed',
          transfer_date: new Date().toISOString().split('T')[0],
          created_by: userId
        })
        .select()
        .single();

      if (transferError) throw transferError;

      // Create transfer items
      const items = lines.map(line => ({
        transfer_id: transfer.id,
        stock_item_id: line.stock_item_id,
        quantity: line.quantity,
        unit: line.unit,
        cost_price: line.cost_price,
        sell_price: line.sell_price,
        charge_price: line.line_charge / line.quantity
      }));

      await supabase
        .from('stock_transfer_items')
        .insert(items);

      // Update stock levels
      for (const line of lines) {
        const { data: existing } = await supabase
          .from('stock_levels')
          .select('id, quantity')
          .eq('stock_item_id', line.stock_item_id)
          .eq('site_id', siteId)
          .single();

        if (existing) {
          await supabase
            .from('stock_levels')
            .update({ quantity: Math.max(0, existing.quantity - line.quantity) })
            .eq('id', existing.id);
        }

        // Record movement
        await supabase
          .from('stock_movements')
          .insert({
            company_id: companyId,
            stock_item_id: line.stock_item_id,
            movement_type: 'staff_sale',
            quantity: -line.quantity,
            unit_cost: line.cost_price,
            notes: `Staff purchase: ${staffName || 'Unknown'}`,
            reference_type: 'transfer',
            reference_id: transfer.id
          });
      }

      onComplete();
    } catch (error) {
      console.error('Error saving staff purchase:', error);
      alert('Failed to save purchase');
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
        {/* Staff Selection */}
        <div className="relative">
          <label className="block text-sm font-medium text-theme-secondary mb-1">Staff Member *</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-tertiary" size={16} />
            <input
              type="text"
              value={showStaffSearch ? staffSearch : staffName}
              onChange={(e) => {
                setStaffSearch(e.target.value);
                if (!showStaffSearch) setShowStaffSearch(true);
              }}
              onFocus={() => setShowStaffSearch(true)}
              placeholder="Search staff..."
              className="w-full pl-9 pr-8 py-2 bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg text-theme-primary placeholder:text-theme-disabled focus:outline-none focus:border-magenta-500"
            />
            {staffName && (
              <button
                onClick={() => { setStaffId(''); setStaffName(''); setStaffSearch(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-tertiary hover:text-theme-primary"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {showStaffSearch && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {staffMembers
                .filter(m => !staffSearch || m.name.toLowerCase().includes(staffSearch.toLowerCase()) || m.email.toLowerCase().includes(staffSearch.toLowerCase()))
                .slice(0, 15)
                .map(member => (
                  <button
                    key={member.id}
                    onClick={() => {
                      setStaffId(member.auth_user_id);
                      setStaffName(member.name);
                      setStaffSearch('');
                      setShowStaffSearch(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 text-sm"
                  >
                    <div className="text-theme-primary font-medium">{member.name}</div>
                    {member.email && <div className="text-xs text-theme-tertiary">{member.email}</div>}
                  </button>
                ))}
              {staffMembers.filter(m => !staffSearch || m.name.toLowerCase().includes(staffSearch.toLowerCase())).length === 0 && (
                <p className="p-3 text-center text-theme-tertiary text-sm">No staff found</p>
              )}
            </div>
          )}
        </div>

        {/* Discount Selection */}
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-2">Staff Discount</label>
          <div className="flex flex-wrap gap-2">
            {DISCOUNT_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setDiscountPercent(option.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  discountPercent === option.value
                    ? 'bg-magenta-500/20 text-magenta-400 border border-magenta-500/50'
                    : 'bg-gray-100 dark:bg-white/5 text-theme-tertiary border border-transparent hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-theme-secondary">Items</label>
            <button
              onClick={() => setShowItemSearch(true)}
              className="flex items-center gap-1 text-sm text-magenta-400 hover:text-magenta-300"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {lines.length === 0 ? (
            <div className="border border-dashed border-gray-300 dark:border-white/10 rounded-lg p-8 text-center">
              <ShoppingBag className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto mb-2" />
              <p className="text-theme-tertiary text-sm">No items added</p>
              <button
                onClick={() => setShowItemSearch(true)}
                className="mt-2 text-magenta-400 text-sm hover:underline"
              >
                Add an item
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-neutral-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-theme-primary font-medium">{line.name}</p>
                    <button
                      onClick={() => removeLine(idx)}
                      className="p-1 text-theme-tertiary hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateLine(idx, { quantity: Math.max(1, line.quantity - 1) })}
                        className="w-8 h-8 rounded bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-theme-primary flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="text-theme-primary w-8 text-center">{line.quantity}</span>
                      <button
                        onClick={() => updateLine(idx, { quantity: line.quantity + 1 })}
                        className="w-8 h-8 rounded bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-theme-primary flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-theme-primary font-medium">£{line.line_charge.toFixed(2)}</p>
                      {discountPercent > 0 && (
                        <p className="text-theme-tertiary text-xs line-through">
                          £{(line.quantity * line.sell_price).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Method */}
        {lines.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">Payment</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(method => (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    paymentMethod === method.value
                      ? 'bg-magenta-500/20 text-magenta-400 border border-magenta-500/50'
                      : 'bg-gray-100 dark:bg-white/5 text-theme-tertiary border border-transparent hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  <span>{method.icon}</span>
                  {method.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {lines.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className="w-full px-3 py-2 bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg text-theme-primary placeholder:text-theme-disabled focus:outline-none focus:border-magenta-500"
            />
          </div>
        )}

        {/* Totals */}
        {lines.length > 0 && (
          <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-neutral-700 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-theme-tertiary">Cost Value</span>
              <span className="text-theme-tertiary">£{totalCost.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-400">Discount ({discountPercent}%)</span>
                <span className="text-green-400">-£{totalDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold border-t border-gray-200 dark:border-neutral-600 pt-2">
              <span className="text-theme-primary">
                {paymentMethod === 'free' ? 'Comped' : 'To Pay'}
              </span>
              <span className={paymentMethod === 'free' ? 'text-green-400' : 'text-theme-primary'}>
                {paymentMethod === 'free' ? 'FREE' : `£${totalCharge.toFixed(2)}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-white/10 flex items-center gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-theme-primary rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || lines.length === 0 || (!staffId && !staffName)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-magenta-500 hover:bg-magenta-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          Complete
        </button>
      </div>

      {/* Item Search Modal */}
      {showItemSearch && (
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-20">
          <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-neutral-700 rounded-xl w-full max-w-md max-h-[60vh] flex flex-col shadow-xl">
            <div className="p-4 border-b border-gray-200 dark:border-neutral-700 flex items-center gap-3">
              <Search className="w-5 h-5 text-theme-tertiary" />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search stock items..."
                autoFocus
                className="flex-1 bg-transparent text-theme-primary placeholder:text-theme-tertiary focus:outline-none"
              />
              <button onClick={() => setShowItemSearch(false)} className="text-theme-tertiary hover:text-theme-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {filteredItems.slice(0, 20).map(item => (
                <button
                  key={item.id}
                  onClick={() => addLine(item)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-left"
                >
                  <div>
                    <span className="text-theme-primary">{item.name}</span>
                    <span className="text-theme-tertiary text-xs ml-2">
                      {item.current_quantity} in stock
                    </span>
                  </div>
                  <span className="text-theme-tertiary text-sm">£{item.unit_cost?.toFixed(2)}</span>
                </button>
              ))}
              {filteredItems.length === 0 && (
                <p className="p-4 text-center text-theme-tertiary">No items found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
