'use client';

import { useState, useEffect } from 'react';
import { Search, Package, Plus, CheckCircle } from 'lucide-react';
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
}

export function StockItemSelector({
  onSelect,
  allowCreateFromLibrary = true,
  filterPurchasable = true,
  selectedItems = [],
  className = '',
}: StockItemSelectorProps) {
  const { companyId } = useAppContext();
  const [creating, setCreating] = useState(false);
  const [searchMode, setSearchMode] = useState<'library' | 'stock'>('library');
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [stockResults, setStockResults] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);

  // Search existing stock items
  useEffect(() => {
    if (searchMode === 'stock' && stockSearchTerm.trim() && companyId) {
      const timer = setTimeout(() => {
        searchStockItems();
      }, 300);
      return () => clearTimeout(timer);
    } else if (searchMode === 'stock' && !stockSearchTerm.trim()) {
      setStockResults([]);
    }
  }, [stockSearchTerm, searchMode, companyId]);

  async function searchStockItems() {
    if (!companyId) return;
    
    setLoadingStock(true);
    try {
      let query = supabase
        .from('stock_items')
        .select('id, name, description, library_item_id, library_type, is_purchasable')
        .eq('company_id', companyId)
        .eq('is_active', true);

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
      {/* Search Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setSearchMode('library')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            searchMode === 'library'
              ? 'bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/30'
              : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Package size={16} />
            Search Libraries
          </div>
        </button>
        <button
          onClick={() => setSearchMode('stock')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            searchMode === 'stock'
              ? 'bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/30'
              : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Search size={16} />
            Search Stock Items
          </div>
        </button>
      </div>

      {/* Library Search Mode */}
      {searchMode === 'library' && (
        <div className="space-y-2">
          <UnifiedLibrarySearch
            onSelect={handleLibrarySelect}
            context="all"
          />
          {creating && (
            <div className="text-sm text-neutral-400 flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-[#EC4899] border-t-transparent rounded-full" />
              Creating stock item from library...
            </div>
          )}
          {!allowCreateFromLibrary && (
            <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
              Library items will only be selected if a matching stock item already exists.
            </div>
          )}
        </div>
      )}

      {/* Stock Items Search Mode */}
      {searchMode === 'stock' && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              value={stockSearchTerm}
              onChange={(e) => setStockSearchTerm(e.target.value)}
              placeholder="Search existing stock items..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-neutral-400 focus:outline-none focus:border-[#EC4899] transition-colors"
            />
          </div>

          {loadingStock && (
            <div className="text-sm text-neutral-400 text-center py-4">
              Searching...
            </div>
          )}

          {!loadingStock && stockSearchTerm && stockResults.length === 0 && (
            <div className="text-sm text-neutral-400 text-center py-4">
              No stock items found matching "{stockSearchTerm}"
            </div>
          )}

          {!loadingStock && stockResults.length > 0 && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {stockResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleStockItemSelect(item)}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-sm border border-white/10 hover:border-[#EC4899]/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-neutral-400">{item.description}</div>
                      )}
                      {item.library_type && (
                        <div className="text-xs text-[#EC4899] mt-1">
                          Linked to {item.library_type.replace('_library', '')}
                        </div>
                      )}
                    </div>
                    <CheckCircle className="text-[#EC4899]" size={16} />
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
