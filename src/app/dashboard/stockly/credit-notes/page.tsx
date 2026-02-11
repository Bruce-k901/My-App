'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, FileX, Calendar, ArrowLeft } from '@/components/ui/icons';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { NewCreditNoteModal } from '@/components/stockly/NewCreditNoteModal';

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
  lines?: { count: number };
  _count?: { lines: number };
}

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'Approved', value: 'approved' },
  { label: 'Disputed', value: 'disputed' },
  { label: 'CN Received', value: 'received' },
  { label: 'Closed', value: 'closed' },
];

const CN_STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  submitted: { label: 'Submitted', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  acknowledged: { label: 'Acknowledged', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  approved: { label: 'Approved', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  disputed: { label: 'Disputed', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  received: { label: 'CN Received', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  closed: { label: 'Closed', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
} as const;

export default function CreditNotesPage() {
  const router = useRouter();
  const { companyId, siteId } = useAppContext();
  const [creditNotes, setCreditNotes] = useState<CreditNoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchSuppliers();
      fetchCreditNotes();
    }
  }, [companyId, siteId]);

  useEffect(() => {
    fetchCreditNotes();
  }, [statusFilter, supplierFilter, startDate, endDate]);

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
    }
  }

  async function fetchCreditNotes() {
    try {
      setLoading(true);
      if (!companyId) return;

      // Build base query (views don't support foreign key relationships)
      let query = supabase
        .from('credit_note_requests')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (siteId) {
        query = query.eq('site_id', siteId);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (supplierFilter && supplierFilter !== 'all') {
        query = query.eq('supplier_id', supplierFilter);
      }

      if (startDate) {
        query = query.gte('request_date', startDate);
      }

      if (endDate) {
        query = query.lte('request_date', endDate);
      }

      const { data: creditNotes, error } = await query;

      if (error) throw error;

      // Fetch related data separately
      const supplierIds = [...new Set((creditNotes || []).map(cn => cn.supplier_id).filter(Boolean))];
      const deliveryIds = [...new Set((creditNotes || []).map(cn => cn.delivery_id).filter(Boolean))];
      const creditNoteIds = (creditNotes || []).map(cn => cn.id);

      // Fetch suppliers
      const suppliersMap = new Map();
      if (supplierIds.length > 0) {
        const { data: suppliersData } = await supabase
          .from('suppliers')
          .select('id, name, code')
          .in('id', supplierIds);
        
        (suppliersData || []).forEach(s => suppliersMap.set(s.id, s));
      }

      // Fetch deliveries
      const deliveriesMap = new Map();
      if (deliveryIds.length > 0) {
        const { data: deliveriesData } = await supabase
          .from('deliveries')
          .select('id, invoice_number, delivery_date')
          .in('id', deliveryIds);
        
        (deliveriesData || []).forEach(d => deliveriesMap.set(d.id, d));
      }

      // Fetch line counts
      const linesCountMap = new Map();
      if (creditNoteIds.length > 0) {
        const { data: linesData } = await supabase
          .from('credit_note_lines')
          .select('credit_note_request_id')
          .in('credit_note_request_id', creditNoteIds);
        
        // Count lines per credit note
        (linesData || []).forEach(line => {
          const count = linesCountMap.get(line.credit_note_request_id) || 0;
          linesCountMap.set(line.credit_note_request_id, count + 1);
        });
      }

      // Enrich credit notes with related data
      const enrichedCreditNotes = (creditNotes || []).map(cn => ({
        ...cn,
        supplier: suppliersMap.get(cn.supplier_id) || null,
        delivery: deliveriesMap.get(cn.delivery_id) || null,
        lines: { count: linesCountMap.get(cn.id) || 0 }
      }));

      setCreditNotes(enrichedCreditNotes as CreditNoteRequest[]);
    } catch (error: any) {
      console.error('Error fetching credit notes:', error);
      toast.error('Failed to load credit notes');
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const config = CN_STATUS_CONFIG[status as keyof typeof CN_STATUS_CONFIG] || CN_STATUS_CONFIG.draft;
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${config.color}`}>
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

  const filteredCreditNotes = useMemo(() => {
    return creditNotes.filter((cn) => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          cn.request_number?.toLowerCase().includes(searchLower) ||
          cn.supplier?.name.toLowerCase().includes(searchLower) ||
          cn.delivery?.invoice_number?.toLowerCase().includes(searchLower) ||
          cn.supplier_cn_number?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [creditNotes, searchTerm]);

  const supplierOptions = useMemo(() => {
    return [
      { label: 'All Suppliers', value: 'all' },
      ...suppliers.map((s) => ({ label: s.name, value: s.id })),
    ];
  }, [suppliers]);

  // Summary calculations
  const summary = useMemo(() => {
    const draft = creditNotes.filter(cn => cn.status === 'draft').length;
    const submitted = creditNotes.filter(cn => cn.status === 'submitted').length;
    const awaiting = creditNotes
      .filter(cn => ['submitted', 'acknowledged', 'approved'].includes(cn.status))
      .reduce((sum, cn) => sum + cn.total, 0);
    
    const thisMonth = new Date();
    const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().split('T')[0];
    const thisMonthTotal = creditNotes
      .filter(cn => cn.request_date >= monthStart)
      .reduce((sum, cn) => sum + cn.total, 0);

    return { draft, submitted, awaiting, thisMonthTotal };
  }, [creditNotes]);

  if (loading && creditNotes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Loading credit notes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
              href="/dashboard/stockly"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Credit Note Requests</h1>
            <p className="text-white/60 text-sm mt-1">Manage credit note requests and track supplier responses</p>
          </div>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#10B981] text-[#10B981] hover:shadow-[0_0_12px_rgba(16,185,129,0.7)] rounded-lg transition-all duration-200 ease-in-out"
        >
          <Plus className="w-5 h-5" />
          New CN Request
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="text-sm text-white/60 mb-1">Draft</div>
          <div className="text-2xl font-bold text-white">{summary.draft}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="text-sm text-white/60 mb-1">Submitted</div>
          <div className="text-2xl font-bold text-white">{summary.submitted}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="text-sm text-white/60 mb-1">Awaiting</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(summary.awaiting)}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="text-sm text-white/60 mb-1">This Month</div>
            <div className="text-2xl font-bold text-white">{formatCurrency(summary.thisMonthTotal)}</div>
          </div>
        </div>

      {/* Filters */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="text"
              placeholder="Search CN requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={STATUS_OPTIONS}
            placeholder="Filter by status"
          />

          <Select
            value={supplierFilter}
            onValueChange={setSupplierFilter}
            options={supplierOptions}
            placeholder="Filter by supplier"
          />

          <Input
            type="date"
            placeholder="Start date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            type="date"
            placeholder="End date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Credit Notes Table */}
        {filteredCreditNotes.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
          <FileX className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">
            {searchTerm || statusFilter !== 'all' || supplierFilter !== 'all' || startDate || endDate
              ? 'No credit notes found'
              : 'No credit notes yet'}
          </h3>
          <p className="text-white/60 text-sm mb-4">
            {searchTerm || statusFilter !== 'all' || supplierFilter !== 'all' || startDate || endDate
              ? 'Try adjusting your filters'
              : 'Get started by creating your first credit note request'}
          </p>
          {!searchTerm && statusFilter === 'all' && supplierFilter === 'all' && !startDate && !endDate && (
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-transparent border border-[#10B981] text-[#10B981] hover:shadow-[0_0_12px_rgba(16,185,129,0.7)] rounded-lg transition-all duration-200 ease-in-out"
            >
              <Plus className="w-4 h-4" />
              New CN Request
            </button>
          )}
        </div>
      ) : (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.05] border-b border-white/[0.06]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      CN#
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Delivery
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {filteredCreditNotes.map((cn) => (
                    <tr
                      key={cn.id}
                      className="hover:bg-white/[0.05] transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/stockly/credit-notes/${cn.id}`)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-white font-medium">
                        {cn.request_number}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                        {formatDate(cn.request_date)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                        {cn.supplier?.name || '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">
                        {cn.delivery?.invoice_number || '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-white font-medium text-right">
                        {formatCurrency(cn.total)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(cn.status)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/stockly/credit-notes/${cn.id}`);
                          }}
                          className="text-[#D37E91] hover:text-[#D37E91]/80 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* New CN Modal */}
      <NewCreditNoteModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onSuccess={(cnId) => {
            setIsNewModalOpen(false);
            router.push(`/dashboard/stockly/credit-notes/${cnId}`);
          }}
        />
      </div>
    </div>
  );
}
