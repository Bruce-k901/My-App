'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Building2, MapPin, Globe, Plus } from '@/components/ui/icons';
import { useToast } from '@/components/ui/ToastProvider';

type SearchResult = {
  source: string;
  name: string;
  registered_address: string;
  postcode: string;
  locality: string;
  company_number: string;
  website: string;
};

interface ContractorSearchBarProps {
  onSelectContractor: (contractor: SearchResult) => void;
  placeholder?: string;
}

export default function ContractorSearchBar({ 
  onSelectContractor, 
  placeholder = "Search for contractors by company name..." 
}: ContractorSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { showToast } = useToast();
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchContractors = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/contractor-search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      showToast({
        title: 'Search failed',
        description: 'Unable to search for contractors. Please try again.',
        type: 'error',
      });
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search
    debounceRef.current = setTimeout(() => {
      searchContractors(value);
    }, 300);
  };

  const handleSelectResult = (result: SearchResult) => {
    onSelectContractor(result);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-tertiary h-4 w-4" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.map((result, index) => (
            <div
              key={`${result.company_number}-${index}`}
              onClick={() => handleSelectResult(result)}
              className="p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-theme-tertiary flex-shrink-0" />
                    <h3 className="font-medium text-theme-primary truncate">{result.name}</h3>
                  </div>
                  
                  {result.registered_address && (
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-3 w-3 text-theme-tertiary flex-shrink-0" />
                      <p className="text-sm text-theme-secondary truncate">{result.registered_address}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-theme-tertiary">
                    <span>#{result.company_number}</span>
                    {result.postcode && <span>{result.postcode}</span>}
                    {result.locality && <span>{result.locality}</span>}
                  </div>
                  
                  {result.website && (
                    <div className="flex items-center gap-2 mt-1">
                      <Globe className="h-3 w-3 text-theme-tertiary flex-shrink-0" />
                      <span className="text-xs text-blue-600 truncate">{result.website}</span>
                    </div>
                  )}
                </div>
                
                <Plus className="h-4 w-4 text-theme-tertiary flex-shrink-0 ml-2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && !loading && query.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
          <p className="text-theme-tertiary text-center">No contractors found for "{query}"</p>
        </div>
      )}
    </div>
  );
}