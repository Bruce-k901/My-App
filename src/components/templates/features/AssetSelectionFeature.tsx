'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

interface AssetSelectionFeatureProps {
  selectedAssets: string[];
  assets: Array<{ id: string; name: string; category?: string; site_name?: string; site_id?: string | null }>;
  sites: Array<{ id: string; name: string }>;
  onChange: (selectedAssets: string[]) => void;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function AssetSelectionFeature({
  selectedAssets,
  assets,
  sites,
  onChange,
  isExpanded = true,
  onExpandedChange
}: AssetSelectionFeatureProps) {
  const { selectedSiteId } = useAppContext();
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('');
  
  // Sync with header site selector - use selectedSiteId from context
  useEffect(() => {
    if (selectedSiteId) {
      setSelectedSiteFilter(selectedSiteId);
    } else {
      setSelectedSiteFilter('');
    }
  }, [selectedSiteId]);

  // Filter assets by selected site (from header selector or local filter)
  const filteredAssets = selectedSiteFilter
    ? assets.filter(a => a.site_id === selectedSiteFilter)
    : assets;

  const toggleAsset = (assetId: string) => {
    if (selectedAssets.includes(assetId)) {
      onChange(selectedAssets.filter(id => id !== assetId));
    } else {
      onChange([...selectedAssets, assetId]);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-white/10 pt-6">
      <button
        type="button"
        onClick={() => onExpandedChange?.(!isExpanded)}
        className="w-full flex items-center justify-between mb-4 text-left hover:opacity-80 transition-opacity"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Asset Selection
          {selectedAssets.length > 0 && (
            <span className="ml-2 text-sm font-normal text-pink-600 dark:text-pink-400">
              ({selectedAssets.length} selected)
            </span>
          )}
        </h2>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-600 dark:text-white/60" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-white/60" />
        )}
      </button>
      
      {isExpanded && (
        <>
          {sites.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Filter by Site
                {selectedSiteId && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-normal">
                    (linked to header selector)
                  </span>
                )}
              </label>
              <select
                value={selectedSiteFilter}
                onChange={(e) => {
                  setSelectedSiteFilter(e.target.value);
                  // Note: Changing this will filter locally, but won't update the header selector
                  // The header selector is the source of truth for site selection
                }}
                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">All Sites ({assets.length} assets)</option>
                {sites.map((site) => {
                  const siteAssetCount = assets.filter((a) => a.site_id === site.id).length;
                  return (
                    <option key={site.id} value={site.id}>
                      {site.name} ({siteAssetCount} assets)
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          
          <div className="max-h-[300px] overflow-y-auto border border-gray-200 dark:border-white/[0.1] rounded-lg bg-gray-50 dark:bg-white/[0.05] p-3">
            <div className="space-y-2">
              {filteredAssets.map((asset) => {
                const isSelected = selectedAssets.includes(asset.id);
                return (
                  <label
                    key={asset.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-pink-50 dark:bg-pink-500/20 border border-pink-300 dark:border-pink-500/50'
                        : 'bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAsset(asset.id)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 bg-white dark:bg-white/[0.05] text-pink-500 focus:ring-pink-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 dark:text-white text-sm font-medium">
                        {asset.name}
                        {(asset.category || asset.site_name) && (
                          <span className="ml-2 text-xs font-normal text-gray-600 dark:text-gray-400">
                            {asset.category && asset.site_name && (
                              <>({asset.category}, {asset.site_name})</>
                            )}
                            {asset.category && !asset.site_name && (
                              <>({asset.category})</>
                            )}
                            {!asset.category && asset.site_name && (
                              <>({asset.site_name})</>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
              
              {filteredAssets.length === 0 && (
                <p className="text-gray-600 dark:text-gray-400 text-sm text-center py-4">
                  No assets found{selectedSiteFilter ? ' for selected site' : ''}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

