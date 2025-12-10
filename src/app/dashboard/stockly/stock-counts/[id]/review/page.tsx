'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';

interface StockItem {
  id: string;
  name: string;
  base_unit?: { code: string; name: string };
}

interface StockCountLine {
  id: string;
  stock_count_section_id: string;
  stock_item_id: string;
  storage_area_id: string;
  expected_quantity: number;
  expected_value: number;
  counted_quantity?: number;
  counted_value?: number;
  variance_quantity: number;
  variance_value: number;
  variance_percent: number;
  is_counted: boolean;
  needs_recount: boolean;
  notes?: string;
  stock_item?: StockItem;
}

interface StockCountSection {
  id: string;
  storage_area_id: string;
  storage_area?: { id: string; name: string };
}

interface StockCount {
  id: string;
  company_id: string;
  site_id: string;
  count_number: string;
  count_date: string;
  count_type: string;
  status: string;
  total_items: number;
  counted_items: number;
  variance_count: number;
  variance_value: number;
  sections?: StockCountSection[];
}

const FILTER_OPTIONS = [
  { label: 'All Items', value: 'all' },
  { label: 'Variances Only', value: 'variances' },
  { label: 'Positive Variances', value: 'positive' },
  { label: 'Negative Variances', value: 'negative' },
];

