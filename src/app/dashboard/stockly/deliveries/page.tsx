'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Calendar, Filter, Eye, Edit2, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { InvoiceUploadModal } from '@/components/stockly/InvoiceUploadModal';
import { ManualDeliveryModal } from '@/components/stockly/ManualDeliveryModal';

interface Supplier {
  id: string;
  name: string;
  code?: string;
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
  ai_extraction?: object;
  requires_review: boolean;
  document_urls?: string[];
  received_by?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  supplier?: Supplier;
  lines?: { count: number };
}

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending Review', value: 'pending_review' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Disputed', value: 'disputed' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function DeliveriesPage() {
  const router = useRouter();
  const { companyId, siteId } = useAppContext();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchSuppliers();
      fetchDeliveries();
    }
  }, [companyId, siteId]);

  useEffect(() => {
    fetchDeliveries();
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

  async function fetchDeliveries() {
    try {
      setLoading(true);
      if (!companyId) return;

      let query = supabase
        .from('deliveries')
        .select(`
          *,
          supplier:suppliers(id, name, code),
          received_by_profile:profiles!received_by(full_name),
          lines:delivery_lines(count)
        `)
        .eq('company_id', companyId)
        .order('delivery_date', { ascending: false });

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
        query = query.gte('delivery_date', startDate);
      }

      if (endDate) {
        query = query.lte('delivery_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDeliveries((data || []) as Delivery[]);
    } catch (error: any) {
      console.error('Error fetching deliveries:', error);
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const styles = {
      draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      pending_review: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
      disputed: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };

    const labels = {
      draft: 'Draft',
      pending_review: 'Pending Review',
      confirmed: 'Confirmed',
      disputed: 'Disputed',
      cancelled: 'Cancelled',
    };

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium border ${styles[status as keyof typeof styles] || styles.draft}`}
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

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((delivery) => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          delivery.invoice_number?.toLowerCase().includes(searchLower) ||
          delivery.delivery_note_number?.toLowerCase().includes(searchLower) ||
          delivery.supplier?.name.toLowerCase().includes(searchLower) ||
          delivery.supplier?.code?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [deliveries, searchTerm]);

  const supplierOptions = useMemo(() => {
    return [
      { label: 'All Suppliers', value: 'all' },
      ...suppliers.map((s) => ({ label: s.name, value: s.id })),
    ];
  }, [suppliers]);

  if (loading && deliveries.length === 0) {
    return (
      <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-white">Loading deliveries...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/stockly"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Deliveries</h1>
              <p className="text-slate-400 text-sm">Manage delivery receipts and invoices</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setIsManualModalOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus size={18} />
              Add Delivery
            </Button>
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Plus size={18} />
              Upload Invoice
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="text"
              placeholder="Search invoices..."
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

        {/* Deliveries Table */}
        {filteredDeliveries.length === 0 ? (
          <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-12 text-center">
            <FileText className="mx-auto text-slate-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm || statusFilter !== 'all' || supplierFilter !== 'all' || startDate || endDate
                ? 'No deliveries found'
                : 'No deliveries yet'}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchTerm || statusFilter !== 'all' || supplierFilter !== 'all' || startDate || endDate
                ? 'Try adjusting your filters'
                : 'Get started by uploading your first invoice'}
            </p>
            {!searchTerm && statusFilter === 'all' && supplierFilter === 'all' && !startDate && !endDate && (
              <Button onClick={() => setIsUploadModalOpen(true)} variant="secondary">
                <Plus size={18} className="mr-2" />
                Upload Invoice
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-neutral-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.05] border-b border-neutral-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Total
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
                  {filteredDeliveries.map((delivery) => (
                    <tr
                      key={delivery.id}
                      className="hover:bg-white/[0.05] transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/stockly/deliveries/${delivery.id}`)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                        {formatDate(delivery.delivery_date)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                        {delivery.supplier?.name || '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">
                        {delivery.invoice_number || '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">
                        {delivery.lines?.[0]?.count || 0} items
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-white font-medium">
                        {formatCurrency(delivery.total)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(delivery.status)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/stockly/deliveries/${delivery.id}`);
                          }}
                          className="text-[#EC4899] hover:text-[#EC4899]/80 transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoice Upload Modal */}
        <InvoiceUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={(deliveryId) => {
            setIsUploadModalOpen(false);
            router.push(`/dashboard/stockly/deliveries/${deliveryId}`);
          }}
        />

        {/* Manual Delivery Modal */}
        <ManualDeliveryModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          onSuccess={(deliveryId) => {
            setIsManualModalOpen(false);
            fetchDeliveries(); // Refresh the list
            router.push(`/dashboard/stockly/deliveries/${deliveryId}`);
          }}
        />
      </div>
    </div>
  );
}

