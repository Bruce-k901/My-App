'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, CheckCircle2, XCircle, AlertCircle, Plus, Trash2, Upload } from '@/components/ui/icons';
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

interface Delivery {
  id: string;
  invoice_number?: string;
  delivery_date: string;
  delivery_note_number?: string;
}

interface StockItem {
  id: string;
  name: string;
}

interface ProductVariant {
  id: string;
  product_name: string;
  supplier_code?: string;
}

interface CreditNoteLine {
  id: string;
  credit_note_request_id: string;
  delivery_line_id?: string;
  stock_item_id?: string;
  product_variant_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  vat_rate: number;
  vat_amount: number;
  line_total_inc_vat?: number;
  reason: string;
  notes?: string;
  photo_url?: string;
  approved?: boolean;
  approved_quantity?: number;
  approved_amount?: number;
  created_at: string;
  stock_item?: StockItem;
  product_variant?: ProductVariant;
}

interface CreditNoteRequest {
  id: string;
  company_id: string;
  site_id?: string;
  supplier_id: string;
  delivery_id?: string;
  request_number: string;
  request_date: string;
  subtotal: number;
  vat: number;
  total: number;
  status: 'draft' | 'submitted' | 'acknowledged' | 'approved' | 'disputed' | 'received' | 'closed';
  supplier_cn_number?: string;
  supplier_cn_date?: string;
  approved_amount?: number;
  submitted_at?: string;
  submitted_by?: string;
  submitted_via?: string;
  supplier_response_notes?: string;
  document_urls?: string[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  supplier?: Supplier;
  delivery?: Delivery;
  submitted_by_profile?: { full_name: string };
  created_by_profile?: { full_name: string };
  lines?: CreditNoteLine[];
}

const CN_STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  submitted: { label: 'Submitted', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  acknowledged: { label: 'Acknowledged', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  approved: { label: 'Approved', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  disputed: { label: 'Disputed', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  received: { label: 'CN Received', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  closed: { label: 'Closed', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
} as const;

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

export default function CreditNoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const cnId = params.id as string;
  const { companyId, userId } = useAppContext();

  const [creditNote, setCreditNote] = useState<CreditNoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplierResponse, setSupplierResponse] = useState({
    supplier_cn_number: '',
    supplier_cn_date: '',
    approved_amount: '',
    supplier_response_notes: '',
  });

  useEffect(() => {
    if (cnId && companyId) {
      fetchCreditNote();
    }
  }, [cnId, companyId]);

  async function fetchCreditNote() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('credit_note_requests')
        .select(`
          *,
          supplier:suppliers(*),
          delivery:deliveries(id, invoice_number, delivery_date, delivery_note_number),
          submitted_by_profile:profiles!submitted_by(full_name),
          created_by_profile:profiles!created_by(full_name),
          lines:credit_note_lines(
            *,
            stock_item:stock_items(id, name),
            product_variant:product_variants(id, product_name, supplier_code)
          )
        `)
        .eq('id', cnId)
        .single();

      if (error) throw error;
      setCreditNote(data as CreditNoteRequest);
      setSupplierResponse({
        supplier_cn_number: data.supplier_cn_number || '',
        supplier_cn_date: data.supplier_cn_date || '',
        approved_amount: data.approved_amount?.toString() || '',
        supplier_response_notes: data.supplier_response_notes || '',
      });
    } catch (error: any) {
      console.error('Error fetching credit note:', error);
      toast.error('Failed to load credit note');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: string, additionalData?: any) {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('credit_note_requests')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...additionalData,
        })
        .eq('id', cnId);

      if (error) throw error;
      toast.success(`Status updated to ${CN_STATUS_CONFIG[newStatus as keyof typeof CN_STATUS_CONFIG].label}`);
      await fetchCreditNote();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  }

  async function submitToSupplier(via: string) {
    await updateStatus('submitted', {
      submitted_at: new Date().toISOString(),
      submitted_by: userId,
      submitted_via: via,
    });
  }

  async function saveSupplierResponse() {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('credit_note_requests')
        .update({
          supplier_cn_number: supplierResponse.supplier_cn_number || null,
          supplier_cn_date: supplierResponse.supplier_cn_date || null,
          approved_amount: supplierResponse.approved_amount ? parseFloat(supplierResponse.approved_amount) : null,
          supplier_response_notes: supplierResponse.supplier_response_notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cnId);

      if (error) throw error;
      toast.success('Supplier response saved');
      await fetchCreditNote();
    } catch (error: any) {
      console.error('Error saving supplier response:', error);
      toast.error('Failed to save supplier response');
    } finally {
      setSaving(false);
    }
  }

  async function recordCNReceived() {
    if (!supplierResponse.supplier_cn_number || !supplierResponse.supplier_cn_date) {
      toast.error('Please enter supplier CN number and date');
      return;
    }
    await updateStatus('received', {
      supplier_cn_number: supplierResponse.supplier_cn_number,
      supplier_cn_date: supplierResponse.supplier_cn_date,
      approved_amount: supplierResponse.approved_amount ? parseFloat(supplierResponse.approved_amount) : null,
    });
  }

  function getStatusBadge(status: string) {
    const config = CN_STATUS_CONFIG[status as keyof typeof CN_STATUS_CONFIG] || CN_STATUS_CONFIG.draft;
    return (
      <span className={`px-3 py-1 rounded text-sm font-medium border ${config.color}`}>
        {config.label}
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

  function getReasonLabel(reason: string) {
    return REJECTION_REASONS.find(r => r.value === reason)?.label || reason;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-white">Loading credit note...</div>
        </div>
      </div>
    );
  }

  if (!creditNote) {
    return (
      <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-white">Credit note not found</div>
        </div>
      </div>
    );
  }

  const isDraft = creditNote.status === 'draft';
  const canEdit = ['draft', 'disputed'].includes(creditNote.status);

  return (
    <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push('/dashboard/stockly/credit-notes')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Credit Notes
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {creditNote.request_number}
              </h1>
              <p className="text-slate-400 text-sm">
                {creditNote.supplier?.name}
                {creditNote.delivery && ` • Linked to: ${creditNote.delivery.invoice_number || 'Delivery'} (${formatDate(creditNote.delivery.delivery_date)})`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(creditNote.status)}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white/[0.03] border border-neutral-800 rounded-xl overflow-hidden mb-6">
          <div className="p-6 border-b border-neutral-800">
            <h2 className="text-lg font-semibold text-white">Line Items</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/[0.05] border-b border-neutral-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Reason</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">VAT</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {creditNote.lines?.map((line) => (
                  <tr key={line.id} className="hover:bg-white/[0.05] transition-colors">
                    <td className="px-4 py-4">
                      <div className="text-sm text-white font-medium">{line.description}</div>
                      {line.notes && (
                        <div className="text-xs text-slate-400 mt-1">{line.notes}</div>
                      )}
                      {line.photo_url && (
                        <a
                          href={line.photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#D37E91] hover:underline mt-1 inline-flex items-center gap-1"
                        >
                          <Upload size={12} />
                          View Photo
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-300">
                      {getReasonLabel(line.reason)}
                    </td>
                    <td className="px-4 py-4 text-sm text-white text-right">{line.quantity}</td>
                    <td className="px-4 py-4 text-sm text-white text-right">
                      {formatCurrency(line.unit_price)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-300 text-right">
                      {line.vat_rate}%
                    </td>
                    <td className="px-4 py-4 text-sm text-white font-medium text-right">
                      {formatCurrency(line.line_total_inc_vat || line.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="p-6 border-t border-neutral-800">
            <div className="flex justify-end">
              <div className="w-full md:w-64 space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal (Ex-VAT):</span>
                  <span className="font-medium">{formatCurrency(creditNote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>VAT:</span>
                  <span className="font-medium">{formatCurrency(creditNote.vat)}</span>
                </div>
                <div className="border-t border-neutral-700 pt-2 flex justify-between text-white">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-lg">{formatCurrency(creditNote.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Supplier Response */}
        <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Supplier Response</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Supplier CN Number</label>
              <Input
                value={supplierResponse.supplier_cn_number}
                onChange={(e) =>
                  setSupplierResponse({ ...supplierResponse, supplier_cn_number: e.target.value })
                }
                placeholder="CN-12345"
                disabled={creditNote.status === 'closed'}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Supplier CN Date</label>
              <Input
                type="date"
                value={supplierResponse.supplier_cn_date}
                onChange={(e) =>
                  setSupplierResponse({ ...supplierResponse, supplier_cn_date: e.target.value })
                }
                disabled={creditNote.status === 'closed'}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Approved Amount</label>
              <Input
                type="number"
                step="0.01"
                value={supplierResponse.approved_amount}
                onChange={(e) =>
                  setSupplierResponse({ ...supplierResponse, approved_amount: e.target.value })
                }
                placeholder="0.00"
                disabled={creditNote.status === 'closed'}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Notes</label>
              <Input
                value={supplierResponse.supplier_response_notes}
                onChange={(e) =>
                  setSupplierResponse({ ...supplierResponse, supplier_response_notes: e.target.value })
                }
                placeholder="Supplier response notes..."
                disabled={creditNote.status === 'closed'}
              />
            </div>
          </div>
          {creditNote.status !== 'closed' && (
            <div className="mt-4">
              <Button onClick={saveSupplierResponse} disabled={saving} variant="outline">
                <Save size={18} className="mr-2" />
                Save Response
              </Button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {creditNote.status === 'draft' && (
              <>
                <Button
                  onClick={() => submitToSupplier('email')}
                  disabled={saving}
                  variant="secondary"
                >
                  Submit to Supplier
                </Button>
              </>
            )}
            {creditNote.status === 'submitted' && (
              <>
                <Button
                  onClick={() => updateStatus('acknowledged')}
                  disabled={saving}
                  variant="outline"
                >
                  Mark Acknowledged
                </Button>
                <Button
                  onClick={() => updateStatus('disputed')}
                  disabled={saving}
                  variant="outline"
                >
                  Mark Disputed
                </Button>
              </>
            )}
            {creditNote.status === 'acknowledged' && (
              <>
                <Button
                  onClick={() => updateStatus('approved')}
                  disabled={saving}
                  variant="secondary"
                >
                  Mark Approved
                </Button>
                <Button
                  onClick={() => updateStatus('disputed')}
                  disabled={saving}
                  variant="outline"
                >
                  Mark Disputed
                </Button>
              </>
            )}
            {creditNote.status === 'approved' && (
              <Button
                onClick={recordCNReceived}
                disabled={saving || !supplierResponse.supplier_cn_number || !supplierResponse.supplier_cn_date}
                variant="secondary"
              >
                Mark CN Received
              </Button>
            )}
            {creditNote.status === 'received' && (
              <Button
                onClick={() => updateStatus('closed')}
                disabled={saving}
                variant="secondary"
              >
                Close & Reconcile
              </Button>
            )}
            {creditNote.status === 'disputed' && (
              <>
                <Button
                  onClick={() => updateStatus('submitted')}
                  disabled={saving}
                  variant="secondary"
                >
                  Resubmit
                </Button>
                <Button
                  onClick={() => updateStatus('closed')}
                  disabled={saving}
                  variant="outline"
                >
                  Close as Unresolved
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}










