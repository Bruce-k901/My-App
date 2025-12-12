'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, GripVertical, ChevronUp, ChevronDown, Warehouse, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface StorageArea {
  id: string;
  site_id: string;
  name: string;
  area_type?: 'dry' | 'chilled' | 'frozen' | 'ambient' | 'bar' | 'cellar';
  sort_order: number;
  is_active: boolean;
}

const AREA_TYPES = [
  { value: 'dry', label: 'Dry Store', color: 'amber' },
  { value: 'chilled', label: 'Chilled', color: 'blue' },
  { value: 'frozen', label: 'Frozen', color: 'cyan' },
  { value: 'ambient', label: 'Ambient', color: 'gray' },
  { value: 'bar', label: 'Bar', color: 'purple' },
  { value: 'cellar', label: 'Cellar', color: 'stone' }
];

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  amber: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-300',
    border: 'border-amber-500/30'
  },
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-300',
    border: 'border-blue-500/30'
  },
  cyan: {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-300',
    border: 'border-cyan-500/30'
  },
  gray: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-300',
    border: 'border-gray-500/30'
  },
  purple: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-300',
    border: 'border-purple-500/30'
  },
  stone: {
    bg: 'bg-stone-500/20',
    text: 'text-stone-300',
    border: 'border-stone-500/30'
  }
};

