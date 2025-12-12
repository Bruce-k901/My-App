'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle, XCircle, Plus, Search, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Supplier {
  id: string;
  name: string;
  code?: string;
}

interface StockItem {
  id: string;
  name: string;
  description?: string;
}

interface ProductVariant {
  id: string;
  stock_item_id: string;
  supplier_code?: string;
  product_name: string;
  stock_item: StockItem;
}

interface DeliveryLine {
  id: string;
  delivery_id: string;
  product_variant_id?: string;
  stock_item_id?: string;
  description: string;
  supplier_code?: string;
  quantity: number;
  quantity_ordered?: number;
  quantity_received?: number;
  quantity_rejected?: number;
  rejection_reason?: string;
  rejection_notes?: string;
  rejection_photo_url?: string;
  unit_price: number;
  line_total: number;
  vat_rate?: number;
  vat_amount?: number;
  line_total_inc_vat?: number;
  matched_status: 'auto_matched' | 'manual_matched' | 'unmatched' | 'new_item';
  match_confidence?: number;
  suggested_stock_item?: any;
  product_variant?: ProductVariant;
}

interface Delivery {
  id: string;
  company_id: string;
  site_id: string;
  supplier_id: string;
  purchase_order_id?: string;
  delivery_date: string;
  delivery_note_number?: string;
  invoice_number?: string;
  invoice_date?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  status: 'draft' | 'pending_review' | 'confirmed' | 'disputed' | 'cancelled';
  ai_processed: boolean;
  ai_confidence?: number;
  ai_extraction?: any;
  requires_review: boolean;
  document_urls?: string[];
  supplier?: Supplier;
  lines?: DeliveryLine[];
}

