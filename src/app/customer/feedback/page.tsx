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
      const response = await fetch('/api/customer/issues');
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
          <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Feedback & Issues</h1>
        <Button variant="secondary">+ Report Issue</Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:bg-white/[0.05] transition-colors text-left">
          <AlertTriangle className="w-6 h-6 text-yellow-400 mb-2" />
          <div className="text-sm font-medium text-white">Quality Issue</div>
          <div className="text-xs text-white/60">Damaged items</div>
        </button>
        <button className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:bg-white/[0.05] transition-colors text-left">
          <Truck className="w-6 h-6 text-blue-400 mb-2" />
          <div className="text-sm font-medium text-white">Delivery Problem</div>
          <div className="text-xs text-white/60">Late or missing</div>
        </button>
        <button className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:bg-white/[0.05] transition-colors text-left">
          <Star className="w-6 h-6 text-yellow-400 mb-2" />
          <div className="text-sm font-medium text-white">Rate Products</div>
          <div className="text-xs text-white/60">Help us improve</div>
        </button>
        <button className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:bg-white/[0.05] transition-colors text-left">
          <CreditCard className="w-6 h-6 text-green-400 mb-2" />
          <div className="text-sm font-medium text-white">Request Credit</div>
          <div className="text-xs text-white/60">For issues</div>
        </button>
      </div>

      {/* Recent Issues */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Reports</h2>
        {issues.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
            <p className="text-white/60">No issues reported yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{issue.title}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    issue.status === 'resolved' ? 'bg-green-500/20 text-green-300' :
                    issue.status === 'in_review' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {issue.status}
                  </span>
                </div>
                <p className="text-sm text-white/60">{issue.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

