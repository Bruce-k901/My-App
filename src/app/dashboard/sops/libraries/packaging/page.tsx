"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, Boxes } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

export default function PackagingLibraryPage() {
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [packaging, setPackaging] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [formData, setFormData] = useState({
    item_name: '',
    category: '',
    size: '',
    material: '',
    supplier: '',
    unit_cost: '',
    notes: ''
  });

  const loadPackaging = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('packaging_library')
        .select('*')
        .eq('company_id', companyId)
        .order('item_name');
      
      if (error) throw error;
      setPackaging(data || []);
    } catch (error) {
      console.error('Error loading packaging:', error);
      showToast({ title: 'Error loading packaging', description: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackaging();
  }, [companyId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
        company_id: companyId,
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null
      };

      if (editingItem) {
        const { error } = await supabase
          .from('packaging_library')
          .update(data)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        showToast({ title: 'Packaging updated', description: 'Item updated successfully', type: 'success' });
      } else {
        const { error } = await supabase
          .from('packaging_library')
          .insert(data);
        
        if (error) throw error;
        showToast({ title: 'Packaging added', description: 'Item added successfully', type: 'success' });
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData({
        item_name: '',
        category: '',
        size: '',
        material: '',
        supplier: '',
        unit_cost: '',
        notes: ''
      });
      loadPackaging();
    } catch (error) {
      console.error('Error saving packaging:', error);
      showToast({ title: 'Error saving packaging', description: error.message, type: 'error' });
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name || '',
      category: item.category || '',
      size: item.size || '',
      material: item.material || '',
      supplier: item.supplier || '',
      unit_cost: item.unit_cost || '',
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const { error } = await supabase
        .from('packaging_library')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showToast({ title: 'Packaging deleted', description: 'Item deleted successfully', type: 'success' });
      loadPackaging();
    } catch (error) {
      console.error('Error deleting packaging:', error);
      showToast({ title: 'Error deleting packaging', description: error.message, type: 'error' });
    }
  };

  const filteredPackaging = packaging.filter(item =>
    item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <Boxes className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Packaging Library</h1>
            <p className="text-white/60">Manage packaging materials, sizes, and suppliers</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
              <input
                type="text"
                placeholder="Search packaging..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              />
            </div>
          </div>
          
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Packaging
          </button>
        </div>
      </div>

      {/* Packaging Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPackaging.map((item) => (
          <div key={item.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.06] transition-colors">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{item.item_name}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.1] text-white/60 hover:text-white transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/60 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Category:</span>
                <span className="text-white">{item.category || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Size:</span>
                <span className="text-white">{item.size || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Material:</span>
                <span className="text-white">{item.material || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Supplier:</span>
                <span className="text-white">{item.supplier || 'N/A'}</span>
              </div>
              {item.unit_cost && (
                <div className="flex justify-between">
                  <span className="text-white/60">Cost:</span>
                  <span className="text-white">£{item.unit_cost}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredPackaging.length === 0 && !loading && (
        <div className="text-center py-12">
          <Boxes className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No packaging found</h3>
          <p className="text-white/60">Add your first packaging item to get started</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1119] border border-white/[0.1] rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                {editingItem ? 'Edit Packaging' : 'Add Packaging'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                  setFormData({
                    item_name: '',
                    category: '',
                    size: '',
                    material: '',
                    supplier: '',
                    unit_cost: '',
                    notes: ''
                  });
                }}
                className="p-1 rounded-lg hover:bg-white/[0.1] text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Item Name *</label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  placeholder="e.g., Takeaway Box, Food Wrap"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                >
                  <option value="">Select category...</option>
                  <option value="Takeaway Containers">Takeaway Containers</option>
                  <option value="Food Wrap">Food Wrap</option>
                  <option value="Bags">Bags</option>
                  <option value="Labels">Labels</option>
                  <option value="Cups & Lids">Cups & Lids</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Size</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({...formData, size: e.target.value})}
                    className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                    placeholder="e.g., Small, 500ml"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Material</label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => setFormData({...formData, material: e.target.value})}
                    className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                    placeholder="e.g., Cardboard, Plastic"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Supplier</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  placeholder="Supplier name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Unit Cost (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({...formData, unit_cost: e.target.value})}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                    setFormData({
                      item_name: '',
                      category: '',
                      size: '',
                      material: '',
                      supplier: '',
                      unit_cost: '',
                      notes: ''
                    });
                  }}
                  className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                >
                  {editingItem ? 'Update' : 'Add'} Packaging
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
