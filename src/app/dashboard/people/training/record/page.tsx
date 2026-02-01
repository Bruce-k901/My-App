'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, GraduationCap, Calendar, Award, Loader2, Check } from 'lucide-react';
import type { TrainingCourse } from '@/types/teamly';

interface Employee {
  id: string;
  full_name: string;
  email: string;
}

export default function RecordTrainingPage() {
  const { profile } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedEmployee = searchParams.get('employee');
  const preSelectedCourse = searchParams.get('course');
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    profile_id: preSelectedEmployee || '',
    course_id: preSelectedCourse || '',
    completed_at: new Date().toISOString().split('T')[0],
    score: '',
    certificate_number: '',
    expiry_date: '',
    trainer_name: '',
    notes: '',
  });

  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchData();
    }
  }, [profile?.company_id, profile?.id]);

  // Auto-select current user if not a manager (staff members can only record for themselves)
  useEffect(() => {
    const isManager = profile?.app_role && ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager'].includes((profile.app_role || '').toLowerCase());
    if (!isManager && profile?.id && employees.length === 1 && employees[0]?.id === profile.id) {
      setFormData(prev => ({ ...prev, profile_id: profile.id }));
    }
  }, [profile?.id, profile?.app_role, employees]);

  useEffect(() => {
    if (formData.course_id) {
      const course = courses.find(c => c.id === formData.course_id);
      setSelectedCourse(course || null);
      
      // Auto-calculate expiry
      if (course?.certification_validity_months && formData.completed_at) {
        const completedDate = new Date(formData.completed_at);
        completedDate.setMonth(completedDate.getMonth() + course.certification_validity_months);
        setFormData(prev => ({ ...prev, expiry_date: completedDate.toISOString().split('T')[0] }));
      }
    }
  }, [formData.course_id, formData.completed_at, courses]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchEmployees(), fetchCourses()]);
    setLoading(false);
  };

  const fetchEmployees = async () => {
    // Check if user is a manager/admin/owner - only they can see all employees
    const isManager = profile?.app_role && ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager'].includes((profile.app_role || '').toLowerCase());
    
    let query = supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('company_id', profile?.company_id)
      .eq('status', 'active');
    
    // Staff members can only see themselves
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
    setError(null);
    
    if (!formData.profile_id || !formData.course_id || !formData.completed_at) {
      setError('Please fill in all required fields');
      return;
    }
    
    setSubmitting(true);
    
    try {
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
      if (formData.notes || formData.trainer_name) {
        await supabase
          .from('training_records')
          .update({
            notes: formData.notes || null,
            trainer_name: formData.trainer_name || null,
          })
          .eq('id', data);
      }
      
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/people/training'), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to record training');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-100 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg p-8 text-center">
          <Check className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Training Recorded</h2>
          <p className="text-gray-600 dark:text-white/70">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/people/training" className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-white/60" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Record Training</h1>
          <p className="text-gray-600 dark:text-white/70">Log completed training or certification</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-6 space-y-6 shadow-sm dark:shadow-none">
          
          {/* Employee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Employee <span className="text-red-400">*</span>
            </label>
            {(() => {
              const isManager = profile?.app_role && ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager'].includes((profile.app_role || '').toLowerCase());
              
              // If staff member and only one employee (themselves), show as disabled input
              if (!isManager && employees.length === 1 && employees[0]?.id === profile?.id) {
                return (
                  <input
                    type="text"
                    value={employees[0]?.full_name || ''}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-[#0B0D13] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-500 dark:text-white/60 cursor-not-allowed"
                  />
                );
              }
              
              // Otherwise show dropdown (managers can select any employee)
              return (
                <select
                  value={formData.profile_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, profile_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              );
            })()}
          </div>

          {/* Course */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
              <GraduationCap className="w-4 h-4 inline mr-2" />
              Training Course <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.course_id}
              onChange={(e) => setFormData(prev => ({ ...prev, course_id: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-[#0B0D13] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Completion Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Completion Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={formData.completed_at}
              onChange={(e) => setFormData(prev => ({ ...prev, completed_at: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-[#0B0D13] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Score (if assessment required) */}
          {selectedCourse?.assessment_required && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                Score (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.score}
                onChange={(e) => setFormData(prev => ({ ...prev, score: e.target.value }))}
                placeholder={`Pass mark: ${selectedCourse.pass_mark_percentage}%`}
                className="w-full px-3 py-2 bg-white dark:bg-[#0B0D13] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Certificate Number (if results in cert) */}
          {selectedCourse?.results_in_certification && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                  <Award className="w-4 h-4 inline mr-2" />
                  Certificate Number
                </label>
                <input
                  type="text"
                  value={formData.certificate_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, certificate_number: e.target.value }))}
                  placeholder="e.g., CERT-12345"
                  className="w-full px-3 py-2 bg-white dark:bg-[#0B0D13] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0B0D13] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {selectedCourse.certification_validity_months && (
                  <p className="text-xs text-gray-500 dark:text-white/50 mt-1">
                    Auto-calculated: {selectedCourse.certification_validity_months} months from completion
                  </p>
                )}
              </div>
            </>
          )}

          {/* Trainer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
              Trainer / Provider
            </label>
            <input
              type="text"
              value={formData.trainer_name}
              onChange={(e) => setFormData(prev => ({ ...prev, trainer_name: e.target.value }))}
              placeholder="e.g., John Smith / Highfield"
              className="w-full px-3 py-2 bg-white dark:bg-[#0B0D13] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Any additional notes..."
              className="w-full px-3 py-2 bg-white dark:bg-[#0B0D13] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/60 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
            <Link href="/dashboard/people/training" className="px-4 py-2 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] border border-gray-300 dark:border-white/[0.1] text-gray-600 hover:text-gray-900 dark:text-white/60 dark:hover:text-white rounded-lg transition-all duration-200 ease-in-out disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Record Training
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

