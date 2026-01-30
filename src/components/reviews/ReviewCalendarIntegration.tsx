'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import type { Review, EmployeeReviewSchedule } from '@/types/reviews';

interface ReviewCalendarIntegrationProps {
  companyId: string;
  onReviewsLoaded?: (reviews: CalendarReview[]) => void;
}

export interface CalendarReview {
  id: string;
  title: string;
  date: string;
  type: 'scheduled' | 'review';
  employee_name: string;
  status: string;
  review_id?: string;
  schedule_id?: string;
}

export function ReviewCalendarIntegration({ companyId, onReviewsLoaded }: ReviewCalendarIntegrationProps) {
  const [reviews, setReviews] = useState<CalendarReview[]>([]);

  useEffect(() => {
    if (!companyId) return;

    loadCalendarReviews();
  }, [companyId]);

  const loadCalendarReviews = async () => {
    try {
      // Load scheduled reviews
      const { data: schedules } = await supabase
        .from('employee_review_schedules')
        .select(`
          id,
          scheduled_date,
          employee:profiles(id, full_name),
          template:review_templates(name)
        `)
        .eq('company_id', companyId)
        .in('status', ['scheduled', 'invitation_sent', 'in_progress'])
        .order('scheduled_date', { ascending: true });

      // Load actual review instances
      const { data: reviewInstances } = await supabase
        .from('reviews')
        .select(`
          id,
          created_at,
          employee:profiles(id, full_name),
          template:review_templates(name),
          status
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);

      const calendarItems: CalendarReview[] = [];

      // Add scheduled reviews
      if (schedules) {
        schedules.forEach((schedule: any) => {
          calendarItems.push({
            id: schedule.id,
            title: schedule.template?.name || 'Review',
            date: schedule.scheduled_date,
            type: 'scheduled',
            employee_name: schedule.employee?.full_name || 'Unknown',
            status: 'scheduled',
            schedule_id: schedule.id,
          });
        });
      }

      // Add review instances
      if (reviewInstances) {
        reviewInstances.forEach((review: any) => {
          calendarItems.push({
            id: review.id,
            title: review.template?.name || 'Review',
            date: review.created_at.split('T')[0],
            type: 'review',
            employee_name: review.employee?.full_name || 'Unknown',
            status: review.status,
            review_id: review.id,
          });
        });
      }

      setReviews(calendarItems);
      if (onReviewsLoaded) {
        onReviewsLoaded(calendarItems);
      }
    } catch (error) {
      console.error('Error loading calendar reviews:', error);
    }
  };

  return null; // This component just loads data, doesn't render
}

// Hook to get reviews for a specific date
export function useReviewCalendar(companyId: string) {
  const [reviews, setReviews] = useState<CalendarReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    loadReviews();
  }, [companyId]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const { data: schedules } = await supabase
        .from('employee_review_schedules')
        .select(`
          id,
          scheduled_date,
          employee:profiles(id, full_name),
          template:review_templates(name)
        `)
        .eq('company_id', companyId)
        .in('status', ['scheduled', 'invitation_sent', 'in_progress']);

      const { data: reviewInstances } = await supabase
        .from('reviews')
        .select(`
          id,
          created_at,
          employee:profiles(id, full_name),
          template:review_templates(name),
          status
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);

      const items: CalendarReview[] = [];

      if (schedules) {
        schedules.forEach((s: any) => {
          items.push({
            id: s.id,
            title: s.template?.name || 'Review',
            date: s.scheduled_date,
            type: 'scheduled',
            employee_name: s.employee?.full_name || 'Unknown',
            status: 'scheduled',
            schedule_id: s.id,
          });
        });
      }

      if (reviewInstances) {
        reviewInstances.forEach((r: any) => {
          items.push({
            id: r.id,
            title: r.template?.name || 'Review',
            date: r.created_at.split('T')[0],
            type: 'review',
            employee_name: r.employee?.full_name || 'Unknown',
            status: r.status,
            review_id: r.id,
          });
        });
      }

      setReviews(items);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReviewsForDate = (date: Date): CalendarReview[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return reviews.filter(r => r.date === dateStr);
  };

  return { reviews, loading, getReviewsForDate, refresh: loadReviews };
}

