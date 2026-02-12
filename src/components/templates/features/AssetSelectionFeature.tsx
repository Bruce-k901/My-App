'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from '@/components/ui/icons';
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
    <div className="border-t border-theme pt-6">
      <button
        type="button"
        onClick={() => onExpandedChange?.(!isExpanded)}
        className="w-full flex items-center justify-between mb-4 text-left hover:opacity-80 transition-opacity"
      >
        <h2 className="text-lg font-semibold text-theme-primary">
          Asset Selection
          {selectedAssets.length > 0 && (
            <span className="ml-2 text-sm font-normal text-[#D37E91] dark:text-[#D37E91]">
              ({selectedAssets.length} selected)
            </span>
          )}
        </h2>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-theme-secondary" />
        ) : (
          <ChevronDown className="w-5 h-5 text-theme-secondary" />
        )}
      </button>
      
      {isExpanded && (
        <>
          {sites.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-theme-primary mb-2">
                Filter by Site
                {selectedSiteId && (
                  <span className="ml-2 text-xs text-theme-tertiary font-normal">
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
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
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
          
          <div className="max-h-[300px] overflow-y-auto border border-theme rounded-lg bg-theme-button p-3">
            <div className="space-y-2">
              {filteredAssets.map((asset) => {
                const isSelected = selectedAssets.includes(asset.id);
                return (
                  <label
                    key={asset.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#D37E91]/10 dark:bg-[#D37E91]/25 border border-[#D37E91] dark:border-[#D37E91]/50'
                        : 'bg-theme-surface border border-theme hover:bg-theme-hover'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAsset(asset.id)}
 className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 bg-theme-surface ] text-[#D37E91] focus:ring-[#D37E91] flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-theme-primary text-sm font-medium">
                        {asset.name}
                        {(asset.category || asset.site_name) && (
                          <span className="ml-2 text-xs font-normal text-theme-secondary">
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
                <p className="text-theme-secondary text-sm text-center py-4">
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

