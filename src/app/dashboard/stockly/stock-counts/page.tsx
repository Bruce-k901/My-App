'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Calculator, Calendar, Filter, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { NewStockCountModal } from '@/components/stockly/NewStockCountModal';

interface StockCount {
  id: string;
  company_id: string;
  site_id: string;
  count_number: string;
  count_date: string;
  count_type: 'full' | 'partial' | 'spot' | 'rolling';
  status: 'draft' | 'in_progress' | 'pending_review' | 'completed' | 'cancelled';
  total_items: number;
  counted_items: number;
  variance_count: number;
  variance_value: number;
  started_by?: string;
  completed_by?: string;
  started_by_profile?: { full_name: string };
  completed_by_profile?: { full_name: string };
  sections?: { count: number }[];
}

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Pending Review', value: 'pending_review' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const TYPE_OPTIONS = [
  { label: 'All Types', value: 'all' },
  { label: 'Full Count', value: 'full' },
  { label: 'Partial Count', value: 'partial' },
  { label: 'Spot Check', value: 'spot' },
  { label: 'Rolling Count', value: 'rolling' },
];

const COUNT_STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  pending_review: { label: 'Pending Review', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
} as const;

export default function StockCountsPage() {
  const router = useRouter();
  const { companyId, siteId } = useAppContext();
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchStockCounts();
    }
  }, [companyId, siteId]);

  useEffect(() => {
    fetchStockCounts();
  }, [statusFilter, typeFilter, startDate, endDate]);

  async function fetchStockCounts() {
    try {
      setLoading(true);
      if (!companyId) return;

      let query = supabase
        .from('stock_counts')
        .select(`
          *,
          started_by_profile:profiles!started_by(full_name),
          completed_by_profile:profiles!completed_by(full_name),
          sections:stock_count_sections(count)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (siteId) {
        query = query.eq('site_id', siteId);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter && typeFilter !== 'all') {
        query = query.eq('count_type', typeFilter);
      }

      if (startDate) {
        query = query.gte('count_date', startDate);
      }

      if (endDate) {
        query = query.lte('count_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStockCounts((data || []) as StockCount[]);
    } catch (error: any) {
      console.error('Error fetching stock counts:', error);
      toast.error('Failed to load stock counts');
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const config = COUNT_STATUS_CONFIG[status as keyof typeof COUNT_STATUS_CONFIG] || COUNT_STATUS_CONFIG.draft;
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

  function getTypeLabel(type: string) {
    const labels = {
      full: 'Full',
      partial: 'Partial',
      spot: 'Spot Check',
      rolling: 'Rolling',
    };
    return labels[type as keyof typeof labels] || type;
  }

  const filteredStockCounts = useMemo(() => {
    return stockCounts.filter((count) => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          count.count_number?.toLowerCase().includes(searchLower) ||
          count.started_by_profile?.full_name?.toLowerCase().includes(searchLower) ||
          count.completed_by_profile?.full_name?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [stockCounts, searchTerm]);

  // Summary calculations
  const summary = useMemo(() => {
    const inProgress = stockCounts.filter(c => c.status === 'in_progress').length;
    const pendingReview = stockCounts.filter(c => c.status === 'pending_review').length;
    
    // Find last completed count
    const completed = stockCounts
      .filter(c => c.status === 'completed')
      .sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime());
    
    const lastCount = completed[0];
    let lastCountDays: number | null = null;
    if (lastCount?.completed_at) {
      const daysDiff = Math.floor((new Date().getTime() - new Date(lastCount.completed_at).getTime()) / (1000 * 60 * 60 * 24));
      lastCountDays = daysDiff;
    }

    return { inProgress, pendingReview, lastCountDays };
  }, [stockCounts]);

  if (loading && stockCounts.length === 0) {
    return (
      <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-white">Loading stock counts...</div>
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
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Stock Counts</h1>
              <p className="text-slate-400 text-sm">Compare system inventory vs actual stock on shelves</p>
            </div>
          </div>
          <Button
            onClick={() => setIsNewModalOpen(true)}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            New Count
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">In Progress</div>
            <div className="text-2xl font-bold text-white">{summary.inProgress}</div>
          </div>
          <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Pending Review</div>
            <div className="text-2xl font-bold text-white">{summary.pendingReview}</div>
          </div>
          <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Last Count</div>
            <div className="text-2xl font-bold text-white">
              {summary.lastCountDays !== null 
                ? `${summary.lastCountDays} ${summary.lastCountDays === 1 ? 'day' : 'days'} ago`
                : 'Never'}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="text"
              placeholder="Search counts..."
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
            value={typeFilter}
            onValueChange={setTypeFilter}
            options={TYPE_OPTIONS}
            placeholder="Filter by type"
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

        {/* Stock Counts Table */}
        {filteredStockCounts.length === 0 ? (
          <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-12 text-center">
            <Calculator className="mx-auto text-slate-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || startDate || endDate
                ? 'No stock counts found'
                : 'No stock counts yet'}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || startDate || endDate
                ? 'Try adjusting your filters'
                : 'Get started by creating your first stock count'}
            </p>
            {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && !startDate && !endDate && (
              <Button onClick={() => setIsNewModalOpen(true)} variant="secondary">
                <Plus size={18} className="mr-2" />
                New Count
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
                      Count#
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Variance
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
                  {filteredStockCounts.map((count) => {
                    const progress = count.total_items > 0 
                      ? Math.round((count.counted_items / count.total_items) * 100) 
                      : 0;
                    const varianceColor = count.variance_value < 0 
                      ? 'text-red-400' 
                      : count.variance_value > 0 
                        ? 'text-green-400' 
                        : 'text-slate-300';

                    return (
                      <tr
                        key={count.id}
                        className="hover:bg-white/[0.05] transition-colors cursor-pointer"
                        onClick={() => {
                          if (count.status === 'pending_review') {
                            router.push(`/dashboard/stockly/stock-counts/${count.id}/review`);
                          } else {
                            router.push(`/dashboard/stockly/stock-counts/${count.id}`);
                          }
                        }}
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-white font-medium">
                          {count.count_number}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                          {formatDate(count.count_date)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">
                          {getTypeLabel(count.count_type)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-neutral-800 rounded-full h-2 min-w-[100px]">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-slate-300 text-xs">
                              {count.counted_items}/{count.total_items} ({progress}%)
                            </span>
                          </div>
                        </td>
                        <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${varianceColor}`}>
                          {count.variance_value !== 0 
                            ? `${count.variance_value > 0 ? '+' : ''}${formatCurrency(count.variance_value)}`
                            : '—'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(count.status)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (count.status === 'pending_review') {
                                router.push(`/dashboard/stockly/stock-counts/${count.id}/review`);
                              } else {
                                router.push(`/dashboard/stockly/stock-counts/${count.id}`);
                              }
                            }}
                            className="text-[#EC4899] hover:text-[#EC4899]/80 transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* New Stock Count Modal */}
        <NewStockCountModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onSuccess={(countId) => {
            setIsNewModalOpen(false);
            fetchStockCounts();
            router.push(`/dashboard/stockly/stock-counts/${countId}`);
          }}
        />
      </div>
    </div>
  );
}

