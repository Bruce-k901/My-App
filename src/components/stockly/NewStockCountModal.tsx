'use client';

import { useState, useEffect } from 'react';
import { X } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { toast } from 'sonner';

interface StorageArea {
  id: string;
  name: string;
  area_type?: string;
}

interface StockCategory {
  id: string;
  name: string;
  category_type?: string;
}

interface NewStockCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (countId: string) => void;
}

export function NewStockCountModal({ isOpen, onClose, onSuccess }: NewStockCountModalProps) {
  const { companyId, siteId, userId } = useAppContext();

  const [storageAreas, setStorageAreas] = useState<StorageArea[]>([]);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    count_type: 'full' as 'full' | 'partial' | 'spot' | 'rolling',
    count_date: new Date().toISOString().split('T')[0],
    categories: [] as string[],
    storage_areas: [] as string[],
    notes: '',
  });

  useEffect(() => {
    if (isOpen && companyId && siteId) {
      fetchStorageAreas();
      fetchCategories();
    }
  }, [isOpen, companyId, siteId]);

  async function fetchStorageAreas() {
    try {
      const { data, error } = await supabase
        .from('storage_areas')
        .select('id, name, area_type')
        .eq('site_id', siteId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        // Extract meaningful error details
        const errorDetails: any = {
          query: 'storage_areas',
          siteId: siteId,
          message: error?.message || 'No message',
          code: error?.code || 'NO_CODE',
          details: error?.details || 'No details',
          hint: error?.hint || 'No hint',
        };
        
        try {
          errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
        } catch (e) {
          errorDetails.fullError = 'Could not serialize error';
        }
        
        console.error('Error fetching storage areas:', errorDetails);
        throw error;
      }
      setStorageAreas(data || []);
    } catch (error: any) {
      // Extract meaningful error information
      const errorDetails: any = {
        message: error?.message || 'Unknown error',
        code: error?.code || 'NO_CODE',
        details: error?.details || 'No details',
        hint: error?.hint || 'No hint',
      };
      
      try {
        errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch (e) {
        errorDetails.fullError = 'Could not serialize error';
      }
      
      try {
        errorDetails.errorString = String(error);
      } catch (e) {
        errorDetails.errorString = 'Could not convert to string';
      }
      
      console.error('Error fetching storage areas:', errorDetails);
      
      const userMessage = error?.message || 'Failed to load storage areas';
      toast.error(userMessage);
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('stock_categories')
        .select('id, name, category_type')
        .eq('company_id', companyId)
        .order('name');

      if (error) {
        // Extract meaningful error details
        const errorDetails: any = {
          query: 'stock_categories',
          companyId: companyId,
          message: error?.message || 'No message',
          code: error?.code || 'NO_CODE',
          details: error?.details || 'No details',
          hint: error?.hint || 'No hint',
        };
        
        try {
          errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
        } catch (e) {
          errorDetails.fullError = 'Could not serialize error';
        }
        
        console.error('Error fetching categories:', errorDetails);
        throw error;
      }
      setCategories(data || []);
    } catch (error: any) {
      // Extract meaningful error information
      const errorDetails: any = {
        message: error?.message || 'Unknown error',
        code: error?.code || 'NO_CODE',
        details: error?.details || 'No details',
        hint: error?.hint || 'No hint',
      };
      
      try {
        errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch (e) {
        errorDetails.fullError = 'Could not serialize error';
      }
      
      try {
        errorDetails.errorString = String(error);
      } catch (e) {
        errorDetails.errorString = 'Could not convert to string';
      }
      
      console.error('Error fetching categories:', errorDetails);
      
      const userMessage = error?.message || 'Failed to load categories';
      toast.error(userMessage);
    }
  }

  function toggleCategory(categoryId: string) {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId],
    }));
  }

  function toggleStorageArea(areaId: string) {
    setFormData(prev => ({
      ...prev,
      storage_areas: prev.storage_areas.includes(areaId)
        ? prev.storage_areas.filter(id => id !== areaId)
        : [...prev.storage_areas, areaId],
    }));
  }

  async function handleCreate() {
    if (!companyId || !siteId || !userId) {
      toast.error('Missing required information');
      return;
    }

    // Validation
    if (formData.count_type === 'partial' && formData.categories.length === 0) {
      toast.error('Please select at least one category for partial count');
      return;
    }

    if ((formData.count_type === 'partial' || formData.count_type === 'rolling') && formData.storage_areas.length === 0) {
      toast.error('Please select at least one storage area');
      return;
    }

    try {
      setSaving(true);

      // 1. Create count header
      const { data: count, error: countError } = await supabase
        .from('stock_counts')
        .insert({
          company_id: companyId,
          site_id: siteId,
          count_date: formData.count_date,
          count_type: formData.count_type,
          categories: formData.categories.length > 0 ? formData.categories : null,
          storage_areas: formData.storage_areas.length > 0 ? formData.storage_areas : null,
          notes: formData.notes || null,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          started_by: userId,
        })
        .select()
        .single();

      if (countError) throw countError;
      if (!count) throw new Error('Failed to create count');

      // 2. Determine which storage areas to include
      let areasToCount: string[];

      if (formData.storage_areas.length > 0) {
        areasToCount = formData.storage_areas;
      } else {
        // Get all active storage areas for site
        const { data: areas } = await supabase
          .from('storage_areas')
          .select('id')
          .eq('site_id', siteId)
          .eq('is_active', true);

        areasToCount = areas?.map(a => a.id) || [];
      }

      if (areasToCount.length === 0) {
        throw new Error('No storage areas found');
      }

      // 3. Create sections (one per storage area)
      const sectionIds: string[] = [];

      for (const areaId of areasToCount) {
        const { data: section, error: sectionError } = await supabase
          .from('stock_count_sections')
          .insert({
            stock_count_id: count.id,
            storage_area_id: areaId,
            status: 'pending',
          })
          .select()
          .single();

        if (sectionError) throw sectionError;
        if (!section) continue;

        sectionIds.push(section.id);

        // 4. Get stock items for this area
        let itemsQuery = supabase
          .from('stock_items')
          .select('id, current_cost')
          .eq('company_id', companyId)
          .eq('is_active', true);

        // Filter by category if partial count
        if (formData.categories.length > 0) {
          itemsQuery = itemsQuery.in('category_id', formData.categories);
        }

        const { data: items, error: itemsError } = await itemsQuery;

        if (itemsError) throw itemsError;

        // 5. Create count lines for each item
        if (items && items.length > 0) {
          // Get current stock levels for expected quantities
          const { data: stockLevels, error: levelsError } = await supabase
            .from('stock_levels')
            .select('stock_item_id, quantity')
            .eq('site_id', siteId)
            .eq('storage_area_id', areaId)
            .in('stock_item_id', items.map(i => i.id));

          if (levelsError) throw levelsError;

          const levelMap = new Map(stockLevels?.map(sl => [sl.stock_item_id, sl.quantity]) || []);

          const linesToInsert = items.map(item => ({
            stock_count_section_id: section.id,
            stock_item_id: item.id,
            storage_area_id: areaId,
            expected_quantity: levelMap.get(item.id) || 0,
            expected_value: (levelMap.get(item.id) || 0) * (item.current_cost || 0),
          }));

          const { error: linesError } = await supabase
            .from('stock_count_lines')
            .insert(linesToInsert);

          if (linesError) throw linesError;

          // Update section item count
          await supabase
            .from('stock_count_sections')
            .update({ item_count: items.length })
            .eq('id', section.id);
        }
      }

      // 6. Update total items on count
      const { data: totalLines, error: totalError } = await supabase
        .from('stock_count_lines')
        .select('id', { count: 'exact', head: true })
        .in('stock_count_section_id', sectionIds);

      if (totalError) throw totalError;

      await supabase
        .from('stock_counts')
        .update({ total_items: totalLines?.length || 0 })
        .eq('id', count.id);

      toast.success('Stock count created successfully');
      onSuccess(count.id);
    } catch (error: any) {
      // Extract meaningful error information
      const errorDetails: any = {
        message: error?.message || 'Unknown error',
        code: error?.code || 'NO_CODE',
        details: error?.details || 'No details',
        hint: error?.hint || 'No hint',
      };
      
      try {
        errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch (e) {
        errorDetails.fullError = 'Could not serialize error';
      }
      
      try {
        errorDetails.errorString = String(error);
      } catch (e) {
        errorDetails.errorString = 'Could not convert to string';
      }
      
      console.error('Error creating stock count:', errorDetails);
      
      const userMessage = error?.message || 'Failed to create stock count';
      toast.error(userMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0f1220] border-neutral-800">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-semibold">Start New Stock Count</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Count Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Count Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'full', label: 'Full', desc: 'All items' },
                { value: 'partial', label: 'Partial', desc: 'By category' },
                { value: 'spot', label: 'Spot Check', desc: 'Random items' },
                { value: 'rolling', label: 'Rolling', desc: 'By section' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, count_type: type.value as any }))}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.count_type === type.value
                      ? 'border-[#D37E91] bg-[#D37E91]/10'
                      : 'border-neutral-700 bg-white/[0.03] hover:border-neutral-600'
                  }`}
                >
                  <div className="text-white font-medium mb-1">{type.label}</div>
                  <div className="text-xs text-slate-400">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Count Date */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Count Date</label>
            <Input
              type="date"
              value={formData.count_date}
              onChange={(e) => setFormData(prev => ({ ...prev, count_date: e.target.value }))}
            />
          </div>

          {/* Categories (if partial) */}
          {formData.count_type === 'partial' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Categories</label>
              <div className="bg-white/[0.03] border border-neutral-800 rounded-lg p-4 max-h-48 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-slate-400 text-sm">No categories available</p>
                ) : (
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-white/[0.05] p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={formData.categories.includes(category.id)}
                          onChange={() => toggleCategory(category.id)}
                          className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-[#D37E91] focus:ring-[#D37E91]"
                        />
                        <span className="text-white text-sm">{category.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Storage Areas (if partial or rolling) */}
          {(formData.count_type === 'partial' || formData.count_type === 'rolling') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Storage Areas</label>
              <div className="bg-white/[0.03] border border-neutral-800 rounded-lg p-4 max-h-48 overflow-y-auto">
                {storageAreas.length === 0 ? (
                  <p className="text-slate-400 text-sm">No storage areas available</p>
                ) : (
                  <div className="space-y-2">
                    {storageAreas.map((area) => (
                      <label
                        key={area.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-white/[0.05] p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={formData.storage_areas.includes(area.id)}
                          onChange={() => toggleStorageArea(area.id)}
                          className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-[#D37E91] focus:ring-[#D37E91]"
                        />
                        <span className="text-white text-sm">{area.name}</span>
                        {area.area_type && (
                          <span className="text-xs text-slate-400 ml-auto">({area.area_type})</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-white/[0.03] border border-neutral-800 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
              placeholder="Optional notes about this count..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-800">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving}
            variant="secondary"
          >
            {saving ? 'Creating...' : 'Create & Start'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

