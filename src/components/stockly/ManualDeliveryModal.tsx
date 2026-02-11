'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, Calculator } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  code?: string;
}

interface StockItem {
  id: string;
  name: string;
  description?: string;
  default_vat_rate?: number;
}

interface ProductVariant {
  id: string;
  stock_item_id: string;
  product_name: string;
  supplier_code?: string;
  current_price?: number;
  stock_item: StockItem;
}

interface DeliveryLine {
  id: string;
  stock_item_id?: string;
  product_variant_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number; // Ex-VAT
  vat_rate: number;
  vat_amount: number;
  line_total_inc_vat: number;
}

interface ManualDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deliveryId: string) => void;
}

export function ManualDeliveryModal({ isOpen, onClose, onSuccess }: ManualDeliveryModalProps) {
  const { companyId, siteId, userId } = useAppContext();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchingLineIndex, setSearchingLineIndex] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    invoice_number: '',
    invoice_date: '',
    delivery_note_number: '',
    lines: [] as DeliveryLine[],
    subtotal: 0,
    tax: 0,
    total: 0,
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && companyId) {
      fetchSuppliers();
      fetchStockItems();
    }
  }, [isOpen, companyId]);

  useEffect(() => {
    if (selectedSupplier) {
      fetchProductVariants(selectedSupplier);
    }
  }, [selectedSupplier]);

  useEffect(() => {
    // Recalculate totals when lines change
    const subtotal = formData.lines.reduce((sum, line) => sum + line.line_total, 0);
    const tax = formData.lines.reduce((sum, line) => sum + line.vat_amount, 0);
    const total = subtotal + tax;
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      tax,
      total,
    }));
  }, [formData.lines]);

  async function fetchSuppliers() {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, code')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load suppliers');
    }
  }

  async function fetchStockItems() {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('id, name, description, default_vat_rate')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('is_purchasable', true)
        .order('name');

      if (error) throw error;
      setStockItems(data || []);
    } catch (error: any) {
      console.error('Error fetching stock items:', error);
    }
  }

  async function fetchProductVariants(supplierId: string, search?: string) {
    try {
      let query = supabase
        .from('product_variants')
        .select('id, supplier_code, supplier_description, stock_item_id, unit_cost, unit_price, stock_item:stock_items(id, name)')
        .eq('supplier_id', supplierId)
        .eq('is_active', true);

      if (search) {
        query = query.or(`supplier_description.ilike.%${search}%,supplier_code.ilike.%${search}%`);
      }

      query = query.limit(50);

      const { data, error } = await query;
      if (error) throw error;
      // Map unit_cost/unit_price to current_price for compatibility, and supplier_description to product_name
      setProductVariants((data || []).map((v: any) => ({ 
        ...v, 
        current_price: v.unit_cost || v.unit_price || 0,
        product_name: v.supplier_description || v.stock_item?.name || ''
      })) as ProductVariant[]);
    } catch (error: any) {
      console.error('Error fetching product variants:', error);
    }
  }

  function addLineItem() {
    const newLine: DeliveryLine = {
      id: `temp-${Date.now()}`,
      description: '',
      quantity: 1,
      unit_price: 0,
      line_total: 0,
      vat_rate: 0,
      vat_amount: 0,
      line_total_inc_vat: 0,
    };
    
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, newLine],
    }));
  }

  function removeLineItem(index: number) {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  }

  function updateLineItem(index: number, field: keyof DeliveryLine, value: any) {
    setFormData(prev => {
      const updatedLines = [...prev.lines];
      const line = { ...updatedLines[index], [field]: value };
      
      // Auto-calculate line_total (ex-VAT)
      if (field === 'quantity' || field === 'unit_price') {
        line.line_total = line.quantity * line.unit_price;
      }
      
      // Auto-calculate VAT and inc-VAT total
      if (field === 'quantity' || field === 'unit_price' || field === 'vat_rate') {
        line.vat_amount = (line.line_total * line.vat_rate) / 100;
        line.line_total_inc_vat = line.line_total + line.vat_amount;
      }
      
      updatedLines[index] = line;
      return { ...prev, lines: updatedLines };
    });
  }

  function selectProductVariant(lineIndex: number, variant: ProductVariant) {
    updateLineItem(lineIndex, 'product_variant_id', variant.id);
    updateLineItem(lineIndex, 'stock_item_id', variant.stock_item_id);
    updateLineItem(lineIndex, 'description', variant.product_name);
    if (variant.current_price) {
      updateLineItem(lineIndex, 'unit_price', variant.current_price);
    }
    // Get default VAT rate from stock item
    const stockItem = stockItems.find(item => item.id === variant.stock_item_id);
    if (stockItem?.default_vat_rate !== null && stockItem?.default_vat_rate !== undefined) {
      updateLineItem(lineIndex, 'vat_rate', stockItem.default_vat_rate);
    }
    setSearchingLineIndex(null);
    setSearchTerm('');
  }

  function selectStockItem(lineIndex: number, item: StockItem) {
    // Find product variant for this supplier
    const variant = productVariants.find(v => v.stock_item_id === item.id);
    
    if (variant) {
      selectProductVariant(lineIndex, variant);
    } else {
      // No variant exists - use stock item directly
      updateLineItem(lineIndex, 'stock_item_id', item.id);
      updateLineItem(lineIndex, 'description', item.name);
      // Set default VAT rate from stock item
      if (item.default_vat_rate !== null && item.default_vat_rate !== undefined) {
        updateLineItem(lineIndex, 'vat_rate', item.default_vat_rate);
      }
    }
    
    setSearchingLineIndex(null);
    setSearchTerm('');
  }

  async function handleSave(asDraft: boolean = true) {
    if (!companyId || !siteId) {
      toast.error('Company or site information missing');
      return;
    }

    if (!formData.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }

    if (formData.lines.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    // Validate all lines have required fields
    const invalidLines = formData.lines.filter(
      line => !line.description || !line.quantity || !line.unit_price || line.line_total === 0
    );

    if (invalidLines.length > 0) {
      toast.error('Please complete all line items');
      return;
    }

    try {
      setSaving(true);

      // Create delivery record
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          company_id: companyId,
          site_id: siteId,
          supplier_id: formData.supplier_id,
          delivery_date: formData.delivery_date,
          invoice_number: formData.invoice_number || null,
          invoice_date: formData.invoice_date || null,
          delivery_note_number: formData.delivery_note_number || null,
          subtotal: formData.subtotal,
          tax: formData.tax,
          total: formData.total,
          ai_processed: false,
          status: asDraft ? 'draft' : 'confirmed',
          requires_review: false,
          confirmed_by: asDraft ? null : userId,
          confirmed_at: asDraft ? null : new Date().toISOString(),
        })
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      // Create delivery lines
      const linesToInsert = formData.lines.map(line => {
        // Get qty_base_units if we have product_variant
        let qtyBaseUnits = null;
        if (line.product_variant_id) {
          const variant = productVariants.find(v => v.id === line.product_variant_id);
          if (variant) {
            // We'd need to fetch conversion_factor - for now use quantity
            qtyBaseUnits = line.quantity;
          }
        }

        return {
          delivery_id: delivery.id,
          product_variant_id: line.product_variant_id || null,
          stock_item_id: line.stock_item_id || null,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          line_total: line.line_total,
          vat_rate: line.vat_rate,
          vat_amount: line.vat_amount,
          line_total_inc_vat: line.line_total_inc_vat,
          qty_base_units: qtyBaseUnits,
          matched_status: line.product_variant_id ? 'manual_matched' : 'unmatched',
          match_confidence: line.product_variant_id ? 1.0 : null,
        };
      });

      const { error: linesError } = await supabase
        .from('delivery_lines')
        .insert(linesToInsert);

      if (linesError) throw linesError;

      toast.success(`Delivery ${asDraft ? 'saved as draft' : 'confirmed'} successfully`);
      onSuccess(delivery.id);
      
      // Reset form
      setFormData({
        supplier_id: '',
        delivery_date: new Date().toISOString().split('T')[0],
        invoice_number: '',
        invoice_date: '',
        delivery_note_number: '',
        lines: [],
        subtotal: 0,
        tax: 0,
        total: 0,
      });
      setSelectedSupplier('');
      setSearchingLineIndex(null);
      setSearchTerm('');
    } catch (error: any) {
      console.error('Error saving delivery:', error);
      toast.error(error.message || 'Failed to save delivery');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (!saving) {
      setFormData({
        supplier_id: '',
        delivery_date: new Date().toISOString().split('T')[0],
        invoice_number: '',
        invoice_date: '',
        delivery_note_number: '',
        lines: [],
        subtotal: 0,
        tax: 0,
        total: 0,
      });
      setSelectedSupplier('');
      setSearchingLineIndex(null);
      setSearchTerm('');
      onClose();
    }
  }

  const supplierOptions = suppliers.map((s) => ({
    label: s.name,
    value: s.id,
  })) as Array<{ label: string; value: string }>;

  const filteredStockItems = stockItems.filter(item =>
    searchTerm === '' || item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProductVariants = productVariants.filter(variant =>
    searchTerm === '' || 
    variant.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variant.supplier_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Add Manual Delivery</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Header Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Supplier <span className="text-red-400">*</span>
              </label>
              <Select
                value={formData.supplier_id}
                onValueChange={(val) => {
                  setFormData(prev => ({ ...prev, supplier_id: val }));
                  setSelectedSupplier(val);
                }}
                options={supplierOptions}
                placeholder="Select supplier"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Delivery Date <span className="text-red-400">*</span>
              </label>
              <Input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Invoice Number</label>
              <Input
                value={formData.invoice_number}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                placeholder="INV-12345"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Invoice Date</label>
              <Input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Delivery Note Number</label>
              <Input
                value={formData.delivery_note_number}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_note_number: e.target.value }))}
                placeholder="DN-6789"
                disabled={saving}
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Line Items</h3>
              <Button
                onClick={addLineItem}
                variant="outline"
                disabled={saving || !formData.supplier_id}
                className="flex items-center gap-2"
              >
                <Plus size={18} />
                Add Line Item
              </Button>
            </div>

            {formData.lines.length === 0 ? (
              <div className="bg-white/[0.03] border border-gray-200 dark:border-neutral-800 rounded-lg p-8 text-center">
                <p className="text-slate-400">No line items added yet</p>
                <p className="text-sm text-slate-500 mt-2">
                  {!formData.supplier_id
                    ? 'Select a supplier first'
                    : 'Click "Add Line Item" to get started'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.lines.map((line, index) => (
                  <div
                    key={line.id}
                    className="bg-white/[0.03] border border-gray-200 dark:border-neutral-800 rounded-lg p-4"
                  >
                    <div className="grid grid-cols-12 gap-4 items-start">
                      {/* Search/Select Stock Item */}
                      <div className="col-span-12 md:col-span-5">
                        <label className="block text-xs text-slate-400 mb-1">Item</label>
                        {searchingLineIndex === index ? (
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <Input
                              placeholder="Search items..."
                              value={searchTerm}
                              onChange={(e) => {
                                setSearchTerm(e.target.value);
                                if (selectedSupplier) {
                                  fetchProductVariants(selectedSupplier, e.target.value);
                                }
                              }}
                              className="pl-10"
                              autoFocus
                            />
                            <div className="absolute z-10 w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {filteredProductVariants.map((variant) => (
                                <button
                                  key={variant.id}
                                  onClick={() => selectProductVariant(index, variant)}
                                  className="w-full text-left p-3 hover:bg-white/[0.05] border-b border-gray-200 dark:border-neutral-800 last:border-b-0"
                                >
                                  <div className="font-medium text-white">{variant.product_name}</div>
                                  {variant.supplier_code && (
                                    <div className="text-xs text-slate-400">Code: {variant.supplier_code}</div>
                                  )}
                                  {variant.current_price && (
                                    <div className="text-xs text-slate-300">Last: {formatCurrency(variant.current_price)}</div>
                                  )}
                                </button>
                              ))}
                              {filteredStockItems.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => selectStockItem(index, item)}
                                  className="w-full text-left p-3 hover:bg-white/[0.05] border-b border-gray-200 dark:border-neutral-800 last:border-b-0"
                                >
                                  <div className="font-medium text-white">{item.name}</div>
                                  <div className="text-xs text-slate-400">Stock Item</div>
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => {
                                setSearchingLineIndex(null);
                                setSearchTerm('');
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              value={line.description}
                              onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                              placeholder="Click to search items..."
                              onClick={() => {
                                setSearchingLineIndex(index);
                                setSearchTerm('');
                                if (selectedSupplier) {
                                  fetchProductVariants(selectedSupplier);
                                }
                              }}
                              readOnly
                              className="cursor-pointer"
                            />
                          </div>
                        )}
                      </div>

                      {/* Quantity */}
                      <div className="col-span-3 md:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">Qty</label>
                        <Input
                          type="number"
                          step="0.001"
                          value={line.quantity || ''}
                          onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          disabled={saving}
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-3 md:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">Unit Price</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={line.unit_price || ''}
                          onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          disabled={saving}
                        />
                      </div>

                      {/* VAT Rate */}
                      <div className="col-span-3 md:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">VAT Rate</label>
                        <Select
                          value={line.vat_rate?.toString() || '0'}
                          onValueChange={(val) => updateLineItem(index, 'vat_rate', parseFloat(val))}
                          options={[
                            { label: '0%', value: '0' },
                            { label: '20%', value: '20' },
                          ]}
                          disabled={saving}
                        />
                      </div>

                      {/* Line Total Inc VAT */}
                      <div className="col-span-2 md:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">Total</label>
                        <div className="h-10 flex items-center px-3 bg-white/[0.05] border border-neutral-700 rounded text-white font-medium text-sm">
                          {formatCurrency(line.line_total_inc_vat)}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <div className="col-span-1 flex items-end">
                        <button
                          onClick={() => removeLineItem(index)}
                          disabled={saving}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    {/* VAT Breakdown */}
                    <div className="mt-2 pt-2 border-t border-neutral-700 text-xs text-slate-400">
                      Ex-VAT: {formatCurrency(line.line_total)} | VAT ({line.vat_rate}%): {formatCurrency(line.vat_amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals Section */}
          <div className="bg-white/[0.05] border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
            <div className="flex justify-end">
              <div className="w-full md:w-64 space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal (Ex-VAT):</span>
                  <span className="font-medium">{formatCurrency(formData.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>VAT:</span>
                  <span className="font-medium">{formatCurrency(formData.tax)}</span>
                </div>
                <div className="border-t border-neutral-700 pt-2 flex justify-between text-white">
                  <span className="font-semibold">Total (Inc-VAT):</span>
                  <span className="font-bold text-lg">{formatCurrency(formData.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-neutral-800">
            <Button
              onClick={() => handleSave(true)}
              disabled={saving || !formData.supplier_id || formData.lines.length === 0}
              variant="outline"
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Save as Draft'}
            </Button>
            <Button
              onClick={() => handleSave(false)}
              disabled={saving || !formData.supplier_id || formData.lines.length === 0}
              variant="secondary"
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Save & Confirm'}
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}










