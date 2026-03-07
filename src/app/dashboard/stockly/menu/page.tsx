"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import {
  Store,
  RefreshCw,
  Loader2,
  Search,
  ArrowLeft,
  Package,
  Tag,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
} from '@/components/ui/icons';
import Link from 'next/link';
import { toast } from 'sonner';

interface MenuItem {
  id: string;
  catalog_item_id: string;
  catalog_variation_id: string;
  name: string;
  description: string | null;
  category_name: string | null;
  variation_name: string | null;
  price: number | null;
  currency: string;
  image_url: string | null;
  modifiers: unknown[] | null;
  is_active: boolean;
  is_deleted: boolean;
  synced_at: string;
}

interface CategoryGroup {
  name: string;
  items: MenuItem[];
  totalItems: number;
  priceRange: { min: number; max: number } | null;
}

const formatCurrency = (value: number, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export default function MenuPage() {
  const { companyId } = useAppContext();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    if (companyId) loadMenu();
  }, [companyId]);

  async function loadMenu() {
    if (!companyId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('pos_menu_items')
      .select('*')
      .eq('company_id', companyId)
      .eq('pos_provider', 'square')
      .order('category_name', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });

    if (error) {
      if (error.code !== '42P01') {
        console.error('[menu] Load error:', error);
        toast.error('Failed to load menu items');
      }
    } else {
      setItems(data || []);
      // Get most recent sync time
      const latest = (data || []).reduce<string | null>((max, item) => {
        if (!max || item.synced_at > max) return item.synced_at;
        return max;
      }, null);
      setLastSyncAt(latest);

      // Auto-expand all categories on first load
      const categories = new Set((data || []).map(i => i.category_name || 'Uncategorised'));
      setExpandedCategories(categories);
    }

    setLoading(false);
  }

  async function handleSync() {
    if (!companyId) return;
    setSyncing(true);

    try {
      const res = await fetch('/api/integrations/square/catalog/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();

      if (data.success) {
        const r = data.result;
        toast.success(
          `Synced ${r.itemsUpserted} items across ${r.categoriesFound} categories`,
        );
        await loadMenu();
      } else {
        toast.error(data.error || data.result?.error || 'Catalog sync failed');
      }
    } catch {
      toast.error('Catalog sync failed');
    } finally {
      setSyncing(false);
    }
  }

  // Group items by category, apply search filter
  const categories = useMemo(() => {
    let filtered = items.filter(i => !i.is_deleted || showInactive);
    if (!showInactive) {
      filtered = filtered.filter(i => i.is_active);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          (i.variation_name || '').toLowerCase().includes(q) ||
          (i.category_name || '').toLowerCase().includes(q),
      );
    }

    const groups = new Map<string, MenuItem[]>();
    for (const item of filtered) {
      const cat = item.category_name || 'Uncategorised';
      const arr = groups.get(cat) || [];
      arr.push(item);
      groups.set(cat, arr);
    }

    const result: CategoryGroup[] = Array.from(groups.entries())
      .map(([name, groupItems]) => {
        const prices = groupItems
          .map(i => i.price)
          .filter((p): p is number => p !== null && p > 0);
        return {
          name,
          items: groupItems,
          totalItems: groupItems.length,
          priceRange: prices.length > 0
            ? { min: Math.min(...prices), max: Math.max(...prices) }
            : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [items, search, showInactive]);

  const totalActive = items.filter(i => i.is_active && !i.is_deleted).length;
  const totalDeleted = items.filter(i => i.is_deleted).length;

  function toggleCategory(name: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-module-fg animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/stockly"
            className="p-2 rounded-lg bg-theme-button hover:bg-theme-button-hover text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">
              Menu
            </h1>
            <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm mt-1">
              {totalActive} active item{totalActive !== 1 ? 's' : ''} from Square
              {lastSyncAt && (
                <span className="ml-2 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
                  Last synced {new Date(lastSyncAt).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 dark:bg-module-fg hover:bg-emerald-700 dark:hover:bg-module-fg/90 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {syncing ? 'Syncing...' : 'Sync Catalog'}
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary" />
          <input
            type="text"
            placeholder="Search items, categories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-theme-button border border-theme rounded-lg text-[rgb(var(--text-primary))] dark:text-white placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary focus:outline-none focus:border-module-fg"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="rounded border-theme"
          />
          Show inactive ({totalDeleted})
        </label>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="bg-theme-surface-elevated border border-theme rounded-xl p-8 text-center">
          <Store className="w-10 h-10 text-[rgb(var(--text-secondary))]/30 dark:text-theme-tertiary/30 mx-auto mb-3" />
          <p className="text-[rgb(var(--text-primary))] dark:text-white font-medium mb-1">
            No menu items yet
          </p>
          <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-4">
            Click &ldquo;Sync Catalog&rdquo; to pull your Square menu items.
          </p>
        </div>
      )}

      {/* Category groups */}
      {categories.map(category => {
        const isExpanded = expandedCategories.has(category.name);
        return (
          <div
            key={category.name}
            className="bg-theme-surface-elevated border border-theme rounded-xl overflow-hidden"
          >
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category.name)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-theme-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-module-fg" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary" />
                )}
                <Tag className="w-4 h-4 text-module-fg" />
                <span className="font-medium text-[rgb(var(--text-primary))] dark:text-white">
                  {category.name}
                </span>
                <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
                  {category.totalItems} item{category.totalItems !== 1 ? 's' : ''}
                </span>
              </div>
              {category.priceRange && (
                <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
                  {category.priceRange.min === category.priceRange.max
                    ? formatCurrency(category.priceRange.min)
                    : `${formatCurrency(category.priceRange.min)} – ${formatCurrency(category.priceRange.max)}`}
                </span>
              )}
            </button>

            {/* Items */}
            {isExpanded && (
              <div className="border-t border-theme divide-y divide-theme/50">
                {category.items.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 px-5 py-3 ${
                      item.is_deleted || !item.is_active ? 'opacity-40' : ''
                    }`}
                  >
                    {/* Image or placeholder */}
                    <div className="w-10 h-10 rounded-lg bg-theme-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-10 h-10 object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary" />
                      )}
                    </div>

                    {/* Name + variation */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                        {item.name}
                      </p>
                      {item.variation_name && (
                        <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
                          {item.variation_name}
                        </p>
                      )}
                      {item.description && (
                        <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary truncate mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      {item.price !== null ? (
                        <span className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
                          {formatCurrency(item.price, item.currency)}
                        </span>
                      ) : (
                        <span className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
                          No price
                        </span>
                      )}
                    </div>

                    {/* Status badge */}
                    {(item.is_deleted || !item.is_active) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 dark:text-red-400">
                        {item.is_deleted ? 'Deleted' : 'Inactive'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
