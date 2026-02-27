'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, AlertTriangle, Info, Loader2, Check } from '@/components/ui/icons';
import type { LeaveType, LeaveBalanceView } from '@/types/teamly';

export default function LeaveRequestPage() {
  const { profile, companyId } = useAppContext();
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedType, setSelectedType] = useState<LeaveType | null>(null);
  const [balance, setBalance] = useState<LeaveBalanceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [calculatedDays, setCalculatedDays] = useState<number>(0);
  
  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    start_half_day: false,
    end_half_day: false,
    reason: '',
  });

  useEffect(() => {
    if (companyId) {
      fetchLeaveTypes();
    }
  }, [companyId]);

  useEffect(() => {
    if (formData.leave_type_id) {
      const type = leaveTypes.find(t => t.id === formData.leave_type_id);
      setSelectedType(type || null);
      if (type) fetchBalance(type.id);
    }
  }, [formData.leave_type_id, leaveTypes]);

  useEffect(() => {
    if (formData.start_date && formData.end_date && companyId) {
      calculateDays();
    }
  }, [formData.start_date, formData.end_date, formData.start_half_day, formData.end_half_day, companyId]);

  const fetchLeaveTypes = async () => {
    const { data } = await supabase
      .from('leave_types')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order');
    
    setLeaveTypes(data || []);
    setLoading(false);
  };

  const fetchBalance = async (leaveTypeId: string) => {
    const { data, error } = await supabase
      .from('leave_balances_view')
      .select('*')
      .eq('profile_id', profile?.id)
      .eq('leave_type_id', leaveTypeId)
      .eq('year', new Date().getFullYear())
      .maybeSingle(); // Use maybeSingle() instead of single() to handle missing balance records
    
    if (error && error.code !== 'PGRST116') {
      // Log unexpected errors (PGRST116 is "no rows" which is expected)
      console.error('Error fetching leave balance:', error);
    }
    
    setBalance(data || null);
  };

  const calculateDays = async () => {
    if (!formData.start_date || !formData.end_date || !companyId) return;

    const { data, error } = await supabase.rpc('calculate_working_days', {
      p_start_date: formData.start_date,
      p_end_date: formData.end_date,
      p_company_id: companyId,
      p_start_half_day: formData.start_half_day,
      p_end_half_day: formData.end_half_day,
    });
    
    if (error) {
      console.error('Error calculating days:', error);
      setCalculatedDays(0);
    } else {
      setCalculatedDays(data || 0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.leave_type_id) return 'Please select a leave type';
    if (!formData.start_date) return 'Please select a start date';
    if (!formData.end_date) return 'Please select an end date';
    if (new Date(formData.end_date) < new Date(formData.start_date)) return 'End date must be after start date';
    if (calculatedDays <= 0) return 'Selected dates contain no working days';
    
    if (selectedType?.min_notice_days) {
      const startDate = new Date(formData.start_date);
      const today = new Date();
      const diffDays = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < selectedType.min_notice_days) {
        return `${selectedType.name} requires ${selectedType.min_notice_days} days notice`;
      }
    }
    
    if (selectedType?.max_consecutive_days && calculatedDays > selectedType.max_consecutive_days) {
      return `${selectedType.name} is limited to ${selectedType.max_consecutive_days} consecutive days`;
    }
    
    // Only check balance if the leave type deducts from allowance
    // Allow negative balances by default (users can request more than they have)
    // Only prevent negative if explicitly disallowed by leave type setting
    if (selectedType?.deducts_from_allowance && balance && !selectedType?.allow_negative_balance && calculatedDays > balance.remaining_days) {
      return `Insufficient balance. You have ${balance.remaining_days} days remaining`;
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setSubmitting(true);
    
    try {
      const { error: insertError } = await supabase
        .from('leave_requests')
        .insert({
          company_id: companyId,
          profile_id: profile?.id,
          leave_type_id: formData.leave_type_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          start_half_day: formData.start_half_day,
          end_half_day: formData.end_half_day,
          total_days: calculatedDays,
          reason: formData.reason || null,
          status: selectedType?.requires_approval ? 'pending' : 'approved',
        });
      
      if (insertError) throw insertError;
      
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/people/leave'), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-500" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg p-8 text-center shadow-sm dark:shadow-none">
          <Check className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-green-800 dark:text-white mb-2">Leave Request Submitted</h2>
          <p className="text-green-700 dark:text-theme-secondary">
            {selectedType?.requires_approval 
              ? 'Your request has been sent for approval.'
              : 'Your leave has been approved automatically.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/people/leave" className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-theme-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Request Leave</h1>
          <p className="text-theme-secondary">Submit a new leave request</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex items-center gap-3 shadow-sm dark:shadow-none">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
 <div className="bg-theme-surface ] border border-theme rounded-lg p-6 space-y-6 shadow-sm dark:shadow-none">
          
          {/* Leave Type Selection */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              Leave Type <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {leaveTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, leave_type_id: type.id }))}
                  className={`p-3 rounded-lg border text-left transition-all bg-theme-surface ${
                    formData.leave_type_id === type.id
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/20 shadow-sm dark:shadow-none'
                      : 'border-theme hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-theme-hover'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                    <span className="text-theme-primary font-medium text-sm">{type.name}</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    {type.is_paid && (
                      <span className={`${formData.leave_type_id === type.id ? 'text-blue-700 dark:text-blue-300' : 'text-green-600 dark:text-green-400'}`}>
                        Paid
                      </span>
                    )}
                    {!type.requires_approval && (
                      <span className={`${formData.leave_type_id === type.id ? 'text-blue-700 dark:text-blue-300' : 'text-blue-600 dark:text-blue-400'}`}>
                        Auto-approved
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Balance Info */}
          {selectedType && selectedType.deducts_from_allowance && balance && (
            <div className="p-4 bg-gray-50 dark:bg-white/[0.03] rounded-lg border border-theme">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-theme-secondary">Your {selectedType.name} Balance</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-theme-primary">{balance.remaining_days}</p>
                  <p className="text-xs text-theme-tertiary">Remaining</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-theme-secondary">{balance.taken_days}</p>
                  <p className="text-xs text-theme-tertiary">Taken</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{balance.pending_days}</p>
                  <p className="text-xs text-theme-tertiary">Pending</p>
                </div>
              </div>
            </div>
          )}

          {/* Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                Start Date <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-white dark:bg-white/[0.06] border border-gray-300 dark:border-blue-500/50 rounded-lg text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {selectedType?.allow_half_days && (
                <label className="flex items-center gap-2 mt-2 text-sm text-theme-secondary">
                  <input
                    type="checkbox"
                    name="start_half_day"
                    checked={formData.start_half_day}
                    onChange={handleChange}
                    className="rounded border-gray-300 dark:border-blue-500/50 bg-white dark:bg-white/[0.06] text-blue-600 dark:text-blue-400 focus:ring-blue-500 focus:ring-2"
                  />
                  Afternoon only (PM)
                </label>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                End Date <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                min={formData.start_date || new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-white dark:bg-white/[0.06] border border-gray-300 dark:border-blue-500/50 rounded-lg text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {selectedType?.allow_half_days && formData.start_date !== formData.end_date && (
                <label className="flex items-center gap-2 mt-2 text-sm text-theme-secondary">
                  <input
                    type="checkbox"
                    name="end_half_day"
                    checked={formData.end_half_day}
                    onChange={handleChange}
                    className="rounded border-gray-300 dark:border-blue-500/50 bg-white dark:bg-white/[0.06] text-blue-600 dark:text-blue-400 focus:ring-blue-500 focus:ring-2"
                  />
                  Morning only (AM)
                </label>
              )}
            </div>
          </div>

          {/* Calculated Days */}
          {calculatedDays > 0 && (
            <div className="p-4 bg-blue-500/10 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-blue-700 dark:text-theme-secondary">Working days requested:</span>
                <span className="text-xl font-bold text-blue-900 dark:text-white">{calculatedDays} day{calculatedDays !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1.5">Reason (optional)</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={3}
              placeholder="Add any notes for your manager..."
              className="w-full px-3 py-2 bg-white dark:bg-white/[0.06] border border-gray-300 dark:border-blue-500/50 rounded-lg text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-theme">
            <Link 
              href="/dashboard/people/leave" 
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] border border-theme text-theme-secondary hover:text-theme-primary/60 rounded-lg transition-all duration-200 ease-in-out font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !formData.leave_type_id || !formData.start_date || !formData.end_date}
              className="flex items-center gap-2 px-6 py-2.5 bg-module-fg hover:bg-module-fg/90 text-white rounded-lg border-0 shadow-[0_0_12px_rgba(37,99,235,0.4)] dark:shadow-[0_0_12px_rgba(59,130,246,0.5)] hover:shadow-module-glow dark:hover:shadow-module-glow transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

