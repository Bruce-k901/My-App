"use client";

import { useState, useEffect, useRef } from 'react';
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
  code?: string;
  lead_time_days: number | null;
  minimum_order_value: number | null;
  email: string | null;
  phone?: string | null;
  ordering_method?: string | null;
}

interface StockItem {
  id: string;
  name: string;
  stock_unit: string;
  last_order_price: number | null;
  current_quantity: number;
}

interface SupplierStockItem {
  stock_item_id: string;
  stock_item_name: string;
  stock_unit: string;
  product_variant_id: string;
  product_name: string;
  supplier_code: string | null;
  current_price: number | null;
  pack_size: number;
  pack_unit: string;
  min_order_qty: number;
  order_multiple: number;
  is_preferred: boolean;
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
  const isMountedRef = useRef(true);
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [supplierItems, setSupplierItems] = useState<SupplierStockItem[]>([]);
  const [loadingSupplierItems, setLoadingSupplierItems] = useState(false);
  
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
  
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (companyId && isMountedRef.current) {
      loadSuppliers();
      loadStockItems();
      if (!isNew) {
        loadOrder();
      }
    }
  }, [companyId, params.id]);

  useEffect(() => {
    // Load supplier items when supplier is selected
    if (order.supplier_id && companyId && isMountedRef.current) {
      loadSupplierItems(order.supplier_id);
    } else {
      if (isMountedRef.current) {
        setSupplierItems([]);
      }
    }
  }, [order.supplier_id, companyId]);

  async function loadSuppliers() {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, code, lead_time_days, minimum_order_value, email, phone, ordering_method')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error('Error loading suppliers:', error);
        return;
      }
      
      if (isMountedRef.current) {
        setSuppliers(data || []);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  }

  async function loadStockItems() {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select(`
          id, 
          name, 
          stock_unit
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error('Error loading stock items:', error);
        return;
      }
    
      if (!isMountedRef.current) return;
      
      const items = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        stock_unit: item.stock_unit,
        last_order_price: 0, // Not available in stock_items table
        current_quantity: 0 // Will be loaded separately if needed
      }));
      
      setStockItems(items);
    } catch (error) {
      console.error('Error loading stock items:', error);
    }
  }

  async function loadSupplierItems(supplierId: string) {
    if (!supplierId || !companyId || !isMountedRef.current) {
      if (isMountedRef.current) {
        setSupplierItems([]);
      }
      return;
    }

    setLoadingSupplierItems(true);
    try {
      console.log('Loading supplier items for supplier:', supplierId);
      
      // First, get the supplier name
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .select('name')
        .eq('id', supplierId)
        .single();

      if (supplierError || !supplierData) {
        console.error('Error loading supplier:', supplierError);
        setSupplierItems([]);
        return;
      }

      const supplierName = supplierData.name;
      console.log('Supplier name:', supplierName);

      // Query all library tables for items with this supplier
      // Select actual column names, then map to common format in JavaScript
      const libraryQueries = [
        // Ingredients Library
        supabase
          .from('ingredients_library')
          .select('id, ingredient_name, unit_cost, unit, pack_size, supplier')
          .eq('company_id', companyId)
          .ilike('supplier', supplierName),
        
        // Chemicals Library
        supabase
          .from('chemicals_library')
          .select('id, product_name, unit_cost, pack_size, supplier')
          .eq('company_id', companyId)
          .ilike('supplier', supplierName),
        
        // First Aid Library
        supabase
          .from('first_aid_supplies_library')
          .select('id, item_name, unit_cost, pack_size, supplier')
          .eq('company_id', companyId)
          .ilike('supplier', supplierName),
        
        // Disposables Library (uses pack_cost instead of unit_cost)
        supabase
          .from('disposables_library')
          .select('id, item_name, pack_cost, pack_size, supplier')
          .eq('company_id', companyId)
          .ilike('supplier', supplierName),
        
        // PPE Library
        supabase
          .from('ppe_library')
          .select('id, item_name, unit_cost, supplier')
          .eq('company_id', companyId)
          .ilike('supplier', supplierName),
      ];

      // Execute all queries in parallel
      const results = await Promise.all(libraryQueries.map(q => q));

      // Combine all results
      const allItems: SupplierStockItem[] = [];
      
      results.forEach((result, index) => {
        if (result.error) {
          console.error(`Error loading library ${index}:`, result.error);
          return;
        }

        const items = (result.data || []).map((item: any) => {
          // Map different column names to common format
          // ingredients_library uses 'ingredient_name'
          // chemicals_library uses 'product_name'
          // others use 'item_name'
          const itemName = item.ingredient_name || item.product_name || item.item_name || 'Unknown';
          
          // Handle different price column names
          // disposables_library uses 'pack_cost', others use 'unit_cost'
          const price = item.unit_cost || item.pack_cost || 0;
          
          return {
            stock_item_id: null, // Libraries don't have stock_item_id
            stock_item_name: itemName,
            stock_unit: item.unit || 'ea',
            product_variant_id: item.id,
            product_name: itemName,
            supplier_code: null,
            current_price: price,
            pack_size: item.pack_size || 1,
            pack_unit: item.unit || 'ea',
            min_order_qty: 1,
            order_multiple: 1,
            is_preferred: false
          };
        });

        allItems.push(...items);
      });

      // Sort by name
      allItems.sort((a, b) => 
        (a.product_name || a.stock_item_name).localeCompare(b.product_name || b.stock_item_name)
      );

      console.log(`Loaded ${allItems.length} items from libraries for supplier: ${supplierName}`);
      if (isMountedRef.current) {
        setSupplierItems(allItems);
      }
    } catch (error) {
      console.error('Error loading supplier items:', error);
      if (isMountedRef.current) {
        setSupplierItems([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingSupplierItems(false);
      }
    }
  }

  async function loadOrder() {
    if (!isMountedRef.current) return;
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
      
      if (!isMountedRef.current) return;
      
      if (po && isMountedRef.current) {
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
            name: item.product_variants?.stock_items?.name || item.product_variants?.product_name || 'Unknown',
            ordered_quantity: item.quantity_ordered,
            unit: 'ea', // Default unit
            unit_price: item.unit_price || 0,
            line_total: item.quantity_ordered * (item.unit_price || 0),
            received_quantity: item.quantity_received || 0,
            status: 'pending'
          }))
        });

        // Load supplier items for this order's supplier
        if (po.supplier_id && isMountedRef.current) {
          loadSupplierItems(po.supplier_id);
        }
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }

  async function findProductVariant(stockItemId: string, supplierId: string): Promise<string | null> {
    const { data } = await supabase
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

  async function calculateNextDeliveryDate(supplierId: string): Promise<string | null> {
    try {
      // Fetch supplier details including cutoff time and delivery days
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('lead_time_days, delivery_days, order_cutoff_time')
        .eq('id', supplierId)
        .single();

      if (!supplierData) return null;

      const leadTimeDays = supplierData.lead_time_days || 1;
      const deliveryDays = supplierData.delivery_days || [];
      const cutoffTime = supplierData.order_cutoff_time || '14:00';

      const now = new Date();
      const [cutoffHours, cutoffMinutes] = cutoffTime.split(':').map(Number);
      const cutoffTimeToday = new Date();
      cutoffTimeToday.setHours(cutoffHours, cutoffMinutes, 0, 0);

      // Check if we've passed today's cutoff time
      let startDate = new Date(now);
      if (now > cutoffTimeToday) {
        // Past cutoff, start from tomorrow
        startDate.setDate(startDate.getDate() + 1);
      }

      // If no delivery days specified, just use lead time
      if (deliveryDays.length === 0) {
        const deliveryDate = new Date(startDate);
        deliveryDate.setDate(deliveryDate.getDate() + leadTimeDays);
        return deliveryDate.toISOString().split('T')[0];
      }

      // Map delivery day names to day numbers (0 = Sunday, 6 = Saturday)
      const dayNameMap: Record<string, number> = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
      };

      const deliveryDayNumbers = deliveryDays
        .map(day => dayNameMap[day.toLowerCase()])
        .filter(day => day !== undefined)
        .sort((a, b) => a - b);

      if (deliveryDayNumbers.length === 0) {
        // Fallback to lead time if no valid days
        const deliveryDate = new Date(startDate);
        deliveryDate.setDate(deliveryDate.getDate() + leadTimeDays);
        return deliveryDate.toISOString().split('T')[0];
      }

      // Find the next delivery day
      let currentDate = new Date(startDate);
      let daysAdded = 0;
      const maxDaysToCheck = 14; // Don't search more than 2 weeks ahead

      while (daysAdded < maxDaysToCheck) {
        const dayOfWeek = currentDate.getDay();
        
        if (deliveryDayNumbers.includes(dayOfWeek)) {
          // Found a delivery day, now add lead time
          const deliveryDate = new Date(currentDate);
          deliveryDate.setDate(deliveryDate.getDate() + leadTimeDays);
          return deliveryDate.toISOString().split('T')[0];
        }

        currentDate.setDate(currentDate.getDate() + 1);
        daysAdded++;
      }

      // Fallback: if we couldn't find a delivery day, use lead time from start date
      const deliveryDate = new Date(startDate);
      deliveryDate.setDate(deliveryDate.getDate() + leadTimeDays);
      return deliveryDate.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error calculating delivery date:', error);
      return null;
    }
  }

  async function handleSupplierChange(supplierId: string) {
    if (!isMountedRef.current) return;
    
    const supplier = suppliers.find(s => s.id === supplierId);
    
    // Calculate next realistic delivery date based on cutoff time and delivery schedule
    const expectedDate = await calculateNextDeliveryDate(supplierId);
    
    // Check if still mounted before updating state
    if (!isMountedRef.current) return;
    
    setOrder(prev => ({
      ...prev,
      supplier_id: supplierId,
      expected_delivery_date: expectedDate,
      items: [] // Clear items when supplier changes
    }));

    // Load items available from this supplier
    if (isMountedRef.current) {
      loadSupplierItems(supplierId);
    }
  }

  function handleQuantityChange(item: SupplierStockItem, quantity: number) {
    // Validate quantity against min_order_qty and order_multiple
    const minQty = item.min_order_qty || 1;
    const multiple = item.order_multiple || 1;
    
    if (quantity < minQty) {
      quantity = minQty;
    }
    
    // Round to nearest multiple
    if (multiple > 1) {
      quantity = Math.round(quantity / multiple) * multiple;
    }

    // Check if item already exists in order
    const existingIndex = order.items.findIndex(
      i => i.product_variant_id === item.product_variant_id
    );

    if (quantity > 0) {
      const unitPrice = item.current_price || 0;
      const lineTotal = quantity * unitPrice;

      if (existingIndex >= 0) {
        // Update existing item
        updateItem(existingIndex, {
          ordered_quantity: quantity,
          unit_price: unitPrice,
          line_total: lineTotal
        });
      } else {
        // Add new item
        const newItem: POItem = {
          stock_item_id: item.stock_item_id,
          product_variant_id: item.product_variant_id,
          name: item.product_name || item.stock_item_name,
          ordered_quantity: quantity,
          unit: item.pack_unit,
          unit_price: unitPrice,
          line_total: lineTotal,
          received_quantity: 0,
          status: 'pending'
        };
        
        const newItems = [...order.items, newItem];
        setOrder(prev => ({ ...prev, items: newItems }));
        recalculateTotals(newItems);
      }
    } else if (existingIndex >= 0) {
      // Remove item if quantity is 0
      removeItem(existingIndex);
    }
  }

  function getItemQuantity(item: SupplierStockItem): number {
    const existingItem = order.items.find(
      i => i.product_variant_id === item.product_variant_id
    );
    return existingItem?.ordered_quantity || 0;
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


  const selectedSupplier = suppliers.find(s => s.id === order.supplier_id);
  const canEdit = ['draft', 'pending_approval'].includes(order.status);
  const statusActions = STATUS_ACTIONS[order.status] || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 dark:bg-[#0B0D13] min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/stockly/orders"
              className="p-2 rounded-lg bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/[0.06] text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {isNew ? 'New Purchase Order' : order.order_number}
              </h1>
              {!isNew && (
                <p className="text-gray-600 dark:text-white/60 text-sm">
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
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white rounded-lg transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
                Actions
              </button>
              
              {showActions && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-10">
                  {statusActions.map((action) => (
                    <button
                      key={action.next}
                      onClick={() => handleStatusChange(action.next)}
                      className="w-full px-4 py-2 flex items-center gap-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 first:rounded-t-lg last:rounded-b-lg"
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
              className="flex items-center gap-2 px-4 py-2 bg-transparent border border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:shadow-[0_0_12px_rgba(16,185,129,0.7)] rounded-lg transition-all duration-200 ease-in-out disabled:opacity-50"
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
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Details</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="supplier-select" className="block text-sm font-medium text-gray-900 dark:text-white/80 mb-1">Supplier *</label>
                <select
                  id="supplier-select"
                  name="supplier_id"
                  value={order.supplier_id}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 disabled:opacity-50"
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="order-date" className="block text-sm font-medium text-gray-900 dark:text-white/80 mb-1">Order Date</label>
                <input
                  id="order-date"
                  name="order_date"
                  type="date"
                  value={order.order_date}
                  onChange={(e) => setOrder(prev => ({ ...prev, order_date: e.target.value }))}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 disabled:opacity-50"
                />
              </div>
              
              <div>
                <label htmlFor="expected-delivery-date" className="block text-sm font-medium text-gray-900 dark:text-white/80 mb-1">Expected Delivery</label>
                <input
                  id="expected-delivery-date"
                  name="expected_delivery_date"
                  type="date"
                  value={order.expected_delivery_date || ''}
                  onChange={(e) => setOrder(prev => ({ ...prev, expected_delivery_date: e.target.value || null }))}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 disabled:opacity-50"
                />
                {selectedSupplier?.lead_time_days && (
                  <p className="text-gray-500 dark:text-white/40 text-xs mt-1">
                    Lead time: {selectedSupplier.lead_time_days} days
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Items</h2>
            </div>
            
            {!order.supplier_id ? (
              <div className="border border-dashed border-gray-300 dark:border-white/10 rounded-lg p-8 text-center">
                <Package className="w-10 h-10 text-gray-400 dark:text-white/20 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-white/40 text-sm">Select a supplier to view available items</p>
              </div>
            ) : loadingSupplierItems ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-spin" />
                <span className="ml-2 text-gray-600 dark:text-white/60">Loading items...</span>
              </div>
            ) : supplierItems.length === 0 ? (
              <div className="border border-dashed border-gray-300 dark:border-white/10 rounded-lg p-8 text-center">
                <Package className="w-10 h-10 text-gray-400 dark:text-white/20 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-white/40 text-sm">No items available from this supplier</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-3 pb-2 border-b border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-white/60">
                  <div className="col-span-5">Item</div>
                  <div className="col-span-2 text-center">Pack Size</div>
                  <div className="col-span-2 text-right">Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Items List */}
                {supplierItems.map((item) => {
                  const quantity = getItemQuantity(item);
                  const existingItem = order.items.find(i => i.product_variant_id === item.product_variant_id);
                  
                  return (
                    <div 
                      key={item.product_variant_id} 
                      className={`grid grid-cols-12 gap-3 items-center py-3 px-2 rounded-lg transition-colors ${
                        quantity > 0 
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20' 
                          : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="col-span-5">
                        <div className="flex items-center gap-2">
                          <p className="text-gray-900 dark:text-white font-medium text-sm">
                            {item.product_name || item.stock_item_name}
                          </p>
                          {item.is_preferred && (
                            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs rounded">
                              Preferred
                            </span>
                          )}
                        </div>
                        {item.supplier_code && (
                          <p className="text-gray-500 dark:text-white/40 text-xs mt-0.5">
                            Code: {item.supplier_code}
                          </p>
                        )}
                      </div>
                      
                      <div className="col-span-2 text-center text-sm text-gray-700 dark:text-white/80">
                        {item.pack_size} {item.pack_unit}
                      </div>
                      
                      <div className="col-span-2 text-right text-sm text-gray-900 dark:text-white font-medium">
                        {item.current_price ? `£${item.current_price.toFixed(2)}` : '—'}
                      </div>
                      
                      <div className="col-span-2">
                        <label htmlFor={`quantity-${item.product_variant_id}`} className="sr-only">
                          Quantity for {item.product_name || item.stock_item_name}
                        </label>
                        <input
                          id={`quantity-${item.product_variant_id}`}
                          name={`quantity-${item.product_variant_id}`}
                          type="number"
                          step={item.order_multiple || 1}
                          min={item.min_order_qty || 0}
                          value={quantity || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleQuantityChange(item, val);
                          }}
                          disabled={!canEdit}
                          placeholder="0"
                          aria-label={`Quantity for ${item.product_name || item.stock_item_name}`}
                          className="w-full px-2 py-1.5 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white text-sm text-center disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
                        />
                        {item.min_order_qty > 1 && (
                          <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5 text-center">
                            Min: {item.min_order_qty}
                          </p>
                        )}
                      </div>
                      
                      <div className="col-span-1 flex justify-end">
                        {quantity > 0 && existingItem && (
                          <button
                            onClick={() => handleQuantityChange(item, 0)}
                            disabled={!canEdit}
                            className="p-1 text-gray-400 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                            title="Remove item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected Items Summary */}
            {order.items.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Order Items ({order.items.length})</h3>
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-white/40">
                          {item.ordered_quantity} {item.unit} × £{item.unit_price.toFixed(2)} = £{item.line_total.toFixed(2)}
                        </p>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => {
                            const supplierItem = supplierItems.find(si => si.product_variant_id === item.product_variant_id);
                            if (supplierItem) {
                              handleQuantityChange(supplierItem, 0);
                            } else {
                              removeItem(idx);
                            }
                          }}
                          className="p-1 text-gray-400 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {canEdit && (
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notes</h2>
              
              <div>
                <label htmlFor="order-notes" className="block text-sm font-medium text-gray-900 dark:text-white/80 mb-1">Internal Notes</label>
                <textarea
                  id="order-notes"
                  name="notes"
                  value={order.notes || ''}
                  onChange={(e) => setOrder(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Internal notes..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 resize-none"
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
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
              <h2 className="text-sm font-medium text-gray-600 dark:text-white/60 mb-3">Status</h2>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                order.status === 'received' ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30' :
                order.status === 'cancelled' ? 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30' :
                order.status === 'draft' ? 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-500/30' :
                'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
              }`}>
                {order.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-600 dark:text-white/60 mb-4">Order Total</h2>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-white/60">Subtotal</span>
                <span className="text-gray-900 dark:text-white">£{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-white/60">VAT (20%)</span>
                <span className="text-gray-900 dark:text-white">£{order.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t border-gray-200 dark:border-white/10 pt-2 mt-2">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">£{order.total.toFixed(2)}</span>
              </div>
            </div>
            
            {selectedSupplier?.minimum_order_value && order.subtotal < selectedSupplier.minimum_order_value && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg">
                <p className="text-yellow-700 dark:text-yellow-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Below minimum order (£{selectedSupplier.minimum_order_value})
                </p>
              </div>
            )}
          </div>

          {/* Supplier Info */}
          {selectedSupplier && (
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
              <h2 className="text-sm font-medium text-gray-600 dark:text-white/60 mb-3">Supplier</h2>
              <p className="text-gray-900 dark:text-white font-medium">{selectedSupplier.name}</p>
              {selectedSupplier.email && (
                <p className="text-gray-600 dark:text-white/60 text-sm">{selectedSupplier.email}</p>
              )}
              {selectedSupplier.code && (
                <p className="text-gray-500 dark:text-white/40 text-xs">Code: {selectedSupplier.code}</p>
              )}
              {selectedSupplier.lead_time_days && (
                <p className="text-gray-500 dark:text-white/40 text-xs mt-2">
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
      </div>

    </div>
  );
}

