'use client';

import { FileText, TrendingUp, Calendar, Target } from '@/components/ui/icons';
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
          <div className="bg-theme-surface border border-theme rounded-lg p-4 shadow-sm dark:shadow-none">
            <div className="text-theme-secondary text-sm mb-1">Total Reviews</div>
            <div className="text-2xl font-bold text-theme-primary">{fileData.summary.total_reviews_completed || 0}</div>
          </div>
          <div className="bg-theme-surface border border-theme rounded-lg p-4 shadow-sm dark:shadow-none">
            <div className="text-theme-secondary text-sm mb-1">Latest Score</div>
            <div className="text-2xl font-bold text-theme-primary">
              {fileData.summary.latest_overall_score || 'N/A'}
            </div>
          </div>
          <div className="bg-theme-surface border border-theme rounded-lg p-4 shadow-sm dark:shadow-none">
            <div className="text-theme-secondary text-sm mb-1">Trend</div>
            <div className="text-2xl font-bold text-theme-primary capitalize">
              {fileData.summary.score_trend || 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Review History */}
      <div className="bg-theme-surface border border-theme rounded-lg p-6 shadow-sm dark:shadow-none">
        <h2 className="text-theme-primary font-medium mb-4">Review History</h2>
        {fileData.reviews.length === 0 ? (
          <p className="text-theme-secondary">No reviews yet</p>
        ) : (
          <div className="space-y-3">
            {fileData.reviews.map((review) => (
              <Link
                key={review.id}
                href={`/dashboard/people/reviews/${review.id}`}
                className="block p-4 bg-gray-50 dark:bg-white/[0.02] border border-theme rounded-lg hover:border-gray-300 dark:hover:border-white/[0.1] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-theme-primary font-medium">
                      {review.template?.name || review.title || 'Review'}
                    </p>
                    <p className="text-theme-secondary text-sm mt-1">
                      {new Date(review.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  {review.overall_score && (
                    <div className="text-right">
                      <p className="text-theme-primary font-bold text-lg">{review.overall_score}</p>
                      <p className="text-theme-secondary text-xs">Score</p>
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

