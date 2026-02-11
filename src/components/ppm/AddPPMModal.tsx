'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, User, Clock, FileText } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';

interface Site {
  id: string;
  name: string;
}

interface Contractor {
  id: string;
  name: string;
}

interface Asset {
  id: string;
  name: string;
  category: string;
  site_id: string;
  site_name: string;
}

interface AddPPMModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string;
  onPPMAdded: () => void;
}

export function AddPPMModal({ isOpen, onClose, selectedDate, onPPMAdded }: AddPPMModalProps) {
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  
  const [formData, setFormData] = useState({
    asset_id: '',
    contractor_id: '',
    next_service_date: selectedDate || '',
    frequency_months: 12,
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setFormData(prev => ({
        ...prev,
        next_service_date: selectedDate || ''
      }));
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    if (formData.asset_id) {
      const selectedAsset = assets.find(asset => asset.id === formData.asset_id);
      if (selectedAsset) {
        setFilteredAssets([selectedAsset]);
      }
    } else {
      setFilteredAssets(assets);
    }
  }, [formData.asset_id, assets]);

  const fetchData = async () => {
    try {
      // Fetch sites
      const { data: sitesData } = await supabase
        .from('sites')
        .select('id, name')
        .order('name');

      // Fetch contractors
      const { data: contractorsData } = await supabase
        .from('contractors')
        .select('id, name')
        .order('name');

      // Fetch assets - exclude archived assets
      const { data: assetsData } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          category,
          site:sites(id, name)
        `)
        .eq('archived', false) // Exclude archived assets
        .order('name');

      setSites(sitesData || []);
      setContractors(contractorsData || []);
      
      const formattedAssets = assetsData?.map(asset => ({
        id: asset.id,
        name: asset.name,
        category: asset.category,
        site_id: (asset.site as any)?.id || null,
        site_name: (asset.site as any)?.name || 'Unknown Site'
      })) || [];
      
      setAssets(formattedAssets);
      setFilteredAssets(formattedAssets);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('ppm_schedule')
        .insert({
          asset_id: formData.asset_id,
          contractor_id: formData.contractor_id || null,
          next_service_date: formData.next_service_date,
          frequency_months: formData.frequency_months,
          notes: formData.notes || null,
          status: 'scheduled'
        });

      if (error) throw error;

      onPPMAdded();
      onClose();
      
      // Reset form
      setFormData({
        asset_id: '',
        contractor_id: '',
        next_service_date: selectedDate || '',
        frequency_months: 12,
        notes: ''
      });
    } catch (error) {
      console.error('Error creating PPM:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAssetsBySite = (siteId: string) => {
    if (!siteId) {
      setFilteredAssets(assets);
    } else {
      setFilteredAssets(assets.filter(asset => asset.site_id === siteId));
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => {
        // Only close if clicking directly on the backdrop, not on dropdown content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-magenta-400" />
            Add PPM Task
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Site Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <MapPin className="h-4 w-4 inline mr-1" />
              Filter by Site (Optional)
            </label>
            <select
              onChange={(e) => filterAssetsBySite(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-magenta-500 focus:border-transparent"
            >
              <option value="">All Sites</option>
              {sites.map(site => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          {/* Asset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Asset *
            </label>
            <select
              value={formData.asset_id}
              onChange={(e) => setFormData(prev => ({ ...prev, asset_id: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-magenta-500 focus:border-transparent"
            >
              <option value="">Select Asset</option>
              {filteredAssets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} - {asset.site_name}
                </option>
              ))}
            </select>
          </div>

          {/* Contractor */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              Contractor
            </label>
            <select
              value={formData.contractor_id}
              onChange={(e) => setFormData(prev => ({ ...prev, contractor_id: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-magenta-500 focus:border-transparent"
            >
              <option value="">Select Contractor</option>
              {contractors.map(contractor => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.name}
                </option>
              ))}
            </select>
          </div>

          {/* Service Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Service Date *
            </label>
            <input
              type="date"
              value={formData.next_service_date}
              onChange={(e) => setFormData(prev => ({ ...prev, next_service_date: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-magenta-500 focus:border-transparent"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Clock className="h-4 w-4 inline mr-1" />
              Frequency (Months) *
            </label>
            <select
              value={formData.frequency_months}
              onChange={(e) => setFormData(prev => ({ ...prev, frequency_months: parseInt(e.target.value) }))}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-magenta-500 focus:border-transparent"
            >
              <option value={1}>Monthly</option>
              <option value={3}>Quarterly</option>
              <option value={6}>Bi-annually</option>
              <option value={12}>Annually</option>
              <option value={24}>Every 2 Years</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-magenta-500 focus:border-transparent resize-none"
              placeholder="Additional notes or instructions..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-magenta-600 hover:bg-magenta-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create PPM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}