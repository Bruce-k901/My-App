'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Search, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';

interface StorageArea {
  id: string;
  name: string;
  area_type?: string;
}

interface StockItem {
  id: string;
  name: string;
  base_unit?: { code: string; name: string };
  current_cost?: number;
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
  stock_count_id: string;
  storage_area_id: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: string;
  started_at?: string;
  completed_at?: string;
  item_count: number;
  counted_count: number;
  storage_area?: StorageArea;
  lines?: StockCountLine[];
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

const AREA_ICONS: Record<string, string> = {
  chilled: '🧊',
  frozen: '❄️',
  dry: '📦',
  ambient: '🌡️',
  bar: '🍷',
  cellar: '🍾',
};

export default function StockCountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const countId = params.id as string;
  const { companyId, siteId, userId } = useAppContext();

  const [stockCount, setStockCount] = useState<StockCount | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (countId && companyId) {
      fetchStockCount();
    }
  }, [countId, companyId]);

  async function fetchStockCount() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('stock_counts')
        .select(`
          *,
          sections:stock_count_sections(
            *,
            storage_area:storage_areas(id, name, area_type),
            lines:stock_count_lines(
              *,
              stock_item:stock_items(
                id, name,
                base_unit:uom!base_unit_id(code, name),
                current_cost
              )
            )
          )
        `)
        .eq('id', countId)
        .single();

      if (error) throw error;
      setStockCount(data as StockCount);

      // Auto-select first pending/in_progress section
      if (data?.sections && data.sections.length > 0) {
        const activeSection = data.sections.find(
          (s: StockCountSection) => s.status === 'pending' || s.status === 'in_progress'
        );
        if (activeSection) {
          setSelectedSectionId(activeSection.id);
        } else if (data.sections[0]) {
          setSelectedSectionId(data.sections[0].id);
        }
      }
    } catch (error: any) {
      console.error('Error fetching stock count:', error);
      toast.error('Failed to load stock count');
    } finally {
      setLoading(false);
    }
  }

  async function updateCountLine(lineId: string, quantity: number) {
    try {
      setSaving(true);

      // Get line with stock item cost
      const { data: line, error: lineError } = await supabase
        .from('stock_count_lines')
        .select('*, stock_item:stock_items(current_cost)')
        .eq('id', lineId)
        .single();

      if (lineError) throw lineError;

      const cost = (line.stock_item as any)?.current_cost || 0;
      const countedValue = quantity * cost;
      const varianceQty = quantity - line.expected_quantity;
      const varianceVal = countedValue - line.expected_value;
      const variancePct = line.expected_quantity > 0
        ? (varianceQty / line.expected_quantity) * 100
        : 0;

      const { error: updateError } = await supabase
        .from('stock_count_lines')
        .update({
          counted_quantity: quantity,
          counted_value: countedValue,
          variance_quantity: varianceQty,
          variance_value: varianceVal,
          variance_percent: variancePct,
          is_counted: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lineId);

      if (updateError) throw updateError;

      // Update section progress
      await updateSectionProgress(line.stock_count_section_id);

      // Refresh data
      await fetchStockCount();
    } catch (error: any) {
      console.error('Error updating count line:', error);
      toast.error('Failed to update count');
    } finally {
      setSaving(false);
    }
  }

  async function updateSectionProgress(sectionId: string) {
    try {
      const { data, error } = await supabase
        .from('stock_count_lines')
        .select('id', { count: 'exact', head: true })
        .eq('stock_count_section_id', sectionId)
        .eq('is_counted', true);

      if (error) throw error;

      await supabase
        .from('stock_count_sections')
        .update({
          counted_count: data?.length || 0,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', sectionId);
    } catch (error: any) {
      console.error('Error updating section progress:', error);
    }
  }

  async function completeSection(sectionId: string) {
    try {
      setSaving(true);

      await supabase
        .from('stock_count_sections')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', sectionId);

      // Check if all sections complete
      await checkAllSectionsComplete();

      toast.success('Section completed');
      await fetchStockCount();
    } catch (error: any) {
      console.error('Error completing section:', error);
      toast.error('Failed to complete section');
    } finally {
      setSaving(false);
    }
  }

  async function checkAllSectionsComplete() {
    if (!stockCount) return;

    const { data: sections, error } = await supabase
      .from('stock_count_sections')
      .select('id, status')
      .eq('stock_count_id', stockCount.id);

    if (error) throw error;

    const allComplete = sections?.every(s => s.status === 'completed') || false;

    if (allComplete) {
      // Calculate totals
      const { data: lines, error: linesError } = await supabase
        .from('stock_count_lines')
        .select('variance_quantity, variance_value')
        .in('stock_count_section_id', sections?.map(s => s.id) || []);

      if (linesError) throw linesError;

      const varianceCount = lines?.filter(l => l.variance_quantity !== 0).length || 0;
      const varianceValue = lines?.reduce((sum, l) => sum + (l.variance_value || 0), 0) || 0;
      const countedItems = lines?.length || 0;

      await supabase
        .from('stock_counts')
        .update({
          status: 'pending_review',
          counted_items: countedItems,
          variance_count: varianceCount,
          variance_value: varianceValue,
          completed_at: new Date().toISOString(),
          completed_by: userId,
        })
        .eq('id', stockCount.id);

      toast.success('All sections completed! Ready for review.');
    }
  }

  async function completeCount() {
    if (!stockCount) return;

    try {
      setSaving(true);

      await checkAllSectionsComplete();
      await fetchStockCount();

      router.push(`/dashboard/stockly/stock-counts/${countId}/review`);
    } catch (error: any) {
      console.error('Error completing count:', error);
      toast.error('Failed to complete count');
    } finally {
      setSaving(false);
    }
  }

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

  const selectedSection = stockCount.sections?.find(s => s.id === selectedSectionId);
  const progress = stockCount.total_items > 0
    ? Math.round((stockCount.counted_items / stockCount.total_items) * 100)
    : 0;

  const filteredLines = selectedSection?.lines?.filter(line => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return line.stock_item?.name.toLowerCase().includes(searchLower);
  }) || [];

  return (
    <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/stockly/stock-counts')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Stock Counts
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                {stockCount.count_number} - {stockCount.count_type.charAt(0).toUpperCase() + stockCount.count_type.slice(1)} Count
              </h1>
              <p className="text-slate-400 text-sm">
                {new Date(stockCount.count_date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <Button
              onClick={completeCount}
              disabled={saving || stockCount.status === 'completed'}
              variant="secondary"
            >
              Complete Count
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 bg-white/[0.03] border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Progress</span>
            <span className="text-sm text-white font-medium">
              {stockCount.counted_items}/{stockCount.total_items} items ({progress}%)
            </span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sections List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-lg font-semibold text-white mb-3">Sections</h2>
            {stockCount.sections?.map((section) => {
              const sectionProgress = section.item_count > 0
                ? Math.round((section.counted_count / section.item_count) * 100)
                : 0;
              const icon = section.storage_area?.area_type
                ? AREA_ICONS[section.storage_area.area_type] || '📦'
                : '📦';

              return (
                <button
                  key={section.id}
                  onClick={() => setSelectedSectionId(section.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedSectionId === section.id
                      ? 'border-[#EC4899] bg-[#EC4899]/10'
                      : 'border-neutral-800 bg-white/[0.03] hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{icon}</span>
                      <span className="text-white font-medium">{section.storage_area?.name || 'Unknown'}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      section.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : section.status === 'in_progress'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {section.status === 'completed' ? 'Completed' : section.status === 'in_progress' ? 'In Progress' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-neutral-800 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${sectionProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">
                      {section.counted_count}/{section.item_count} ({sectionProgress}%)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Counting Interface */}
          <div className="lg:col-span-2">
            {selectedSection ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">
                    {selectedSection.storage_area?.name || 'Unknown Area'}
                  </h2>
                  {selectedSection.status !== 'completed' && (
                    <Button
                      onClick={() => completeSection(selectedSection.id)}
                      disabled={saving}
                      variant="secondary"
                      size="sm"
                    >
                      Complete Section
                    </Button>
                  )}
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Count Lines */}
                <div className="space-y-3">
                  {filteredLines.length === 0 ? (
                    <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-8 text-center">
                      <p className="text-slate-400">No items found</p>
                    </div>
                  ) : (
                    filteredLines.map((line) => {
                      const hasVariance = line.variance_quantity !== 0;
                      const unit = line.stock_item?.base_unit?.code || '';

                      return (
                        <div
                          key={line.id}
                          className={`bg-white/[0.03] border rounded-xl p-4 ${
                            hasVariance ? 'border-amber-500/30' : 'border-neutral-800'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {line.is_counted && (
                                  <CheckCircle2 className="text-green-400" size={18} />
                                )}
                                <span className="text-white font-medium">{line.stock_item?.name || 'Unknown Item'}</span>
                              </div>
                              <div className="text-sm text-slate-400">
                                Expected: {line.expected_quantity} {unit}
                              </div>
                            </div>
                            {hasVariance && (
                              <div className={`text-sm font-medium ${
                                line.variance_quantity > 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {line.variance_quantity > 0 ? '+' : ''}
                                {line.variance_quantity} {unit}
                                {line.variance_value !== 0 && (
                                  <span className="ml-2">
                                    ({line.variance_value > 0 ? '+' : ''}£{Math.abs(line.variance_value).toFixed(2)})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="block text-xs text-slate-400 mb-1">Counted Quantity</label>
                              <Input
                                type="number"
                                step="0.001"
                                value={line.counted_quantity ?? ''}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  updateCountLine(line.id, value);
                                }}
                                placeholder="0"
                                className="bg-white/[0.05]"
                              />
                            </div>
                            <div className="pt-6">
                              <span className="text-slate-400 text-sm">{unit}</span>
                            </div>
                            <div className="pt-6">
                              {line.is_counted && !hasVariance && (
                                <span className="text-green-400 text-sm">✓ Match</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-8 text-center">
                <p className="text-slate-400">Select a section to start counting</p>
              </div>
            )}
          </div>
        </div>

        {/* Variance Summary */}
        {stockCount.variance_count > 0 && (
          <div className="mt-6 bg-white/[0.03] border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Variance Summary (so far)</span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-400">
                  Items with variance: <span className="text-white font-medium">{stockCount.variance_count}</span>
                </span>
                <span className={`text-sm font-medium ${
                  stockCount.variance_value < 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  Total variance: {stockCount.variance_value > 0 ? '+' : ''}£{Math.abs(stockCount.variance_value).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

