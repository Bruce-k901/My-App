"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

const PPE_CATEGORIES = [
  'Hand Protection',
  'Eye Protection',
  'Respiratory',
  'Body Protection',
  'Foot Protection'
];

export default function PPELibraryPage() {
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [ppeItems, setPPEItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    item_name: '',
    category: '',
    standard_compliance: '',
    size_options: [],
    supplier: '',
    unit_cost: '',
    reorder_level: '',
    linked_risks: [],
    cleaning_replacement_interval: '',
    notes: ''
  });

  const loadPPEItems = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ppe_library')
        .select('*')
        .eq('company_id', companyId)
        .order('item_name');
      
      if (error) throw error;
      setPPEItems(data || []);
    } catch (error: any) {
      console.error('Error loading PPE:', error);
      showToast({ title: 'Error loading PPE', description: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [companyId, showToast]);

  useEffect(() => {
    loadPPEItems();
  }, [loadPPEItems]);

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        company_id: companyId,
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
        reorder_level: formData.reorder_level ? parseInt(formData.reorder_level) : null,
        size_options: formData.size_options || []
      };

      if (editingItem) {
        const { error } = await supabase
          .from('ppe_library')
          .update(payload)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        showToast({ title: 'PPE updated', type: 'success' });
      } else {
        const { error } = await supabase
          .from('ppe_library')
          .insert(payload);
        
        if (error) throw error;
        showToast({ title: 'PPE added', type: 'success' });
      }

      setShowModal(false);
      setEditingItem(null);
      resetForm();
      loadPPEItems();
    } catch (error: any) {
      console.error('Error saving PPE:', error);
      showToast({ title: 'Error saving PPE', description: error.message, type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PPE item?')) return;
    
    try {
      const { error } = await supabase
        .from('ppe_library')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showToast({ title: 'PPE deleted', type: 'success' });
      loadPPEItems();
    } catch (error: any) {
      console.error('Error deleting PPE:', error);
      showToast({ title: 'Error deleting PPE', description: error.message, type: 'error' });
    }
  };

  const resetForm = () => {
    setFormData({
      item_name: '',
      category: '',
      standard_compliance: '',
      size_options: [],
      supplier: '',
      unit_cost: '',
      reorder_level: '',
      linked_risks: [],
      cleaning_replacement_interval: '',
      notes: ''
    });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name || '',
      category: item.category || '',
      standard_compliance: item.standard_compliance || '',
      size_options: item.size_options || [],
      supplier: item.supplier || '',
      unit_cost: item.unit_cost || '',
      reorder_level: item.reorder_level || '',
      linked_risks: item.linked_risks || [],
      cleaning_replacement_interval: item.cleaning_replacement_interval || '',
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const filteredItems = ppeItems.filter((item: any) => {
    const matchesSearch = (item.item_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-white">PPE Library</h1>
              <p className="text-sm text-neutral-400">Manage personal protective equipment</p>
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
            Add PPE
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
            placeholder="Search PPE items..."
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Categories</option>
          {PPE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-neutral-400 text-center py-8">Loading PPE...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-neutral-700">
          <p className="text-neutral-400">No PPE items found.</p>
        </div>
      ) : (
        <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-900">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Item Name</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Category</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Unit Cost</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Reorder Level</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: any) => (
                <tr key={item.id} className="border-t border-neutral-700 hover:bg-neutral-800/50">
                  <td className="px-4 py-3 text-white">{item.item_name}</td>
                  <td className="px-4 py-3 text-neutral-400">{item.category}</td>
                  <td className="px-4 py-3 text-neutral-400">£{item.unit_cost || '0.00'}</td>
                  <td className="px-4 py-3 text-neutral-400">{item.reorder_level || '-'}</td>
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
                {editingItem ? 'Edit PPE' : 'Add PPE'}
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
                    {PPE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
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