export default function DeliveryReviewPage() {
  const router = useRouter();
  const params = useParams();
  const deliveryId = params.id as string;
  const { companyId, userId } = useAppContext();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [deliveryFormData, setDeliveryFormData] = useState({
    invoice_number: '',
    invoice_date: '',
    delivery_note_number: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [matchingLineId, setMatchingLineId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [showCreateItemModal, setShowCreateItemModal] = useState(false);
  const [creatingItemLineId, setCreatingItemLineId] = useState<string | null>(null);
  const [lineAcceptanceStates, setLineAcceptanceStates] = useState<Record<string, {
    state: 'accept_all' | 'partial' | 'reject_all';
    received: number;
    rejected: number;
    rejection_reason?: string;
    rejection_notes?: string;
  }>>({});

  useEffect(() => {
    if (deliveryId && companyId) {
      fetchDelivery();
      fetchStockItems();
    }
  }, [deliveryId, companyId]);

  async function fetchDelivery() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          supplier:suppliers(id, name, code),
          lines:delivery_lines(
            *,
            product_variant:product_variants(
              id,
              supplier_code,
              product_name,
              stock_item:stock_items(id, name)
            )
          )
        `)
        .eq('id', deliveryId)
        .single();

      if (error) throw error;
      const deliveryData = data as Delivery;
      setDelivery(deliveryData);
      setDeliveryFormData({
        invoice_number: deliveryData.invoice_number || '',
        invoice_date: deliveryData.invoice_date || '',
        delivery_note_number: deliveryData.delivery_note_number || '',
      });
      
      // Initialize acceptance states
      const states: Record<string, any> = {};
      deliveryData.lines?.forEach(line => {
        states[line.id] = {
          state: 'accept_all' as const,
          received: line.quantity_received ?? line.quantity,
          rejected: line.quantity_rejected ?? 0,
          rejection_reason: line.rejection_reason,
          rejection_notes: line.rejection_notes,
        };
      });
      setLineAcceptanceStates(states);
    } catch (error: any) {
      console.error('Error fetching delivery:', error);
      toast.error('Failed to load delivery');
    } finally {
      setLoading(false);
    }
  }

  async function saveDeliveryHeader() {
    if (!delivery) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('deliveries')
        .update({
          invoice_number: deliveryFormData.invoice_number || null,
          invoice_date: deliveryFormData.invoice_date || null,
          delivery_note_number: deliveryFormData.delivery_note_number || null,
        })
        .eq('id', deliveryId);

      if (error) throw error;
      toast.success('Invoice details updated');
      await fetchDelivery();
    } catch (error: any) {
      console.error('Error saving delivery:', error);
      toast.error('Failed to save invoice details');
    } finally {
      setSaving(false);
    }
  }

  async function fetchStockItems() {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('id, name, description')
        .eq('company_id', companyId)
        .eq('is_active', true)
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
        .select('id, supplier_code, product_name, stock_item_id, stock_item:stock_items(id, name)')
        .eq('supplier_id', supplierId);

      if (search) {
        query = query.or(`product_name.ilike.%${search}%,supplier_code.ilike.%${search}%`);
      }

      query = query.limit(20);

      const { data, error } = await query;
      if (error) throw error;
      setProductVariants((data || []) as ProductVariant[]);
    } catch (error: any) {
      console.error('Error fetching product variants:', error);
      toast.error('Failed to load product variants');
    }
  }

  async function matchLineToVariant(lineId: string, variantId: string) {
    try {
      const variant = productVariants.find((v) => v.id === variantId);
      if (!variant) return;

      const { error } = await supabase
        .from('delivery_lines')
        .update({
          product_variant_id: variantId,
          stock_item_id: variant.stock_item_id,
          matched_status: 'manual_matched',
          match_confidence: 1.0,
        })
        .eq('id', lineId);

      if (error) throw error;

      toast.success('Line item matched successfully');
      setMatchingLineId(null);
      setSelectedVariantId('');
      await fetchDelivery();
    } catch (error: any) {
      console.error('Error matching line:', error);
      toast.error('Failed to match line item');
    }
  }

  async function createStockItemFromLine(lineId: string, line: DeliveryLine) {
    try {
      setSaving(true);

      // Get default UOM (try to get "each" or first available)
      const { data: uoms } = await supabase
        .from('uom')
        .select('id')
        .or('abbreviation.eq.each,abbreviation.eq.EA,abbreviation.eq.unit')
        .limit(1);

      const defaultUomId = uoms && uoms.length > 0 
        ? uoms[0].id 
        : (await supabase.from('uom').select('id').limit(1).single()).data?.id;

      if (!defaultUomId) {
        throw new Error('No UOM found. Please configure units of measure first.');
      }

      // Get default base unit (same as pack unit for now)
      const { data: baseUoms } = await supabase
        .from('uom')
        .select('id')
        .eq('id', defaultUomId)
        .single();

      if (!baseUoms) {
        throw new Error('Base UOM not found');
      }

      // Create stock item
      const { data: stockItem, error: itemError } = await supabase
        .from('stock_items')
        .insert({
          company_id: companyId,
          name: line.description,
          description: line.description,
          base_unit_id: baseUoms.id,
          is_purchasable: true,
          is_active: true,
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Create product variant
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .insert({
          stock_item_id: stockItem.id,
          supplier_id: delivery!.supplier_id,
          supplier_code: line.supplier_code || null,
          product_name: line.description,
          pack_size: line.quantity,
          pack_unit_id: defaultUomId,
          conversion_factor: 1, // 1:1 for now, can be updated later
          is_approved: true,
        })
        .select()
        .single();

      if (variantError) throw variantError;

      // Update delivery line
      const { error: lineError } = await supabase
        .from('delivery_lines')
        .update({
          product_variant_id: variant.id,
          stock_item_id: stockItem.id,
          matched_status: 'new_item',
          match_confidence: 1.0,
        })
        .eq('id', lineId);

      if (lineError) throw lineError;

      toast.success('Stock item created and matched');
      setShowCreateItemModal(false);
      setCreatingItemLineId(null);
      await fetchDelivery();
      await fetchStockItems();
    } catch (error: any) {
      console.error('Error creating stock item:', error);
      toast.error(error.message || 'Failed to create stock item');
    } finally {
      setSaving(false);
    }
  }

  async function generateCNRequestNumber(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const { count } = await supabase
      .from('credit_note_requests')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .like('request_number', `CN-${year}-%`);

    const nextNum = ((count || 0) + 1).toString().padStart(4, '0');
    return `CN-${year}-${nextNum}`;
  }

  async function createCNFromRejections(rejectedLines: DeliveryLine[]) {
    const subtotal = rejectedLines.reduce((sum, l) => {
      const rejectedQty = lineAcceptanceStates[l.id]?.rejected || 0;
      return sum + (rejectedQty * l.unit_price);
    }, 0);

    const vat = rejectedLines.reduce((sum, l) => {
      const rejectedQty = lineAcceptanceStates[l.id]?.rejected || 0;
      const lineTotal = rejectedQty * l.unit_price;
      return sum + (lineTotal * (l.vat_rate || 0) / 100);
    }, 0);

    const requestNumber = await generateCNRequestNumber();

    const { data: cn, error: cnError } = await supabase
      .from('credit_note_requests')
      .insert({
        company_id: companyId,
        site_id: delivery!.site_id,
        supplier_id: delivery!.supplier_id,
        delivery_id: deliveryId,
        request_number: requestNumber,
        request_date: new Date().toISOString().split('T')[0],
        subtotal,
        vat,
        total: subtotal + vat,
        status: 'draft',
        created_by: userId,
      })
      .select()
      .single();

    if (cnError) throw cnError;

    const linesToInsert = rejectedLines.map(line => {
      const state = lineAcceptanceStates[line.id];
      const rejectedQty = state?.rejected || 0;
      const lineTotal = rejectedQty * line.unit_price;
      const vatAmount = lineTotal * (line.vat_rate || 0) / 100;

      return {
        credit_note_request_id: cn.id,
        delivery_line_id: line.id,
        stock_item_id: line.stock_item_id || null,
        product_variant_id: line.product_variant_id || null,
        description: line.description,
        quantity: rejectedQty,
        unit_price: line.unit_price,
        line_total: lineTotal,
        vat_rate: line.vat_rate || 0,
        vat_amount: vatAmount,
        line_total_inc_vat: lineTotal + vatAmount,
        reason: state?.rejection_reason || 'other',
        notes: state?.rejection_notes || null,
        photo_url: line.rejection_photo_url || null,
      };
    });

    const { error: linesError } = await supabase
      .from('credit_note_lines')
      .insert(linesToInsert);

    if (linesError) throw linesError;

    return cn.id;
  }

  async function confirmDelivery() {
    if (!delivery) return;

    // Check if all lines are matched
    const unmatchedLines = delivery.lines?.filter(
      (l) => !l.product_variant_id || l.matched_status === 'unmatched'
    );

    if (unmatchedLines && unmatchedLines.length > 0) {
      toast.error('Please match all line items before confirming');
      return;
    }

    try {
      setSaving(true);

      // Update delivery lines with received/rejected quantities
      for (const line of delivery.lines || []) {
        const state = lineAcceptanceStates[line.id];
        const received = state?.received ?? line.quantity;
        const rejected = state?.rejected ?? 0;

        await supabase
          .from('delivery_lines')
          .update({
            quantity_ordered: line.quantity,
            quantity_received: received,
            quantity_rejected: rejected,
            rejection_reason: state?.rejection_reason || null,
            rejection_notes: state?.rejection_notes || null,
            rejection_photo_url: line.rejection_photo_url || null,
          })
          .eq('id', line.id);
      }

      // Update delivery status
      const { error } = await supabase
        .from('deliveries')
        .update({
          status: 'confirmed',
          confirmed_by: userId,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      if (error) throw error;

      // Check for rejections
      const rejectedLines = delivery.lines?.filter(
        l => (lineAcceptanceStates[l.id]?.rejected || 0) > 0
      ) || [];

      if (rejectedLines.length > 0) {
        const rejectedTotal = rejectedLines.reduce((sum, l) => {
          const rejectedQty = lineAcceptanceStates[l.id]?.rejected || 0;
          const lineTotal = rejectedQty * l.unit_price;
          const vatAmount = lineTotal * (l.vat_rate || 0) / 100;
          return sum + lineTotal + vatAmount;
        }, 0);

        const createCN = confirm(
          `${rejectedLines.length} item(s) were rejected totalling ${formatCurrency(rejectedTotal)}. Would you like to create a Credit Note Request?`
        );

        if (createCN) {
          const cnId = await createCNFromRejections(rejectedLines);
          toast.success('Delivery confirmed and credit note created');
          router.push(`/dashboard/stockly/credit-notes/${cnId}`);
          return;
        }
      }

      toast.success('Delivery confirmed successfully');
      router.push('/dashboard/stockly/deliveries');
    } catch (error: any) {
      console.error('Error confirming delivery:', error);
      toast.error('Failed to confirm delivery');
    } finally {
      setSaving(false);
    }
  }

  function getMatchStatusIcon(status: string) {
    switch (status) {
      case 'auto_matched':
        return <CheckCircle2 className="text-green-400" size={20} />;
      case 'manual_matched':
        return <CheckCircle2 className="text-blue-400" size={20} />;
      case 'new_item':
        return <Plus className="text-purple-400" size={20} />;
      case 'unmatched':
        return <XCircle className="text-red-400" size={20} />;
      default:
        return <AlertCircle className="text-amber-400" size={20} />;
    }
  }

  function getMatchStatusBadge(status: string) {
    const styles = {
      auto_matched: 'bg-green-500/20 text-green-400 border-green-500/30',
      manual_matched: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      new_item: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      unmatched: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    const labels = {
      auto_matched: 'Auto-matched',
      manual_matched: 'Manual-matched',
      new_item: 'New Item',
      unmatched: 'Unmatched',
    };

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium border ${
          styles[status as keyof typeof styles] || styles.unmatched
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  }

  function formatCurrency(amount?: number) {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  }

  function formatDate(dateString?: string) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-white">Loading delivery...</div>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-white">Delivery not found</div>
        </div>
      </div>
    );
  }

  const unmatchedLines = delivery.lines?.filter((l) => l.matched_status === 'unmatched') || [];
  const canConfirm = unmatchedLines.length === 0 && delivery.status !== 'confirmed';

  return (
    <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push('/dashboard/stockly/deliveries')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Deliveries
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Review Delivery
              </h1>
              <p className="text-slate-400 text-sm">
                {delivery.supplier?.name} • {formatDate(delivery.delivery_date)}
              </p>
            </div>
            {canConfirm && (
              <Button onClick={confirmDelivery} disabled={saving} variant="secondary">
                <Save size={18} className="mr-2" />
                {saving ? 'Confirming...' : 'Confirm Delivery'}
              </Button>
            )}
          </div>
        </div>

        {/* Invoice Header Info */}
        <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Invoice Number</label>
              <Input
                value={deliveryFormData.invoice_number}
                onChange={(e) =>
                  setDeliveryFormData({ ...deliveryFormData, invoice_number: e.target.value })
                }
                placeholder="Invoice #"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Invoice Date</label>
              <Input
                type="date"
                value={deliveryFormData.invoice_date}
                onChange={(e) =>
                  setDeliveryFormData({ ...deliveryFormData, invoice_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Delivery Note</label>
              <Input
                value={deliveryFormData.delivery_note_number}
                onChange={(e) =>
                  setDeliveryFormData({ ...deliveryFormData, delivery_note_number: e.target.value })
                }
                placeholder="DN #"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Total</label>
              <div className="text-lg font-semibold text-white">
                {formatCurrency(delivery.total)}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <Button onClick={saveDeliveryHeader} disabled={saving} variant="outline">
              <Save size={18} className="mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white/[0.03] border border-neutral-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Line Items</h2>
                <p className="text-sm text-slate-400 mt-1">
                  {unmatchedLines.length > 0
                    ? `${unmatchedLines.length} item(s) need matching`
                    : 'All items matched'}
                </p>
              </div>
              {rejectedTotal > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                  <div className="text-xs text-red-400">Rejected Total</div>
                  <div className="text-lg font-bold text-red-400">{formatCurrency(rejectedTotal)}</div>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/[0.05] border-b border-neutral-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Supplier Code
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">
                    VAT Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Matched To
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {delivery.lines?.map((line) => {
                  const acceptanceState = lineAcceptanceStates[line.id] || {
                    state: 'accept_all' as const,
                    received: line.quantity,
                    rejected: 0,
                  };
                  const isPartial = acceptanceState.state === 'partial';
                  
                  return (
                    <>
                      <tr key={line.id} className="hover:bg-white/[0.05] transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getMatchStatusIcon(line.matched_status)}
                            {getMatchStatusBadge(line.matched_status)}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-white">{line.description}</td>
                        <td className="px-4 py-4 text-sm text-slate-300">
                          {line.supplier_code || '—'}
                        </td>
                        <td className="px-4 py-4 text-sm text-white text-right">
                          Invoiced: {line.quantity}
                        </td>
                        <td className="px-4 py-4 text-sm text-white text-right">
                          {formatCurrency(line.unit_price)}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-300 text-right">
                          {line.vat_rate !== null && line.vat_rate !== undefined ? `${line.vat_rate}%` : '—'}
                        </td>
                        <td className="px-4 py-4 text-sm text-white font-medium text-right">
                          <div>
                            <div>{formatCurrency(line.line_total_inc_vat || line.line_total)}</div>
                            {line.vat_amount && line.vat_amount > 0 && (
                              <div className="text-xs text-slate-400">
                                Ex-VAT: {formatCurrency(line.line_total)} | VAT: {formatCurrency(line.vat_amount)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-300">
                          {line.product_variant?.stock_item?.name || '—'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          {line.matched_status === 'unmatched' && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                onClick={() => {
                                  setMatchingLineId(line.id);
                                  fetchProductVariants(delivery.supplier_id);
                                }}
                                variant="outline"
                                className="text-xs"
                              >
                                Match
                              </Button>
                              <Button
                                onClick={() => {
                                  setCreatingItemLineId(line.id);
                                  setShowCreateItemModal(true);
                                }}
                                variant="outline"
                                className="text-xs"
                              >
                                Create New
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {/* Rejection UI Row */}
                      {line.matched_status !== 'unmatched' && (
                        <tr className="bg-white/[0.02]">
                          <td colSpan={9} className="px-4 py-4">
                            <div className="space-y-3">
                              {/* Acceptance Options */}
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-slate-400">Acceptance:</span>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`acceptance-${line.id}`}
                                    checked={acceptanceState.state === 'accept_all'}
                                    onChange={() => {
                                      setLineAcceptanceStates(prev => ({
                                        ...prev,
                                        [line.id]: {
                                          state: 'accept_all',
                                          received: line.quantity,
                                          rejected: 0,
                                        },
                                      }));
                                    }}
                                    className="text-[#EC4899]"
                                  />
                                  <span className="text-sm text-white">Accept All ({line.quantity})</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`acceptance-${line.id}`}
                                    checked={acceptanceState.state === 'partial'}
                                    onChange={() => {
                                      setLineAcceptanceStates(prev => ({
                                        ...prev,
                                        [line.id]: {
                                          state: 'partial',
                                          received: Math.max(0, line.quantity - 1),
                                          rejected: 1,
                                          rejection_reason: 'damaged',
                                        },
                                      }));
                                    }}
                                    className="text-[#EC4899]"
                                  />
                                  <span className="text-sm text-white">Partial</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`acceptance-${line.id}`}
                                    checked={acceptanceState.state === 'reject_all'}
                                    onChange={() => {
                                      setLineAcceptanceStates(prev => ({
                                        ...prev,
                                        [line.id]: {
                                          state: 'reject_all',
                                          received: 0,
                                          rejected: line.quantity,
                                          rejection_reason: 'damaged',
                                        },
                                      }));
                                    }}
                                    className="text-[#EC4899]"
                                  />
                                  <span className="text-sm text-white">Reject All</span>
                                </label>
                              </div>

                              {/* Quantity Inputs */}
                              {isPartial && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">Received</label>
                                    <Input
                                      type="number"
                                      step="0.001"
                                      value={acceptanceState.received}
                                      onChange={(e) => {
                                        const received = parseFloat(e.target.value) || 0;
                                        const rejected = line.quantity - received;
                                        setLineAcceptanceStates(prev => ({
                                          ...prev,
                                          [line.id]: {
                                            ...prev[line.id],
                                            received: Math.max(0, Math.min(line.quantity, received)),
                                            rejected: Math.max(0, Math.min(line.quantity, rejected)),
                                          },
                                        }));
                                      }}
                                      min="0"
                                      max={line.quantity}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">Rejected</label>
                                    <Input
                                      type="number"
                                      step="0.001"
                                      value={acceptanceState.rejected}
                                      onChange={(e) => {
                                        const rejected = parseFloat(e.target.value) || 0;
                                        const received = line.quantity - rejected;
                                        setLineAcceptanceStates(prev => ({
                                          ...prev,
                                          [line.id]: {
                                            ...prev[line.id],
                                            received: Math.max(0, Math.min(line.quantity, received)),
                                            rejected: Math.max(0, Math.min(line.quantity, rejected)),
                                          },
                                        }));
                                      }}
                                      min="0"
                                      max={line.quantity}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">Reason</label>
                                    <Select
                                      value={acceptanceState.rejection_reason || 'damaged'}
                                      onValueChange={(val) => {
                                        setLineAcceptanceStates(prev => ({
                                          ...prev,
                                          [line.id]: {
                                            ...prev[line.id],
                                            rejection_reason: val,
                                          },
                                        }));
                                      }}
                                      options={[
                                        { value: 'damaged', label: 'Damaged' },
                                        { value: 'short_delivery', label: 'Short Delivery' },
                                        { value: 'wrong_item', label: 'Wrong Item' },
                                        { value: 'quality_issue', label: 'Quality Issue' },
                                        { value: 'temperature_breach', label: 'Temperature Breach' },
                                        { value: 'expired', label: 'Expired' },
                                        { value: 'other', label: 'Other' },
                                      ]}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">Notes</label>
                                    <Input
                                      value={acceptanceState.rejection_notes || ''}
                                      onChange={(e) => {
                                        setLineAcceptanceStates(prev => ({
                                          ...prev,
                                          [line.id]: {
                                            ...prev[line.id],
                                            rejection_notes: e.target.value,
                                          },
                                        }));
                                      }}
                                      placeholder="Rejection notes..."
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Rejection reason for reject_all */}
                              {acceptanceState.state === 'reject_all' && (
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">Reason</label>
                                    <Select
                                      value={acceptanceState.rejection_reason || 'damaged'}
                                      onValueChange={(val) => {
                                        setLineAcceptanceStates(prev => ({
                                          ...prev,
                                          [line.id]: {
                                            ...prev[line.id],
                                            rejection_reason: val,
                                          },
                                        }));
                                      }}
                                      options={[
                                        { value: 'damaged', label: 'Damaged' },
                                        { value: 'short_delivery', label: 'Short Delivery' },
                                        { value: 'wrong_item', label: 'Wrong Item' },
                                        { value: 'quality_issue', label: 'Quality Issue' },
                                        { value: 'temperature_breach', label: 'Temperature Breach' },
                                        { value: 'expired', label: 'Expired' },
                                        { value: 'other', label: 'Other' },
                                      ]}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">Notes</label>
                                    <Input
                                      value={acceptanceState.rejection_notes || ''}
                                      onChange={(e) => {
                                        setLineAcceptanceStates(prev => ({
                                          ...prev,
                                          [line.id]: {
                                            ...prev[line.id],
                                            rejection_notes: e.target.value,
                                          },
                                        }));
                                      }}
                                      placeholder="Rejection notes..."
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Match Modal */}
        {matchingLineId && (
          <Dialog open={!!matchingLineId} onOpenChange={() => setMatchingLineId(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-white">
                  Match Line Item
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Search Products</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                      placeholder="Search by name or supplier code..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        fetchProductVariants(delivery.supplier_id, e.target.value);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {productVariants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => {
                        matchLineToVariant(matchingLineId, variant.id);
                      }}
                      className="w-full text-left p-3 rounded-lg border border-neutral-700 hover:border-[#EC4899] transition-colors bg-white/[0.03]"
                    >
                      <div className="font-medium text-white">{variant.product_name}</div>
                      {variant.supplier_code && (
                        <div className="text-xs text-slate-400 mt-1">
                          Code: {variant.supplier_code}
                        </div>
                      )}
                      {variant.stock_item && (
                        <div className="text-xs text-slate-300 mt-1">
                          Stock Item: {variant.stock_item.name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Create New Item Modal */}
        {showCreateItemModal && creatingItemLineId && (
          <Dialog open={showCreateItemModal} onOpenChange={setShowCreateItemModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-white">
                  Create New Stock Item
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <p className="text-sm text-slate-300">
                  This will create a new stock item and product variant from the invoice line item.
                </p>
                <Button
                  onClick={() => {
                    const line = delivery.lines?.find((l) => l.id === creatingItemLineId);
                    if (line) {
                      createStockItemFromLine(creatingItemLineId, line);
                    }
                  }}
                  disabled={saving}
                  variant="secondary"
                  className="w-full"
                >
                  {saving ? 'Creating...' : 'Create Stock Item'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

