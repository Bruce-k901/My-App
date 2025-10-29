"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, GlassWater } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

export default function GlasswareLibraryPage() {
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [glassware, setGlassware] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [formData, setFormData] = useState({
    item_name: '',
    category: '',
    capacity: '',
    material: '',
    supplier: '',
    unit_cost: '',
    notes: ''
  });

  const loadGlassware = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('glassware_library')
        .select('*')
        .eq('company_id', companyId)
        .order('item_name');
      
      if (error) throw error;
      setGlassware(data || []);
    } catch (error) {
      console.error('Error loading glassware:', error);
      showToast({ title: 'Error loading glassware', description: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGlassware();
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
          .from('glassware_library')
          .update(data)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        showToast({ title: 'Glassware updated', description: 'Item updated successfully', type: 'success' });
      } else {
        const { error } = await supabase
          .from('glassware_library')
          .insert(data);
        
        if (error) throw error;
        showToast({ title: 'Glassware added', description: 'Item added successfully', type: 'success' });
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData({
        item_name: '',
        category: '',
        capacity: '',
        material: '',
        supplier: '',
        unit_cost: '',
        notes: ''
      });
      loadGlassware();
    } catch (error) {
      console.error('Error saving glassware:', error);
      showToast({ title: 'Error saving glassware', description: error.message, type: 'error' });
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name || '',
      category: item.category || '',
      capacity: item.capacity || '',
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
        .from('glassware_library')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showToast({ title: 'Glassware deleted', description: 'Item deleted successfully', type: 'success' });
      loadGlassware();
    } catch (error) {
      console.error('Error deleting glassware:', error);
      showToast({ title: 'Error deleting glassware', description: error.message, type: 'error' });
    }
  };

  const filteredGlassware = glassware.filter(item =>
    item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <GlassWater className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Glassware Library</h1>
            <p className="text-white/60">Manage glassware items, capacity, and materials</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
              <input
                type="text"
                placeholder="Search glassware..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>
          
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Glassware
          </button>
        </div>
      </div>

      {/* Glassware Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGlassware.map((item) => (
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
                <span className="text-white/60">Capacity:</span>
                <span className="text-white">{item.capacity || 'N/A'}</span>
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

      {filteredGlassware.length === 0 && !loading && (
        <div className="text-center py-12">
          <GlassWater className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No glassware found</h3>
          <p className="text-white/60">Add your first glassware item to get started</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1119] border border-white/[0.1] rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                {editingItem ? 'Edit Glassware' : 'Add Glassware'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                  setFormData({
                    item_name: '',
                    category: '',
                    capacity: '',
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
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="e.g., Wine Glass, Beer Mug"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="">Select category...</option>
                  <option value="Wine Glasses">Wine Glasses</option>
                  <option value="Beer Glasses">Beer Glasses</option>
                  <option value="Cocktail Glasses">Cocktail Glasses</option>
                  <option value="Water Glasses">Water Glasses</option>
                  <option value="Champagne Flutes">Champagne Flutes</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Capacity</label>
                  <input
                    type="text"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                    className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="e.g., 250ml"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Material</label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => setFormData({...formData, material: e.target.value})}
                    className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="e.g., Crystal, Glass"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Supplier</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
                      capacity: '',
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
                  className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                >
                  {editingItem ? 'Update' : 'Add'} Glassware
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
