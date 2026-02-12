'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import Button from '@/components/ui/Button';
import { Plus, Loader2, ArrowLeft, Package } from '@/components/ui/icons';
import Link from 'next/link';
import StorageAreaCard from '@/components/stockly/storage-areas/StorageAreaCard';
import StorageAreaModal from '@/components/stockly/storage-areas/StorageAreaModal';
import { StorageArea } from '@/lib/types/stockly';
import BackToSetup from '@/components/dashboard/BackToSetup';

export default function StorageAreasPage() {
  const { companyId } = useAppContext();
  const [storageAreas, setStorageAreas] = useState<StorageArea[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<StorageArea | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      fetchStorageAreas();
    }
  }, [companyId]);

  const fetchStorageAreas = async () => {
    if (!companyId) return;
    
    setLoading(true);
    
    try {
      // Fetch storage areas with ingredient counts
      const { data: areas, error } = await supabase
        .from('storage_areas')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching storage areas:', error);
        setLoading(false);
        return;
      }

      // Get ingredient counts for each area
      const areasWithCounts = await Promise.all(
        (areas || []).map(async (area) => {
          const { count } = await supabase
            .from('ingredients_library')
            .select('*', { count: 'exact', head: true })
            .eq('storage_area_id', area.id);
          
          return {
            ...area,
            ingredient_count: count || 0
          };
        })
      );

      setStorageAreas(areasWithCounts);
    } catch (error) {
      console.error('Error fetching storage areas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingArea(null);
    setIsModalOpen(true);
  };

  const handleEdit = (area: StorageArea) => {
    setEditingArea(area);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsModalOpen(false);
    setEditingArea(null);
    await fetchStorageAreas();
  };

  return (
    <div className="w-full bg-theme-surface-elevated min-h-screen">
      <div className="max-w-6xl mx-auto p-6">
        <BackToSetup />
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/stockly"
 className="p-2 rounded-lg bg-theme-surface ] hover:bg-theme-muted text-theme-secondary hover:text-theme-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-theme-primary mb-2 flex items-center gap-3">
                <Package className="w-8 h-8 text-module-fg" />
                Storage Areas
              </h1>
              <p className="text-sm text-theme-secondary">
                Define physical storage locations for stock counting
              </p>
            </div>
          </div>
          <Button 
            onClick={handleAdd} 
            className="bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow transition-all duration-200 ease-in-out"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Storage Area
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-module-fg" />
          </div>
        ) : storageAreas.length === 0 ? (
          <div className="text-center py-12 bg-theme-surface border border-theme rounded-xl">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold text-theme-primary mb-2">
                No Storage Areas Yet
              </h3>
              <p className="text-theme-secondary mb-6">
                Create your first storage area to organize stock counting by physical location
              </p>
              <Button 
                onClick={handleAdd} 
                className="bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow transition-all duration-200 ease-in-out"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Storage Area
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {storageAreas.map((area) => (
              <StorageAreaCard
                key={area.id}
                area={area}
                onEdit={handleEdit}
                onDelete={fetchStorageAreas}
              />
            ))}
          </div>
        )}

        {/* Modal */}
        <StorageAreaModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingArea(null);
          }}
          onSave={handleSave}
          editingArea={editingArea}
        />
      </div>
    </div>
  );
}
