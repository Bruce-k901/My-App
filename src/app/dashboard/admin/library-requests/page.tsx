"use client";

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, Package, Eye, Filter } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useRouter } from 'next/navigation';

export default function AdminLibraryRequestsPage() {
  const { companyId } = useAppContext();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadRequests();
  }, [filterStatus]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('library_requests')
        .select(`
          *,
          companies:company_id (name),
          requester:requested_by (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error loading library requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs flex items-center gap-1">
            <Clock size={12} />
            Pending
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
          <span className="px-2 py-1 bg-neutral-700 text-neutral-400 rounded-full text-xs">
            Cancelled
          </span>
        );
      default:
        return <span className="px-2 py-1 bg-neutral-700 text-neutral-400 rounded-full text-xs">{status}</span>;
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

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-neutral-400 text-center py-8">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-[#D37E91] rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-white">Library Requests</h1>
              <p className="text-sm text-neutral-400">Review and manage library requests from users</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
              {pendingCount} Pending
            </span>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Filter size={16} className="text-neutral-400" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="deployed">Deployed</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {requests.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-12 text-center border border-neutral-700">
          <Package className="mx-auto mb-4 text-neutral-600" size={48} />
          <p className="text-neutral-400">No library requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const company = request.companies as any;
            const requester = request.requester as any;
            
            return (
              <div
                key={request.id}
                className="bg-neutral-800/50 rounded-xl border border-neutral-700 p-6 hover:border-neutral-600 transition cursor-pointer"
                onClick={() => router.push(`/dashboard/admin/library-requests/${request.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{request.library_name}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    {request.description && (
                      <p className="text-sm text-neutral-400 mb-2">{request.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span>Company: <strong className="text-neutral-300">{company?.name || 'Unknown'}</strong></span>
                      <span>Requested by: <strong className="text-neutral-300">{requester?.full_name || requester?.email || 'Unknown'}</strong></span>
                      <span>Table: <code className="bg-neutral-900 px-1 rounded">{request.table_name}</code></span>
                      <span>Submitted: {formatDate(request.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/admin/library-requests/${request.id}`);
                    }}
                    className="p-2 text-magenta-400 hover:text-magenta-300 hover:bg-magenta-500/10 rounded-lg"
                  >
                    <Eye size={16} />
                  </button>
                </div>

                {request.fields && Array.isArray(request.fields) && request.fields.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-neutral-700">
                    <p className="text-xs text-neutral-400 mb-2">Fields ({request.fields.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {request.fields.slice(0, 6).map((field: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-neutral-900 text-neutral-300 rounded text-xs"
                        >
                          {field.name} ({field.type})
                        </span>
                      ))}
                      {request.fields.length > 6 && (
                        <span className="px-2 py-1 bg-neutral-900 text-neutral-500 rounded text-xs">
                          +{request.fields.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

