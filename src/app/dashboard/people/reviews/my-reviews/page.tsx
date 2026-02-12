'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight
} from '@/components/ui/icons';

export default function MyReviewsPage() {
  const { profile } = useAppContext();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter') || 'all';
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchReviews();
    }
  }, [profile?.id, filter]);

  const fetchReviews = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('reviews')
        .select(`
          *,
          review_templates (
            name,
            template_type
          )
        `)
        .eq('employee_id', profile.id)
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.in('status', ['draft', 'employee_complete', 'manager_complete']);
      } else if (filter === 'completed') {
        query = query.eq('status', 'completed');
      } else if (filter === 'overdue') {
        // TODO: Implement overdue logic
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching reviews:', error);
      } else {
        setReviews(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'signed_off':
        return 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30';
      case 'overdue':
        return 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30';
      case 'in_progress':
      case 'pending_manager':
      case 'pending_employee':
        return 'bg-module-fg/10 text-module-fg border border-module-fg/20';
      default:
        return 'bg-theme-button text-theme-tertiary border border-theme';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-module-fg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">My Reviews</h1>
          <p className="text-theme-secondary">View and complete your performance reviews</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'completed', 'overdue'] as const).map((f) => (
          <Link
            key={f}
            href={`/dashboard/people/reviews/my-reviews?filter=${f}`}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === f
                ? 'bg-transparent border border-module-fg text-module-fg'
                : 'bg-theme-surface border border-theme text-theme-tertiary hover:text-theme-primary'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Link>
        ))}
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="bg-theme-surface border border-theme rounded-lg p-12 text-center">
          <FileText className="w-12 h-12 text-theme-tertiary mx-auto mb-4" />
          <p className="text-theme-primary font-medium">No reviews found</p>
          <p className="text-theme-secondary text-sm mt-1">
            {filter === 'all' 
              ? 'You don\'t have any reviews yet'
              : `No ${filter} reviews`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Link
              key={review.id}
              href={`/dashboard/people/reviews/${review.id}`}
              className="block bg-theme-surface border border-theme rounded-lg p-4 hover:border-theme-hover transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-theme-primary font-medium">
                      {review.review_templates?.name || 'Review'}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(review.status)}`}>
                      {review.status.replace('_', ' ')}
                    </span>
                  </div>
                  {review.review_period_start && review.review_period_end && (
                    <p className="text-theme-secondary text-sm">
                      Period: {new Date(review.review_period_start).toLocaleDateString('en-GB')} - {new Date(review.review_period_end).toLocaleDateString('en-GB')}
                    </p>
                  )}
                  {review.overall_score && (
                    <p className="text-theme-secondary text-sm mt-1">
                      Overall Score: {review.overall_score}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-theme-tertiary" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

