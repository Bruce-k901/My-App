'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  Search,
  RefreshCw,
} from '@/components/ui/icons';
import { toast } from 'sonner';

interface CatalogItem {
  id: string;
  name: string;
  categoryName: string | null;
  stockItemId: string | null;
  recipeId: string | null;
  isAutoMatched: boolean;
  isIgnored: boolean;
  isMapped: boolean;
}

interface StockItem {
  id: string;
  name: string;
}

export function SquareProductMapping() {
  const { companyId } = useAppContext();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoMatching, setAutoMatching] = useState(false);
  const [filter, setFilter] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadCatalog();
      loadStockItems();
    }
  }, [companyId]);

  async function loadCatalog() {
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/square/catalog?companyId=${companyId}`);
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
      }
    } catch {
      toast.error('Failed to load Square catalog');
    } finally {
      setLoading(false);
    }
  }

  async function loadStockItems() {
    try {
      const res = await fetch(`/api/stockly/stock-items?companyId=${companyId}&limit=500`);
      const data = await res.json();
      setStockItems(data.data || data.items || []);
    } catch {
      // Stock items may not be available
    }
  }

  async function handleAutoMatch() {
    setAutoMatching(true);
    try {
      const res = await fetch('/api/integrations/square/catalog/auto-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Matched ${data.matched} items (${data.unmatched} remaining)`);
        loadCatalog();
      } else {
        toast.error(data.error || 'Auto-match failed');
      }
    } catch {
      toast.error('Auto-match failed');
    } finally {
      setAutoMatching(false);
    }
  }

  async function handleMapItem(item: CatalogItem, stockItemId: string | null, isIgnored?: boolean) {
    setSavingId(item.id);
    try {
      const res = await fetch('/api/integrations/square/catalog/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          posProductId: item.id,
          posProductName: item.name,
          stockItemId: isIgnored ? null : stockItemId,
          isIgnored: isIgnored ?? false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  stockItemId: isIgnored ? null : stockItemId,
                  isIgnored: isIgnored ?? false,
                  isMapped: !isIgnored && !!stockItemId,
                  isAutoMatched: false,
                }
              : i,
          ),
        );
      } else {
        toast.error(data.error || 'Failed to save mapping');
      }
    } catch {
      toast.error('Failed to save mapping');
    } finally {
      setSavingId(null);
    }
  }

  const filteredItems = items.filter(
    (i) =>
      !filter ||
      i.name.toLowerCase().includes(filter.toLowerCase()),
  );

  const mapped = items.filter((i) => i.isMapped).length;
  const ignored = items.filter((i) => i.isIgnored).length;
  const unmapped = items.length - mapped - ignored;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-sm text-theme-secondary">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading Square catalog...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-theme-secondary py-4">
        No items found in your Square catalog. Add items in Square first.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
          {mapped} mapped
        </span>
        <span className="text-gray-500">{ignored} ignored</span>
        <span className="text-amber-600 dark:text-amber-400 font-medium">
          {unmapped} unmapped
        </span>
        <span className="text-theme-tertiary">of {items.length} total</span>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-tertiary" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter items..."
            className="w-full pl-9 pr-3 py-2 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/30"
          />
        </div>
        <button
          onClick={handleAutoMatch}
          disabled={autoMatching}
          className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-1.5 whitespace-nowrap"
        >
          {autoMatching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Auto-Match
        </button>
      </div>

      {/* Items table */}
      <div className="border border-theme rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-theme">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-theme-secondary">
                Square Item
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-theme-secondary">
                Status
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-theme-secondary">
                Map To
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-theme-secondary w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            {filteredItems.map((item) => (
              <tr
                key={item.id}
                className={
                  item.isIgnored
                    ? 'opacity-50'
                    : !item.isMapped
                    ? 'bg-amber-50/30 dark:bg-amber-900/5'
                    : ''
                }
              >
                <td className="px-4 py-2.5">
                  <span className="text-theme-primary font-medium">{item.name}</span>
                </td>
                <td className="px-4 py-2.5">
                  {item.isMapped ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="w-3 h-3" />
                      Mapped
                      {item.isAutoMatched && (
                        <span className="px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-[10px]">
                          Auto
                        </span>
                      )}
                    </span>
                  ) : item.isIgnored ? (
                    <span className="text-xs text-gray-400">Ignored</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3 h-3" />
                      Unmapped
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={item.stockItemId || ''}
                    onChange={(e) => handleMapItem(item, e.target.value || null)}
                    disabled={savingId === item.id}
                    className="w-full px-2 py-1 bg-theme-surface-elevated border border-theme rounded text-xs text-theme-primary"
                  >
                    <option value="">— Select stock item —</option>
                    {stockItems.map((si) => (
                      <option key={si.id} value={si.id}>
                        {si.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  {savingId === item.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-theme-tertiary" />
                  ) : item.isIgnored ? (
                    <button
                      onClick={() => handleMapItem(item, null, false)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Unignore
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMapItem(item, null, true)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Ignore
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
