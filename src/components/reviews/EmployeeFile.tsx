'use client';

import { FileText, TrendingUp, Calendar, Target, UserCheck, UserX } from '@/components/ui/icons';
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

      {/* Sickness & Absence History */}
      {fileData.sickness_records && fileData.sickness_records.length > 0 && (
        <div className="bg-theme-surface border border-theme rounded-lg p-6 shadow-sm dark:shadow-none">
          <h2 className="text-theme-primary font-medium mb-4">Sickness & Absence History</h2>
          <div className="space-y-3">
            {fileData.sickness_records.map((record) => {
              const statusClass = record.status === 'active'
                ? 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                : record.status === 'cleared'
                  ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                  : 'bg-gray-50 dark:bg-white/[0.04] text-theme-secondary';
              const statusLabel = record.status === 'active' ? 'Active' : record.status === 'cleared' ? 'Cleared' : 'Closed';

              // Calculate days absent
              const onset = new Date(record.illness_onset_date);
              const end = record.return_to_work_date ? new Date(record.return_to_work_date) : record.exclusion_period_end ? new Date(record.exclusion_period_end) : null;
              const daysAbsent = end ? Math.max(1, Math.ceil((end.getTime() - onset.getTime()) / (1000 * 60 * 60 * 24))) : null;

              return (
                <div key={record.id} className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-theme rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${record.status === 'active' ? 'bg-red-50 dark:bg-red-500/10' : 'bg-green-50 dark:bg-green-500/10'}`}>
                        {record.rtw_conducted_date
                          ? <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                          : <UserX className="w-4 h-4 text-red-600 dark:text-red-400" />
                        }
                      </div>
                      <div>
                        <p className="text-theme-primary font-medium text-sm">
                          {new Date(record.illness_onset_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {daysAbsent != null && <span className="text-theme-tertiary font-normal"> — {daysAbsent} day{daysAbsent !== 1 ? 's' : ''}</span>}
                        </p>
                        <p className="text-theme-secondary text-xs mt-0.5">{record.symptoms}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${statusClass}`}>{statusLabel}</span>
                  </div>

                  {/* RTW summary */}
                  {record.rtw_conducted_date && (
                    <div className="mt-2 pt-2 border-t border-theme text-xs text-theme-secondary">
                      <span className="font-medium text-green-600 dark:text-green-400">RTW: </span>
                      {new Date(record.rtw_conducted_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' — '}
                      {record.rtw_fit_for_full_duties ? 'Fit for full duties' : 'Restricted duties'}
                      {record.rtw_adjustments_needed && record.rtw_adjustments_details && (
                        <span> ({record.rtw_adjustments_details})</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

