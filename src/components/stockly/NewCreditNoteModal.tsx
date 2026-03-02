'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search } from '@/components/ui/icons';
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

interface Delivery {
  id: string;
  invoice_number?: string;
  delivery_date: string;
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

interface CNLine {
  id: string;
  stock_item_id?: string;
  product_variant_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  reason: string;
  notes?: string;
}

interface NewCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cnId: string) => void;
  deliveryId?: string;
  supplierId?: string;
}

const REJECTION_REASONS = [
  { value: 'damaged', label: 'Damaged/Crushed' },
  { value: 'short_delivery', label: 'Short Delivery' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'temperature_breach', label: 'Temperature Breach' },
  { value: 'expired', label: 'Expired/Short Date' },
  { value: 'wrong_spec', label: 'Wrong Specification' },
  { value: 'not_ordered', label: 'Not Ordered' },
  { value: 'overcharge', label: 'Overcharged' },
  { value: 'other', label: 'Other' },
] as const;

export function NewCreditNoteModal({
  isOpen,
  onClose,
  onSuccess,
  deliveryId,
  supplierId,
}: NewCreditNoteModalProps) {
  const { companyId, siteId, userId } = useAppContext();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>(supplierId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchingLineIndex, setSearchingLineIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    supplier_id: supplierId || '',
    delivery_id: deliveryId || '',
    request_date: new Date().toISOString().split('T')[0],
    lines: [] as CNLine[],
    subtotal: 0,
    vat: 0,
    total: 0,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && companyId) {
      fetchSuppliers();
      if (selectedSupplier) {
        fetchProductVariants(selectedSupplier);
        fetchDeliveries(selectedSupplier);
      }
      fetchStockItems();
    }
  }, [isOpen, companyId, selectedSupplier]);

  useEffect(() => {
    // Recalculate totals when lines change
    const subtotal = formData.lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
    const vat = formData.lines.reduce((sum, line) => {
      const lineTotal = line.quantity * line.unit_price;
      return sum + (lineTotal * line.vat_rate / 100);
    }, 0);
    const total = subtotal + vat;

    setFormData(prev => ({
      ...prev,
      subtotal,
      vat,
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

  async function fetchDeliveries(supplierId: string) {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('id, invoice_number, delivery_date')
        .eq('company_id', companyId)
        .eq('supplier_id', supplierId)
        .order('delivery_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setDeliveries(data || []);
    } catch (error: any) {
      console.error('Error fetching deliveries:', error);
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

      // If error is about is_purchasable column not existing, retry without that filter
      if (error && (error.message?.includes('is_purchasable') || error.code === '42703')) {
        const { data: retryData, error: retryError } = await supabase
          .from('stock_items')
          .select('id, name, description, default_vat_rate')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('name');

        if (retryError) throw retryError;
        setStockItems(retryData || []);
        return;
      }

      if (error) throw error;
      setStockItems(data || []);
    } catch (error: any) {
      console.error('Error fetching stock items:', error?.message || error);
    }
  }

  async function fetchProductVariants(supplierId: string, search?: string) {
    try {
      let query = supabase
        .from('product_variants')
        .select('id, supplier_code, supplier_description, stock_item_id, unit_cost, unit_price, stock_item:stock_items(id, name, default_vat_rate)')
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
    const newLine: CNLine = {
      id: `temp-${Date.now()}`,
      description: '',
      quantity: 1,
      unit_price: 0,
      vat_rate: 0,
      reason: 'damaged',
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

  function updateLineItem(index: number, field: keyof CNLine, value: any) {
    setFormData(prev => {
      const updatedLines = [...prev.lines];
      updatedLines[index] = { ...updatedLines[index], [field]: value };
      return { ...prev, lines: updatedLines };
    });
  }

  function selectProductVariant(lineIndex: number, variant: ProductVariant) {
    updateLineItem(lineIndex, 'product_variant_id', variant.id);
    updateLineItem(lineIndex, 'stock_item_id', variant.stock_item_id);
    updateLineItem(lineIndex, 'description', variant.product_name);
    // Use current_price if available (mapped from price_per_base), otherwise use 0
    if (variant.current_price) {
      updateLineItem(lineIndex, 'unit_price', variant.current_price);
    }
    // Set default VAT rate from stock item
    const stockItem = stockItems.find(item => item.id === variant.stock_item_id);
    if (stockItem?.default_vat_rate !== null && stockItem?.default_vat_rate !== undefined) {
      updateLineItem(lineIndex, 'vat_rate', stockItem.default_vat_rate);
    }
    setSearchingLineIndex(null);
    setSearchTerm('');
  }

  function selectStockItem(lineIndex: number, item: StockItem) {
    const variant = productVariants.find(v => v.stock_item_id === item.id);
    if (variant) {
      selectProductVariant(lineIndex, variant);
    } else {
      updateLineItem(lineIndex, 'stock_item_id', item.id);
      updateLineItem(lineIndex, 'description', item.name);
      if (item.default_vat_rate !== null && item.default_vat_rate !== undefined) {
        updateLineItem(lineIndex, 'vat_rate', item.default_vat_rate);
      }
    }
    setSearchingLineIndex(null);
    setSearchTerm('');
  }

  async function generateRequestNumber(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const { count } = await supabase
      .from('credit_note_requests')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .like('request_number', `CN-${year}-%`);

    const nextNum = ((count || 0) + 1).toString().padStart(4, '0');
    return `CN-${year}-${nextNum}`;
  }

  async function handleSave(submitImmediately: boolean = false) {
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

    const invalidLines = formData.lines.filter(
      line => !line.description || !line.quantity || !line.unit_price || !line.reason
    );

    if (invalidLines.length > 0) {
      toast.error('Please complete all line items');
      return;
    }

    try {
      setSaving(true);

      const requestNumber = await generateRequestNumber();

      // Insert CN request
      const { data: cn, error: cnError } = await supabase
        .from('credit_note_requests')
        .insert({
          company_id: companyId,
          site_id: siteId,
          supplier_id: formData.supplier_id,
          delivery_id: formData.delivery_id || null,
          request_number: requestNumber,
          request_date: formData.request_date,
          subtotal: formData.subtotal,
          vat: formData.vat,
          total: formData.total,
          status: submitImmediately ? 'submitted' : 'draft',
          submitted_at: submitImmediately ? new Date().toISOString() : null,
          submitted_by: submitImmediately ? userId : null,
          submitted_via: submitImmediately ? 'other' : null,
          created_by: userId,
        })
        .select()
        .single();

      if (cnError) throw cnError;

      // Insert lines
      const linesToInsert = formData.lines.map(line => ({
        credit_note_request_id: cn.id,
        stock_item_id: line.stock_item_id || null,
        product_variant_id: line.product_variant_id || null,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        line_total: line.quantity * line.unit_price,
        vat_rate: line.vat_rate,
        vat_amount: (line.quantity * line.unit_price) * line.vat_rate / 100,
        line_total_inc_vat: (line.quantity * line.unit_price) * (1 + line.vat_rate / 100),
        reason: line.reason,
        notes: line.notes || null,
      }));

      const { error: linesError } = await supabase
        .from('credit_note_lines')
        .insert(linesToInsert);

      if (linesError) throw linesError;

      toast.success(`Credit note ${submitImmediately ? 'created and submitted' : 'saved as draft'}`);
      onSuccess(cn.id);

      // Reset form
      setFormData({
        supplier_id: supplierId || '',
        delivery_id: deliveryId || '',
        request_date: new Date().toISOString().split('T')[0],
        lines: [],
        subtotal: 0,
        vat: 0,
        total: 0,
      });
      setSelectedSupplier(supplierId || '');
      setSearchingLineIndex(null);
      setSearchTerm('');
    } catch (error: any) {
      console.error('Error saving credit note:', error);
      toast.error(error.message || 'Failed to save credit note');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (!saving) {
      setFormData({
        supplier_id: supplierId || '',
        delivery_id: deliveryId || '',
        request_date: new Date().toISOString().split('T')[0],
        lines: [],
        subtotal: 0,
        vat: 0,
        total: 0,
      });
      setSelectedSupplier(supplierId || '');
      setSearchingLineIndex(null);
      setSearchTerm('');
      onClose();
    }
  }

  const supplierOptions = suppliers.map((s) => ({
    label: s.name,
    value: s.id,
  })) as Array<{ label: string; value: string }>;

  const deliveryOptions = deliveries.map((d) => ({
    label: `${d.invoice_number || 'Delivery'} - ${new Date(d.delivery_date).toLocaleDateString('en-GB')}`,
    value: d.id,
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
          <DialogTitle className="text-xl font-semibold text-theme-primary">New Credit Note Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Header Fields */}
          <div className="space-y-4 pb-6 border-b border-gray-200 dark:border-neutral-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Supplier <span className="text-red-400">*</span>
                </label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(val) => {
                    setFormData(prev => ({ ...prev, supplier_id: val }));
                    setSelectedSupplier(val);
                    fetchProductVariants(val);
                    fetchDeliveries(val);
                  }}
                  options={supplierOptions}
                  placeholder="Select supplier"
                  disabled={saving || !!supplierId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Request Date</label>
                <Input
                  type="date"
                  value={formData.request_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, request_date: e.target.value }))}
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">Link to Delivery (Optional)</label>
              <Select
                value={formData.delivery_id}
                onValueChange={(val) => setFormData(prev => ({ ...prev, delivery_id: val }))}
                options={deliveryOptions}
                placeholder="Select delivery"
                disabled={saving || !formData.supplier_id}
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-theme-primary">Line Items</h3>
                <p className="text-xs text-theme-tertiary mt-1">Add items to request credit for</p>
              </div>
              <Button
                onClick={addLineItem}
                variant="outline"
                disabled={saving || !formData.supplier_id}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Plus size={18} />
                Add Line Item
              </Button>
            </div>

            {formData.lines.length === 0 ? (
              <div className="bg-white/[0.03] border border-gray-200 dark:border-neutral-800 rounded-lg p-10 text-center">
                <p className="text-theme-tertiary text-base">No line items added yet</p>
                <p className="text-sm text-theme-tertiary mt-3">
                  {!formData.supplier_id
                    ? 'Select a supplier first'
                    : 'Click "Add Line Item" to get started'}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {formData.lines.map((line, index) => (
                  <div
                    key={line.id}
                    className="bg-white/[0.03] border border-gray-200 dark:border-neutral-800 rounded-lg p-5 space-y-4"
                  >
                    {/* First Row: Item, Qty, Price, VAT, Reason, Remove */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      {/* Item Search */}
                      <div className="md:col-span-5">
                        <label className="block text-xs font-medium text-theme-secondary mb-2">Item</label>
                        {searchingLineIndex === index ? (
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-tertiary" size={16} />
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
                            <div className="absolute z-10 w-full mt-1 bg-neutral-900 border border-theme rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {filteredProductVariants.map((variant) => (
                                <button
                                  key={variant.id}
                                  onClick={() => selectProductVariant(index, variant)}
                                  className="w-full text-left p-3 hover:bg-white/[0.05] border-b border-gray-200 dark:border-neutral-800 last:border-b-0"
                                >
                                  <div className="font-medium text-theme-primary">{variant.product_name}</div>
                                  {variant.supplier_code && (
                                    <div className="text-xs text-theme-tertiary">Code: {variant.supplier_code}</div>
                                  )}
                                </button>
                              ))}
                              {filteredStockItems.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => selectStockItem(index, item)}
                                  className="w-full text-left p-3 hover:bg-white/[0.05] border-b border-gray-200 dark:border-neutral-800 last:border-b-0"
                                >
                                  <div className="font-medium text-theme-primary">{item.name}</div>
                                  <div className="text-xs text-theme-tertiary">Stock Item</div>
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => {
                                setSearchingLineIndex(null);
                                setSearchTerm('');
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-tertiary hover:text-white"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
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
                        )}
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-theme-secondary mb-2">Quantity</label>
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
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-theme-secondary mb-2">Unit Price</label>
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
                      <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-theme-secondary mb-2">VAT</label>
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

                      {/* Reason */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-theme-secondary mb-2">Reason</label>
                        <Select
                          value={line.reason}
                          onValueChange={(val) => updateLineItem(index, 'reason', val)}
                          options={REJECTION_REASONS as any}
                          disabled={saving}
                        />
                      </div>

                      {/* Remove Button */}
                      <div className="md:col-span-1 flex items-end pb-0.5">
                        <button
                          onClick={() => removeLineItem(index)}
                          disabled={saving}
                          className="p-2 text-theme-tertiary hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Remove line"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Second Row: Line Total Display and Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start mt-4">
                      {/* Line Total Display */}
                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-theme-secondary mb-2">Line Total</label>
                        <div className="h-10 flex items-center px-3 bg-white/[0.05] border border-theme rounded text-theme-primary font-medium text-sm">
                          {formatCurrency((line.quantity * line.unit_price) * (1 + line.vat_rate / 100))}
                        </div>
                        <div className="text-xs text-theme-tertiary mt-1.5">
                          Ex-VAT: {formatCurrency(line.quantity * line.unit_price)} | VAT: {formatCurrency((line.quantity * line.unit_price) * line.vat_rate / 100)}
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="md:col-span-8">
                        <label className="block text-xs font-medium text-theme-secondary mb-2">Notes</label>
                        <Input
                          value={line.notes || ''}
                          onChange={(e) => updateLineItem(index, 'notes', e.target.value)}
                          placeholder="Additional notes about this rejection..."
                          disabled={saving}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          {formData.lines.length > 0 && (
            <div className="bg-white/[0.05] border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
              <div className="flex justify-end">
                <div className="w-full md:w-64 space-y-2">
                  <div className="flex justify-between text-theme-secondary">
                    <span>Subtotal (Ex-VAT):</span>
                    <span className="font-medium">{formatCurrency(formData.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-theme-secondary">
                    <span>VAT:</span>
                    <span className="font-medium">{formatCurrency(formData.vat)}</span>
                  </div>
                  <div className="border-t border-theme pt-2 flex justify-between text-theme-primary">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-lg">{formatCurrency(formData.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-neutral-800">
            <Button
              onClick={() => handleSave(false)}
              disabled={saving || !formData.supplier_id || formData.lines.length === 0}
              variant="outline"
              className="w-full sm:flex-1 whitespace-nowrap"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving || !formData.supplier_id || formData.lines.length === 0}
              variant="secondary"
              className="w-full sm:flex-1 whitespace-nowrap"
            >
              {saving ? 'Saving...' : 'Submit to Supplier'}
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="w-full sm:flex-1 whitespace-nowrap"
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










