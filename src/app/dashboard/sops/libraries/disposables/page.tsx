"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

const DISPOSABLE_CATEGORIES = [
  'Napkins',
  'Stirrers',
  'Straws',
  'Picks',
  'Coasters',
  'Takeaway Packaging',
  'Gloves',
  'Aprons'
];

export default function DisposablesLibraryPage() {
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [disposables, setDisposables] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    item_name: '',
    category: '',
    material: '',
    eco_friendly: false,
    color_finish: '',
    dimensions: '',
    supplier: '',
    unit_cost: '',
    pack_size: '',
    unit_per_pack: '',
    reorder_level: '',
    storage_location: '',
    usage_context: '',
    notes: ''
  });

  const loadDisposables = useCallback(async () => {
    if (!companyId) return;
    if (loading) return; // Guard against concurrent calls
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('disposables_library')
        .select('*')
        .eq('company_id', companyId)
        .order('item_name');
      
      if (error) throw error;
      setDisposables(data || []);
    } catch (error) {
      console.error('Error loading disposables:', error);
      showToast({ title: 'Error loading disposables', description: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [companyId, showToast, loading]);

  useEffect(() => {
    loadDisposables();
  }, [loadDisposables]);

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        company_id: companyId,
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
        pack_size: formData.pack_size ? parseInt(formData.pack_size) : null,
        reorder_level: formData.reorder_level ? parseInt(formData.reorder_level) : null
      };

      if (editingItem) {
        const { error } = await supabase
          .from('disposables_library')
          .update(payload)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        showToast({ title: 'Disposable updated', type: 'success' });
      } else {
        const { error } = await supabase
          .from('disposables_library')
          .insert(payload);
        
        if (error) throw error;
        showToast({ title: 'Disposable added', type: 'success' });
      }

      setShowModal(false);
      setEditingItem(null);
      resetForm();
      loadDisposables();
    } catch (error) {
      console.error('Error saving disposable:', error);
      showToast({ title: 'Error saving disposable', description: error.message, type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this disposable item?')) return;
    
    try {
      const { error } = await supabase
        .from('disposables_library')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showToast({ title: 'Disposable deleted', type: 'success' });
      loadDisposables();
    } catch (error) {
      console.error('Error deleting disposable:', error);
      showToast({ title: 'Error deleting disposable', description: error.message, type: 'error' });
    }
  };

  const resetForm = () => {
    setFormData({
      item_name: '',
      category: '',
      material: '',
      eco_friendly: false,
      color_finish: '',
      dimensions: '',
      supplier: '',
      unit_cost: '',
      pack_size: '',
      unit_per_pack: '',
      reorder_level: '',
      storage_location: '',
      usage_context: '',
      notes: ''
    });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name || '',
      category: item.category || '',
      material: item.material || '',
      eco_friendly: item.eco_friendly || false,
      color_finish: item.color_finish || '',
      dimensions: item.dimensions || '',
      supplier: item.supplier || '',
      unit_cost: item.unit_cost || '',
      pack_size: item.pack_size || '',
      unit_per_pack: item.unit_per_pack || '',
      reorder_level: item.reorder_level || '',
      storage_location: item.storage_location || '',
      usage_context: item.usage_context || '',
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const filteredItems = disposables.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-white">Disposables Library</h1>
              <p className="text-sm text-neutral-400">Manage disposable items and packaging</p>
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
            Add Disposable
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search disposables..."
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Categories</option>
          {DISPOSABLE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Disposables Table */}
      {loading ? (
        <div className="text-neutral-400 text-center py-8">Loading disposables...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-neutral-700">
          <p className="text-neutral-400">No disposables found.</p>
        </div>
      ) : (
        <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-900">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Item Name</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Category</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Material</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Eco-Friendly</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Unit Cost</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-t border-neutral-700 hover:bg-neutral-800/50">
                  <td className="px-4 py-3 text-white">{item.item_name}</td>
                  <td className="px-4 py-3 text-neutral-400">{item.category}</td>
                  <td className="px-4 py-3 text-neutral-400">{item.material}</td>
                  <td className="px-4 py-3">
                    {item.eco_friendly ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Yes</span>
                    ) : (
                      <span className="px-2 py-1 bg-neutral-700 text-neutral-400 rounded-full text-xs">No</span>
                    )}
                  </td>
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
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-xl border border-neutral-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                {editingItem ? 'Edit Disposable' : 'Add Disposable'}
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
                <label className="block text-sm text-neutral-300 mb-1">Item Name *</label>
                <input
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
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
                    {DISPOSABLE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Material</label>
                  <input
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g., Paper, Bamboo"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.eco_friendly}
                  onChange={(e) => setFormData({ ...formData, eco_friendly: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm text-neutral-300">Eco-friendly / Compostable</label>
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

