'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { Check, X, Loader2, Calendar, Clock, User, AlertCircle } from '@/components/ui/icons';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

// ============================================
// TYPES
// ============================================

interface TimeOffRequest {
  id: string;
  date: string;
  override_type: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  request_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TimeOffRequestsPage() {
  const { currentUser, company } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);

  // Check if user is a manager
  const isManager = currentUser?.app_role && 
    ['Admin', 'Owner', 'Manager', 'General Manager', 'Super Admin'].includes(currentUser.app_role);

  // ============================================
  // DATA LOADING
  // ============================================

  const loadRequests = useCallback(async () => {
    if (!company?.id || !isManager) return;

    setLoading(true);
    try {
      let query = supabase
        .from('staff_availability_overrides')
        .select(`
          id,
          date,
          override_type,
          start_time,
          end_time,
          reason,
          request_status,
          created_at,
          profiles:profile_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('company_id', company.id)
        .in('override_type', ['time_off_request', 'leave'])
        .order('date', { ascending: true });

      if (filter === 'pending') {
        query = query.eq('request_status', 'pending');
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load time-off requests');
    } finally {
      setLoading(false);
    }
  }, [company?.id, filter, isManager]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // ============================================
  // REQUEST ACTIONS
  // ============================================

  const handleApprove = async (requestId: string) => {
    if (!currentUser?.id) return;

    setProcessing(requestId);
    try {
      const { error } = await supabase
        .from('staff_availability_overrides')
        .update({
          request_status: 'approved',
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
      toast.success('Request approved');
      await loadRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string, notes?: string) => {
    if (!currentUser?.id) return;

    setProcessing(requestId);
    try {
      const { error } = await supabase
        .from('staff_availability_overrides')
        .update({
          request_status: 'rejected',
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        })
        .eq('id', requestId);

      if (error) throw error;
      toast.success('Request rejected');
      await loadRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (!isManager) {
    return (
      <div className="p-6">
        <Card className="p-8 bg-white/[0.03] border border-white/[0.06] text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-theme-primary mb-2">Manager Access Required</h2>
          <p className="text-theme-tertiary">
            You need manager permissions to view and approve time-off requests.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-module-fg animate-spin" />
      </div>
    );
  }

  const pendingCount = requests.filter(r => r.request_status === 'pending').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Time Off Requests</h1>
          <p className="text-theme-tertiary mt-1">
            Review and approve staff availability requests
          </p>
        </div>

        <Link href="/dashboard/people/my-availability">
          <Button
            variant="ghost"
            className="text-theme-tertiary hover:text-white"
          >
            Back to My Availability
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg p-1 w-fit">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            filter === 'pending'
              ? 'bg-module-fg text-white'
              : 'text-theme-tertiary hover:text-white'
          }`}
        >
          Pending
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-module-fg text-white'
              : 'text-theme-tertiary hover:text-white'
          }`}
        >
          All Requests
        </button>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card className="p-12 bg-white/[0.03] border border-white/[0.06] text-center">
          <Calendar className="w-16 h-16 text-theme-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-theme-primary mb-2">
            {filter === 'pending' ? 'No Pending Requests' : 'No Requests'}
          </h3>
          <p className="text-theme-tertiary">
            {filter === 'pending'
              ? 'All caught up! There are no pending time-off requests.'
              : 'No time-off requests have been submitted yet.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onApprove={handleApprove}
              onReject={handleReject}
              processing={processing === request.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// REQUEST CARD COMPONENT
// ============================================

interface RequestCardProps {
  request: TimeOffRequest;
  onApprove: (id: string) => void;
  onReject: (id: string, notes?: string) => void;
  processing: boolean;
}

function RequestCard({ request, onApprove, onReject, processing }: RequestCardProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const isPending = request.request_status === 'pending';
  const isApproved = request.request_status === 'approved';
  const isRejected = request.request_status === 'rejected';

  const statusColors = {
    pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    approved: 'text-green-400 bg-green-400/10 border-green-400/20',
    rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
    cancelled: 'text-theme-tertiary bg-neutral-400/10 border-neutral-400/20',
  };

  const handleRejectWithNotes = () => {
    onReject(request.id, rejectNotes);
    setShowRejectModal(false);
    setRejectNotes('');
  };

  return (
    <>
      <Card className="p-4 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
        <div className="flex items-start justify-between gap-4">
          {/* Employee Info */}
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center flex-shrink-0">
              {request.profiles?.avatar_url ? (
                <img
                  src={request.profiles.avatar_url}
                  alt={request.profiles.full_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-theme-tertiary" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-theme-primary">
                  {request.profiles?.full_name || 'Unknown Employee'}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    statusColors[request.request_status]
                  }`}
                >
                  {request.request_status.charAt(0).toUpperCase() + request.request_status.slice(1)}
                </span>
              </div>

              {/* Request Details */}
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-theme-tertiary">
                  <Calendar className="w-4 h-4 text-theme-tertiary" />
                  <span>{format(parseISO(request.date), 'EEEE, MMMM d, yyyy')}</span>
                </div>

                {request.start_time && request.end_time && (
                  <div className="flex items-center gap-2 text-theme-tertiary">
                    <Clock className="w-4 h-4 text-theme-tertiary" />
                    <span>
                      {request.start_time} - {request.end_time}
                    </span>
                  </div>
                )}

                {request.reason && (
                  <div className="mt-2 text-theme-tertiary bg-neutral-900/50 rounded-md p-2 text-xs">
                    <strong className="text-theme-tertiary">Reason:</strong> {request.reason}
                  </div>
                )}

                <div className="text-xs text-theme-tertiary mt-2">
                  Requested {format(parseISO(request.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isPending && (
            <div className="flex gap-2 flex-shrink-0">
              <Button
                onClick={() => onApprove(request.id)}
                disabled={processing}
                size="sm"
                className="bg-green-600 text-white hover:bg-green-700 border-0"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowRejectModal(true)}
                disabled={processing}
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700 border-0"
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[rgb(var(--surface-elevated))] border border-white/[0.06] rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-theme-primary">Reject Request</h2>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-theme-tertiary hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-theme-tertiary text-sm">
                Are you sure you want to reject this time-off request from{' '}
                <strong>{request.profiles?.full_name}</strong> for{' '}
                <strong>{format(parseISO(request.date), 'MMMM d, yyyy')}</strong>?
              </p>

              <div>
                <label className="text-sm text-theme-tertiary block mb-2">
                  Reason for rejection (optional)
                </label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  rows={3}
                  placeholder="Provide a reason for the rejection..."
                  className="w-full bg-neutral-900 border border-theme rounded-md px-3 py-2 text-theme-primary resize-none focus:outline-none focus:border-module-fg"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  variant="ghost"
                  className="flex-1 text-theme-tertiary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRejectWithNotes}
                  className="flex-1 bg-red-600 text-white hover:bg-red-700 border-0"
                >
                  Reject Request
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

