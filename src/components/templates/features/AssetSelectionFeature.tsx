'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AssetSelectionFeatureProps {
  selectedAssets: string[];
  assets: Array<{ id: string; name: string; category?: string; site_name?: string }>;
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
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('');

  const filteredAssets = selectedSiteFilter
    ? assets.filter(a => a.site_name === sites.find(s => s.id === selectedSiteFilter)?.name)
    : assets;

  const toggleAsset = (assetId: string) => {
    if (selectedAssets.includes(assetId)) {
      onChange(selectedAssets.filter(id => id !== assetId));
    } else {
      onChange([...selectedAssets, assetId]);
    }
  };

  return (
    <div className="border-t border-white/10 pt-6">
      <button
        type="button"
        onClick={() => onExpandedChange?.(!isExpanded)}
        className="w-full flex items-center justify-between mb-4 text-left hover:opacity-80 transition-opacity"
      >
        <h2 className="text-lg font-semibold text-white">
          Asset Selection
          {selectedAssets.length > 0 && (
            <span className="ml-2 text-sm font-normal text-pink-400">
              ({selectedAssets.length} selected)
            </span>
          )}
        </h2>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-white/60" />
        ) : (
          <ChevronDown className="w-5 h-5 text-white/60" />
        )}
      </button>
      
      {isExpanded && (
        <>
          {sites.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-white mb-2">Filter by Site</label>
              <select
                value={selectedSiteFilter}
                onChange={(e) => setSelectedSiteFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[#0f1220] border border-neutral-800 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">All Sites ({assets.length} assets)</option>
                {sites.map((site) => {
                  const siteAssetCount = assets.filter((a) => a.site_name === site.name).length;
                  return (
                    <option key={site.id} value={site.id}>
                      {site.name} ({siteAssetCount} assets)
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          
          <div className="max-h-[300px] overflow-y-auto border border-neutral-800 rounded-lg bg-[#0f1220] p-3">
            <div className="space-y-2">
              {filteredAssets.map((asset) => {
                const isSelected = selectedAssets.includes(asset.id);
                return (
                  <label
                    key={asset.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-pink-500/20 border border-pink-500/50'
                        : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAsset(asset.id)}
                      className="w-4 h-4 rounded border-neutral-600 bg-[#0f1220] text-pink-500 focus:ring-pink-500"
                    />
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">{asset.name}</div>
                      {asset.category && (
                        <div className="text-gray-400 text-xs">{asset.category}</div>
                      )}
                      {asset.site_name && (
                        <div className="text-gray-500 text-xs">{asset.site_name}</div>
                      )}
                    </div>
                  </label>
                );
              })}
              
              {filteredAssets.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">
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

