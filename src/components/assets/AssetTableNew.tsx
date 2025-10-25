'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { Edit, Archive, Eye } from 'lucide-react';

type Asset = Database['public']['Tables']['assets']['Row'];

interface AssetTableNewProps {
  companyId: string;
  onEdit?: (asset: Asset) => void;
  onArchive?: (asset: Asset) => void;
  onViewLogs?: (asset: Asset) => void;
}

export default function AssetTableNew({ companyId, onEdit, onArchive, onViewLogs }: AssetTableNewProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const { data, error } = await supabase
          .from('assets')
          .select(`
            id,
            name,
            brand,
            model,
            serial_number,
            category,
            site_id,
            install_date,
            warranty_end,
            last_service_date,
            next_service_date,
            ppm_frequency_months,
            ppm_contractor_id,
            reactive_contractor_id,
            warranty_contractor_id,
            status,
            archived,
            notes,
            sites!inner(id, name),
            ppm_contractor:contractors!assets_ppm_contractor_id_fkey(id, name),
            reactive_contractor:contractors!assets_reactive_contractor_id_fkey(id, name),
            warranty_contractor:contractors!assets_warranty_contractor_id_fkey(id, name)
          `)
          .eq('company_id', companyId)
          .eq('archived', false)
          .order('name', { ascending: true });

        if (error) throw error;
        setAssets(data || []);
      } catch (error) {
        console.error('Error fetching assets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [companyId]);

  const handleArchive = async (asset: Asset) => {
    const confirmed = window.confirm(`Are you sure you want to archive "${asset.name}"?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('assets')
        .update({ 
          archived: true, 
          archived_at: new Date().toISOString() 
        })
        .eq('id', asset.id);

      if (error) throw error;
      
      // Remove from local state
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      onArchive?.(asset);
    } catch (error) {
      console.error('Error archiving asset:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <p className="text-slate-400">Loading assets...</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-neutral-200">
        <thead className="border-b border-neutral-700 text-neutral-400">
          <tr>
            <th className="py-3 text-left">Asset</th>
            <th className="text-left">Category</th>
            <th className="text-left">Site</th>
            <th className="text-left">Brand/Model</th>
            <th className="text-left">Serial</th>
            <th className="text-left">Install Date</th>
            <th className="text-left">Warranty End</th>
            <th className="text-left">Next Service</th>
            <th className="text-left">PPM Contractor</th>
            <th className="text-left">Status</th>
            <th className="text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id} className="border-b border-neutral-800 hover:bg-neutral-800/40">
              <td className="py-3">
                <div>
                  <div className="font-medium text-white">{asset.name}</div>
                  {asset.notes && (
                    <div className="text-xs text-neutral-500 mt-1 truncate max-w-[200px]">
                      {asset.notes}
                    </div>
                  )}
                </div>
              </td>
              <td>
                <span className="capitalize text-neutral-300">
                  {asset.category}
                </span>
              </td>
              <td>
                <span className="text-neutral-300">
                  {(asset as any).sites?.name || 'Unknown'}
                </span>
              </td>
              <td>
                <div className="text-neutral-300">
                  {asset.brand && <div className="font-medium">{asset.brand}</div>}
                  {asset.model && <div className="text-xs text-neutral-500">{asset.model}</div>}
                </div>
              </td>
              <td>
                <span className="text-neutral-300 font-mono text-xs">
                  {asset.serial_number || '-'}
                </span>
              </td>
              <td>
                <span className="text-neutral-300">
                  {asset.install_date ? new Date(asset.install_date).toLocaleDateString() : '-'}
                </span>
              </td>
              <td>
                <span className="text-neutral-300">
                  {asset.warranty_end ? new Date(asset.warranty_end).toLocaleDateString() : '-'}
                </span>
              </td>
              <td>
                <span className="text-neutral-300">
                  {asset.next_service_date ? new Date(asset.next_service_date).toLocaleDateString() : '-'}
                </span>
              </td>
              <td>
                <span className="text-neutral-300">
                  {(asset as any).ppm_contractor?.name || '-'}
                </span>
              </td>
              <td>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  asset.status === 'Active' 
                    ? 'bg-green-900/30 text-green-400' 
                    : asset.status === 'Maintenance'
                    ? 'bg-yellow-900/30 text-yellow-400'
                    : 'bg-neutral-900/30 text-neutral-400'
                }`}>
                  {asset.status}
                </span>
              </td>
              <td>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit?.(asset)}
                    className="p-1 h-8 w-8"
                    title="Edit asset"
                  >
                    <Edit size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewLogs?.(asset)}
                    className="p-1 h-8 w-8"
                    title="View logs"
                  >
                    <Eye size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleArchive(asset)}
                    className="p-1 h-8 w-8 text-orange-400 border-orange-400 hover:bg-orange-900/20"
                    title="Archive asset"
                  >
                    <Archive size={14} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {assets.length === 0 && (
            <tr>
              <td colSpan={11} className="py-8 text-center text-neutral-500">
                No assets found. Create your first asset to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

