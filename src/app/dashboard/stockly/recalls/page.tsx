// @salsa - SALSA Compliance: Recall list page
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import {
  Shield,
  Plus,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle,
} from '@/components/ui/icons';
import type { Recall, RecallStatus, RecallSeverity } from '@/lib/types/stockly';

const STATUS_CONFIG: Record<RecallStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  active: { label: 'Active', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  investigating: { label: 'Investigating', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  notified: { label: 'Notified', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  resolved: { label: 'Resolved', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  closed: { label: 'Closed', color: 'text-gray-500 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800/50' },
};

const SEVERITY_CONFIG: Record<RecallSeverity, { label: string; color: string }> = {
  class_1: { label: 'Class 1', color: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30' },
  class_2: { label: 'Class 2', color: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30' },
  class_3: { label: 'Class 3', color: 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' },
};

export default function RecallsPage() {
  const { companyId, siteId } = useAppContext();
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | RecallStatus>('all');

  const fetchRecalls = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (siteId && siteId !== 'all') params.set('site_id', siteId);

      const res = await fetch(`/api/stockly/recalls?${params}`);
      const json = await res.json();
      if (json.success) setRecalls(json.data || []);
    } catch (err) {
      console.error('Failed to fetch recalls:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, siteId, statusFilter]);

  useEffect(() => { fetchRecalls(); }, [fetchRecalls]);

  const statusTabs: { value: 'all' | RecallStatus; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'investigating', label: 'Investigating' },
    { value: 'notified', label: 'Notified' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary flex items-center gap-2">
            <Shield className="w-6 h-6 text-stockly-dark dark:text-stockly" />
            Recalls & Withdrawals
          </h1>
          <p className="text-sm text-theme-secondary mt-1">
            Manage product recalls, withdrawals, and customer notifications
          </p>
        </div>
        <Link href="/dashboard/stockly/recalls/new">
          <Button>
            <Plus className="w-4 h-4 mr-1" /> New Recall
          </Button>
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-theme-bg-secondary rounded-lg p-1 overflow-x-auto">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === tab.value
                ? 'bg-theme-bg-primary text-theme-primary shadow-sm'
                : 'text-theme-tertiary hover:text-theme-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Recalls list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-stockly-dark dark:text-stockly" />
        </div>
      ) : recalls.length === 0 ? (
        <div className="text-center py-16">
          <Shield className="w-12 h-12 text-theme-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-theme-primary mb-2">No recalls found</h3>
          <p className="text-sm text-theme-secondary">
            {statusFilter !== 'all' ? 'Try a different status filter' : 'Create a recall to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recalls.map((recall) => {
            const statusConf = STATUS_CONFIG[recall.status];
            const severityConf = SEVERITY_CONFIG[recall.severity];
            const isSalsaOverdue = !recall.salsa_notified && recall.status !== 'draft' && recall.initiated_at &&
              (new Date().getTime() - new Date(recall.initiated_at).getTime()) > 3 * 24 * 60 * 60 * 1000;

            return (
              <Link
                key={recall.id}
                href={`/dashboard/stockly/recalls/${recall.id}`}
                className="block p-4 bg-theme-bg-primary border border-theme-border rounded-lg hover:border-stockly-dark/30 dark:hover:border-stockly/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium text-theme-primary">{recall.recall_code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${statusConf.bgColor} ${statusConf.color}`}>
                      {statusConf.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${severityConf.color}`}>
                      {severityConf.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      recall.recall_type === 'recall'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}>
                      {recall.recall_type === 'recall' ? 'Recall' : 'Withdrawal'}
                    </span>
                    {isSalsaOverdue && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> SALSA notification overdue
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-theme-tertiary">
                    {new Date(recall.initiated_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <h3 className="font-medium text-theme-primary mt-1">{recall.title}</h3>
                {recall.reason && <p className="text-sm text-theme-secondary mt-0.5 line-clamp-1">{recall.reason}</p>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
