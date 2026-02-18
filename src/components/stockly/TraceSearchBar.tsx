// @salsa - SALSA Compliance: Batch code search with direction toggle for traceability
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Search, ArrowRight, ArrowLeft, Loader2 } from '@/components/ui/icons';

interface TraceSearchBarProps {
  onTrace: (batchId: string, direction: 'forward' | 'backward') => void;
  loading?: boolean;
}

export default function TraceSearchBar({ onTrace, loading }: TraceSearchBarProps) {
  const { companyId } = useAppContext();
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [suggestions, setSuggestions] = useState<{ id: string; batch_code: string; item_name: string; status: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // @salsa — Search batches by code
  useEffect(() => {
    if (!search || search.length < 2 || !companyId) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('stock_batches')
        .select('id, batch_code, status, stock_item:stock_items(name)')
        .eq('company_id', companyId)
        .ilike('batch_code', `%${search}%`)
        .limit(10);

      if (data) {
        setSuggestions(data.map((b: any) => ({
          id: b.id,
          batch_code: b.batch_code,
          item_name: b.stock_item?.name || 'Unknown',
          status: b.status,
        })));
        setShowSuggestions(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, companyId]);

  function handleSelect(batch: { id: string; batch_code: string }) {
    setSearch(batch.batch_code);
    setSelectedBatchId(batch.id);
    setShowSuggestions(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedBatchId) {
      onTrace(selectedBatchId, direction);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedBatchId(null); }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Enter batch code..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-theme-border bg-theme-bg-primary text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
          />

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-theme-bg-primary border border-theme-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelect(s)}
                  className="w-full text-left px-4 py-2.5 hover:bg-theme-bg-secondary transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-medium text-theme-primary">{s.batch_code}</span>
                    <span className="text-sm text-theme-secondary ml-2">{s.item_name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                    s.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                    s.status === 'recalled' || s.status === 'quarantined' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {s.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Direction toggle */}
        <div className="flex rounded-lg border border-theme-border overflow-hidden">
          <button
            type="button"
            onClick={() => setDirection('forward')}
            className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
              direction === 'forward'
                ? 'bg-stockly-dark/10 dark:bg-stockly/10 text-stockly-dark dark:text-stockly'
                : 'text-theme-secondary hover:bg-theme-bg-secondary'
            }`}
          >
            <ArrowRight className="w-4 h-4" /> Forward
          </button>
          <button
            type="button"
            onClick={() => setDirection('backward')}
            className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors border-l border-theme-border ${
              direction === 'backward'
                ? 'bg-stockly-dark/10 dark:bg-stockly/10 text-stockly-dark dark:text-stockly'
                : 'text-theme-secondary hover:bg-theme-bg-secondary'
            }`}
          >
            <ArrowLeft className="w-4 h-4" /> Backward
          </button>
        </div>

        {/* Trace button */}
        <button
          type="submit"
          disabled={!selectedBatchId || loading}
          className="px-5 py-2 rounded-lg bg-stockly-dark dark:bg-stockly text-white dark:text-gray-900 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Trace'}
        </button>
      </div>

      <p className="text-xs text-theme-tertiary">
        {direction === 'forward'
          ? 'Forward: Raw material → Production → Finished goods → Customers'
          : 'Backward: Finished product → Production → Raw materials → Suppliers'}
      </p>
    </form>
  );
}
