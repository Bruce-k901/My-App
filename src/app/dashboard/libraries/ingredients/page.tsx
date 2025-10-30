"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

const INGREDIENT_CATEGORIES = [
  'Meat', 'Fish', 'Vegetables', 'Fruits', 'Dairy', 'Grains', 'Bakery', 'Dry Goods', 'Other'
];

export default function IngredientsLibraryPage() {
  const { companyId } = useAppContext();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    ingredient_name: '',
    category: '',
    allergens: [],
    unit: '',
    unit_cost: '',
    supplier: '',
    pack_size: '',
    storage_type: '',
    shelf_life: '',
    notes: ''
  });

  const loadIngredients = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ingredients_library')
        .select('*')
        .eq('company_id', companyId)
        .order('ingredient_name');
      if (error) throw error;
      setIngredients(data || []);
    } catch (error: any) {
      console.error('Error loading ingredients:', error);
      showToast({ title: 'Error loading ingredients', description: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [companyId, showToast]);

  useEffect(() => {
    loadIngredients();
  }, [loadIngredients]);

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        company_id: companyId,
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('ingredients_library')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
        showToast({ title: 'Ingredient updated', type: 'success' });
      } else {
        const { error } = await supabase
          .from('ingredients_library')
          .insert(payload);
        if (error) throw error;
        showToast({ title: 'Ingredient added', type: 'success' });
      }

      setShowModal(false);
      setEditingItem(null);
      resetForm();
      loadIngredients();
    } catch (error: any) {
      console.error('Error saving ingredient:', error);
      showToast({ title: 'Error saving ingredient', description: error.message, type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ingredient?')) return;
    try {
      const { error } = await supabase
        .from('ingredients_library')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showToast({ title: 'Ingredient deleted', type: 'success' });
      loadIngredients();
    } catch (error: any) {
      console.error('Error deleting ingredient:', error);
      showToast({ title: 'Error deleting ingredient', description: error.message, type: 'error' });
    }
  };

  const resetForm = () => {
    setFormData({
      ingredient_name: '',
      category: '',
      allergens: [],
      unit: '',
      unit_cost: '',
      supplier: '',
      pack_size: '',
      storage_type: '',
      shelf_life: '',
      notes: ''
    });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      ingredient_name: item.ingredient_name || '',
      category: item.category || '',
      allergens: item.allergens || [],
      unit: item.unit || '',
      unit_cost: item.unit_cost || '',
      supplier: item.supplier || '',
      pack_size: item.pack_size || '',
      storage_type: item.storage_type || '',
      shelf_life: item.shelf_life || '',
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const filteredItems = ingredients.filter((item: any) => {
    const matchesSearch = (item.ingredient_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-pink-500 rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-white">Ingredients Library</h1>
              <p className="text-sm text-neutral-400">Manage ingredients, allergens, and costs</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white flex items-center gap-2">
            <Upload size={16} />
            Upload CSV
          </button>
          <button className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white flex items-center gap-2">
            <Download size={16} />
            Download CSV
          </button>
          <button
            onClick={() => { resetForm(); setEditingItem(null); setShowModal(true); }}
            className="px-4 py-2 bg-gradient-to-r from-magenta-600 to-blue-600 hover:from-magenta-500 hover:to-blue-500 transition-all rounded-lg text-white flex items-center gap-2"
          >
            <Plus size={16} />
            Add Ingredient
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ingredients..."
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Categories</option>
          {INGREDIENT_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-neutral-400 text-center py-8">Loading ingredients...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-neutral-700">
          <p className="text-neutral-400">No ingredients found.</p>
        </div>
      ) : (
        <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-900">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Name</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Category</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Unit</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Unit Cost</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: any) => (
                <tr key={item.id} className="border-t border-neutral-700 hover:bg-neutral-800/50">
                  <td className="px-4 py-3 text-white">{item.ingredient_name}</td>
                  <td className="px-4 py-3 text-neutral-400">{item.category || '-'}</td>
                  <td className="px-4 py-3 text-neutral-400">{item.unit || '-'}</td>
                  <td className="px-4 py-3 text-neutral-400">£{item.unit_cost || '0.00'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(item)} className="p-1.5 text-magenta-400 hover:text-magenta-300">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-400 hover:text-red-300">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-xl border border-neutral-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                {editingItem ? 'Edit Ingredient' : 'Add Ingredient'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingItem(null); resetForm(); }}
                className="text-neutral-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-300 mb-1">Name *</label>
                <input
                  value={formData.ingredient_name}
                  onChange={(e) => setFormData({ ...formData, ingredient_name: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select category...</option>
                    {INGREDIENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Unit</label>
                  <input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g., kg, g, L"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Unit Cost (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Supplier</label>
                  <input
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-neutral-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-magenta-600 to-blue-600 hover:from-magenta-500 hover:to-blue-500 transition-all rounded-lg text-white flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {editingItem ? 'Update' : 'Save'}
              </button>
              <button
                onClick={() => { setShowModal(false); setEditingItem(null); resetForm(); }}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


