'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import AssetModal from '@/components/assets/AssetModal';
import AssetTableNew from '@/components/assets/AssetTableNew';
import { useAppContext } from '@/context/AppContext';
import { Database } from '@/lib/database.types';

type Asset = Database['public']['Tables']['assets']['Row'];

export default function TestAssetModalPage() {
  const { companyId } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setShowModal(true);
  };

  const handleArchive = (asset: Asset) => {
    console.log('Archiving asset:', asset);
    // The table will handle the actual archiving
  };

  const handleViewLogs = (asset: Asset) => {
    console.log('Viewing logs for asset:', asset);
    // This will be handled by the modal when editing
  };

  const handleSaved = (asset: Asset) => {
    console.log('Asset saved:', asset);
    setShowModal(false);
    setEditingAsset(null);
  };

  if (!companyId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-4">Test Asset Modal</h1>
        <p className="text-neutral-400">No company context available. Please log in.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Asset Management</h1>
        <Button
          onClick={() => {
            setEditingAsset(null);
            setShowModal(true);
          }}
          className="bg-[#FF00CC] hover:bg-[#FF00CC]/80 text-white"
        >
          Add New Asset
        </Button>
      </div>

      <div className="bg-neutral-900 rounded-lg p-6">
        <AssetTableNew
          companyId={companyId}
          onEdit={handleEdit}
          onArchive={handleArchive}
          onViewLogs={handleViewLogs}
        />
      </div>

      <AssetModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingAsset(null);
        }}
        onSaved={handleSaved}
        asset={editingAsset}
      />
    </div>
  );
}

