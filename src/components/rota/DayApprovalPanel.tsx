'use client';

import { Check, AlertCircle, Clock, DollarSign, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface DayApproval {
  approval_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  hours_allocated: number;
  forecasted_sales: number | null;
  recommended_hours: number | null;
  rejection_reason: string | null;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

interface Shift {
  id: string;
  shift_date: string;
  net_hours: number;
  estimated_cost: number;
  profile_id: string | null;
}

interface DayAnalysis {
  hours: number;
  costPence: number;
  revenuePence: number;
}

interface DayApprovalPanelProps {
  rotaId: string;
  weekDays: Date[];
  forecasts: Record<string, { predicted_revenue?: number; target_hours?: number }>;
  shifts: Shift[];
  dayAnalysisByDate: Map<string, DayAnalysis>;
  canApprove: boolean;
  onApprovalChange?: () => void;
}

type ReviewReason = 'sales_too_high' | 'sales_too_low' | 'hours_too_high' | 'hours_too_low' | 'labour_percent_too_high' | 'other';

const REVIEW_REASON_LABELS: Record<ReviewReason, string> = {
  sales_too_high: 'Sales forecast too high',
  sales_too_low: 'Sales forecast too low',
  hours_too_high: 'Hours allocated too high',
  hours_too_low: 'Hours allocated too low',
  labour_percent_too_high: 'Labour % too high',
  other: 'Other reason'
};

export function DayApprovalPanel({
  rotaId,
  weekDays,
  forecasts,
  shifts,
  dayAnalysisByDate,
  canApprove,
  onApprovalChange
}: DayApprovalPanelProps) {
  const [approvals, setApprovals] = useState<Record<string, DayApproval>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<string | null>(null);
  const [reviewReasons, setReviewReasons] = useState<Record<string, ReviewReason[]>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  // Load approvals
  useEffect(() => {
    if (rotaId) {
      loadApprovals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotaId]);

  const loadApprovals = async () => {
    try {
      const { data, error } = await supabase
        .from('rota_day_approvals')
        .select('*')
        .eq('rota_id', rotaId)
        .in('approval_date', weekDays.map(d => d.toISOString().split('T')[0]));

      if (error) throw error;

      const approvalsMap: Record<string, DayApproval> = {};
      (data || []).forEach((approval: any) => {
        approvalsMap[approval.approval_date] = approval;
      });
      setApprovals(approvalsMap);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (date: string) => {
    if (!canApprove) return;
    setProcessing(date);
    try {
      const { error } = await supabase.rpc('approve_rota_day', {
        p_rota_id: rotaId,
        p_approval_date: date,
        p_notes: null
      });
      if (error) throw error;
      await loadApprovals();
      onApprovalChange?.();
    } catch (err: any) {
      console.error('Failed to approve day:', err);
      alert(err?.message || 'Failed to approve day');
    } finally {
      setProcessing(null);
    }
  };

  const handleNeedsReview = async (date: string) => {
    if (!canApprove) return;
    const reasons = reviewReasons[date] || [];
    if (reasons.length === 0) {
      alert('Please select at least one reason for review');
      return;
    }
    
    setProcessing(date);
    try {
      // Build notes from reasons
      const reasonText = reasons.map(r => REVIEW_REASON_LABELS[r]).join(', ');
      const notes = reviewNotes[date] 
        ? `${reasonText}. ${reviewNotes[date]}`
        : reasonText;

      const { error } = await supabase.rpc('mark_rota_day_needs_review', {
        p_rota_id: rotaId,
        p_approval_date: date,
        p_notes: notes
      });
      if (error) throw error;
      await loadApprovals();
      setShowReviewModal(null);
      setReviewReasons({ ...reviewReasons, [date]: [] });
      setReviewNotes({ ...reviewNotes, [date]: '' });
      onApprovalChange?.();
    } catch (err: any) {
      console.error('Failed to mark for review:', err);
      alert(err?.message || 'Failed to mark for review');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'needs_review':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-neutral-700/50 text-neutral-400 border-neutral-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check className="w-4 h-4" />;
      case 'needs_review':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const calculateHoursStatus = (hours: number, forecast?: { target_hours?: number; predicted_revenue?: number }) => {
    if (!forecast) return null;
    const target = forecast.target_hours || 0;
    if (target === 0) return null;
    const diff = hours - target;
    if (Math.abs(diff) < 1) return 'good';
    if (diff > 0) return 'over';
    return 'under';
  };

  const calculateSalesStatus = (sales: number | null, forecast?: { predicted_revenue?: number }) => {
    if (!sales || !forecast?.predicted_revenue) return null;
    const diff = sales - forecast.predicted_revenue;
    const percentDiff = (diff / forecast.predicted_revenue) * 100;
    if (Math.abs(percentDiff) < 5) return 'good';
    if (percentDiff > 0) return 'high';
    return 'low';
  };

  // Use the same day analysis data from the rota
  const getDayAnalysis = (dateStr: string): DayAnalysis => {
    return dayAnalysisByDate.get(dateStr) || { hours: 0, costPence: 0, revenuePence: 0 };
  };

  const getDayLabourPercent = (dateStr: string): number | null => {
    const analysis = getDayAnalysis(dateStr);
    if (analysis.revenuePence === 0 || analysis.costPence === 0) return null;
    return (analysis.costPence / analysis.revenuePence) * 100;
  };

  const toggleReviewReason = (date: string, reason: ReviewReason) => {
    const current = reviewReasons[date] || [];
    if (current.includes(reason)) {
      setReviewReasons({ ...reviewReasons, [date]: current.filter(r => r !== reason) });
    } else {
      setReviewReasons({ ...reviewReasons, [date]: [...current, reason] });
    }
  };

  // Parse existing review notes to extract reasons
  const parseReviewNotes = (notes: string | null): { reasons: ReviewReason[]; otherNotes: string } => {
    if (!notes) return { reasons: [], otherNotes: '' };
    
    const reasons: ReviewReason[] = [];
    let otherNotes = notes;

    // Check for each reason label
    Object.entries(REVIEW_REASON_LABELS).forEach(([key, label]) => {
      if (notes.includes(label)) {
        reasons.push(key as ReviewReason);
        // Remove the label from notes
        otherNotes = otherNotes.replace(label, '').replace(/^,\s*|,\s*$/g, '').trim();
      }
    });

    // Clean up otherNotes - remove leading/trailing commas and periods
    otherNotes = otherNotes.replace(/^[.,\s]+|[.,\s]+$/g, '').trim();

    return { reasons, otherNotes };
  };

  const openReviewModal = (date: string) => {
    const approval = approvals[date];
    if (approval?.status === 'needs_review' && approval.notes) {
      // Parse existing notes
      const { reasons, otherNotes } = parseReviewNotes(approval.notes);
      setReviewReasons({ ...reviewReasons, [date]: reasons });
      setReviewNotes({ ...reviewNotes, [date]: otherNotes });
    } else {
      // New review - clear any existing data
      setReviewReasons({ ...reviewReasons, [date]: [] });
      setReviewNotes({ ...reviewNotes, [date]: '' });
    }
    setShowReviewModal(date);
  };

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-neutral-900/50 rounded-xl border border-neutral-800">
        <div className="text-center text-neutral-400">Loading approvals...</div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-neutral-900/50 rounded-xl border border-neutral-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Check className="w-5 h-5 text-[#EC4899]" />
          Day-by-Day Approval
        </h3>
        {!canApprove && (
          <span className="text-xs text-neutral-400">Only senior managers can approve days</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const dateStr = day.toISOString().split('T')[0];
          const approval = approvals[dateStr];
          const forecast = forecasts[dateStr];
          // Use the same day analysis data from the rota
          const dayAnalysis = getDayAnalysis(dateStr);
          const hours = dayAnalysis.hours;
          const sales = approval?.forecasted_sales || forecast?.predicted_revenue || dayAnalysis.revenuePence || null;
          const labourPercent = getDayLabourPercent(dateStr);
          const hoursStatus = calculateHoursStatus(hours, forecast);
          const salesStatus = calculateSalesStatus(sales, forecast);
          const status = approval?.status || 'pending';

          return (
            <div
              key={dateStr}
              className={`p-3 rounded-lg border ${getStatusColor(status)}`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold">
                    {day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {getStatusIcon(status)}
                    <span className="text-xs capitalize">{status.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3 h-3" />
                  <span>{hours.toFixed(1)}h</span>
                  {hoursStatus && (
                    <span className={`ml-auto ${
                      hoursStatus === 'good' ? 'text-green-400' :
                      hoursStatus === 'over' ? 'text-blue-400' :
                      'text-amber-400'
                    }`}>
                      {hoursStatus === 'over' && <TrendingUp className="w-3 h-3 inline" />}
                      {hoursStatus === 'under' && <TrendingDown className="w-3 h-3 inline" />}
                    </span>
                  )}
                </div>
                {sales && (
                  <div className="flex items-center gap-2 text-xs">
                    <DollarSign className="w-3 h-3" />
                    <span>£{(sales / 100).toFixed(0)}</span>
                    {salesStatus && (
                      <span className={`ml-auto ${
                        salesStatus === 'good' ? 'text-green-400' :
                        salesStatus === 'high' ? 'text-blue-400' :
                        'text-amber-400'
                      }`}>
                        {salesStatus === 'high' && <TrendingUp className="w-3 h-3 inline" />}
                        {salesStatus === 'low' && <TrendingDown className="w-3 h-3 inline" />}
                      </span>
                    )}
                  </div>
                )}
                {labourPercent !== null && (
                  <div className="flex items-center gap-2 text-xs">
                    <Percent className="w-3 h-3" />
                    <span className={labourPercent > 35 ? 'text-red-400' : labourPercent > 30 ? 'text-amber-400' : 'text-green-400'}>
                      {labourPercent.toFixed(1)}%
                    </span>
                    <span className="text-neutral-500 text-[10px]">labour</span>
                  </div>
                )}
              </div>

              {/* Review Notes */}
              {approval?.notes && approval.status === 'needs_review' && (
                <div className="mb-2 p-2 bg-amber-500/10 rounded text-xs text-amber-400">
                  {approval.notes}
                </div>
              )}

              {/* Actions */}
              {canApprove && (
                <div className="flex flex-col gap-2">
                  {status !== 'approved' && (
                    <button
                      onClick={() => handleApprove(dateStr)}
                      disabled={processing === dateStr}
                      className="px-2 py-1.5 text-xs bg-transparent border border-green-500/50 text-green-400 rounded hover:bg-green-500/10 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Approve
                    </button>
                  )}
                  <button
                    onClick={() => openReviewModal(dateStr)}
                    disabled={processing === dateStr}
                    className={`px-2 py-1.5 text-xs bg-transparent border border-amber-500/50 text-amber-400 rounded hover:bg-amber-500/10 disabled:opacity-50 transition-colors flex items-center justify-center gap-1 ${
                      status === 'needs_review' ? 'opacity-75' : ''
                    }`}
                    title={status === 'needs_review' ? 'Edit review' : 'Mark for review'}
                  >
                    <AlertCircle className="w-3 h-3" />
                    {status === 'needs_review' ? 'Edit' : 'Review'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {approvals[showReviewModal]?.status === 'needs_review' ? 'Edit Review' : 'Mark Day for Review'}
            </h3>
            <p className="text-sm text-neutral-400 mb-4">
              Please select why this day needs review:
            </p>
            
            <div className="space-y-2 mb-4">
              {(Object.keys(REVIEW_REASON_LABELS) as ReviewReason[]).map((reason) => (
                <label
                  key={reason}
                  className="flex items-center gap-2 p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(reviewReasons[showReviewModal] || []).includes(reason)}
                    onChange={() => toggleReviewReason(showReviewModal, reason)}
                    className="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-[#EC4899] focus:ring-[#EC4899] focus:ring-offset-0"
                  />
                  <span className="text-sm text-white">{REVIEW_REASON_LABELS[reason]}</span>
                </label>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm text-neutral-400 mb-2">Additional notes (optional):</label>
              <textarea
                value={reviewNotes[showReviewModal] || ''}
                onChange={(e) => setReviewNotes({ ...reviewNotes, [showReviewModal]: e.target.value })}
                className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
                placeholder="Add any additional context..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(null);
                  setReviewReasons({ ...reviewReasons, [showReviewModal]: [] });
                  setReviewNotes({ ...reviewNotes, [showReviewModal]: '' });
                }}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleNeedsReview(showReviewModal)}
                disabled={(reviewReasons[showReviewModal] || []).length === 0 || processing === showReviewModal}
                className="px-4 py-2 bg-transparent border border-amber-500 text-amber-400 rounded-lg hover:bg-amber-500/10 disabled:opacity-50"
              >
                {processing === showReviewModal ? 'Saving...' : 'Mark for Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
