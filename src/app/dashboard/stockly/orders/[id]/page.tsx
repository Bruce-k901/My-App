"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Search,
  X,
  Send,
  CheckCircle,
  Package,
  AlertTriangle,
  Calendar,
  FileText,
  Printer,
  Mail,
  MoreVertical,
  Clock
} from 'lucide-react';
import SmartOrderSuggestions from '@/components/stockly/SmartOrderSuggestions';
import DeliveryScheduleInfo from '@/components/stockly/DeliveryScheduleInfo';

interface Supplier {
  id: string;
  name: string;
  lead_time_days: number;
  minimum_order_value: number | null;
  order_email: string | null;
}

interface StockItem {
  id: string;
  name: string;
  stock_unit: string;
  last_order_price: number | null;
  current_quantity: number;
}

interface POItem {
  id?: string;
  stock_item_id: string;
  product_variant_id?: string; // For saving
  name: string;
  ordered_quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
  received_quantity: number;
  status: string;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  order_date: string;
  expected_delivery_date: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  items: POItem[];
}

const STATUS_ACTIONS: Record<string, { next: string; label: string; icon: any }[]> = {
  draft: [
    { next: 'sent', label: 'Mark as Sent', icon: Send },
    { next: 'pending_approval', label: 'Submit for Approval', icon: Clock },
  ],
  pending_approval: [
    { next: 'approved', label: 'Approve', icon: CheckCircle },
    { next: 'draft', label: 'Return to Draft', icon: FileText },
  ],
  approved: [
    { next: 'sent', label: 'Mark as Sent', icon: Send },
  ],
  sent: [
    { next: 'acknowledged', label: 'Supplier Confirmed', icon: CheckCircle },
  ],
  acknowledged: [],
  partially_received: [],
  received: [],
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { companyId, siteId, userId } = useAppContext();
  
  const isNew = params.id === 'new';
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  
  const [order, setOrder] = useState<PurchaseOrder>({
    id: '',
    order_number: '',
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: null,
    status: 'draft',
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: null,
    items: []
  });
  
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadSuppliers();
      loadStockItems();
      if (!isNew) {
        loadOrder();
      }
    }
  }, [companyId, params.id]);

  async function loadSuppliers() {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, lead_time_days, minimum_order_value, order_email')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');
    setSuppliers(data || []);
  }

  async function loadStockItems() {
    const { data } = await supabase
      .from('stock_items')
      .select(`
        id, name, stock_unit, last_order_price,
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
      last_order_price: item.last_order_price || item.product_variants?.[0]?.unit_price || 0,
      current_quantity: item.stock_levels?.[0]?.quantity || 0
    }));
    
    setStockItems(items);
  }

  async function loadOrder() {
    setLoading(true);
    try {
      const { data: po } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          purchase_order_lines(
            id, product_variant_id, quantity_ordered, unit_price, 
            quantity_received,
            product_variants(
              stock_item_id,
              stock_items(id, name)
            )
          )
        `)
        .eq('id', params.id)
        .single();
      
      if (po) {
        setOrder({
          id: po.id,
          order_number: po.order_number,
          supplier_id: po.supplier_id,
          order_date: po.order_date,
          expected_delivery_date: po.expected_delivery,
          status: po.status,
          subtotal: po.subtotal || 0,
          tax: po.tax || 0,
          total: po.total || 0,
          notes: po.notes,
          items: (po.purchase_order_lines || []).map((item: any) => ({
            id: item.id,
            stock_item_id: item.product_variants?.stock_item_id || '',
            product_variant_id: item.product_variant_id,
            name: item.product_variants?.stock_items?.name || 'Unknown',
            ordered_quantity: item.quantity_ordered,
            unit: 'ea', // Default unit
            unit_price: item.unit_price || 0,
            line_total: item.quantity_ordered * (item.unit_price || 0),
            received_quantity: item.quantity_received || 0,
            status: 'pending'
          }))
        });
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  }

  async function findProductVariant(stockItemId: string, supplierId: string): Promise<string | null> {
    const { data } = await supabase
      .schema('stockly')
      .from('product_variants')
      .select('id')
      .eq('stock_item_id', stockItemId)
      .eq('supplier_id', supplierId)
      .eq('is_approved', true)
      .order('is_preferred', { ascending: false })
      .limit(1)
      .single();
    
    return data?.id || null;
  }

  function addItem(item: StockItem) {
    const newItem: POItem = {
      stock_item_id: item.id,
      name: item.name,
      ordered_quantity: 1,
      unit: item.stock_unit,
      unit_price: item.last_order_price || 0,
      line_total: item.last_order_price || 0,
      received_quantity: 0,
      status: 'pending'
    };
    setOrder(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setShowItemSearch(false);
    setItemSearch('');
    recalculateTotals([...order.items, newItem]);
  }

  function updateItem(index: number, updates: Partial<POItem>) {
    const newItems = [...order.items];
    newItems[index] = { ...newItems[index], ...updates };
    newItems[index].line_total = newItems[index].ordered_quantity * newItems[index].unit_price;
    setOrder(prev => ({ ...prev, items: newItems }));
    recalculateTotals(newItems);
  }

  function removeItem(index: number) {
    const newItems = order.items.filter((_, i) => i !== index);
    setOrder(prev => ({ ...prev, items: newItems }));
    recalculateTotals(newItems);
  }

  function recalculateTotals(items: POItem[]) {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const vat = subtotal * 0.2;
    setOrder(prev => ({
      ...prev,
      subtotal,
      tax: vat,
      total: subtotal + vat
    }));
  }

  function handleSupplierChange(supplierId: string) {
    const supplier = suppliers.find(s => s.id === supplierId);
    let expectedDate = null;
    
    if (supplier?.lead_time_days) {
      const date = new Date();
      date.setDate(date.getDate() + supplier.lead_time_days);
      expectedDate = date.toISOString().split('T')[0];
    }
    
    setOrder(prev => ({
      ...prev,
      supplier_id: supplierId,
      expected_delivery_date: expectedDate
    }));
  }

  async function handleSave() {
    if (!companyId || !order.supplier_id || order.items.length === 0) return;
    setSaving(true);

    try {
      let poId = order.id;
      
      if (isNew) {
        // Generate PO number (try public wrapper first, then stockly)
        let poNumber;
        const publicResult = await supabase.rpc('generate_po_number', {
          p_company_id: companyId
        });
        
        if (publicResult.error) {
          const stocklyResult = await supabase.rpc('stockly.generate_po_number', {
            p_company_id: companyId
          });
          poNumber = stocklyResult.data;
        } else {
          poNumber = publicResult.data;
        }
        
        // Create PO
        const { data: newPO, error: poError } = await supabase
          .from('purchase_orders')
          .insert({
            company_id: companyId,
            site_id: siteId,
            order_number: poNumber || `PO-${Date.now()}`,
            supplier_id: order.supplier_id,
            order_date: order.order_date,
            expected_delivery: order.expected_delivery_date,
            status: 'draft',
            subtotal: order.subtotal,
            tax: order.tax,
            total: order.total,
            notes: order.notes || null,
            created_by: userId
          })
          .select()
          .single();
        
        if (poError) throw poError;
        poId = newPO.id;
      } else {
        // Update PO
        await supabase
          .from('purchase_orders')
          .update({
            supplier_id: order.supplier_id,
            order_date: order.order_date,
            expected_delivery: order.expected_delivery_date,
            notes: order.notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', poId);
        
        // Delete existing items
        await supabase
          .from('purchase_order_lines')
          .delete()
          .eq('purchase_order_id', poId);
      }
      
      // Find product variants for each item and insert
      const itemsToInsert = [];
      for (const item of order.items) {
        let variantId = item.product_variant_id;
        if (!variantId) {
          variantId = await findProductVariant(item.stock_item_id, order.supplier_id);
          if (!variantId) {
            console.error(`No product variant found for stock_item ${item.stock_item_id} and supplier ${order.supplier_id}`);
            continue;
          }
        }
        
        itemsToInsert.push({
          purchase_order_id: poId,
          product_variant_id: variantId,
          quantity_ordered: item.ordered_quantity,
          unit_price: item.unit_price,
          line_total: item.line_total
        });
      }
      
      if (itemsToInsert.length > 0) {
        await supabase
          .from('purchase_order_lines')
          .insert(itemsToInsert);
      }
      
      // Update totals (try public wrapper first, then stockly)
      const updateResult = await supabase.rpc('update_po_totals', { p_po_id: poId });
      if (updateResult.error) {
        await supabase.rpc('stockly.update_po_totals', { p_po_id: poId });
      }
      
      if (isNew) {
        router.push(`/dashboard/stockly/orders/${poId}`);
      } else {
        loadOrder();
      }
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Failed to save order');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!order.id) return;
    setSaving(true);
    
    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === 'sent') {
        updates.sent_at = new Date().toISOString();
        updates.sent_by = userId;
      } else if (newStatus === 'approved') {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = userId;
      }
      
      await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', order.id);
      
      setOrder(prev => ({ ...prev, status: newStatus }));
      setShowActions(false);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setSaving(false);
    }
  }

  const filteredItems = stockItems.filter(item =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase()) &&
    !order.items.some(i => i.stock_item_id === item.id)
  );

  const selectedSupplier = suppliers.find(s => s.id === order.supplier_id);
  const canEdit = ['draft', 'pending_approval'].includes(order.status);
  const statusActions = STATUS_ACTIONS[order.status] || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#EC4899] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/stockly/orders"
            className="p-2 hover:bg-white/5 rounded-lg text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isNew ? 'New Purchase Order' : order.order_number}
            </h1>
            {!isNew && (
              <p className="text-white/60 text-sm mt-1">
                {selectedSupplier?.name} • {order.order_date}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {!isNew && statusActions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
                Actions
              </button>
              
              {showActions && (
                <div className="absolute right-0 mt-2 w-48 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl z-10">
                  {statusActions.map((action) => (
                    <button
                      key={action.next}
                      onClick={() => handleStatusChange(action.next)}
                      className="w-full px-4 py-2 flex items-center gap-2 text-white hover:bg-white/5 first:rounded-t-lg last:rounded-b-lg"
                    >
                      <action.icon className="w-4 h-4" />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving || !order.supplier_id || order.items.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200 ease-in-out disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isNew ? 'Create Order' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Details */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Order Details</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Supplier *</label>
                <select
                  value={order.supplier_id}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#EC4899] disabled:opacity-50"
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Order Date</label>
                <input
                  type="date"
                  value={order.order_date}
                  onChange={(e) => setOrder(prev => ({ ...prev, order_date: e.target.value }))}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#EC4899] disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Expected Delivery</label>
                <input
                  type="date"
                  value={order.expected_delivery_date || ''}
                  onChange={(e) => setOrder(prev => ({ ...prev, expected_delivery_date: e.target.value || null }))}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#EC4899] disabled:opacity-50"
                />
                {selectedSupplier?.lead_time_days && (
                  <p className="text-white/40 text-xs mt-1">
                    Lead time: {selectedSupplier.lead_time_days} days
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Items</h2>
              {canEdit && (
                <button
                  onClick={() => setShowItemSearch(true)}
                  className="flex items-center gap-1 text-sm text-[#EC4899] hover:text-[#EC4899]/80"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              )}
            </div>
            
            {order.items.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-lg p-8 text-center">
                <Package className="w-10 h-10 text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">No items added yet</p>
                {canEdit && (
                  <button
                    onClick={() => setShowItemSearch(true)}
                    className="mt-2 text-[#EC4899] text-sm hover:underline"
                  >
                    Add your first item
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-white font-medium">{item.name}</p>
                        {item.received_quantity > 0 && (
                          <p className="text-green-400 text-xs">
                            {item.received_quantity} of {item.ordered_quantity} received
                          </p>
                        )}
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1 text-white/40 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-white/40">Quantity</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.ordered_quantity}
                          onChange={(e) => updateItem(idx, { ordered_quantity: parseFloat(e.target.value) || 0 })}
                          disabled={!canEdit}
                          className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40">Unit</label>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateItem(idx, { unit: e.target.value })}
                          disabled={!canEdit}
                          className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40">Unit Price</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40 text-sm">£</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                            disabled={!canEdit}
                            className="w-full pl-5 pr-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm disabled:opacity-50"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-white/40">Line Total</label>
                        <p className="px-2 py-1.5 text-white font-medium">
                          £{item.line_total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {canEdit && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
              
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Internal Notes</label>
                <textarea
                  value={order.notes || ''}
                  onChange={(e) => setOrder(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Internal notes..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#EC4899] resize-none"
                />
              </div>
            </div>
          )}

          {/* Smart Order Suggestions - only show when below minimum */}
          {canEdit && selectedSupplier?.minimum_order_value && order.subtotal < selectedSupplier.minimum_order_value && (
            <SmartOrderSuggestions
              supplierId={order.supplier_id}
              currentTotal={order.subtotal}
              minimumOrder={selectedSupplier.minimum_order_value}
              existingItemIds={order.items.map(i => i.stock_item_id)}
              onAddItems={(items) => {
                const newItems = items.map(item => ({
                  stock_item_id: item.stock_item_id,
                  name: item.name,
                  ordered_quantity: item.quantity,
                  unit: item.unit,
                  unit_price: item.unit_price,
                  line_total: item.quantity * item.unit_price,
                  received_quantity: 0,
                  status: 'pending'
                }));
                const allItems = [...order.items, ...newItems];
                setOrder(prev => ({ ...prev, items: allItems }));
                recalculateTotals(allItems);
              }}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          {!isNew && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <h2 className="text-sm font-medium text-white/60 mb-3">Status</h2>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                order.status === 'received' ? 'bg-green-500/20 text-green-400' :
                order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                order.status === 'draft' ? 'bg-gray-500/20 text-gray-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {order.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
            <h2 className="text-sm font-medium text-white/60 mb-4">Order Total</h2>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Subtotal</span>
                <span className="text-white">£{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">VAT (20%)</span>
                <span className="text-white">£{order.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t border-white/10 pt-2 mt-2">
                <span className="text-white">Total</span>
                <span className="text-white">£{order.total.toFixed(2)}</span>
              </div>
            </div>
            
            {selectedSupplier?.minimum_order_value && order.subtotal < selectedSupplier.minimum_order_value && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Below minimum order (£{selectedSupplier.minimum_order_value})
                </p>
              </div>
            )}
          </div>

          {/* Supplier Info */}
          {selectedSupplier && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <h2 className="text-sm font-medium text-white/60 mb-3">Supplier</h2>
              <p className="text-white font-medium">{selectedSupplier.name}</p>
              {selectedSupplier.order_email && (
                <p className="text-white/60 text-sm">{selectedSupplier.order_email}</p>
              )}
              {selectedSupplier.lead_time_days && (
                <p className="text-white/40 text-xs mt-2">
                  Lead time: {selectedSupplier.lead_time_days} days
                </p>
              )}
            </div>
          )}

          {/* Delivery Schedule */}
          {order.supplier_id && (
            <DeliveryScheduleInfo
              supplierId={order.supplier_id}
              onDeliveryDateChange={(date) => {
                if (canEdit && !order.expected_delivery_date) {
                  setOrder(prev => ({ ...prev, expected_delivery_date: date }));
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Item Search Modal */}
      {showItemSearch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-20 z-50">
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
                  onClick={() => addItem(item)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 rounded-lg text-left"
                >
                  <div>
                    <span className="text-white">{item.name}</span>
                    <span className="text-white/40 text-xs ml-2">
                      {item.current_quantity} in stock
                    </span>
                  </div>
                  <span className="text-white/40 text-sm">
                    £{item.last_order_price?.toFixed(2)}/{item.stock_unit}
                  </span>
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

