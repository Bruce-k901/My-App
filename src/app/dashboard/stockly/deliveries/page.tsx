'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Calendar, Filter, Eye, Edit2, FileText, ArrowLeft, Trash2 } from '@/components/ui/icons';
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

      // Only filter by site_id if it's a valid UUID (not "all")
      if (siteId && siteId !== 'all') {
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
 draft:'bg-gray-50 dark:bg-theme-surface-elevated0/20 text-theme-secondary border-gray-200 dark:border-gray-500/30',
      pending_review: 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
      confirmed: 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30',
      disputed: 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
 cancelled:'bg-gray-50 dark:bg-theme-surface-elevated0/20 text-theme-secondary border-gray-200 dark:border-gray-500/30',
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

  async function handleDelete(deliveryId: string) {
    if (!confirm('Are you sure you want to delete this delivery? This will also delete all line items.')) {
      return;
    }

    try {
      // Delete delivery lines first (cascade should handle this, but being explicit)
      await supabase.from('delivery_lines').delete().eq('delivery_id', deliveryId);

      // Delete the delivery
      const { error } = await supabase.from('deliveries').delete().eq('id', deliveryId);

      if (error) throw error;

      toast.success('Delivery deleted');
      fetchDeliveries();
    } catch (error: any) {
      console.error('Error deleting delivery:', error);
      toast.error('Failed to delete delivery');
    }
  }

  if (loading && deliveries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-secondary">Loading deliveries...</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-theme-surface-elevated min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link
              href="/dashboard/stockly"
              className="p-2 rounded-lg bg-theme-surface hover:bg-theme-muted border border-theme text-theme-secondary hover:text-theme-primary transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-theme-primary flex items-center gap-2 sm:gap-3">
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-module-fg flex-shrink-0" />
                Deliveries
              </h1>
              <p className="text-theme-secondary text-xs sm:text-sm mt-1">
                Manage delivery receipts and invoices
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow rounded-lg transition-all duration-200 ease-in-out text-sm"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add Delivery</span>
              <span className="sm:hidden">Add</span>
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow rounded-lg transition-all duration-200 ease-in-out text-sm"
            >
              <Plus className="w-5 h-5" />
              Upload Invoice
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-theme-surface border border-theme rounded-xl p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-tertiary" size={18} />
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

          <div className="hidden sm:block">
            <Input
              type="date"
              placeholder="Start date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="hidden sm:block">
            <Input
              type="date"
              placeholder="End date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          </div>
        </div>

        {/* Deliveries Table */}
        {filteredDeliveries.length === 0 ? (
          <div className="bg-theme-surface border border-theme rounded-xl p-12 text-center">
            <FileText className="mx-auto text-gray-300 dark:text-white/20 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-theme-primary mb-2">
              {searchTerm || statusFilter !== 'all' || supplierFilter !== 'all' || startDate || endDate
                ? 'No deliveries found'
                : 'No deliveries yet'}
            </h3>
            <p className="text-theme-secondary mb-6">
              {searchTerm || statusFilter !== 'all' || supplierFilter !== 'all' || startDate || endDate
                ? 'Try adjusting your filters'
                : 'Get started by uploading your first invoice'}
            </p>
            {!searchTerm && statusFilter === 'all' && supplierFilter === 'all' && !startDate && !endDate && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow rounded-lg transition-all duration-200 ease-in-out"
              >
                <Plus className="w-4 h-4" />
                Upload Invoice
              </button>
            )}
          </div>
        ) : (
          <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-theme-button border-b border-theme">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="hidden sm:table-cell px-4 py-3 text-right text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                  {filteredDeliveries.map((delivery) => (
                    <tr
                      key={delivery.id}
                      className="hover:bg-theme-hover transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/stockly/deliveries/${delivery.id}`)}
                    >
                      <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-theme-primary">
                        {formatDate(delivery.delivery_date)}
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-theme-primary">
                        {delivery.supplier?.name || '—'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-theme-secondary">
                        {delivery.invoice_number || '—'}
                      </td>
                      <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-sm text-theme-secondary">
                        {delivery.lines?.[0]?.count || 0} items
                      </td>
                      <td className="hidden sm:table-cell px-4 py-4 whitespace-nowrap text-sm text-theme-primary font-medium">
                        {formatCurrency(delivery.total)}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(delivery.status)}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/stockly/deliveries/${delivery.id}`);
                            }}
                            className="text-module-fg hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(delivery.id);
                            }}
                            className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
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

