"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

const ALLERGEN_OPTIONS = [
  'Gluten', 'Crustaceans', 'Eggs', 'Fish', 'Peanuts', 'Soybeans', 'Milk', 'Nuts', 'Celery', 
  'Mustard', 'Sesame', 'Sulphites', 'Lupin', 'Molluscs'
];

const PREP_STATES = ['Raw', 'Cooked', 'Prepared', 'Marinated', 'Fermented', 'Dried', 'Frozen'];

export default function IngredientsLibraryPage() {
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50); // Show 50 items per page
  const [totalItems, setTotalItems] = useState(0);
  const [formData, setFormData] = useState({
    ingredient_name: '',
    category: '',
    allergens: [],
    prep_state: '',
    supplier: '',
    unit_cost: '',
    unit: '',
    notes: ''
  });

  const loadIngredients = useCallback(async () => {
    if (!companyId) return;
    if (loading) return; // Guard against concurrent calls
    
    try {
      setLoading(true);
      
      // Get total count first
      const { count } = await supabase
        .from('ingredients_library')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      
      setTotalItems(count || 0);
      
      // Fetch paginated data with specific columns only
      const { data, error } = await supabase
        .from('ingredients_library')
        .select('id, ingredient_name, category, allergens, prep_state, supplier, unit_cost, unit, notes')
        .eq('company_id', companyId)
        .order('ingredient_name')
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
      
      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error('Error loading ingredients:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      showToast({ title: 'Error loading ingredients', description: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [companyId, currentPage, pageSize, showToast, loading]);

  useEffect(() => {
    loadIngredients();
  }, [loadIngredients]);

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        company_id: companyId,
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null
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
    } catch (error) {
      console.error('Error saving ingredient:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      showToast({ title: 'Error saving ingredient', description: errorMessage, type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this ingredient?')) return;
    
    try {
      const { error } = await supabase
        .from('ingredients_library')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showToast({ title: 'Ingredient deleted', type: 'success' });
      loadIngredients();
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      showToast({ title: 'Error deleting ingredient', description: errorMessage, type: 'error' });
    }
  };

  const resetForm = () => {
    setFormData({
      ingredient_name: '',
      category: '',
      allergens: [],
      prep_state: '',
      supplier: '',
      unit_cost: '',
      unit: '',
      notes: ''
    });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      ingredient_name: item.ingredient_name || '',
      category: item.category || '',
      allergens: item.allergens || [],
      prep_state: item.prep_state || '',
      supplier: item.supplier || '',
      unit_cost: item.unit_cost || '',
      unit: item.unit || '',
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const filteredItems = ingredients.filter(item => 
    item.ingredient_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-green-500 rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-white">Ingredients Library</h1>
              <p className="text-sm text-neutral-400">Manage food ingredients, allergens, and costs</p>
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
            onClick={() => {
              resetForm();
              setEditingItem(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-magenta-600 to-blue-600 hover:from-magenta-500 hover:to-blue-500 transition-all rounded-lg text-white flex items-center gap-2"
          >
            <Plus size={16} />
            Add Ingredient
          </button>
        </div>
      </div>

      {/* Search */}
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

      {/* Ingredients Table */}
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
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Ingredient Name</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Category</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Allergens</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Prep State</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Unit Cost</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-t border-neutral-700 hover:bg-neutral-800/50">
                  <td className="px-4 py-3 text-white">{item.ingredient_name}</td>
                  <td className="px-4 py-3 text-neutral-400">{item.category || '-'}</td>
                  <td className="px-4 py-3">
                    {item.allergens && item.allergens.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <AlertTriangle size={14} className="text-red-400" />
                        <span className="text-xs text-red-400">{item.allergens.join(', ')}</span>
                      </div>
                    ) : (
                      <span className="text-neutral-500">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{item.prep_state || '-'}</td>
                  <td className="px-4 py-3 text-neutral-400">£{item.unit_cost || '0.00'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-magenta-400 hover:text-magenta-300"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          {totalItems > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 bg-neutral-900 border-t border-neutral-700">
              <div className="text-sm text-neutral-400">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} ingredients
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-neutral-400">
                  Page {currentPage} of {Math.ceil(totalItems / pageSize)}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalItems / pageSize), p + 1))}
                  disabled={currentPage >= Math.ceil(totalItems / pageSize)}
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-xl border border-neutral-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                {editingItem ? 'Edit Ingredient' : 'Add Ingredient'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                  resetForm();
                }}
                className="text-neutral-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-300 mb-1">Ingredient Name *</label>
                <input
                  value={formData.ingredient_name}
                  onChange={(e) => setFormData({ ...formData, ingredient_name: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                  placeholder="e.g., Chicken Breast"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Category</label>
                  <input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g., Meat"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Prep State</label>
                  <select
                    value={formData.prep_state}
                    onChange={(e) => setFormData({ ...formData, prep_state: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select...</option>
                    {PREP_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-neutral-300 mb-2">Allergens</label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGEN_OPTIONS.map(allergen => (
                    <label key={allergen} className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 border border-neutral-600 rounded-lg cursor-pointer hover:bg-neutral-700">
                      <input
                        type="checkbox"
                        checked={formData.allergens.includes(allergen)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, allergens: [...formData.allergens, allergen] });
                          } else {
                            setFormData({ ...formData, allergens: formData.allergens.filter(a => a !== allergen) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-white">{allergen}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Unit</label>
                  <input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g., kg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Unit Cost (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Supplier</label>
                  <input
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                    placeholder="Supplier name"
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
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-magenta-600 to-blue-600 hover:from-magenta-500 hover:to-blue-500 transition-all rounded-lg text-white flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {editingItem ? 'Update' : 'Add'} Ingredient
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                  resetForm();
                }}
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

