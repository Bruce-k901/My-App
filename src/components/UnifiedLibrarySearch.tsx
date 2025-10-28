"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronDown, Package, Shield, FlaskConical, Coffee, ShoppingBag, GlassWater, Boxes, UtensilsCrossed } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';

interface UnifiedLibrarySearchProps {
  onSelect: (item: any, library: string) => void;
  context?: 'food' | 'cleaning' | 'coshh' | 'drinks' | 'all';
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
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/30'
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
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30'
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
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30'
  }
];

export default function UnifiedLibrarySearch({
  onSelect,
  context = 'all',
  className = ""
}: UnifiedLibrarySearchProps) {
  const { companyId } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<{ [key: string]: any[] }>({});
  const [loading, setLoading] = useState(false);
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>(() => {
    // Context-aware defaults
    switch (context) {
      case 'food':
        return ['ingredients_library', 'drinks_library'];
      case 'cleaning':
        return ['chemicals_library', 'ppe_library', 'equipment_library'];
      case 'coshh':
        return ['chemicals_library', 'ppe_library'];
      case 'drinks':
        return ['drinks_library', 'glassware_library', 'disposables_library'];
      default:
        return LIBRARIES.map(l => l.id);
    }
  });

  const searchRef = useRef<HTMLDivElement>(null);

  // Search across all libraries
  const performSearch = useCallback(async () => {
    if (!companyId || !searchQuery.trim()) {
      setResults({});
      return;
    }

    try {
      setLoading(true);
      const searchResults: { [key: string]: any[] } = {};

      // Search each selected library
      for (const library of selectedLibraries) {
        const { data, error } = await supabase
          .from(library)
          .select('*')
          .eq('company_id', companyId)
          .or(`item_name.ilike.%${searchQuery}%,ingredient_name.ilike.%${searchQuery}%,product_name.ilike.%${searchQuery}%,equipment_name.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`)
          .limit(10);

        if (!error && data && data.length > 0) {
          searchResults[library] = data;
        }
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Error searching libraries:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, searchQuery, selectedLibraries]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [performSearch]);

  const toggleResult = (libraryId: string) => {
    setSelectedLibraries(prev =>
      prev.includes(libraryId)
        ? prev.filter(id => id !== libraryId)
        : [...prev, libraryId]
    );
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search across all libraries..."
          className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-10 py-2.5 text-white placeholder-neutral-400 focus:outline-none focus:border-magenta-500 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery("");
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Library Filters */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-neutral-800 border border-neutral-600 rounded-lg shadow-xl p-3">
          <div className="text-xs text-neutral-400 mb-2">Search in:</div>
          <div className="flex flex-wrap gap-2">
            {LIBRARIES.map((lib) => {
              const Icon = lib.icon;
              const isSelected = selectedLibraries.includes(lib.id);
              return (
                <button
                  key={lib.id}
                  onClick={() => toggleResult(lib.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    isSelected
                      ? `${lib.bgColor} ${lib.borderColor} border`
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  }`}
                >
                  <Icon size={14} className={isSelected ? lib.color : 'text-neutral-400'} />
                  {lib.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Results */}
      {isOpen && searchQuery && (
        <div className="absolute z-50 w-full mt-2 bg-neutral-800 border border-neutral-600 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-neutral-400">Searching...</div>
          ) : totalResults === 0 ? (
            <div className="p-4 text-center text-neutral-400">
              No results found for "{searchQuery}"
            </div>
          ) : (
            <div className="divide-y divide-neutral-700">
              {LIBRARIES.map((lib) => {
                const Icon = lib.icon;
                const items = results[lib.id] || [];
                if (items.length === 0) return null;

                return (
                  <div key={lib.id} className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={16} className={lib.color} />
                      <span className="font-semibold text-white">{lib.name}</span>
                      <span className="text-xs text-neutral-400">({items.length} results)</span>
                    </div>
                    <div className="space-y-1">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSelect(item, lib.id);
                            setIsOpen(false);
                            setSearchQuery("");
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-neutral-700 rounded text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-white">
                                {getDisplayName(item, lib.id)}
                              </div>
                              <div className="text-xs text-neutral-400">
                                {getDisplayInfo(item, lib.id)}
                              </div>
                            </div>
                            <ChevronDown size={16} className="text-neutral-400" />
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
      )}
    </div>
  );
}

