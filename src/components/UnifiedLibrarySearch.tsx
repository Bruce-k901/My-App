"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, ChevronDown, Package, Shield, FlaskConical, Coffee, ShoppingBag, GlassWater, Boxes, UtensilsCrossed } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';

interface UnifiedLibrarySearchProps {
  onSelect: (item: any, library: string) => void;
  context?: 'food' | 'cleaning' | 'coshh' | 'drinks' | 'waste' | 'all';
  className?: string;
}

const LIBRARIES = [
  { 
    id: 'ingredients_library', 
    name: 'Ingredients', 
    icon: Package, 
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30'
  },
  { 
    id: 'ppe_library', 
    name: 'PPE', 
    icon: Shield, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  { 
    id: 'chemicals_library', 
    name: 'Chemicals', 
    icon: FlaskConical, 
    color: 'text-module-fg',
    bgColor: 'bg-module-fg/10',
    borderColor: 'border-module-fg/30'
  },
  { 
    id: 'drinks_library', 
    name: 'Drinks', 
    icon: Coffee, 
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30'
  },
  { 
    id: 'disposables_library', 
    name: 'Disposables', 
    icon: ShoppingBag, 
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30'
  },
  { 
    id: 'glassware_library', 
    name: 'Glassware', 
    icon: GlassWater, 
    color: 'text-module-fg',
    bgColor: 'bg-module-fg/10',
    borderColor: 'border-module-fg/30'
  },
  { 
    id: 'packaging_library', 
    name: 'Packaging', 
    icon: Boxes, 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30'
  },
  { 
    id: 'serving_equipment_library', 
    name: 'Serving Equipment', 
    icon: UtensilsCrossed, 
    color: 'text-[#D37E91]',
    bgColor: 'bg-[#D37E91]/15',
    borderColor: 'border-[#D37E91]/30'
  }
];

export default function UnifiedLibrarySearch({
  onSelect,
  context = 'all',
  className = ""
}: UnifiedLibrarySearchProps) {
  const { companyId } = useAppContext();
  const [isOpen, setIsOpen] = useState(true); // Open by default to show library filters
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<{ [key: string]: any[] }>({});
  const [loading, setLoading] = useState(false);
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>(() => {
    // Context-aware defaults - start with empty (user must select)
    // Unless explicitly configured for a specific context
    switch (context) {
      case 'food':
        return ['ingredients_library', 'drinks_library'];
      case 'cleaning':
        return ['chemicals_library', 'ppe_library', 'equipment_library'];
      case 'coshh':
        return ['chemicals_library', 'ppe_library'];
      case 'drinks':
        return ['drinks_library', 'glassware_library', 'disposables_library'];
      case 'waste':
        // Waste context: exclude glassware and serving_equipment
        return []; // Start empty, user selects
      default:
        return []; // Start with none selected - user must choose
    }
  });

  // Filter available libraries based on context
  const availableLibraries = useMemo(() => {
    if (context === 'waste') {
      // For waste, exclude glassware and serving_equipment
      return LIBRARIES.filter(lib => 
        lib.id !== 'glassware_library' && 
        lib.id !== 'serving_equipment_library'
      );
    }
    return LIBRARIES;
  }, [context]);

  const searchRef = useRef<HTMLDivElement>(null);

  // Get search columns for each library type
  const getSearchColumns = (libraryId: string): string[] => {
    switch (libraryId) {
      case 'ingredients_library':
        return ['ingredient_name', 'category', 'supplier', 'notes'];
      case 'chemicals_library':
        return ['product_name', 'manufacturer', 'use_case', 'notes'];
      case 'ppe_library':
        return ['item_name', 'category', 'standard_compliance', 'notes'];
      case 'drinks_library':
        return ['item_name', 'category', 'sub_category', 'notes'];
      case 'disposables_library':
        return ['item_name', 'category', 'supplier', 'notes'];
      case 'glassware_library':
        return ['item_name', 'category', 'supplier', 'notes'];
      case 'packaging_library':
        return ['item_name', 'category', 'supplier', 'notes'];
      case 'serving_equipment_library':
        return ['item_name', 'category', 'supplier', 'notes'];
      default:
        return ['item_name', 'notes'];
    }
  };

  // Search across all libraries
  const performSearch = useCallback(async () => {
    if (!companyId) {
      setResults({});
      return;
    }

    try {
      setLoading(true);
      const searchResults: { [key: string]: any[] } = {};

      // Search each selected library
      for (const library of selectedLibraries) {
        try {
          let query = supabase
            .from(library)
            .select('*')
            .eq('company_id', companyId);

          // If there's a search query, add search filters
          if (searchQuery.trim()) {
            const searchColumns = getSearchColumns(library);
            // Build OR condition for this library's specific columns
            const orConditions = searchColumns
              .map(col => `${col}.ilike.%${searchQuery}%`)
              .join(',');
            query = query.or(orConditions);
          }

          // Limit results
          query = query.limit(20);

          const { data, error } = await query;

          if (error) {
            // Log error for debugging
            console.warn(`Error searching ${library}:`, {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
          } else if (data && data.length > 0) {
            searchResults[library] = data;
            console.log(`Found ${data.length} items in ${library}`);
          } else {
            console.log(`No items found in ${library}${searchQuery.trim() ? ` for "${searchQuery}"` : ''}`);
          }
        } catch (err: any) {
          // Catch any unexpected errors and continue with other libraries
          console.warn(`Unexpected error searching ${library}:`, err?.message || err);
        }
      }

      setResults(searchResults);
      console.log('Search results:', Object.keys(searchResults).length, 'libraries with results');
      console.log('Selected libraries:', selectedLibraries);
      console.log('Results keys:', Object.keys(searchResults));
    } catch (error) {
      console.error('Error searching libraries:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, searchQuery, selectedLibraries]);

  // Debounced search - also trigger when libraries change
  useEffect(() => {
    if (!companyId) return;
    
    const timer = setTimeout(() => {
      performSearch();
    }, searchQuery.trim() ? 300 : 100); // Faster when no search query (showing all items)
    return () => clearTimeout(timer);
  }, [performSearch, companyId]);

  const toggleResult = (libraryId: string) => {
    setSelectedLibraries(prev => {
      const newSelection = prev.includes(libraryId)
        ? prev.filter(id => id !== libraryId)
        : [...prev, libraryId];
      console.log('Library toggled:', libraryId, 'New selection:', newSelection);
      return newSelection;
    });
  };

  const getDisplayName = (item: any, libraryId: string) => {
    if (libraryId === 'ingredients_library') return item.ingredient_name;
    if (libraryId === 'chemicals_library') return item.product_name;
    if (libraryId === 'equipment_library') return item.equipment_name;
    return item.item_name || '';
  };

  const getDisplayInfo = (item: any, libraryId: string) => {
    if (libraryId === 'ingredients_library') {
      return `${item.unit || ''} - £${item.unit_cost || '0.00'}`;
    }
    if (libraryId === 'chemicals_library') {
      return `${item.manufacturer || ''} - £${item.unit_cost || '0.00'}`;
    }
    if (libraryId === 'equipment_library') {
      return item.category || '';
    }
    return item.supplier || item.category || '';
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalResults = Object.values(results).reduce((sum, items) => sum + items.length, 0);

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary"size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Type to search across all libraries (Ingredients, PPE, Chemicals, Drinks, etc.)..."
 className="w-full bg-theme-button border border-theme rounded-lg pl-10 pr-10 py-3 text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary focus:outline-none focus:border-[#D37E91] focus:ring-2 focus:ring-[#D37E91]/20 transition-all"
          autoFocus
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setIsOpen(false);
            }}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))]"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Library Filters and Results Container */}
      {isOpen && (
 <div className="absolute z-50 w-full mt-2 bg-theme-surface-elevated dark:bg-[#1a1a2e] border border-theme rounded-lg shadow-xl overflow-hidden">
          {/* Library Filters */}
          <div 
 className="p-3 border-b border-theme"
            onClick={(e) => e.stopPropagation()}
          >
          <div className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-2 font-medium">Select libraries to search:</div>
          <div className="flex flex-wrap gap-2">
            {availableLibraries.map((lib) => {
                const Icon = lib.icon;
                const isSelected = selectedLibraries.includes(lib.id);
                return (
                  <button
                    key={lib.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      toggleResult(lib.id);
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      isSelected
                        ? `${lib.bgColor} ${lib.borderColor} border`
 : 'bg-theme-button text-[rgb(var(--text-secondary))] dark:text-neutral-300 hover:bg-theme-button-hover dark:hover:bg-neutral-600'
                    }`}
                  >
 <Icon size={14} className={isSelected ? lib.color :'text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary'} />
                    {lib.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results */}
          <div 
            className="max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {loading ? (
              <div className="p-4 text-center text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Searching...</div>
            ) : totalResults === 0 ? (
              <div className="p-4 text-center text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
                {searchQuery ? (
                  <>No results found for "{searchQuery}"</>
                ) : (
                  <>No items found in selected libraries. Try selecting different libraries or check if libraries have data.</>
                )}
              </div>
            ) : (
              <div className="divide-y divide-theme dark:divide-neutral-700">
                {selectedLibraries.map((libraryId) => {
                  // Find the library config
                  const lib = LIBRARIES.find(l => l.id === libraryId);
                  if (!lib) return null;
                  
                  const Icon = lib.icon;
                  const items = results[libraryId] || [];
                  if (items.length === 0) return null;

                  return (
                    <div key={libraryId} className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={16} className={lib.color} />
                        <span className="font-semibold text-[rgb(var(--text-primary))] dark:text-white">{lib.name}</span>
 <span className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">({items.length} results)</span>
                      </div>
                      <div className="space-y-1">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onSelect(item, libraryId);
                              setIsOpen(false);
                              setSearchQuery("");
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-theme-button dark:hover:bg-neutral-700 rounded text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-[rgb(var(--text-primary))] dark:text-white">
                                  {getDisplayName(item, libraryId)}
                                </div>
 <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
                                  {getDisplayInfo(item, libraryId)}
                                </div>
                              </div>
 <ChevronDown size={16} className="text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary"/>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

