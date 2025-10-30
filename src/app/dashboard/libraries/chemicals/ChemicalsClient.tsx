"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

export default function ChemicalsClient() {
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [chemicals, setChemicals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    product_name: '',
    manufacturer: '',
    use_case: '',
    hazard_symbols: [],
    dilution_ratio: '',
    contact_time: '',
    required_ppe: [],
    supplier: '',
    unit_cost: '',
    pack_size: '',
    storage_requirements: '',
    linked_risks: [],
    notes: ''
  });

  const loadChemicals = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chemicals_library')
        .select('*')
        .eq('company_id', companyId)
        .order('product_name');
      
      if (error) throw error;
      
      const { data: coshhSheets } = await supabase
        .from('coshh_data_sheets')
        .select('chemical_id, status, expiry_date')
        .eq('company_id', companyId)
        .eq('status', 'Active');
      
      const chemicalsWithCOSHH = (data || []).map(chem => {
        const coshhSheet = coshhSheets?.find(s => s.chemical_id === chem.id);
        return {
          ...chem,
          hasCOSHHSheet: !!coshhSheet,
          coshhExpiryDate: coshhSheet?.expiry_date || null
        };
      });
      
      setChemicals(chemicalsWithCOSHH);
    } catch (error) {
      console.error('Error loading chemicals:', error);
      showToast({ title: 'Error loading chemicals', description: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [companyId, showToast, loading]);

  useEffect(() => {
    loadChemicals();
  }, [loadChemicals]);

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        company_id: companyId,
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null
      };

      if (editingItem) {
        const { error } = await supabase
          .from('chemicals_library')
          .update(payload)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        showToast({ title: 'Chemical updated', type: 'success' });
      } else {
        const { error } = await supabase
          .from('chemicals_library')
          .insert(payload);
        
        if (error) throw error;
        showToast({ title: 'Chemical added', type: 'success' });
      }

      setShowModal(false);
      setEditingItem(null);
      resetForm();
      loadChemicals();
    } catch (error) {
      console.error('Error saving chemical:', error);
      showToast({ title: 'Error saving chemical', description: error.message, type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chemical?')) return;
    
    try {
      const { error } = await supabase
        .from('chemicals_library')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showToast({ title: 'Chemical deleted', type: 'success' });
      loadChemicals();
    } catch (error) {
      console.error('Error deleting chemical:', error);
      showToast({ title: 'Error deleting chemical', description: (error as any)?.message, type: 'error' });
    }
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      manufacturer: '',
      use_case: '',
      hazard_symbols: [],
      dilution_ratio: '',
      contact_time: '',
      required_ppe: [],
      supplier: '',
      unit_cost: '',
      pack_size: '',
      storage_requirements: '',
      linked_risks: [],
      notes: ''
    });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      product_name: item.product_name || '',
      manufacturer: item.manufacturer || '',
      use_case: item.use_case || '',
      hazard_symbols: item.hazard_symbols || [],
      dilution_ratio: item.dilution_ratio || '',
      contact_time: item.contact_time || '',
      required_ppe: item.required_ppe || [],
      supplier: item.supplier || '',
      unit_cost: item.unit_cost || '',
      pack_size: item.pack_size || '',
      storage_requirements: item.storage_requirements || '',
      linked_risks: item.linked_risks || [],
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const filteredItems = chemicals.filter((item: any) => 
    (item.product_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-red-500 rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-white">Chemicals Library</h1>
              <p className="text-sm text-neutral-400">Manage cleaning chemicals and COSHH data</p>
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
            Add Chemical
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search chemicals..."
          className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400"
        />
      </div>

      {loading ? (
        <div className="text-neutral-400 text-center py-8">Loading chemicals...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-neutral-700">
          <p className="text-neutral-400">No chemicals found.</p>
        </div>
      ) : (
        <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-900">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Product Name</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Manufacturer</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Use Case</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Hazards</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">COSHH Sheet</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Contact Time</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Dilution</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Required PPE</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Supplier</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Unit Cost</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Pack Size</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Storage</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Linked Risks</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Notes</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: any) => (
                <tr key={item.id} className="border-t border-neutral-700 hover:bg-neutral-800/50">
                  <td className="px-4 py-3 text-white">{item.product_name}</td>
                  <td className="px-4 py-3 text-neutral-400">{item.manufacturer || '-'}</td>
                  <td className="px-4 py-3 text-neutral-400">{item.use_case}</td>
                  <td className="px-4 py-3">
                    {item.hazard_symbols && item.hazard_symbols.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <AlertTriangle size={14} className="text-red-400" />
                        <span className="text-xs text-red-400">{item.hazard_symbols.join(', ')}</span>
                      </div>
                    ) : (
                      <span className="text-neutral-500">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.hasCOSHHSheet ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle size={16} className="text-green-400" />
                        <span className="text-xs text-green-400">Uploaded</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <AlertTriangle size={16} className="text-red-400" />
                        <span className="text-xs text-red-400">Missing</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{item.contact_time || '-'}</td>
                  <td className="px-4 py-3 text-neutral-400">{item.dilution_ratio || '-'}</td>
                  <td className="px-4 py-3 text-neutral-400">{(item.required_ppe || []).join(', ') || '-'}</td>
                  <td className="px-4 py-3 text-neutral-400">{item.supplier || '-'}</td>
                  <td className="px-4 py-3 text-neutral-400">£{item.unit_cost || '0.00'}</td>
                  <td className="px-4 py-3 text-neutral-400">{item.pack_size || '-'}</td>
                  <td className="px-4 py-3 text-neutral-400">{item.storage_requirements || '-'}</td>
                  <td className="px-4 py-3 text-neutral-400">{(item.linked_risks || []).join(', ') || '-'}</td>
                  <td className="px-4 py-3 text-neutral-400 max-w-[280px] truncate" title={item.notes || ''}>{item.notes || '-'}</td>
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
                {editingItem ? 'Edit Chemical' : 'Add Chemical'}
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

            {/* form fields kept above */}
          </div>
        </div>
      )}
    </div>
  );
}
