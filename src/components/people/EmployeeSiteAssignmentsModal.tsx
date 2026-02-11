'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Plus, Calendar, MapPin, Trash2 } from '@/components/ui/icons';
import { useToast } from '@/components/ui/ToastProvider';

interface SiteAssignment {
  id: string;
  borrowed_site_id: string;
  borrowed_site_name: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
}

interface EmployeeSiteAssignmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  homeSiteId: string | null;
  companyId: string;
}

export default function EmployeeSiteAssignmentsModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  homeSiteId,
  companyId,
}: EmployeeSiteAssignmentsModalProps) {
  const { showToast } = useToast();
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [assignments, setAssignments] = useState<SiteAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    borrowed_site_id: '',
    start_date: '',
    end_date: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load sites
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name');

      if (sitesError) throw sitesError;
      setSites(sitesData || []);

      // Load existing assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('employee_site_assignments')
        .select(`
          id,
          borrowed_site_id,
          start_date,
          end_date,
          notes,
          sites:borrowed_site_id (id, name)
        `)
        .eq('profile_id', employeeId)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('start_date', { ascending: true });

      if (assignmentsError) throw assignmentsError;

      const mappedAssignments: SiteAssignment[] = (assignmentsData || []).map((a: any) => ({
        id: a.id,
        borrowed_site_id: a.borrowed_site_id,
        borrowed_site_name: a.sites?.name || 'Unknown Site',
        start_date: a.start_date,
        end_date: a.end_date,
        notes: a.notes,
      }));

      setAssignments(mappedAssignments);
    } catch (error: any) {
      console.error('Error loading site assignments:', error);
      showToast({
        title: 'Failed to load assignments',
        description: error.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [employeeId, companyId, showToast]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleAddAssignment = async () => {
    if (!newAssignment.borrowed_site_id || !newAssignment.start_date) {
      showToast({
        title: 'Validation Error',
        description: 'Please select a site and start date',
        type: 'error',
      });
      return;
    }

    if (newAssignment.borrowed_site_id === homeSiteId) {
      showToast({
        title: 'Invalid Site',
        description: 'Cannot assign employee to their own home site',
        type: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('employee_site_assignments')
        .insert({
          company_id: companyId,
          profile_id: employeeId,
          home_site_id: homeSiteId,
          borrowed_site_id: newAssignment.borrowed_site_id,
          start_date: newAssignment.start_date,
          end_date: newAssignment.end_date || null,
          notes: newAssignment.notes || null,
          is_active: true,
        });

      if (error) throw error;

      showToast({
        title: 'Assignment Added',
        description: 'Employee can now work at the selected site during the specified dates',
        type: 'success',
      });

      setNewAssignment({
        borrowed_site_id: '',
        start_date: '',
        end_date: '',
        notes: '',
      });
      setShowAddForm(false);
      loadData();
    } catch (error: any) {
      console.error('Error adding assignment:', error);
      showToast({
        title: 'Failed to add assignment',
        description: error.message,
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this site assignment?')) return;

    try {
      const { error } = await supabase
        .from('employee_site_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId);

      if (error) throw error;

      showToast({
        title: 'Assignment Removed',
        description: 'Employee can no longer work at this site',
        type: 'success',
      });

      loadData();
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      showToast({
        title: 'Failed to remove assignment',
        description: error.message,
        type: 'error',
      });
    }
  };

  const availableSites = sites.filter(s => s.id !== homeSiteId);

  console.log('EmployeeSiteAssignmentsModal render check', { isOpen, employeeId, employeeName, homeSiteId, companyId });

  if (!isOpen) {
    console.log('Modal not open, returning null');
    return null;
  }

  console.log('Modal IS open, rendering modal content');

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#171b2d] rounded-xl border border-gray-200 dark:border-white/[0.1] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/[0.06]">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Site Assignments</h2>
            <p className="text-sm text-gray-600 dark:text-white/70 mt-1">{employeeName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400 dark:text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Info Banner */}
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Site assignments allow employees to be "borrowed" from their home site to work at other sites.
                  When an employee has an active assignment, they will appear in the rota for the borrowing site during the specified date range.
                </p>
              </div>

              {/* Add New Assignment Button */}
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] border border-gray-300 dark:border-white/[0.1] text-gray-600 hover:text-gray-900 dark:text-white/60 dark:hover:text-white rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Site Assignment
                </button>
              )}

              {/* Add New Assignment Form */}
              {showAddForm && (
                <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Site Assignment</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                      Site to Borrow To
                    </label>
                    <select
                      value={newAssignment.borrowed_site_id}
                      onChange={(e) => setNewAssignment({ ...newAssignment, borrowed_site_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-white/[0.06] border border-gray-300 dark:border-white/[0.1] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a site...</option>
                      {availableSites.map(site => (
                        <option key={site.id} value={site.id}>{site.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={newAssignment.start_date}
                        onChange={(e) => setNewAssignment({ ...newAssignment, start_date: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-white/[0.06] border border-gray-300 dark:border-white/[0.1] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                        End Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={newAssignment.end_date}
                        onChange={(e) => setNewAssignment({ ...newAssignment, end_date: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-white/[0.06] border border-gray-300 dark:border-white/[0.1] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min={newAssignment.start_date}
                      />
                      <p className="text-xs text-gray-500 dark:text-white/50 mt-1">Leave empty for ongoing assignment</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={newAssignment.notes}
                      onChange={(e) => setNewAssignment({ ...newAssignment, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-white/[0.06] border border-gray-300 dark:border-white/[0.1] rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="e.g., Covering for staff shortage during busy period"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleAddAssignment}
                      disabled={saving || !newAssignment.borrowed_site_id || !newAssignment.start_date}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Adding...' : 'Add Assignment'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewAssignment({
                          borrowed_site_id: '',
                          start_date: '',
                          end_date: '',
                          notes: '',
                        });
                      }}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-gray-600 hover:text-gray-900 dark:text-white/60 dark:hover:text-white border border-gray-200 dark:border-white/[0.1] rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Assignments */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Assignments</h3>
                {assignments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-white/60">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No site assignments yet</p>
                    <p className="text-sm mt-2">Add an assignment to allow this employee to work at other sites</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-gray-900 dark:text-white font-medium">{assignment.borrowed_site_name}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-white/70">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {new Date(assignment.start_date).toLocaleDateString('en-GB')}
                                  {assignment.end_date
                                    ? ` - ${new Date(assignment.end_date).toLocaleDateString('en-GB')}`
                                    : ' (Ongoing)'}
                                </span>
                              </div>
                            </div>
                            {assignment.notes && (
                              <p className="text-sm text-gray-500 dark:text-white/50 mt-2 italic">{assignment.notes}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                            title="Remove assignment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-white/[0.06] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-gray-600 hover:text-gray-900 dark:text-white/60 dark:hover:text-white border border-gray-200 dark:border-white/[0.1] rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


