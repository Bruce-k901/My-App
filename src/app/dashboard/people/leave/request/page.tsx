'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, AlertTriangle, Info, Loader2, Check } from 'lucide-react';
import type { LeaveType, LeaveBalanceView } from '@/types/teamly';

export default function LeaveRequestPage() {
  const { profile } = useAppContext();
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
    if (profile?.company_id) {
      fetchLeaveTypes();
    }
  }, [profile?.company_id]);

  useEffect(() => {
    if (formData.leave_type_id) {
      const type = leaveTypes.find(t => t.id === formData.leave_type_id);
      setSelectedType(type || null);
      if (type) fetchBalance(type.id);
    }
  }, [formData.leave_type_id, leaveTypes]);

  useEffect(() => {
    if (formData.start_date && formData.end_date && profile?.company_id) {
      calculateDays();
    }
  }, [formData.start_date, formData.end_date, formData.start_half_day, formData.end_half_day, profile?.company_id]);

  const fetchLeaveTypes = async () => {
    const { data } = await supabase
      .from('leave_types')
      .select('*')
      .eq('company_id', profile?.company_id)
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
    if (!formData.start_date || !formData.end_date || !profile?.company_id) return;
    
    const { data, error } = await supabase.rpc('calculate_working_days', {
      p_start_date: formData.start_date,
      p_end_date: formData.end_date,
      p_company_id: profile.company_id,
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
          company_id: profile?.company_id,
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EC4899]" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-8 text-center">
          <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Leave Request Submitted</h2>
          <p className="text-neutral-400">
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
        <Link href="/dashboard/people/leave" className="p-2 hover:bg-white/[0.05] rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-neutral-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Request Leave</h1>
          <p className="text-neutral-400">Submit a new leave request</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 space-y-6">
          
          {/* Leave Type Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Leave Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {leaveTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, leave_type_id: type.id }))}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    formData.leave_type_id === type.id
                      ? 'border-[#EC4899] bg-[#EC4899]/10'
                      : 'border-white/[0.06] hover:border-white/[0.1]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                    <span className="text-white font-medium text-sm">{type.name}</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    {type.is_paid && <span className="text-green-400">Paid</span>}
                    {!type.requires_approval && <span className="text-blue-400">Auto-approved</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Balance Info */}
          {selectedType && selectedType.deducts_from_allowance && balance && (
            <div className="p-4 bg-white/[0.05] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-neutral-300">Your {selectedType.name} Balance</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{balance.remaining_days}</p>
                  <p className="text-xs text-neutral-400">Remaining</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-400">{balance.taken_days}</p>
                  <p className="text-xs text-neutral-400">Taken</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">{balance.pending_days}</p>
                  <p className="text-xs text-neutral-400">Pending</p>
                </div>
              </div>
            </div>
          )}

          {/* Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Start Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-[#0B0D13] border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-[#EC4899]"
              />
              {selectedType?.allow_half_days && (
                <label className="flex items-center gap-2 mt-2 text-sm text-neutral-400">
                  <input
                    type="checkbox"
                    name="start_half_day"
                    checked={formData.start_half_day}
                    onChange={handleChange}
                    className="rounded border-white/[0.06] bg-[#0B0D13] text-[#EC4899] focus:ring-[#EC4899]"
                  />
                  Afternoon only (PM)
                </label>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                End Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                min={formData.start_date || new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-[#0B0D13] border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-[#EC4899]"
              />
              {selectedType?.allow_half_days && formData.start_date !== formData.end_date && (
                <label className="flex items-center gap-2 mt-2 text-sm text-neutral-400">
                  <input
                    type="checkbox"
                    name="end_half_day"
                    checked={formData.end_half_day}
                    onChange={handleChange}
                    className="rounded border-white/[0.06] bg-[#0B0D13] text-[#EC4899] focus:ring-[#EC4899]"
                  />
                  Morning only (AM)
                </label>
              )}
            </div>
          </div>

          {/* Calculated Days */}
          {calculatedDays > 0 && (
            <div className="p-4 bg-[#EC4899]/10 border border-[#EC4899]/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">Working days requested:</span>
                <span className="text-xl font-bold text-white">{calculatedDays} day{calculatedDays !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Reason (optional)</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={3}
              placeholder="Add any notes for your manager..."
              className="w-full px-3 py-2 bg-[#0B0D13] border border-white/[0.06] rounded-lg text-white placeholder-neutral-400 resize-none focus:outline-none focus:border-[#EC4899]"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <Link href="/dashboard/people/leave" className="px-4 py-2 text-neutral-400 hover:text-white transition-colors">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !formData.leave_type_id || !formData.start_date || !formData.end_date}
              className="flex items-center gap-2 px-6 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] rounded-lg hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
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

