'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Truck, Star, CreditCard, Loader2 } from '@/components/ui/icons';
import { Button } from '@/components/ui';

export default function FeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<any[]>([]);

  useEffect(() => {
    loadIssues();
  }, []);

  async function loadIssues() {
    try {
      setLoading(true);
      // Support admin preview mode
      const previewId = typeof window !== 'undefined' ? sessionStorage.getItem('admin_preview_customer_id') : null;
      const url = previewId ? `/api/customer/issues?customer_id=${previewId}` : '/api/customer/issues';
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        setIssues(result.data || []);
      }
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-module-fg animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary">Feedback & Issues</h1>
        <Button variant="secondary">+ Report Issue</Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button className="p-4 bg-theme-button border border-theme rounded-lg hover:bg-theme-hover transition-colors text-left">
          <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mb-2" />
          <div className="text-sm font-medium text-theme-primary">Quality Issue</div>
          <div className="text-xs text-theme-tertiary">Damaged items</div>
        </button>
        <button className="p-4 bg-theme-button border border-theme rounded-lg hover:bg-theme-hover transition-colors text-left">
          <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
          <div className="text-sm font-medium text-theme-primary">Delivery Problem</div>
          <div className="text-xs text-theme-tertiary">Late or missing</div>
        </button>
        <button className="p-4 bg-theme-button border border-theme rounded-lg hover:bg-theme-hover transition-colors text-left">
          <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mb-2" />
          <div className="text-sm font-medium text-theme-primary">Rate Products</div>
          <div className="text-xs text-theme-tertiary">Help us improve</div>
        </button>
        <button className="p-4 bg-theme-button border border-theme rounded-lg hover:bg-theme-hover transition-colors text-left">
          <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
          <div className="text-sm font-medium text-theme-primary">Request Credit</div>
          <div className="text-xs text-theme-tertiary">For issues</div>
        </button>
      </div>

      {/* Recent Issues */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-theme-primary mb-4">Recent Reports</h2>
        {issues.length === 0 ? (
          <div className="bg-theme-button border border-theme rounded-xl p-8 text-center">
            <p className="text-theme-tertiary">No issues reported yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 bg-theme-button border border-theme rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-theme-primary">{issue.title}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    issue.status === 'resolved' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' :
                    issue.status === 'in_review' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                    'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                  }`}>
                    {issue.status}
                  </span>
                </div>
                <p className="text-sm text-theme-tertiary">{issue.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

