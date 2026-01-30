'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Users,
  FileText,
  Calendar,
  ChevronRight,
  Clock
} from 'lucide-react';

interface ReviewItem {
  id: string;
  type: 'schedule' | 'review';
  employee_id: string;
  employee?: { id: string; full_name: string; avatar_url?: string };
  template?: { id: string; name: string };
  scheduled_date?: string;
  due_date?: string;
  status: string;
  created_at: string;
}

export default function TeamReviewsPage() {
  const { profile } = useAppContext();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isManager = profile?.app_role && ['admin', 'owner', 'manager'].includes(profile.app_role.toLowerCase());

  useEffect(() => {
    if (profile?.id && isManager) {
      fetchTeamReviews();
    }
  }, [profile?.id, isManager]);

  const fetchTeamReviews = async () => {
    if (!profile?.id || !profile?.company_id) return;

    setLoading(true);
    try {
      // Get direct reports (or all employees if admin/owner)
      let reportsQuery = supabase
        .from('profiles')
        .select('id')
        .eq('company_id', profile.company_id);
      
      // If not admin/owner, only get direct reports
      if (profile.app_role?.toLowerCase() !== 'admin' && profile.app_role?.toLowerCase() !== 'owner') {
        reportsQuery = reportsQuery.eq('reports_to', profile.id);
      }
      
      const { data: reports } = await reportsQuery;

      if (!reports || reports.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const reportIds = reports.map(r => r.id);

      // Fetch both schedules and review instances
      const [schedulesResult, reviewsResult] = await Promise.all([
        // Get scheduled reviews (upcoming)
        supabase
          .from('employee_review_schedules')
          .select(`
            *,
            template:review_templates (
              id,
              name
            )
          `)
          .in('employee_id', reportIds)
          .in('status', ['scheduled', 'invitation_sent', 'in_progress', 'pending_manager', 'pending_employee'])
          .order('scheduled_date', { ascending: true }),
        
        // Get actual review instances (started/completed)
        supabase
          .from('reviews')
          .select(`
            *,
            template:review_templates (
              id,
              name
            )
          `)
          .in('employee_id', reportIds)
          .order('created_at', { ascending: false })
      ]);

      // Combine and enrich with employee data
      const allItems: ReviewItem[] = [];
      
      // Add schedules
      if (schedulesResult.data) {
        schedulesResult.data.forEach((schedule: any) => {
          allItems.push({
            id: schedule.id,
            type: 'schedule',
            employee_id: schedule.employee_id,
            template: schedule.template,
            scheduled_date: schedule.scheduled_date,
            due_date: schedule.due_date,
            status: schedule.status,
            created_at: schedule.created_at,
          });
        });
      }

      // Add review instances
      if (reviewsResult.data) {
        reviewsResult.data.forEach((review: any) => {
          allItems.push({
            id: review.id,
            type: 'review',
            employee_id: review.employee_id,
            template: review.template,
            scheduled_date: review.review_period_start,
            due_date: review.review_period_end,
            status: review.status,
            created_at: review.created_at,
          });
        });
      }

      // Enrich with employee data
      const employeeIds = [...new Set(allItems.map(item => item.employee_id).filter(Boolean))];
      if (employeeIds.length > 0) {
        const { data: employees } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', employeeIds);
        
        const employeesMap = new Map((employees || []).map((e: any) => [e.id, e]));
        allItems.forEach((item) => {
          item.employee = employeesMap.get(item.employee_id) || undefined;
        });
      }

      // Sort by scheduled_date or created_at (most recent first)
      allItems.sort((a, b) => {
        const dateA = a.scheduled_date || a.created_at;
        const dateB = b.scheduled_date || b.created_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      setItems(allItems);
    } catch (error) {
      console.error('Error fetching team reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => 
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (!isManager) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-12 text-center">
        <Users className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
        <p className="text-white font-medium">Access Restricted</p>
        <p className="text-neutral-400 text-sm mt-1">You need manager permissions to view team reviews</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EC4899]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Reviews</h1>
          <p className="text-neutral-400">Manage reviews for your team members</p>
        </div>
        <Link
          href="/dashboard/people/reviews/schedule"
          className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] rounded-lg hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out"
        >
          <Calendar className="w-5 h-5" />
          Schedule Review
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-12 text-center">
          <Users className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <p className="text-white font-medium">No team reviews</p>
          <p className="text-neutral-400 text-sm mt-1">Schedule a review to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const href = item.type === 'review' 
              ? `/dashboard/people/reviews/${item.id}`
              : `/dashboard/people/reviews/schedule`; // Could link to schedule detail if we create that page
            
            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={href}
                className="block bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:border-white/[0.1] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#EC4899] to-blue-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                    {item.employee?.avatar_url ? (
                      <img src={item.employee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(item.employee?.full_name || 'Employee')
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium">{item.employee?.full_name || 'Employee'}</h3>
                      {item.type === 'schedule' && (
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs border border-blue-500/30">
                          Scheduled
                        </span>
                      )}
                      {item.type === 'review' && (
                        <span className="px-2 py-0.5 bg-[#EC4899]/10 text-[#EC4899] rounded text-xs border border-[#EC4899]/30">
                          {item.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-400 text-sm">{item.template?.name || 'Review'}</p>
                    <div className="flex items-center gap-4 mt-1">
                      {item.scheduled_date && (
                        <p className="text-neutral-500 text-xs flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.scheduled_date).toLocaleDateString('en-GB', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </p>
                      )}
                      {item.type === 'schedule' && item.status === 'scheduled' && (
                        <p className="text-neutral-500 text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Upcoming
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-500" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

