'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  Users,
  CalendarDays,
  Clock,
  GraduationCap,
  UserPlus,
  Briefcase,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  Calendar,
  Target,
  Wallet,
} from 'lucide-react';

interface DashboardStats {
  total_employees: number;
  active_employees: number;
  on_leave_today: number;
  pending_leave_requests: number;
  expiring_training: number;
  active_onboardings: number;
  open_jobs: number;
  pending_applications: number;
  clocked_in_today: number;
  birthdays_this_week: number;
  anniversaries_this_week: number;
}

interface QuickAction {
  label: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

interface Alert {
  type: 'warning' | 'info' | 'success';
  message: string;
  href?: string;
  count?: number;
}

export default function TeamlyDashboard() {
  const { profile } = useAppContext();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [recentJoiners, setRecentJoiners] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [anniversaries, setAnniversaries] = useState<any[]>([]);

  const isManager = profile?.app_role && ['admin', 'owner', 'manager'].includes(profile.app_role.toLowerCase());

  useEffect(() => {
    if (profile?.company_id) {
      fetchDashboardData();
    } else if (profile && !profile.company_id) {
      // Profile loaded but no company_id - stop loading
      setLoading(false);
      console.warn('Profile loaded but no company_id:', profile);
    } else if (!profile) {
      // Still loading profile
      setLoading(true);
    }
  }, [profile?.company_id, profile]);

  const fetchDashboardData = async () => {
    if (!profile?.company_id) {
      console.warn('Cannot fetch dashboard data: no company_id');
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      // Fetch stats - use RPC function for employees, direct queries for others
      // Wrap promises to handle errors properly
      const employeesPromise = supabase.rpc('get_company_profiles', { p_company_id: profile.company_id })
        .then(result => ({ data: result.data || [], error: result.error }))
        .catch(() => ({ data: [], error: null }));
      
      const leavePromise = supabase.from('leave_requests')
        .select('id, status')
        .eq('company_id', profile?.company_id)
        .eq('status', 'pending')
        .then(r => r)
        .catch(() => ({ data: [], error: null }));
      
      // Training records: expiring within 30 days
      // Use RPC function to avoid PostgREST duplicate column filter issues
      // Note: Function may not exist if migration hasn't been run - handle gracefully
      // Check if function is known to be broken (cached in sessionStorage)
      const functionBrokenKey = 'get_expiring_training_broken';
      const isFunctionBroken = typeof window !== 'undefined' && sessionStorage.getItem(functionBrokenKey) === 'true';
      
      const trainingPromise = isFunctionBroken 
        ? Promise.resolve({ data: [], error: null })
        : supabase.rpc('get_expiring_training', {
            p_company_id: profile.company_id,
            p_days_ahead: 30
          })
        .then(r => {
          // If function doesn't exist (404) or bad request (400), return empty array
          if (r.error) {
            const errorStr = JSON.stringify(r.error).toLowerCase();
            const errorCode = r.error.code || '';
            const errorMessage = (r.error.message || '').toLowerCase();
            const errorDetails = (r.error.details || '').toLowerCase();
            const errorHint = (r.error.hint || '').toLowerCase();
            
            // Check if error object is empty (common with 400 errors)
            const isEmptyError = Object.keys(r.error).length === 0 || errorStr === '{}';
            
            // Check for 404 or 400 errors in various formats
            const is404 = errorCode === 'PGRST116' || 
                         errorMessage.includes('404') || 
                         errorMessage.includes('not found') ||
                         errorStr.includes('404') ||
                         errorStr.includes('not found');
            
            const is400 = isEmptyError ||
                         errorCode === 'PGRST204' || 
                         errorMessage.includes('400') || 
                         errorMessage.includes('bad request') ||
                         errorDetails.includes('400') ||
                         errorHint.includes('400') ||
                         errorStr.includes('400') ||
                         errorStr.includes('bad request');
            
            // Check for PostgreSQL schema errors (42703 = undefined_column, 42883 = undefined_function, etc.)
            const isSchemaError = errorCode === '42703' || // undefined_column
                                 errorCode === '42883' || // undefined_function
                                 errorCode === '42P01' ||  // undefined_table
                                 errorMessage.includes('does not exist') ||
                                 errorMessage.includes('column') && errorMessage.includes('does not exist');
            
            // If it's a 400, 404, or schema error, silently handle it (don't log)
            // Also cache that the function is broken to avoid future calls
            if (is404 || is400 || isSchemaError) {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(functionBrokenKey, 'true');
              }
              return { data: [], error: null };
            }
            // Only log unexpected errors
            console.error('Error fetching expiring training:', r.error);
            return { data: [], error: null };
          }
          return { data: r.data || [], error: null };
        })
        .catch((err) => {
          // Silently handle missing function (404) or bad request (400) errors
          const errorStr = JSON.stringify(err || {}).toLowerCase();
          const errorCode = err?.code || '';
          const errorMessage = (err?.message || '').toLowerCase();
          
          const is404 = errorCode === 'PGRST116' || 
                       errorMessage.includes('404') || 
                       errorMessage.includes('not found') ||
                       errorStr.includes('404') ||
                       errorStr.includes('not found');
          
          const is400 = errorCode === 'PGRST204' || 
                       errorMessage.includes('400') || 
                       errorMessage.includes('bad request') ||
                       errorStr.includes('400') ||
                       errorStr.includes('bad request');
          
          // Check for PostgreSQL schema errors
          const isSchemaError = errorCode === '42703' || // undefined_column
                               errorCode === '42883' || // undefined_function
                               errorCode === '42P01' ||  // undefined_table
                               errorMessage.includes('does not exist') ||
                               (errorMessage.includes('column') && errorMessage.includes('does not exist'));
          
          // If it's a 400, 404, or schema error, silently handle it
          // Also cache that the function is broken to avoid future calls
          if (is404 || is400 || isSchemaError) {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem(functionBrokenKey, 'true');
            }
            return { data: [], error: null };
          }
          // Only log unexpected errors
          console.error('Error fetching expiring training:', err);
          return { data: [], error: null };
        });
      
      // Jobs table may not exist - handle gracefully
      const jobsPromise = supabase.from('jobs')
        .select('id')
        .eq('company_id', profile?.company_id)
        .eq('status', 'open')
        .then(r => r)
        .catch(() => ({ data: [], error: null }));
      
      // Time entries: completed entries for today (clock_out is not null)
      // Extract date from clock_in timestamp using gte/lte range
      const now = new Date();
      const todayStartISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
      const todayEndISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      const timeEntriesPromise = supabase.from('time_entries')
        .select('id')
        .eq('company_id', profile?.company_id)
        .gte('clock_in', todayStartISO)
        .lte('clock_in', todayEndISO)
        .not('clock_out', 'is', null)
        .then(r => r)
        .catch(() => ({ data: [], error: null }));

      const [
        employeesRes,
        leaveRes,
        trainingRes,
        jobsRes,
        timeEntriesRes,
      ] = await Promise.all([
        employeesPromise,
        leavePromise,
        trainingPromise,
        jobsPromise,
        timeEntriesPromise,
      ]);
      
      // Get onboarding count from employees array
      const onboardingRes = { 
        data: (employeesRes.data || []).filter((e: any) => e.status === 'onboarding').map((e: any) => ({ id: e.profile_id || e.id })) 
      };

      // Handle RPC function result - it returns an array directly
      const employees = Array.isArray(employeesRes.data) ? employeesRes.data : [];
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Normalize today to start and end of day for date comparisons
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      // Check who's on leave today
      const leaveTodayResult = await supabase
        .from('leave_requests')
        .select('id')
        .eq('company_id', profile?.company_id)
        .eq('status', 'approved')
        .lte('start_date', todayStr)
        .gte('end_date', todayStr)
        .then(r => r)
        .catch(() => ({ data: null, error: null }));
      const leaveToday = leaveTodayResult.data;

      // Calculate Recent Joiners (in probation - last 90 days)
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      ninetyDaysAgo.setHours(0, 0, 0, 0); // Reset to start of day
      
      const recentJoinersList = employees
        .filter((e: any) => {
          if (!e.start_date) return false;
          const startDate = new Date(e.start_date);
          startDate.setHours(0, 0, 0, 0); // Normalize to start of day
          return startDate >= ninetyDaysAgo && startDate <= todayEnd;
        })
        .sort((a: any, b: any) => {
          const dateA = new Date(a.start_date || 0);
          const dateB = new Date(b.start_date || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5); // Show up to 5 most recent
      setRecentJoiners(recentJoinersList);

      // Calculate Birthdays this week (next 7 days)
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + 7); // Next 7 days
      weekEnd.setHours(23, 59, 59, 999);
      
      const birthdaysList = employees
        .filter((e: any) => {
          if (!e.date_of_birth) return false;
          const birthDate = new Date(e.date_of_birth);
          // Handle invalid dates
          if (isNaN(birthDate.getTime())) return false;
          
          const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
          const nextYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
          
          // Check if birthday falls within the next 7 days (handling year rollover)
          const checkDate = thisYearBirthday < todayStart ? nextYearBirthday : thisYearBirthday;
          return checkDate >= todayStart && checkDate <= weekEnd;
        })
        .sort((a: any, b: any) => {
          const dateA = new Date(a.date_of_birth || 0);
          const dateB = new Date(b.date_of_birth || 0);
          // Sort by month and day only (ignore year)
          const monthDayA = dateA.getMonth() * 100 + dateA.getDate();
          const monthDayB = dateB.getMonth() * 100 + dateB.getDate();
          return monthDayA - monthDayB;
        });
      setBirthdays(birthdaysList);

      // Calculate Anniversaries this month (based on start_date)
      // Only show anniversaries where at least one year has passed since start date
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      
      const anniversariesList = employees
        .filter((e: any) => {
          if (!e.start_date) return false;
          const startDate = new Date(e.start_date);
          startDate.setHours(0, 0, 0, 0);
          // Handle invalid dates
          if (isNaN(startDate.getTime())) return false;
          
          // Calculate the anniversary date for this year (same month/day, current year)
          const thisYearAnniversary = new Date(today.getFullYear(), startDate.getMonth(), startDate.getDate());
          thisYearAnniversary.setHours(0, 0, 0, 0);
          
          // Check if anniversary date falls within this month
          const isInThisMonth = thisYearAnniversary >= monthStart && thisYearAnniversary <= monthEnd;
          
          if (!isInThisMonth) return false;
          
          // CRITICAL: Only show if the start date was at least one year ago
          // Calculate the date that is exactly one year after the start date
          const oneYearAfterStart = new Date(startDate);
          oneYearAfterStart.setFullYear(startDate.getFullYear() + 1);
          oneYearAfterStart.setHours(0, 0, 0, 0);
          
          // The one-year mark must have passed (be today or in the past)
          // This ensures we only show actual anniversaries, not people who just started
          // Compare with todayStart (normalized to start of day) to ensure accurate comparison
          const hasReachedOneYear = oneYearAfterStart.getTime() <= todayStart.getTime();
          
          return hasReachedOneYear;
        })
        .sort((a: any, b: any) => {
          const dateA = new Date(a.start_date || 0);
          const dateB = new Date(b.start_date || 0);
          // Sort by month and day only (ignore year)
          const monthDayA = dateA.getMonth() * 100 + dateA.getDate();
          const monthDayB = dateB.getMonth() * 100 + dateB.getDate();
          return monthDayA - monthDayB;
        });
      setAnniversaries(anniversariesList);

      setStats({
        total_employees: employees.length,
        active_employees: employees.filter(e => e.status === 'active').length,
        on_leave_today: leaveToday?.length || 0,
        pending_leave_requests: leaveRes.data?.length || 0,
        expiring_training: Array.isArray(trainingRes.data) ? trainingRes.data.length : 0,
        active_onboardings: onboardingRes.data?.length || 0,
        open_jobs: jobsRes.data?.length || 0,
        pending_applications: 0,
        clocked_in_today: timeEntriesRes.data?.length || 0,
        birthdays_this_week: birthdaysList.length,
        anniversaries_this_week: anniversariesList.length,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions: QuickAction[] = [
    { label: 'Add Employee', href: '/dashboard/people/directory/new', icon: UserPlus, color: 'from-green-500 to-emerald-600' },
    { label: 'Request Leave', href: '/dashboard/people/leave/request', icon: CalendarDays, color: 'from-blue-500 to-cyan-600' },
    { label: 'View Schedule', href: '/dashboard/people/schedule', icon: Calendar, color: 'from-purple-500 to-violet-600' },
    { label: 'Record Training', href: '/dashboard/people/training/record', icon: GraduationCap, color: 'from-amber-500 to-orange-600' },
  ];

  const managerActions: QuickAction[] = [
    { label: 'Approve Leave', href: '/dashboard/people/leave', icon: CheckCircle, color: 'from-green-500 to-emerald-600' },
    { label: 'View Timesheets', href: '/dashboard/people/attendance/signoff', icon: Clock, color: 'from-blue-500 to-cyan-600' },
    { label: 'Post Job', href: '/dashboard/people/recruitment/jobs/new', icon: Briefcase, color: 'from-purple-500 to-violet-600' },
    { label: 'Start Onboarding', href: '/dashboard/people/onboarding', icon: UserPlus, color: 'from-[#EC4899] to-pink-600' },
  ];

  const getAlerts = (): Alert[] => {
    const alerts: Alert[] = [];
    
    if (stats?.pending_leave_requests && stats.pending_leave_requests > 0) {
      alerts.push({
        type: 'warning',
        message: `${stats.pending_leave_requests} leave request${stats.pending_leave_requests > 1 ? 's' : ''} pending approval`,
        href: '/dashboard/people/leave',
        count: stats.pending_leave_requests,
      });
    }
    
    if (stats?.expiring_training && stats.expiring_training > 0) {
      alerts.push({
        type: 'warning',
        message: `${stats.expiring_training} training certificate${stats.expiring_training > 1 ? 's' : ''} expiring soon`,
        href: '/dashboard/people/training',
        count: stats.expiring_training,
      });
    }
    
    if (stats?.active_onboardings && stats.active_onboardings > 0) {
      alerts.push({
        type: 'info',
        message: `${stats.active_onboardings} employee${stats.active_onboardings > 1 ? 's' : ''} currently onboarding`,
        href: '/dashboard/people/onboarding',
        count: stats.active_onboardings,
      });
    }
    
    return alerts;
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EC4899]" />
      </div>
    );
  }

  if (!profile?.company_id) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">People Dashboard</h1>
          <p className="text-neutral-400 mt-2">
            Your profile is not linked to a company. Please contact an administrator to get access.
          </p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-200 mb-2">Account Setup Required</h3>
              <p className="text-neutral-300 text-sm mb-4">
                Your account needs to be linked to a company before you can access the People dashboard.
              </p>
              <div className="text-sm text-neutral-400">
                <p><strong>Profile ID:</strong> {profile?.id || 'Not loaded'}</p>
                <p><strong>Email:</strong> {profile?.email || 'Not loaded'}</p>
                <p><strong>Company ID:</strong> {profile?.company_id || 'Not set'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const alerts = getAlerts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">People Dashboard</h1>
        <p className="text-neutral-400">
          Welcome back, {profile?.full_name?.split(' ')[0]}. Here's what's happening with your team.
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Link
              key={index}
              href={alert.href || '#'}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                alert.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50'
                  : alert.type === 'info'
                  ? 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50'
                  : 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                alert.type === 'warning' ? 'text-amber-400' :
                alert.type === 'info' ? 'text-blue-400' : 'text-green-400'
              }`} />
              <span className={`flex-1 ${
                alert.type === 'warning' ? 'text-amber-200' :
                alert.type === 'info' ? 'text-blue-200' : 'text-green-200'
              }`}>
                {alert.message}
              </span>
              <ArrowRight className="w-4 h-4 text-neutral-500" />
            </Link>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link 
          href="/dashboard/people/employees"
          className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:border-[#EC4899]/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
            <Users className="w-4 h-4" />
            Total Employees
          </div>
          <p className="text-2xl font-bold text-white">{stats?.active_employees || 0}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {stats?.total_employees || 0} total records
          </p>
        </Link>

        <Link 
          href="/dashboard/people/leave"
          className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:border-[#EC4899]/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
            <CalendarDays className="w-4 h-4" />
            On Leave Today
          </div>
          <p className="text-2xl font-bold text-white">{stats?.on_leave_today || 0}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {stats?.pending_leave_requests || 0} pending requests
          </p>
        </Link>

        <Link 
          href="/dashboard/people/training"
          className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:border-[#EC4899]/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
            <GraduationCap className="w-4 h-4" />
            Training
          </div>
          <p className={`text-2xl font-bold ${stats?.expiring_training ? 'text-amber-400' : 'text-white'}`}>
            {stats?.expiring_training || 0}
          </p>
          <p className="text-xs text-neutral-500 mt-1">expiring in 30 days</p>
        </Link>

        <Link 
          href="/dashboard/people/recruitment"
          className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:border-[#EC4899]/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
            <Briefcase className="w-4 h-4" />
            Open Positions
          </div>
          <p className="text-2xl font-bold text-white">{stats?.open_jobs || 0}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {stats?.pending_applications || 0} new applicants
          </p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Employee Quick Actions */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
          <h2 className="font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 p-4 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-neutral-300 text-center">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Manager Quick Actions */}
        {isManager && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
            <h2 className="font-semibold text-white mb-4">Manager Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {managerActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center gap-2 p-4 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm text-neutral-300 text-center">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Recent Joiners */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="font-semibold text-white">Recent Joiners</h2>
            <Link href="/dashboard/people/employees?sort=start_date" className="text-sm text-[#EC4899] hover:underline">
              View all
            </Link>
          </div>
          <div className="p-4">
            {recentJoiners.length > 0 ? (
              <div className="space-y-2">
                {recentJoiners.map((joiner: any) => (
                  <Link
                    key={joiner.id || joiner.profile_id}
                    href={`/dashboard/people/${joiner.id || joiner.profile_id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.05] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-[#EC4899] transition-colors">
                        {joiner.full_name || joiner.name || 'Unknown'}
                      </p>
                      {joiner.start_date && (
                        <p className="text-xs text-neutral-400">
                          Started {new Date(joiner.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-sm text-center py-4">No recent joiners</p>
            )}
          </div>
        </div>

        {/* Upcoming Birthdays */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="font-semibold text-white">🎂 Birthdays</h2>
            <span className="text-sm text-neutral-500">This week</span>
          </div>
          <div className="p-4">
            {birthdays.length > 0 ? (
              <div className="space-y-2">
                {birthdays.map((person: any) => {
                  const birthDate = new Date(person.date_of_birth);
                  const today = new Date();
                  const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
                  const isToday = thisYearBirthday.toDateString() === today.toDateString();
                  const birthdayStr = thisYearBirthday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  
                  return (
                    <Link
                      key={person.id || person.profile_id}
                      href={`/dashboard/people/${person.id || person.profile_id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.05] transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-[#EC4899] transition-colors">
                          {person.full_name || person.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {isToday ? 'Today!' : birthdayStr}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-neutral-500 text-sm text-center py-4">No birthdays this week</p>
            )}
          </div>
        </div>

        {/* Anniversaries */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="font-semibold text-white">🎉 Anniversaries</h2>
            <span className="text-sm text-neutral-500">This month</span>
          </div>
          <div className="p-4">
            {anniversaries.length > 0 ? (
              <div className="space-y-2">
                {anniversaries.map((person: any) => {
                  const startDate = new Date(person.start_date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  // Calculate years of service correctly
                  // Check if the anniversary date has passed this year
                  const thisYearAnniversary = new Date(today.getFullYear(), startDate.getMonth(), startDate.getDate());
                  thisYearAnniversary.setHours(0, 0, 0, 0);
                  
                  let yearsOfService = today.getFullYear() - startDate.getFullYear();
                  // If anniversary hasn't passed this year, subtract 1
                  if (thisYearAnniversary > today) {
                    yearsOfService = yearsOfService - 1;
                  }
                  // Ensure it's not negative
                  yearsOfService = Math.max(0, yearsOfService);
                  
                  const isToday = thisYearAnniversary.getTime() === today.getTime();
                  const anniversaryStr = thisYearAnniversary.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  
                  return (
                    <Link
                      key={person.id || person.profile_id}
                      href={`/dashboard/people/${person.id || person.profile_id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.05] transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-[#EC4899] transition-colors">
                          {person.full_name || person.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {isToday ? `${yearsOfService} year${yearsOfService !== 1 ? 's' : ''} today!` : `${anniversaryStr} (${yearsOfService} year${yearsOfService !== 1 ? 's' : ''})`}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-neutral-500 text-sm text-center py-4">No anniversaries this month</p>
            )}
          </div>
        </div>
      </div>

      {/* Module Cards - Entry points to each section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { 
            title: 'Leave Management', 
            description: 'Request time off, view balances, team calendar',
            href: '/dashboard/people/leave',
            icon: CalendarDays,
            color: 'from-blue-500 to-cyan-600'
          },
          { 
            title: 'Scheduling', 
            description: 'View rotas, set availability, swap shifts',
            href: '/dashboard/people/schedule',
            icon: Calendar,
            color: 'from-purple-500 to-violet-600'
          },
          { 
            title: 'Training & Certs', 
            description: 'Track training, compliance matrix, certifications',
            href: '/dashboard/people/training',
            icon: GraduationCap,
            color: 'from-amber-500 to-orange-600'
          },
          { 
            title: 'Performance', 
            description: 'Reviews, goals, 1:1 meetings',
            href: '/dashboard/people/reviews',
            icon: Target,
            color: 'from-green-500 to-emerald-600'
          },
          { 
            title: 'Time & Attendance', 
            description: 'Clock in/out, timesheets, hours worked',
            href: '/dashboard/people/attendance',
            icon: Clock,
            color: 'from-rose-500 to-pink-600'
          },
          { 
            title: 'Company Directory', 
            description: 'Find colleagues, org chart, contact info',
            href: '/dashboard/people/employees',
            icon: Users,
            color: 'from-teal-500 to-cyan-600'
          },
        ].map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:border-[#EC4899]/50 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center flex-shrink-0`}>
                <module.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white group-hover:text-[#EC4899] transition-colors">
                  {module.title}
                </h3>
                <p className="text-sm text-neutral-500 mt-1">{module.description}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-neutral-600 group-hover:text-[#EC4899] transition-colors flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
