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
    <div className="w-full bg-gray-50 dark:bg-[#0B0D13] min-h-screen">
      <div className="max-w-6xl mx-auto p-6">
        <BackToSetup />
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/stockly"
              className="p-2 rounded-lg bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                <Package className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                Storage Areas
              </h1>
              <p className="text-sm text-gray-600 dark:text-white/60">
                Define physical storage locations for stock counting
              </p>
            </div>
          </div>
          <Button 
            onClick={handleAdd} 
            className="bg-transparent border border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:shadow-[0_0_12px_rgba(16,185,129,0.7)] transition-all duration-200 ease-in-out"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Storage Area
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
          </div>
        ) : storageAreas.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Storage Areas Yet
              </h3>
              <p className="text-gray-600 dark:text-white/60 mb-6">
                Create your first storage area to organize stock counting by physical location
              </p>
              <Button 
                onClick={handleAdd} 
                className="bg-transparent border border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:shadow-[0_0_12px_rgba(16,185,129,0.7)] transition-all duration-200 ease-in-out"
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
