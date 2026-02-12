"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronDown, Star, Clock } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';

interface SmartSearchProps {
  libraryTable: string;
  placeholder?: string;
  categoryFilters?: string[];
  onSelect: (item: any) => void;
  allowMultiple?: boolean;
  recentItems?: any[];
  currentSelected?: any[];
  className?: string;
}

export default function SmartSearch({
  libraryTable,
  placeholder = "Search...",
  categoryFilters = [],
  onSelect,
  allowMultiple = false,
  recentItems = [],
  currentSelected = [],
  className = ""
}: SmartSearchProps) {
  const { companyId } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load items for search
  const loadItems = useCallback(async () => {
    if (!companyId || !libraryTable) return;

    try {
      setLoading(true);
      // Determine the correct column name for ordering based on table
      const orderColumn = libraryTable === 'ingredients_library' ? 'ingredient_name' : 
                         libraryTable === 'chemicals_library' ? 'product_name' :
                         libraryTable === 'equipment_library' ? 'equipment_name' : 'item_name';
      
      const { data, error } = await supabase
        .from(libraryTable)
        .select('*')
        .eq('company_id', companyId)
        .order(orderColumn);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, libraryTable]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Helper functions
  const getDisplayName = (item: any) => {
    if (libraryTable === 'ingredients_library') return item.ingredient_name;
    return item.item_name || item.product_name || item.equipment_name || '';
  };

  // Filter results based on search and category
  const filteredResults = results.filter(item => {
    // Get the display name for search
    const displayName = getDisplayName(item).toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    
    // Search only in the name field (not all fields)
    const matchesSearch = searchQuery === "" || displayName.includes(searchLower);
    
    const matchesCategory = selectedCategory === "All" || 
      item.category === selectedCategory || 
      item.ingredient_type === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Debounced search
  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(() => {
        // Filter is handled in filteredResults, no need for additional API call
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(filteredResults[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  const handleSelect = (item: any) => {
    onSelect(item);
    if (!allowMultiple) {
      setIsOpen(false);
      setSearchQuery("");
    }
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

  const getEmoji = (item: any) => {
    if (libraryTable === 'ingredients_library') {
      const type = item.ingredient_type;
      const emojiMap: { [key: string]: string } = {
        'Vegetable': '🥕',
        'Fruit': '🍎',
        'Meat': '🥩',
        'Fish': '🐟',
        'Dairy': '🧀',
        'Herb': '🌿',
        'Spice': '🌶️',
        'Dry': '🌾',
        'Wet': '💧',
        'Condiment': '🍯'
      };
      return emojiMap[type] || '📦';
    }
    return '📦';
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
 className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] text-sm placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary focus:outline-none transition-colors"
        />
        {searchQuery && (
          <button
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

      {/* Category Filters - Hidden for cleaner UI */}
      {false && categoryFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === "All"
                ? "bg-magenta-500 text-white"
                : "bg-neutral-800 text-theme-tertiary hover:bg-neutral-700"
            }`}
          >
            All ({results.length})
          </button>
          {categoryFilters.map((cat) => {
            const count = results.filter(r => 
              r.category === cat || r.ingredient_type === cat
            ).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-magenta-500 text-white"
                    : "bg-neutral-800 text-theme-tertiary hover:bg-neutral-700"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[rgb(var(--surface-elevated))] dark:bg-neutral-800 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {loading ? (
 <div className="p-4 text-center text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">Loading...</div>
          ) : filteredResults.length === 0 ? (
 <div className="p-4 text-center text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
              No results found for "{searchQuery}"
            </div>
          ) : (
            <>
              {/* Recent Items */}
              {recentItems.length > 0 && searchQuery === "" && (
                <div className="p-2 border-b border-[rgb(var(--border))] dark:border-theme">
 <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary px-2 mb-1">Recently Used</div>
                  {recentItems.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="w-full text-left px-3 py-2 hover:bg-[rgb(var(--surface))] dark:hover:bg-neutral-700 rounded text-sm"
                    >
                      <span className="text-[rgb(var(--text-primary))] dark:text-white">{getDisplayName(item)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Results */}
              {filteredResults.map((item, index) => {
                const isSelected = currentSelected.some(s => s.id === item.id);
                const isHighlighted = index === highlightedIndex;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left px-3 py-2 hover:bg-[rgb(var(--surface))] dark:hover:bg-neutral-700 rounded transition-colors ${
                      isHighlighted ? 'bg-[rgb(var(--surface))] dark:bg-neutral-700' : ''
                    } ${isSelected ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                        {getDisplayName(item)}
                      </span>
                      {isSelected && (
                        <ChevronDown size={16} className="text-magenta-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

