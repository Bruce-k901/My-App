'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  User,
  GraduationCap,
  Calendar,
  Award,
  Loader2,
  Check,
} from '@/components/ui/icons';
import type { TrainingCourse } from '@/types/teamly';

interface Employee {
  id: string;
  full_name: string;
  email: string;
}

export interface RecordTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // Pre-selection (all optional)
  employeeId?: string;
  employeeName?: string;
  courseId?: string;
  courseName?: string;
  // Edit mode - pass existing record
  existingRecord?: {
    id: string;
    completed_at?: string | null;
    expiry_date?: string | null;
    score_percentage?: number | null;
    certificate_number?: string | null;
    trainer_name?: string | null;
    notes?: string | null;
  };
}

export default function RecordTrainingModal({
  isOpen,
  onClose,
  onSuccess,
  employeeId,
  employeeName,
  courseId,
  courseName,
  existingRecord,
}: RecordTrainingModalProps) {
  const { profile } = useAppContext();
  const isEditMode = !!existingRecord;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    profile_id: employeeId || '',
    course_id: courseId || '',
    completed_at: existingRecord?.completed_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    score: existingRecord?.score_percentage?.toString() || '',
    certificate_number: existingRecord?.certificate_number || '',
    expiry_date: existingRecord?.expiry_date?.split('T')[0] || '',
    trainer_name: existingRecord?.trainer_name || '',
    notes: existingRecord?.notes || '',
  });

  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);

  // Reset form when modal opens with new props
  useEffect(() => {
    if (isOpen) {
      setFormData({
        profile_id: employeeId || '',
        course_id: courseId || '',
        completed_at: existingRecord?.completed_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        score: existingRecord?.score_percentage?.toString() || '',
        certificate_number: existingRecord?.certificate_number || '',
        expiry_date: existingRecord?.expiry_date?.split('T')[0] || '',
        trainer_name: existingRecord?.trainer_name || '',
        notes: existingRecord?.notes || '',
      });
    }
  }, [isOpen, employeeId, courseId, existingRecord]);

  // Fetch employees and courses
  useEffect(() => {
    if (isOpen && profile?.company_id) {
      fetchData();
    }
  }, [isOpen, profile?.company_id]);

  // Auto-select course when courses load
  useEffect(() => {
    if (formData.course_id && courses.length > 0) {
      const course = courses.find(c => c.id === formData.course_id);
      setSelectedCourse(course || null);
    }
  }, [formData.course_id, courses]);

  // Auto-calculate expiry when course or completion date changes
  useEffect(() => {
    if (isEditMode) return; // Don't auto-calculate in edit mode
    if (selectedCourse?.certification_validity_months && formData.completed_at) {
      const completedDate = new Date(formData.completed_at);
      completedDate.setMonth(completedDate.getMonth() + selectedCourse.certification_validity_months);
      setFormData(prev => ({ ...prev, expiry_date: completedDate.toISOString().split('T')[0] }));
    }
  }, [selectedCourse, formData.completed_at, isEditMode]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchEmployees(), fetchCourses()]);
    setLoading(false);
  };

  const fetchEmployees = async () => {
    const isManager = profile?.app_role &&
      ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager']
        .includes((profile.app_role || '').toLowerCase());

    let query = supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('company_id', profile?.company_id)
      .eq('status', 'active');

    if (!isManager && profile?.id) {
      query = query.eq('id', profile.id);
    }

    const { data } = await query.order('full_name');
    setEmployees(data || []);
  };

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('training_courses')
      .select('*')
      .eq('company_id', profile?.company_id)
      .eq('is_active', true)
      .order('category')
      .order('name');
    setCourses(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.profile_id || !formData.course_id || !formData.completed_at) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      if (isEditMode && existingRecord) {
        // Edit mode - update existing record directly
        const { error: updateError } = await supabase
          .from('training_records')
          .update({
            completed_at: formData.completed_at,
            expiry_date: formData.expiry_date || null,
            score_percentage: formData.score ? parseInt(formData.score) : null,
            certificate_number: formData.certificate_number || null,
            trainer_name: formData.trainer_name || null,
            notes: formData.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRecord.id);

        if (updateError) throw updateError;
        toast.success('Training record updated');
      } else {
        // New record - use complete_training RPC
        const { data, error: rpcError } = await supabase.rpc('complete_training', {
          p_profile_id: formData.profile_id,
          p_course_id: formData.course_id,
          p_completed_at: formData.completed_at,
          p_score: formData.score ? parseInt(formData.score) : null,
          p_certificate_number: formData.certificate_number || null,
          p_expiry_date: formData.expiry_date || null,
          p_recorded_by: profile?.id,
        });

        if (rpcError) throw rpcError;

        // Update notes and trainer if provided
        if (data && (formData.notes || formData.trainer_name)) {
          await supabase
            .from('training_records')
            .update({
              notes: formData.notes || null,
              trainer_name: formData.trainer_name || null,
            })
            .eq('id', data);
        }

        toast.success('Training recorded successfully');
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save training record');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 bg-white dark:bg-[#0B0D13] border border-gray-300 dark:border-white/[0.06] rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  const labelClass = 'block text-sm font-medium text-theme-secondary mb-1.5';

  // Find employee/course display names for locked fields
  const lockedEmployeeName = employeeName || employees.find(e => e.id === formData.profile_id)?.full_name;
  const lockedCourseName = courseName || courses.find(c => c.id === formData.course_id)?.name;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Training Record' : 'Record Training'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee */}
            <div>
              <label className={labelClass}>
                <User className="w-3.5 h-3.5 inline mr-1.5" />
                Employee <span className="text-red-400">*</span>
              </label>
              {employeeId || isEditMode ? (
                <input
                  type="text"
                  value={lockedEmployeeName || ''}
                  disabled
                  className={`${inputClass} opacity-60 cursor-not-allowed`}
                />
              ) : (
                <select
                  value={formData.profile_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, profile_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Select employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Course */}
            <div>
              <label className={labelClass}>
                <GraduationCap className="w-3.5 h-3.5 inline mr-1.5" />
                Training Course <span className="text-red-400">*</span>
              </label>
              {courseId || isEditMode ? (
                <input
                  type="text"
                  value={lockedCourseName || ''}
                  disabled
                  className={`${inputClass} opacity-60 cursor-not-allowed`}
                />
              ) : (
                <select
                  value={formData.course_id}
                  onChange={(e) => {
                    const course = courses.find(c => c.id === e.target.value);
                    setSelectedCourse(course || null);
                    setFormData(prev => ({ ...prev, course_id: e.target.value }));
                  }}
                  className={inputClass}
                >
                  <option value="">Select course...</option>
                  {Object.entries(
                    courses.reduce((acc, c) => {
                      if (!acc[c.category]) acc[c.category] = [];
                      acc[c.category].push(c);
                      return acc;
                    }, {} as Record<string, TrainingCourse[]>)
                  ).map(([category, categoryCourses]) => (
                    <optgroup key={category} label={category}>
                      {categoryCourses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>

            {/* Completion Date */}
            <div>
              <label className={labelClass}>
                <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
                Completion Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={formData.completed_at}
                onChange={(e) => setFormData(prev => ({ ...prev, completed_at: e.target.value }))}
                className={inputClass}
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className={labelClass}>
                Expiry Date
              </label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                className={inputClass}
              />
              {selectedCourse?.certification_validity_months && !isEditMode && (
                <p className="text-xs text-theme-tertiary mt-1">
                  Auto-calculated: {selectedCourse.certification_validity_months} months from completion
                </p>
              )}
            </div>

            {/* Score (if assessment required) */}
            {selectedCourse?.assessment_required && (
              <div>
                <label className={labelClass}>Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) => setFormData(prev => ({ ...prev, score: e.target.value }))}
                  placeholder={`Pass mark: ${selectedCourse.pass_mark_percentage}%`}
                  className={inputClass}
                />
              </div>
            )}

            {/* Certificate Number */}
            {(selectedCourse?.results_in_certification || isEditMode) && (
              <div>
                <label className={labelClass}>
                  <Award className="w-3.5 h-3.5 inline mr-1.5" />
                  Certificate Number
                </label>
                <input
                  type="text"
                  value={formData.certificate_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, certificate_number: e.target.value }))}
                  placeholder="e.g., CERT-12345"
                  className={inputClass}
                />
              </div>
            )}

            {/* Trainer */}
            <div>
              <label className={labelClass}>Trainer / Provider</label>
              <input
                type="text"
                value={formData.trainer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, trainer_name: e.target.value }))}
                placeholder="e.g., John Smith / Highfield"
                className={inputClass}
              />
            </div>

            {/* Notes */}
            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Any additional notes..."
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Actions */}
            <DialogFooter>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-theme-secondary hover:text-theme-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg shadow-sm transition-colors font-medium text-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {isEditMode ? 'Update Record' : 'Record Training'}
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
