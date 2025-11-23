'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Filter, Search, Download, Eye, UserX, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

interface StaffSicknessRecord {
  id: string;
  staff_member_name: string;
  staff_member_id?: string | null;
  illness_onset_date: string;
  illness_onset_time?: string | null;
  symptoms: string;
  exclusion_period_start: string;
  exclusion_period_end?: string | null;
  return_to_work_date?: string | null;
  medical_clearance_required: boolean;
  medical_clearance_received: boolean;
  manager_notified: boolean;
  food_handling_restricted: boolean;
  symptomatic_in_food_areas: boolean;
  reported_by: string;
  reported_date: string;
  company_id: string;
  site_id?: string | null;
  status: 'active' | 'cleared' | 'closed';
  notes?: string | null;
  created_at: string;
}

export default function StaffSicknessPage() {
  const { companyId, siteId, profile } = useAppContext();
  const [records, setRecords] = useState<StaffSicknessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<StaffSicknessRecord | null>(null);
  const [formData, setFormData] = useState<Partial<StaffSicknessRecord>>({
    staff_member_name: '',
    staff_member_id: null,
    illness_onset_date: new Date().toISOString().split('T')[0],
    illness_onset_time: '',
    symptoms: '',
    exclusion_period_start: new Date().toISOString().split('T')[0],
    exclusion_period_end: null,
    return_to_work_date: null,
    medical_clearance_required: false,
    medical_clearance_received: false,
    manager_notified: false,
    food_handling_restricted: true,
    symptomatic_in_food_areas: false,
    notes: '',
    status: 'active'
  });

  useEffect(() => {
    if (companyId) {
      fetchRecords();
    }
  }, [companyId, siteId]);

  async function fetchRecords() {
    try {
      setLoading(true);
      
      if (!companyId) {
        console.warn('No company ID available');
        setRecords([]);
        setLoading(false);
        return;
      }
      
      let query = supabase
        .from('staff_sickness_records')
        .select('*')
        .eq('company_id', companyId)
        .order('illness_onset_date', { ascending: false });

      if (siteId) {
        query = query.eq('site_id', siteId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching staff sickness records:', error);
        toast.error(`Failed to load staff sickness records: ${error.message || 'Unknown error'}`);
        setRecords([]);
        return;
      }
      
      setRecords(data || []);
    } catch (err: any) {
      console.error('Error fetching staff sickness records:', err);
      toast.error(`Failed to load staff sickness records: ${err?.message || 'Unknown error'}`);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!companyId || !formData.staff_member_name || !formData.illness_onset_date || !formData.symptoms) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (selectedRecord) {
        // Update existing
        const { error } = await supabase
          .from('staff_sickness_records')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedRecord.id);

        if (error) throw error;
        toast.success('Staff sickness record updated successfully');
      } else {
        // Create new
        // Ensure dates are properly formatted
        const insertData = {
          ...formData,
          company_id: companyId,
          site_id: siteId || null,
          reported_by: profile?.id || '',
          reported_date: new Date().toISOString().split('T')[0], // DATE field
          illness_onset_date: formData.illness_onset_date || new Date().toISOString().split('T')[0],
          exclusion_period_start: formData.exclusion_period_start || new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('staff_sickness_records')
          .insert(insertData);

        if (error) throw error;
        toast.success('Staff sickness record created successfully');
      }

      setIsModalOpen(false);
      setSelectedRecord(null);
      setFormData({
        staff_member_name: '',
        staff_member_id: null,
        illness_onset_date: new Date().toISOString().split('T')[0],
        illness_onset_time: '',
        symptoms: '',
        exclusion_period_start: new Date().toISOString().split('T')[0],
        exclusion_period_end: null,
        return_to_work_date: null,
        medical_clearance_required: false,
        medical_clearance_received: false,
        manager_notified: false,
        food_handling_restricted: true,
        symptomatic_in_food_areas: false,
        notes: '',
        status: 'active'
      });
      fetchRecords();
    } catch (err: any) {
      console.error('Error saving staff sickness record:', err);
      toast.error(err.message || 'Failed to save record');
    }
  };

  const handleEdit = (record: StaffSicknessRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setSelectedRecord(null);
    setFormData({
      staff_member_name: '',
      staff_member_id: null,
      illness_onset_date: new Date().toISOString().split('T')[0],
      illness_onset_time: '',
      symptoms: '',
      exclusion_period_start: new Date().toISOString().split('T')[0],
      exclusion_period_end: null,
      return_to_work_date: null,
      medical_clearance_required: false,
      medical_clearance_received: false,
      manager_notified: false,
      food_handling_restricted: true,
      symptomatic_in_food_areas: false,
      notes: '',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = !searchTerm || 
      record.staff_member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.symptoms.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = statusFilter === 'all' || record.status === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/60">Loading staff sickness records...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Staff Sickness & Exclusion Log</h1>
          <p className="text-white/60 mt-1 text-sm sm:text-base">Record and track staff illness, exclusions, and return-to-work clearance</p>
        </div>
        <Button onClick={handleNew} className="flex items-center gap-2 text-sm sm:text-base px-3 sm:px-4 py-2 whitespace-nowrap w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4" />
          Log Sickness
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search by staff name or symptoms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-pink-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-pink-500/50"
        >
          <option value="all">All Status</option>
          <option value="active">Active Exclusions</option>
          <option value="cleared">Cleared</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Records List */}
      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            {searchTerm || statusFilter !== 'all' 
              ? 'No records match your search' 
              : 'No staff sickness records yet. Click "Log Sickness" to get started.'}
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div
              key={record.id}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <UserX className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{record.staff_member_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          record.status === 'active' ? 'bg-red-500/20 text-red-400' :
                          record.status === 'cleared' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {record.status === 'active' ? 'Active Exclusion' : 
                           record.status === 'cleared' ? 'Cleared' : 'Closed'}
                        </span>
                        {record.medical_clearance_required && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                            Medical Clearance Required
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-white/60">Illness Onset:</span>
                      <p className="text-white">{new Date(record.illness_onset_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-white/60">Exclusion Start:</span>
                      <p className="text-white">{new Date(record.exclusion_period_start).toLocaleDateString()}</p>
                    </div>
                    {record.exclusion_period_end && (
                      <div>
                        <span className="text-white/60">Exclusion End:</span>
                        <p className="text-white">{new Date(record.exclusion_period_end).toLocaleDateString()}</p>
                      </div>
                    )}
                    {record.return_to_work_date && (
                      <div>
                        <span className="text-white/60">Return to Work:</span>
                        <p className="text-green-400">{new Date(record.return_to_work_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <span className="text-white/60 text-sm">Symptoms: </span>
                    <span className="text-white text-sm">{record.symptoms}</span>
                  </div>

                  {record.symptomatic_in_food_areas && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                      ⚠️ CRITICAL: Staff member was symptomatic in food areas
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleEdit(record)}
                  className="p-2 hover:bg-white/[0.1] rounded-lg transition-colors"
                  title="Edit record"
                >
                  <Eye className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B0D13] border border-white/[0.1] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">
              {selectedRecord ? 'Edit Staff Sickness Record' : 'Log Staff Sickness'}
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Staff Member Name *</label>
                  <input
                    type="text"
                    value={formData.staff_member_name}
                    onChange={(e) => setFormData({ ...formData, staff_member_name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-pink-500/50"
                    placeholder="John Smith"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Illness Onset Date *</label>
                  <input
                    type="date"
                    value={formData.illness_onset_date}
                    onChange={(e) => setFormData({ ...formData, illness_onset_date: e.target.value })}
                    className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-pink-500/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Symptoms *</label>
                <textarea
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                  className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-pink-500/50"
                  placeholder="e.g., Vomiting, diarrhoea, fever, nausea"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Exclusion Period Start *</label>
                  <input
                    type="date"
                    value={formData.exclusion_period_start}
                    onChange={(e) => setFormData({ ...formData, exclusion_period_start: e.target.value })}
                    className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-pink-500/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Exclusion Period End</label>
                  <input
                    type="date"
                    value={formData.exclusion_period_end || ''}
                    onChange={(e) => setFormData({ ...formData, exclusion_period_end: e.target.value || null })}
                    className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-pink-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Return to Work Date</label>
                <input
                  type="date"
                  value={formData.return_to_work_date || ''}
                  onChange={(e) => setFormData({ ...formData, return_to_work_date: e.target.value || null })}
                  className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-pink-500/50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="medical_clearance_required"
                    checked={formData.medical_clearance_required}
                    onChange={(e) => setFormData({ ...formData, medical_clearance_required: e.target.checked })}
                    className="w-4 h-4 rounded border-white/[0.2] bg-white/[0.06]"
                  />
                  <label htmlFor="medical_clearance_required" className="text-sm text-white/80">Medical Clearance Required</label>
                </div>

                {formData.medical_clearance_required && (
                  <div className="flex items-center gap-2 ml-6">
                    <input
                      type="checkbox"
                      id="medical_clearance_received"
                      checked={formData.medical_clearance_received}
                      onChange={(e) => setFormData({ ...formData, medical_clearance_received: e.target.checked })}
                      className="w-4 h-4 rounded border-white/[0.2] bg-white/[0.06]"
                    />
                    <label htmlFor="medical_clearance_received" className="text-sm text-white/80">Medical Clearance Received</label>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="manager_notified"
                    checked={formData.manager_notified}
                    onChange={(e) => setFormData({ ...formData, manager_notified: e.target.checked })}
                    className="w-4 h-4 rounded border-white/[0.2] bg-white/[0.06]"
                  />
                  <label htmlFor="manager_notified" className="text-sm text-white/80">Manager Notified Immediately</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="food_handling_restricted"
                    checked={formData.food_handling_restricted}
                    onChange={(e) => setFormData({ ...formData, food_handling_restricted: e.target.checked })}
                    className="w-4 h-4 rounded border-white/[0.2] bg-white/[0.06]"
                  />
                  <label htmlFor="food_handling_restricted" className="text-sm text-white/80">Food Handling Restrictions Applied</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="symptomatic_in_food_areas"
                    checked={formData.symptomatic_in_food_areas}
                    onChange={(e) => setFormData({ ...formData, symptomatic_in_food_areas: e.target.checked })}
                    className="w-4 h-4 rounded border-red-500/50 bg-red-500/10"
                  />
                  <label htmlFor="symptomatic_in_food_areas" className="text-sm text-red-400 font-semibold">CRITICAL: Staff was symptomatic in food areas</label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Additional Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-pink-500/50"
                  placeholder="Additional information, actions taken, etc."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200"
              >
                {selectedRecord ? 'Update' : 'Log'} Record
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedRecord(null);
                }}
                className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg transition-colors"
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

