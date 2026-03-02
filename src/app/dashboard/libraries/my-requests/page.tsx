"use client";

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, Package, Eye, Trash2 } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useRouter } from 'next/navigation';

export default function MyLibraryRequestsPage() {
  const { companyId, userId } = useAppContext();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!companyId || !userId) {
      setLoading(false);
      return;
    }
    loadRequests();
  }, [companyId, userId]);

  const loadRequests = async () => {
    if (!companyId || !userId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('library_requests')
        .select('*')
        .eq('company_id', companyId)
        .eq('requested_by', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error loading library requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this library request?')) return;
    
    try {
      const { error } = await supabase
        .from('library_requests')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('requested_by', userId);
      
      if (error) throw error;
      loadRequests();
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs flex items-center gap-1">
            <Clock size={12} />
            Pending Review
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs flex items-center gap-1">
            <CheckCircle2 size={12} />
            Approved
          </span>
        );
      case 'deployed':
        return (
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs flex items-center gap-1">
            <CheckCircle2 size={12} />
            Deployed
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs flex items-center gap-1">
            <XCircle size={12} />
            Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-1 bg-neutral-700 text-theme-tertiary rounded-full text-xs">
            Cancelled
          </span>
        );
      default:
        return <span className="px-2 py-1 bg-neutral-700 text-theme-tertiary rounded-full text-xs">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-theme-tertiary text-center py-8">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-module-fg rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-theme-primary">My Library Requests</h1>
              <p className="text-sm text-theme-tertiary">View and track your custom library requests</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard/libraries/create')}
          className="px-4 py-2 border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-module-glow transition rounded-lg flex items-center gap-2"
        >
          <Package size={16} />
          New Request
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-12 text-center border border-theme">
          <Package className="mx-auto mb-4 text-theme-secondary" size={48} />
          <p className="text-theme-tertiary mb-4">No library requests yet</p>
          <button
            onClick={() => router.push('/dashboard/libraries/create')}
            className="px-4 py-2 border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-module-glow transition rounded-lg"
          >
            Create Your First Request
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-neutral-800/50 rounded-xl border border-theme p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-theme-primary">{request.library_name}</h3>
                    {getStatusBadge(request.status)}
                  </div>
                  {request.description && (
                    <p className="text-sm text-theme-tertiary mb-2">{request.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-theme-tertiary">
                    <span>Table: <code className="bg-neutral-900 px-1 rounded">{request.table_name}</code></span>
                    <span>Submitted: {formatDate(request.created_at)}</span>
                    {request.fields && Array.isArray(request.fields) && (
                      <span>{request.fields.length} field{request.fields.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {request.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(request.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                      title="Cancel request"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              {(request.review_notes || request.rejection_reason || request.deployment_notes) && (
                <div className="mt-4 pt-4 border-t border-theme">
                  {request.rejection_reason && (
                    <div className="mb-2">
                      <p className="text-xs text-theme-tertiary mb-1">Rejection Reason:</p>
                      <p className="text-sm text-red-400">{request.rejection_reason}</p>
                    </div>
                  )}
                  {request.review_notes && (
                    <div className="mb-2">
                      <p className="text-xs text-theme-tertiary mb-1">Review Notes:</p>
                      <p className="text-sm text-theme-tertiary">{request.review_notes}</p>
                    </div>
                  )}
                  {request.deployment_notes && (
                    <div>
                      <p className="text-xs text-theme-tertiary mb-1">Deployment Notes:</p>
                      <p className="text-sm text-green-400">{request.deployment_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Fields Summary */}
              {request.fields && Array.isArray(request.fields) && request.fields.length > 0 && (
                <div className="mt-4 pt-4 border-t border-theme">
                  <p className="text-xs text-theme-tertiary mb-2">Fields:</p>
                  <div className="flex flex-wrap gap-2">
                    {request.fields.slice(0, 8).map((field: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-neutral-900 text-theme-tertiary rounded text-xs"
                      >
                        {field.name} ({field.type})
                      </span>
                    ))}
                    {request.fields.length > 8 && (
                      <span className="px-2 py-1 bg-neutral-900 text-theme-tertiary rounded text-xs">
                        +{request.fields.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

