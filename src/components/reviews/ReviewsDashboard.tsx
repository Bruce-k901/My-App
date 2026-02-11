'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ClipboardList, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Plus,
  ChevronRight,
  User,
  Filter,
  AlertTriangle
} from '@/components/ui/icons';
import { Button } from '@/components/ui';
import { useAppContext } from '@/context/AppContext';
import type { Review, EmployeeReviewSchedule } from '@/types/reviews';

interface ReviewsDashboardProps {
  stats: {
    total_reviews_this_month: number;
    completed_reviews_this_month: number;
    overdue_reviews: number;
    upcoming_reviews_7_days: number;
    pending_follow_ups: number;
  };
  reviews: Review[];
  myUpcoming: EmployeeReviewSchedule[];
  overdueReviews: any[];
}

export function ReviewsDashboard({ 
  stats, 
  reviews, 
  myUpcoming, 
  overdueReviews 
}: ReviewsDashboardProps) {
  const { profile } = useAppContext();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const isManagerOrAdmin = profile?.app_role && 
    ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager'].includes(
      (profile.app_role || '').toLowerCase()
    );
  
  // Count reviews/schedules without templates
  const reviewsWithoutTemplates = reviews.filter(r => !r.template_id || !r.template);
  const schedulesWithoutTemplates = myUpcoming.filter(s => !s.template_id || !s.template);

  const filteredReviews = reviews.filter(review => {
    if (statusFilter === 'all') return true;
    return review.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reviews & Appraisals</h1>
          <p className="text-gray-600 dark:text-white/60 mt-1">Manage employee reviews and performance appraisals</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/people/reviews/templates">
            <Button variant="outline">
              <ClipboardList className="h-4 w-4 mr-2" />
              Templates
            </Button>
          </Link>
          <Link href="/dashboard/people/reviews/schedule">
            <Button variant="primary" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white border-0 shadow-sm dark:shadow-none">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Review
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Overdue"
          value={stats.overdue_reviews}
          icon={AlertCircle}
          iconColor="text-red-400"
          bgColor="bg-red-500/10"
          href="/dashboard/people/reviews?status=overdue"
        />
        <StatsCard
          title="Due This Week"
          value={stats.upcoming_reviews_7_days}
          icon={Clock}
          iconColor="text-amber-400"
          bgColor="bg-amber-500/10"
          href="/dashboard/people/reviews/schedule?range=week"
        />
        <StatsCard
          title="Completed This Month"
          value={stats.completed_reviews_this_month}
          icon={CheckCircle}
          iconColor="text-green-400"
          bgColor="bg-green-500/10"
          href="/dashboard/people/reviews?status=completed"
        />
        <StatsCard
          title="Pending Follow-ups"
          value={stats.pending_follow_ups}
          icon={ClipboardList}
          iconColor="text-blue-400"
          bgColor="bg-blue-500/10"
          href="/dashboard/people/reviews?tab=follow-ups"
        />
      </div>

      {/* Overdue Alert */}
      {overdueReviews.length > 0 && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <p className="font-medium text-red-900 dark:text-red-200">
                {overdueReviews.length} review{overdueReviews.length !== 1 ? 's' : ''} overdue
              </p>
              <p className="text-sm text-red-700 dark:text-red-300/70">
                {overdueReviews.slice(0, 3).map((r: any) => r.employee?.full_name).join(', ')}
                {overdueReviews.length > 3 && ` and ${overdueReviews.length - 3} more`}
              </p>
            </div>
            <Link href="/dashboard/people/reviews?status=overdue">
              <Button variant="outline" className="border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-500/20">
                View All
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Template Missing Alert for Managers */}
      {isManagerOrAdmin && (reviewsWithoutTemplates.length > 0 || schedulesWithoutTemplates.length > 0) && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                {reviewsWithoutTemplates.length + schedulesWithoutTemplates.length} review{reviewsWithoutTemplates.length + schedulesWithoutTemplates.length !== 1 ? 's' : ''} without templates
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300/70">
                Please attach templates to these reviews before staff can complete them.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Template Not Ready Alert for Staff */}
      {!isManagerOrAdmin && schedulesWithoutTemplates.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="font-medium text-blue-900 dark:text-blue-200">
                {schedulesWithoutTemplates.length} review{schedulesWithoutTemplates.length !== 1 ? 's' : ''} pending template setup
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300/70">
                Your manager is still setting up the review templates. Please check back later.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* My Upcoming Reviews */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg">
        <div className="p-4 border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">My Upcoming Reviews</h2>
          <Link href="/dashboard/people/reviews/my-reviews" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-white/[0.06]">
          {myUpcoming.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-10 h-10 text-gray-400 dark:text-white/50 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-white/60">No upcoming reviews scheduled</p>
            </div>
          ) : (
            myUpcoming.map((schedule) => (
              <ReviewScheduleCard key={schedule.id} schedule={schedule} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, iconColor, bgColor, href }: { 
  title: string; value: number; icon: any; iconColor: string; bgColor: string; href: string;
}) {
  return (
    <Link href={href}>
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 hover:border-gray-300 dark:hover:border-white/[0.1] transition-colors cursor-pointer shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-white/60">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function ReviewScheduleCard({ schedule }: { schedule: EmployeeReviewSchedule }) {
  const { profile } = useAppContext();
  const isOverdue = schedule.due_date && new Date(schedule.due_date) < new Date();
  const hasTemplate = !!schedule.template_id && !!schedule.template;
  const isManagerOrAdmin = profile?.app_role && 
    ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager'].includes(
      (profile.app_role || '').toLowerCase()
    );
  
  return (
    <Link
      href={`/dashboard/people/reviews/${schedule.review_id || schedule.id}`}
      className={`block p-4 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors ${isOverdue ? 'border-l-4 border-l-red-500 dark:border-l-red-400' : !hasTemplate ? 'border-l-4 border-l-amber-500 dark:border-l-amber-400' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-400 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {schedule.employee?.avatar_url ? (
              <img src={schedule.employee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              schedule.employee?.full_name?.charAt(0) || 'U'
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-gray-900 dark:text-white font-medium">{schedule.employee?.full_name || 'Employee'}</h3>
              <span className="text-gray-400 dark:text-white/50">-</span>
              <span className="text-gray-600 dark:text-white/70">{schedule.template?.name || schedule.title || 'No Template'}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-white/60">
              <Calendar className="h-3 w-3" />
              <span>Scheduled: {new Date(schedule.scheduled_date).toLocaleDateString()}</span>
              {schedule.due_date && (
                <span className={isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-white/60'}>
                  Due: {new Date(schedule.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!hasTemplate && (
            <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded text-xs border border-amber-200 dark:border-amber-500/30 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {isManagerOrAdmin ? 'No Template' : 'Template Pending'}
            </span>
          )}
          {isOverdue && (
            <span className="px-2 py-0.5 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded text-xs border border-red-200 dark:border-red-500/30">
              Overdue
            </span>
          )}
          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded text-xs border border-blue-200 dark:border-blue-500/30">
            <Clock className="h-3 w-3 inline mr-1" />
            Scheduled
          </span>
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-white/50" />
        </div>
      </div>
    </Link>
  );
}

