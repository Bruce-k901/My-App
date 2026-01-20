'use client';

import { FileText, TrendingUp, Calendar, Target } from 'lucide-react';
import Link from 'next/link';
import type { EmployeeFileData } from '@/types/reviews';

interface EmployeeFileProps {
  fileData: EmployeeFileData;
}

export function EmployeeFile({ fileData }: EmployeeFileProps) {
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {fileData.summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
            <div className="text-neutral-400 text-sm mb-1">Total Reviews</div>
            <div className="text-2xl font-bold text-white">{fileData.summary.total_reviews_completed || 0}</div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
            <div className="text-neutral-400 text-sm mb-1">Latest Score</div>
            <div className="text-2xl font-bold text-white">
              {fileData.summary.latest_overall_score || 'N/A'}
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
            <div className="text-neutral-400 text-sm mb-1">Trend</div>
            <div className="text-2xl font-bold text-white capitalize">
              {fileData.summary.score_trend || 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Review History */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6">
        <h2 className="text-white font-medium mb-4">Review History</h2>
        {fileData.reviews.length === 0 ? (
          <p className="text-neutral-400">No reviews yet</p>
        ) : (
          <div className="space-y-3">
            {fileData.reviews.map((review) => (
              <Link
                key={review.id}
                href={`/dashboard/people/reviews/${review.id}`}
                className="block p-4 bg-white/[0.02] border border-white/[0.06] rounded-lg hover:border-white/[0.1] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {review.template?.name || review.title || 'Review'}
                    </p>
                    <p className="text-neutral-400 text-sm mt-1">
                      {new Date(review.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  {review.overall_score && (
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">{review.overall_score}</p>
                      <p className="text-neutral-400 text-xs">Score</p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