export default function StorageAreasPage() {
  const { siteId } = useAppContext();
  const [storageAreas, setStorageAreas] = useState<StorageArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<StorageArea | null>(null);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    area_type: '',
    sort_order: 0,
  });

  useEffect(() => {
    if (siteId) {
      fetchStorageAreas();
    }
  }, [siteId]);

  async function fetchStorageAreas() {
    try {
      setLoading(true);
      if (!siteId) return;

      const { data, error } = await supabase
        .from('storage_areas')
        .select('*')
        .eq('site_id', siteId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setStorageAreas(data || []);
    } catch (error: any) {
      console.error('Error fetching storage areas:', error);
      toast.error('Failed to load storage areas');
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingArea(null);
    setFormData({
      name: '',
      area_type: '',
      sort_order: storageAreas.length > 0 
        ? Math.max(...storageAreas.map(a => a.sort_order)) + 1 
        : 0,
    });
    setIsModalOpen(true);
  }

  function openEditModal(area: StorageArea) {
    setEditingArea(area);
    setFormData({
      name: area.name || '',
      area_type: area.area_type || '',
      sort_order: area.sort_order || 0,
    });
    setIsModalOpen(true);
  }

  async function handleSave() {
    if (!siteId) {
      toast.error('Site ID not available');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Storage area name is required');
      return;
    }

    try {
      setSaving(true);

      const areaData: any = {
        site_id: siteId,
        name: formData.name.trim(),
        area_type: formData.area_type || null,
        sort_order: formData.sort_order || 0,
        is_active: true,
      };

      if (editingArea) {
        const { error } = await supabase
          .from('storage_areas')
          .update(areaData)
          .eq('id', editingArea.id);

        if (error) throw error;
        toast.success('Storage area updated successfully');
      } else {
        const { error } = await supabase
          .from('storage_areas')
          .insert(areaData)
          .select()
          .single();

        if (error) throw error;
        toast.success('Storage area added successfully');
      }

      setIsModalOpen(false);
      await fetchStorageAreas();
    } catch (error: any) {
      console.error('Error saving storage area:', error);
      toast.error(error.message || 'Failed to save storage area');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(area: StorageArea) {
    if (!confirm(`Are you sure you want to delete ${area.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('storage_areas')
        .update({ is_active: false })
        .eq('id', area.id);

      if (error) throw error;
      toast.success('Storage area deleted successfully');
      await fetchStorageAreas();
    } catch (error: any) {
      console.error('Error deleting storage area:', error);
      toast.error('Failed to delete storage area');
    }
  }

  async function moveArea(area: StorageArea, direction: 'up' | 'down') {
    const currentIndex = storageAreas.findIndex(a => a.id === area.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= storageAreas.length) return;

    const otherArea = storageAreas[newIndex];
    const newAreas = [...storageAreas];
    
    // Swap sort orders
    const tempSortOrder = area.sort_order;
    newAreas[currentIndex] = { ...area, sort_order: otherArea.sort_order };
    newAreas[newIndex] = { ...otherArea, sort_order: tempSortOrder };

    setStorageAreas(newAreas);
    setReordering(true);

    try {
      // Update both areas
      const { error: error1 } = await supabase
        .from('storage_areas')
        .update({ sort_order: otherArea.sort_order })
        .eq('id', area.id);

      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from('storage_areas')
        .update({ sort_order: tempSortOrder })
        .eq('id', otherArea.id);

      if (error2) throw error2;

      toast.success('Order updated');
    } catch (error: any) {
      console.error('Error reordering:', error);
      toast.error('Failed to update order');
      // Revert on error
      await fetchStorageAreas();
    } finally {
      setReordering(false);
    }
  }

  function getTypeColor(type: string | null | undefined) {
    if (!type) return COLOR_CLASSES.gray;
    const areaType = AREA_TYPES.find(t => t.value === type);
    return COLOR_CLASSES[areaType?.color || 'gray'] || COLOR_CLASSES.gray;
  }

  function getTypeLabel(type: string | null | undefined) {
    if (!type) return 'No Type';
    return AREA_TYPES.find(t => t.value === type)?.label || type;
  }

  const filteredAreas = storageAreas.filter(area =>
    area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getTypeLabel(area.area_type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-white">Loading storage areas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/stockly"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Storage Areas</h1>
              <p className="text-slate-400 text-sm">Manage storage locations within your site</p>
            </div>
          </div>
          <Button
            onClick={openAddModal}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Add Storage Area
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="text"
              placeholder="Search storage areas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Storage Areas List */}
        {filteredAreas.length === 0 ? (
          <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-12 text-center">
            <Warehouse className="mx-auto text-slate-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm ? 'No storage areas found' : 'No storage areas yet'}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Get started by adding your first storage area'}
            </p>
            {!searchTerm && (
              <Button onClick={openAddModal} variant="secondary">
                <Plus size={18} className="mr-2" />
                Add Storage Area
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAreas.map((area, index) => {
              const colorClasses = getTypeColor(area.area_type);
              return (
                <div
                  key={area.id}
                  className="bg-white/[0.03] border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Reorder Controls */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveArea(area, 'up')}
                        disabled={reordering || index === 0}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Move up"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={() => moveArea(area, 'down')}
                        disabled={reordering || index === filteredAreas.length - 1}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Move down"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>

                    {/* Drag Handle */}
                    <div className="text-slate-500 cursor-grab">
                      <GripVertical size={20} />
                    </div>

                    {/* Area Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-white">{area.name}</h3>
                        {area.area_type && (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded border ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}
                          >
                            {getTypeLabel(area.area_type)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        Sort order: {area.sort_order}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(area)}
                        className="p-2 text-slate-400 hover:text-[#EC4899] transition-colors"
                        aria-label="Edit area"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(area)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        aria-label="Delete area"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">
                {editingArea ? 'Edit Storage Area' : 'Add Storage Area'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Fridge, Dry Store"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Area Type</label>
                <Select
                  value={formData.area_type}
                  onValueChange={(val) => setFormData({ ...formData, area_type: val })}
                  options={AREA_TYPES.map(type => ({ label: type.label, value: type.value }))}
                  placeholder="Select type (optional)"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Sort Order</label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Lower numbers appear first. Use up/down arrows to reorder.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-neutral-800">
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.name.trim()}
                  variant="secondary"
                  className="flex-1"
                >
                  {saving ? 'Saving...' : editingArea ? 'Update Area' : 'Add Area'}
                </Button>
                <Button
                  onClick={() => setIsModalOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

