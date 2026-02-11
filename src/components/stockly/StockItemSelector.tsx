'use client';

import { useState, useEffect } from 'react';
import { Search, Package, Plus, CheckCircle } from '@/components/ui/icons';
import UnifiedLibrarySearch from '@/components/UnifiedLibrarySearch';
import { findOrCreateStockItemFromLibrary, getStockItemWithLibrary } from '@/lib/stockly/stock-utils';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';

interface StockItemSelectorProps {
  onSelect: (stockItemId: string, item: any) => void;
  allowCreateFromLibrary?: boolean;
  filterPurchasable?: boolean;
  selectedItems?: string[]; // IDs of already selected items to exclude
  className?: string;
  defaultMode?: 'library' | 'stock'; // Default search mode
}

export function StockItemSelector({
  onSelect,
  allowCreateFromLibrary = true,
  filterPurchasable = true,
  selectedItems = [],
  className = '',
  defaultMode = 'library',
}: StockItemSelectorProps) {
  const { companyId } = useAppContext();
  const [creating, setCreating] = useState(false);
  const [searchMode, setSearchMode] = useState<'library' | 'stock'>(defaultMode);
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [stockResults, setStockResults] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);

  // Search existing stock items
  useEffect(() => {
    if (searchMode === 'stock' && companyId) {
      if (stockSearchTerm.trim()) {
        // Debounce search when typing
        const timer = setTimeout(() => {
          searchStockItems();
        }, 300);
        return () => clearTimeout(timer);
      } else {
        // Load initial items immediately when no search term
        loadInitialStockItems();
      }
    } else if (searchMode !== 'stock') {
      setStockResults([]);
    }
  }, [stockSearchTerm, searchMode, companyId]);

  async function loadInitialStockItems() {
    if (!companyId) return;
    
    setLoadingStock(true);
    try {
      let query = supabase
        .from('stock_items')
        .select('id, name, description, library_item_id, library_type')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .limit(20)
        .order('name');

      if (filterPurchasable) {
        query = query.eq('is_purchasable', true);
      }

      if (selectedItems.length > 0) {
        query = query.not('id', 'in', `(${selectedItems.join(',')})`);
      }

      const { data, error } = await query;

      // If error is about is_purchasable column not existing, retry without that filter
      if (error && (error.message?.includes('is_purchasable') || error.code === '42703')) {
        const retryQuery = supabase
          .from('stock_items')
          .select('id, name, description, library_item_id, library_type')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .limit(20)
          .order('name');
        
        if (selectedItems.length > 0) {
          retryQuery.not('id', 'in', `(${selectedItems.join(',')})`);
        }
        
        const { data: retryData, error: retryError } = await retryQuery;
        
        if (retryError) throw retryError;
        setStockResults(retryData || []);
        return;
      }

      if (error) throw error;
      setStockResults(data || []);
    } catch (error: any) {
      console.error('Error loading stock items:', error);
      // Don't show error toast for initial load
    } finally {
      setLoadingStock(false);
    }
  }

  async function searchStockItems() {
    if (!companyId) return;
    
    setLoadingStock(true);
    try {
      // Build base query
      let query = supabase
        .from('stock_items')
        .select('id, name, description, library_item_id, library_type')
        .eq('company_id', companyId)
        .eq('is_active', true);

      // Try to add is_purchasable filter if needed
      if (filterPurchasable) {
        query = query.eq('is_purchasable', true);
      }

      if (selectedItems.length > 0) {
        query = query.not('id', 'in', `(${selectedItems.join(',')})`);
      }

      const { data, error } = await query
        .or(`name.ilike.%${stockSearchTerm}%,description.ilike.%${stockSearchTerm}%`)
        .limit(20)
        .order('name');

      // If error is about is_purchasable column not existing, retry without that filter
      if (error && (error.message?.includes('is_purchasable') || error.code === '42703')) {
        console.warn('is_purchasable column not available, retrying without filter');
        const retryQuery = supabase
          .from('stock_items')
          .select('id, name, description, library_item_id, library_type')
          .eq('company_id', companyId)
          .eq('is_active', true);
        
        if (selectedItems.length > 0) {
          retryQuery.not('id', 'in', `(${selectedItems.join(',')})`);
        }
        
        const { data: retryData, error: retryError } = await retryQuery
          .or(`name.ilike.%${stockSearchTerm}%,description.ilike.%${stockSearchTerm}%`)
          .limit(20)
          .order('name');
        
        if (retryError) throw retryError;
        setStockResults(retryData || []);
        return;
      }

      if (error) throw error;
      setStockResults(data || []);
    } catch (error: any) {
      console.error('Error searching stock items:', error);
      toast.error('Failed to search stock items');
    } finally {
      setLoadingStock(false);
    }
  }

  const handleLibrarySelect = async (libraryItem: any, libraryType: string) => {
    if (!companyId) return;

    try {
      setCreating(true);

      // Find or create stock item from library item
      const { id: stockItemId, created } = await findOrCreateStockItemFromLibrary(
        libraryItem.id,
        libraryType,
        companyId
      );

      // Get full stock item data
      const stockItem = await getStockItemWithLibrary(stockItemId);

      if (stockItem) {
        onSelect(stockItemId, stockItem);
        if (created) {
          toast.success(`Stock item created: ${stockItem.name}`);
        } else {
          toast.success(`Selected: ${stockItem.name}`);
        }
      }
    } catch (error: any) {
      console.error('Error handling library select:', error);
      toast.error(`Failed to create stock item: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleStockItemSelect = async (stockItem: any) => {
    // Get full stock item with library data
    const fullItem = await getStockItemWithLibrary(stockItem.id);
    if (fullItem) {
      onSelect(stockItem.id, fullItem);
      toast.success(`Selected: ${fullItem.name}`);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Mode Toggle - Only show if allowCreateFromLibrary is true */}
      {allowCreateFromLibrary && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSearchMode('library')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              searchMode === 'library'
                ? 'bg-[#D37E91]/10 dark:bg-[#D37E91]/20 text-[#D37E91] dark:text-[#D37E91] border border-[#D37E91] dark:border-[#D37E91]/30'
                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-neutral-400 border border-gray-300 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Package size={16} />
              Search Libraries
            </div>
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('stock')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              searchMode === 'stock'
                ? 'bg-[#D37E91]/10 dark:bg-[#D37E91]/20 text-[#D37E91] dark:text-[#D37E91] border border-[#D37E91] dark:border-[#D37E91]/30'
                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-neutral-400 border border-gray-300 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Search size={16} />
              Search Stock Items
            </div>
          </button>
        </div>
      )}

      {/* Library Search Mode */}
      {searchMode === 'library' && (
        <div className="space-y-2">
          <UnifiedLibrarySearch
            onSelect={handleLibrarySelect}
            context="waste"
          />
          {creating && (
            <div className="text-sm text-gray-600 dark:text-neutral-400 flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-emerald-600 dark:border-[#D37E91] border-t-transparent rounded-full" />
              Creating stock item from library...
            </div>
          )}
          {!allowCreateFromLibrary && (
            <div className="text-xs text-amber-700 dark:text-yellow-400 bg-amber-50 dark:bg-yellow-500/10 border border-amber-200 dark:border-yellow-500/20 rounded-lg p-2">
              Library items will only be selected if a matching stock item already exists.
            </div>
          )}
        </div>
      )}

      {/* Stock Items Search Mode */}
      {searchMode === 'stock' && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-400" size={18} />
            <input
              type="text"
              value={stockSearchTerm}
              onChange={(e) => setStockSearchTerm(e.target.value)}
              placeholder="Type to search stock items..."
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-[#D37E91] focus:border-emerald-500 dark:focus:border-[#D37E91] transition-colors"
              autoFocus
            />
          </div>

          {loadingStock && (
            <div className="text-sm text-gray-500 dark:text-neutral-400 text-center py-4">
              Searching...
            </div>
          )}

          {!loadingStock && stockSearchTerm && stockResults.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-neutral-400 text-center py-4">
              No stock items found matching "{stockSearchTerm}"
            </div>
          )}

          {!loadingStock && !stockSearchTerm && stockResults.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-neutral-400 text-center py-4">
              {allowCreateFromLibrary 
                ? 'Start typing to search stock items, or switch to "Search Libraries" to create new items'
                : 'Start typing to search your stock items...'}
            </div>
          )}

          {!loadingStock && stockResults.length > 0 && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {stockResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleStockItemSelect(item)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-sm border border-gray-200 dark:border-white/10 hover:border-emerald-300 dark:hover:border-[#D37E91]/30 transition-colors bg-white dark:bg-transparent"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5 truncate">{item.description}</div>
                      )}
                      {item.library_type && (
                        <div className="text-xs text-emerald-600 dark:text-[#D37E91] mt-1 font-medium">
                          Linked to {item.library_type.replace('_library', '').replace('_', ' ')}
                        </div>
                      )}
                    </div>
                    <CheckCircle className="text-emerald-600 dark:text-[#D37E91] flex-shrink-0 ml-2" size={18} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
