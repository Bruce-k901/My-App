"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, Save, Copy, Download, Clock } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useRouter, useParams } from 'next/navigation';

export default function AdminLibraryRequestDetailPage() {
  const { userId } = useAppContext();
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [request, setRequest] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [deploymentNotes, setDeploymentNotes] = useState('');

  useEffect(() => {
    if (requestId) {
      loadRequest();
    }
  }, [requestId]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('library_requests')
        .select(`
          *,
          companies:company_id (name),
          requester:requested_by (
            email,
            full_name
          )
        `)
        .eq('id', requestId)
        .single();

      if (error) throw error;
      setRequest(data);
      setReviewNotes(data.review_notes || '');
      setRejectionReason(data.rejection_reason || '');
      setDeploymentNotes(data.deployment_notes || '');
    } catch (error: any) {
      console.error('Error loading request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this library request? You can still edit the SQL before deploying.')) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('library_requests')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', requestId);

      if (error) throw error;
      await loadRequest();
      console.info('Request approved');
    } catch (error: any) {
      console.error('Error approving request:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    if (!confirm('Reject this library request?')) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('library_requests')
        .update({
          status: 'rejected',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
          rejection_reason: rejectionReason.trim(),
        })
        .eq('id', requestId);

      if (error) throw error;
      await loadRequest();
      console.info('Request rejected');
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDeployed = async () => {
    if (!confirm('Mark this library as deployed? Make sure you have executed the SQL in Supabase first.')) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('library_requests')
        .update({
          status: 'deployed',
          deployed_by: userId,
          deployed_at: new Date().toISOString(),
          deployment_notes: deploymentNotes || null,
        })
        .eq('id', requestId);

      if (error) throw error;
      await loadRequest();
      console.info('Request marked as deployed');
    } catch (error: any) {
      console.error('Error marking as deployed:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const copySQL = () => {
    if (request?.generated_sql) {
      navigator.clipboard.writeText(request.generated_sql);
      alert('SQL copied to clipboard!');
    }
  };

  const downloadSQL = () => {
    if (!request?.generated_sql) return;
    
    const blob = new Blob([request.generated_sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${request.table_name}_migration.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm flex items-center gap-2">
            <Clock size={14} />
            Pending Review
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm flex items-center gap-2">
            <CheckCircle2 size={14} />
            Approved
          </span>
        );
      case 'deployed':
        return (
          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-2">
            <CheckCircle2 size={14} />
            Deployed
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm flex items-center gap-2">
            <XCircle size={14} />
            Rejected
          </span>
        );
      default:
        return <span className="px-3 py-1 bg-neutral-700 text-theme-tertiary rounded-full text-sm">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-theme-tertiary text-center py-8">Loading request...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6">
        <div className="text-theme-tertiary text-center py-8">Request not found</div>
      </div>
    );
  }

  const company = request.companies as any;
  const requester = request.requester as any;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-neutral-800 rounded-lg"
        >
          <ArrowLeft size={20} className="text-theme-tertiary" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl font-semibold text-theme-primary">{request.library_name}</h1>
            {getStatusBadge(request.status)}
          </div>
          <div className="flex items-center gap-4 text-sm text-theme-tertiary">
            <span>Company: <strong className="text-theme-tertiary">{company?.name || 'Unknown'}</strong></span>
            <span>Requested by: <strong className="text-theme-tertiary">{requester?.full_name || requester?.email || 'Unknown'}</strong></span>
            <span>Table: <code className="bg-neutral-900 px-1 rounded">{request.table_name}</code></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {request.description && (
            <div className="bg-neutral-800/50 rounded-xl border border-theme p-6">
              <h2 className="text-lg font-semibold text-theme-primary mb-2">Description</h2>
              <p className="text-theme-tertiary">{request.description}</p>
            </div>
          )}

          {/* Fields */}
          {request.fields && Array.isArray(request.fields) && request.fields.length > 0 && (
            <div className="bg-neutral-800/50 rounded-xl border border-theme p-6">
              <h2 className="text-lg font-semibold text-theme-primary mb-4">Fields ({request.fields.length})</h2>
              <div className="space-y-3">
                {request.fields.map((field: any, idx: number) => (
                  <div key={idx} className="bg-neutral-900/50 border border-theme rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-theme-primary font-medium">{field.name}</h3>
                        <p className="text-xs text-theme-tertiary">
                          Column: <code className="bg-neutral-800 px-1 rounded">{field.column}</code> • Type: {field.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {field.required && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">Required</span>
                        )}
                        {field.main_table && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">Main Table</span>
                        )}
                      </div>
                    </div>
                    {field.default && (
                      <p className="text-xs text-theme-tertiary">Default: {field.default}</p>
                    )}
                    {field.category_options && field.category_options.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-theme-tertiary mb-1">Options:</p>
                        <div className="flex flex-wrap gap-1">
                          {field.category_options.map((opt: string, optIdx: number) => (
                            <span key={optIdx} className="px-2 py-0.5 bg-neutral-800 text-theme-tertiary rounded text-xs">
                              {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generated SQL */}
          {request.generated_sql && (
            <div className="bg-neutral-800/50 rounded-xl border border-theme p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-theme-primary">Generated SQL</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copySQL}
                    className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-theme-primary flex items-center gap-2 text-sm"
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                  <button
                    onClick={downloadSQL}
                    className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-theme-primary flex items-center gap-2 text-sm"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </div>
              <pre className="bg-neutral-900 border border-theme rounded-lg p-4 overflow-x-auto text-xs text-theme-tertiary font-mono max-h-[600px] overflow-y-auto">
                {request.generated_sql}
              </pre>
              <p className="text-xs text-theme-tertiary mt-2">
                💡 Copy this SQL and execute it in Supabase SQL Editor to create the table.
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Actions Card */}
          {request.status === 'pending' && (
            <div className="bg-neutral-800/50 rounded-xl border border-theme p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-theme-primary mb-4">Review Actions</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-theme-tertiary mb-2">Review Notes</label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Optional notes about this request..."
                    rows={4}
                    className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
                  />
                </div>

                <button
                  onClick={handleApprove}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-[0_0_12px_rgba(var(--module-fg),0.7)] disabled:opacity-50 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-theme-tertiary rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  {saving ? 'Processing...' : 'Approve Request'}
                </button>

                <div>
                  <label className="block text-sm text-theme-tertiary mb-2">Rejection Reason *</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Required if rejecting..."
                    rows={3}
                    className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
                  />
                </div>

                <button
                  onClick={handleReject}
                  disabled={saving || !rejectionReason.trim()}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white flex items-center justify-center gap-2"
                >
                  <XCircle size={16} />
                  {saving ? 'Processing...' : 'Reject Request'}
                </button>
              </div>
            </div>
          )}

          {request.status === 'approved' && (
            <div className="bg-neutral-800/50 rounded-xl border border-theme p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-theme-primary mb-4">Deployment</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-theme-tertiary mb-2">Deployment Notes</label>
                  <textarea
                    value={deploymentNotes}
                    onChange={(e) => setDeploymentNotes(e.target.value)}
                    placeholder="Notes about deployment..."
                    rows={3}
                    className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
                  />
                </div>

                <button
                  onClick={handleMarkDeployed}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-[0_0_12px_rgba(var(--module-fg),0.7)] disabled:opacity-50 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-theme-tertiary rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {saving ? 'Processing...' : 'Mark as Deployed'}
                </button>

                <p className="text-xs text-theme-tertiary">
                  ⚠️ Make sure you've executed the SQL in Supabase SQL Editor before marking as deployed.
                </p>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="bg-neutral-800/50 rounded-xl border border-theme p-6">
            <h2 className="text-lg font-semibold text-theme-primary mb-4">Request Info</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-theme-tertiary">Submitted:</span>
                <p className="text-theme-primary mt-1">
                  {new Date(request.created_at).toLocaleString('en-GB')}
                </p>
              </div>
              {request.reviewed_at && (
                <div>
                  <span className="text-theme-tertiary">Reviewed:</span>
                  <p className="text-theme-primary mt-1">
                    {new Date(request.reviewed_at).toLocaleString('en-GB')}
                  </p>
                </div>
              )}
              {request.deployed_at && (
                <div>
                  <span className="text-theme-tertiary">Deployed:</span>
                  <p className="text-theme-primary mt-1">
                    {new Date(request.deployed_at).toLocaleString('en-GB')}
                  </p>
                </div>
              )}
              {request.review_notes && (
                <div>
                  <span className="text-theme-tertiary">Review Notes:</span>
                  <p className="text-theme-primary mt-1">{request.review_notes}</p>
                </div>
              )}
              {request.rejection_reason && (
                <div>
                  <span className="text-theme-tertiary">Rejection Reason:</span>
                  <p className="text-red-400 mt-1">{request.rejection_reason}</p>
                </div>
              )}
              {request.deployment_notes && (
                <div>
                  <span className="text-theme-tertiary">Deployment Notes:</span>
                  <p className="text-green-400 mt-1">{request.deployment_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