export default function StockCountReviewPage() {
  const router = useRouter();
  const params = useParams();
  const countId = params.id as string;
  const { companyId, siteId, userId } = useAppContext();

  const [stockCount, setStockCount] = useState<StockCount | null>(null);
  const [lines, setLines] = useState<StockCountLine[]>([]);
  const [filter, setFilter] = useState<string>('variances');
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (countId && companyId) {
      fetchStockCount();
      fetchLines();
    }
  }, [countId, companyId]);

  async function fetchStockCount() {
    try {
      const { data, error } = await supabase
        .from('stock_counts')
        .select(`
          *,
          sections:stock_count_sections(
            id,
            storage_area_id,
            storage_area:storage_areas(id, name)
          )
        `)
        .eq('id', countId)
        .single();

      if (error) throw error;
      setStockCount(data as StockCount);
    } catch (error: any) {
      console.error('Error fetching stock count:', error);
      toast.error('Failed to load stock count');
    }
  }

  async function fetchLines() {
    try {
      setLoading(true);

      const sectionIds = stockCount?.sections?.map(s => s.id) || [];
      if (sectionIds.length === 0) {
        // Get sections first if not loaded
        const { data: sections } = await supabase
          .from('stock_count_sections')
          .select('id')
          .eq('stock_count_id', countId);

        if (sections) {
          sectionIds.push(...sections.map(s => s.id));
        }
      }

      if (sectionIds.length === 0) {
        setLines([]);
        return;
      }

      const { data, error } = await supabase
        .from('stock_count_lines')
        .select(`
          *,
          stock_item:stock_items(
            id, name,
            base_unit:uom!base_unit_id(code, name)
          )
        `)
        .in('stock_count_section_id', sectionIds)
        .order('variance_quantity', { ascending: false });

      if (error) throw error;
      setLines((data || []) as StockCountLine[]);
    } catch (error: any) {
      console.error('Error fetching lines:', error);
      toast.error('Failed to load count lines');
    } finally {
      setLoading(false);
    }
  }

  async function markForRecount(lineId: string) {
    try {
      await supabase
        .from('stock_count_lines')
        .update({ needs_recount: true })
        .eq('id', lineId);

      toast.success('Marked for recount');
      await fetchLines();
    } catch (error: any) {
      console.error('Error marking for recount:', error);
      toast.error('Failed to mark for recount');
    }
  }

  async function approveAndAdjust() {
    if (!stockCount || !companyId || !siteId || !userId) {
      toast.error('Missing required information');
      return;
    }

    try {
      setSaving(true);

      // Get all lines with variance
      const sectionIds = stockCount.sections?.map(s => s.id) || [];
      if (sectionIds.length === 0) {
        const { data: sections } = await supabase
          .from('stock_count_sections')
          .select('id')
          .eq('stock_count_id', countId);

        if (sections) {
          sectionIds.push(...sections.map(s => s.id));
        }
      }

      const { data: varianceLines, error: linesError } = await supabase
        .from('stock_count_lines')
        .select('*')
        .in('stock_count_section_id', sectionIds)
        .neq('variance_quantity', 0);

      if (linesError) throw linesError;

      // Create stock movements for each variance
      for (const line of varianceLines || []) {
        // Create adjustment movement
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            company_id: companyId,
            site_id: siteId,
            stock_item_id: line.stock_item_id,
            storage_area_id: line.storage_area_id,
            movement_type: 'adjustment',
            quantity: line.variance_quantity, // Positive or negative
            reference_type: 'stock_count',
            reference_id: countId,
            notes: `Stock count adjustment: ${stockCount.count_number}`,
            created_by: userId,
          });

        if (movementError) {
          console.error('Error creating movement:', movementError);
          // Continue with other items
        }

        // Update stock level using RPC function if available, otherwise direct update
        const { data: currentLevel } = await supabase
          .from('stock_levels')
          .select('quantity')
          .eq('site_id', siteId)
          .eq('storage_area_id', line.storage_area_id)
          .eq('stock_item_id', line.stock_item_id)
          .single();

        if (currentLevel) {
          const newQuantity = (currentLevel.quantity || 0) + line.variance_quantity;
          await supabase
            .from('stock_levels')
            .update({ quantity: newQuantity })
            .eq('site_id', siteId)
            .eq('storage_area_id', line.storage_area_id)
            .eq('stock_item_id', line.stock_item_id);
        } else {
          // Create new stock level if doesn't exist
          await supabase
            .from('stock_levels')
            .insert({
              company_id: companyId,
              site_id: siteId,
              storage_area_id: line.storage_area_id,
              stock_item_id: line.stock_item_id,
              quantity: line.variance_quantity,
            });
        }
      }

      // Mark count as completed
      await supabase
        .from('stock_counts')
        .update({
          status: 'completed',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', countId);

      toast.success('Stock levels adjusted successfully');
      router.push('/dashboard/stockly/stock-counts');
    } catch (error: any) {
      console.error('Error approving and adjusting:', error);
      toast.error(error.message || 'Failed to approve and adjust stock');
    } finally {
      setSaving(false);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  }

  const filteredLines = lines.filter(line => {
    if (filter === 'all') return true;
    if (filter === 'variances') return line.variance_quantity !== 0;
    if (filter === 'positive') return line.variance_quantity > 0;
    if (filter === 'negative') return line.variance_quantity < 0;
    return true;
  });

  const summary = {
    totalItems: stockCount?.total_items || 0,
    withVariance: stockCount?.variance_count || 0,
    totalValue: lines.reduce((sum, l) => sum + (l.expected_value || 0), 0),
    netVariance: stockCount?.variance_value || 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }

  if (!stockCount) {
    return (
      <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-white">Stock count not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/dashboard/stockly/stock-counts/${countId}`)}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Count
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                {stockCount.count_number} Review
              </h1>
              <p className="text-slate-400 text-sm">
                {stockCount.count_type.charAt(0).toUpperCase() + stockCount.count_type.slice(1)} Count -{' '}
                {new Date(stockCount.count_date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <Button
              onClick={approveAndAdjust}
              disabled={saving || stockCount.status === 'completed'}
              variant="secondary"
            >
              Approve & Adjust Stock
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Total Items</div>
            <div className="text-2xl font-bold text-white">{summary.totalItems}</div>
          </div>
          <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">With Variance</div>
            <div className="text-2xl font-bold text-white">{summary.withVariance}</div>
          </div>
          <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-white">{formatCurrency(summary.totalValue)}</div>
          </div>
          <div className={`bg-white/[0.03] border rounded-xl p-4 ${
            summary.netVariance < 0 ? 'border-red-500/30' : summary.netVariance > 0 ? 'border-green-500/30' : 'border-neutral-800'
          }`}>
            <div className="text-sm text-slate-400 mb-1">Net Variance</div>
            <div className={`text-2xl font-bold ${
              summary.netVariance < 0 ? 'text-red-400' : summary.netVariance > 0 ? 'text-green-400' : 'text-white'
            }`}>
              {summary.netVariance > 0 ? '+' : ''}{formatCurrency(summary.netVariance)}
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-4">
          <Select
            value={filter}
            onValueChange={setFilter}
            options={FILTER_OPTIONS}
            placeholder="Filter items"
          />
        </div>

        {/* Variance Table */}
        <div className="bg-white/[0.03] border border-neutral-800 rounded-xl overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/[0.05] border-b border-neutral-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Expected
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Counted
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Variance
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filteredLines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No items found
                    </td>
                  </tr>
                ) : (
                  filteredLines.map((line) => {
                    const unit = line.stock_item?.base_unit?.code || '';
                    const hasVariance = line.variance_quantity !== 0;

                    return (
                      <tr
                        key={line.id}
                        className={`hover:bg-white/[0.05] transition-colors ${
                          hasVariance ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <td className="px-4 py-4 text-sm text-white">
                          {line.stock_item?.name || 'Unknown Item'}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-300 text-right">
                          {line.expected_quantity} {unit}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-300 text-right">
                          {line.counted_quantity ?? '—'} {line.counted_quantity !== null && unit}
                        </td>
                        <td className={`px-4 py-4 text-sm font-medium text-right ${
                          line.variance_quantity > 0 ? 'text-green-400' : line.variance_quantity < 0 ? 'text-red-400' : 'text-slate-300'
                        }`}>
                          {hasVariance ? (
                            <>
                              {line.variance_quantity > 0 ? '+' : ''}
                              {line.variance_quantity} {unit}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className={`px-4 py-4 text-sm font-medium text-right ${
                          line.variance_value > 0 ? 'text-green-400' : line.variance_value < 0 ? 'text-red-400' : 'text-slate-300'
                        }`}>
                          {hasVariance ? formatCurrency(line.variance_value) : '—'}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {hasVariance && (
                            <button
                              onClick={() => markForRecount(line.id)}
                              className="text-[#EC4899] hover:text-[#EC4899]/80 transition-colors text-sm"
                            >
                              Recount
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Review Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">Review Notes</label>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-white/[0.03] border border-neutral-800 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/40"
            placeholder="Add notes about this review..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/stockly/stock-counts')}
          >
            Cancel
          </Button>
          <Button
            onClick={approveAndAdjust}
            disabled={saving || stockCount.status === 'completed'}
            variant="secondary"
          >
            {saving ? 'Processing...' : 'Approve & Adjust Stock'}
          </Button>
        </div>
      </div>
    </div>
  );
}

