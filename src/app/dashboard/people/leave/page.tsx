'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight
} from '@/components/ui/icons';
import type { LeaveBalanceView, LeaveRequestView, LeaveCalendarEvent } from '@/types/teamly';

export default function LeaveManagementPage() {
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  const [myBalances, setMyBalances] = useState<LeaveBalanceView[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequestView[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<LeaveCalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'calendar' | 'requests'>('calendar');
  
  // Check if user is a manager/admin/owner (case-insensitive)
  const isManager = profile?.app_role && ['admin', 'owner', 'manager'].includes((profile.app_role || '').toLowerCase());
  // Admins and owners can approve their own requests
  const isAdminOrOwner = profile?.app_role && ['admin', 'owner'].includes((profile.app_role || '').toLowerCase());
  
  // Debug logging
  useEffect(() => {
    if (profile) {
      console.log('[Leave Management] Profile loaded:', {
        app_role: profile.app_role,
        isManager,
        profile_id: profile.id,
        company_id: companyId
      });
    }
  }, [profile, isManager]);
  
  useEffect(() => {
    if (pendingRequests.length > 0) {
      console.log('[Leave Management] Pending requests:', {
        count: pendingRequests.length,
        requests: pendingRequests.map(r => ({
          id: r.id,
          employee_name: r.employee_name,
          profile_id: r.profile_id,
          current_profile_id: profile?.id,
          canApprove: isManager && r.profile_id !== profile?.id
        }))
      });
    }
  }, [pendingRequests, profile?.id, isManager]);

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId, currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchMyBalances(),
      fetchPendingRequests(),
      fetchCalendarEvents(),
    ]);
    setLoading(false);
  };

  const fetchMyBalances = async () => {
    if (!profile?.id) return;
    
    const { data } = await supabase
      .from('leave_balances_view')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('year', new Date().getFullYear());
    
    setMyBalances(data || []);
  };

  const fetchPendingRequests = async () => {
    if (!companyId) return;
    
    let query = supabase
      .from('leave_requests_view')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });
    
    if (!isManager) {
      query = query.eq('profile_id', profile.id);
    }
    
    const { data } = await query;
    setPendingRequests(data || []);
  };

  const fetchCalendarEvents = async () => {
    if (!companyId) return;
    
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Get all approved/taken leave that overlaps with the current month view
    // A leave overlaps if: start_date <= endOfMonth AND end_date >= startOfMonth
    const { data, error } = await supabase
      .from('leave_calendar_view')
      .select('*')
      .eq('company_id', companyId)
      .lte('start_date', endOfMonth.toISOString().split('T')[0])
      .gte('end_date', startOfMonth.toISOString().split('T')[0]);
    
    if (error) {
      console.error('Error fetching calendar events:', error);
    } else {
      console.log(`[Leave Calendar] Loaded ${data?.length || 0} events for ${currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`);
    }
    
    setCalendarEvents(data || []);
  };

  const handleApprove = async (requestId: string) => {
    if (!profile?.id) return;
    
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ 
          status: 'approved',
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (error) {
        console.error('Error approving leave request:', error);
        showToast({
          title: 'Failed to approve request',
          description: error.message,
          type: 'error'
        });
        return;
      }
      
      showToast({
        title: 'Leave request approved',
        description: 'The leave request has been approved successfully',
        type: 'success'
      });
      
      // Refresh data to show updated status
      await fetchData();
    } catch (err: any) {
      console.error('Error approving leave request:', err);
      showToast({
        title: 'Failed to approve request',
        description: err.message || 'Unknown error occurred',
        type: 'error'
      });
    }
  };

  const handleDecline = async (requestId: string) => {
    if (!profile?.id) return;
    
    const declineReason = prompt('Please provide a reason for declining this leave request:');
    if (declineReason === null) return; // User cancelled
    
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ 
          status: 'declined',
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          decline_reason: declineReason || null
        })
        .eq('id', requestId);
      
      if (error) {
        console.error('Error declining leave request:', error);
        showToast({
          title: 'Failed to decline request',
          description: error.message,
          type: 'error'
        });
        return;
      }
      
      showToast({
        title: 'Leave request declined',
        description: 'The leave request has been declined',
        type: 'success'
      });
      
      // Refresh data to show updated status
      await fetchData();
    } catch (err: any) {
      console.error('Error declining leave request:', err);
      showToast({
        title: 'Failed to decline request',
        description: err.message || 'Unknown error occurred',
        type: 'error'
      });
    }
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    
    return days;
  };

  const getEventsForDay = (day: number) => {
    if (!day) return [];
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // Check if the date falls within the leave period (inclusive)
    return calendarEvents.filter(event => {
      return dateStr >= event.start_date && dateStr <= event.end_date;
    });
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-module-fg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Leave Management</h1>
          <p className="text-theme-secondary">Request time off and view team calendar</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/people/leave/balances"
            className="flex items-center gap-2 px-4 py-2 bg-transparent border border-theme text-theme-secondary rounded-lg hover:border-module-fg hover:text-module-fg transition-all duration-200 ease-in-out"
          >
            <Calendar className="w-5 h-5" />
            Balances
          </Link>
          <Link
            href="/dashboard/people/leave/request"
            className="flex items-center gap-2 px-4 py-2 bg-module-fg hover:bg-module-fg/90 text-white rounded-lg border-0 hover:shadow-module-glow transition-all duration-200 ease-in-out font-medium"
          >
            <Plus className="w-5 h-5" />
            Request Leave
          </Link>
        </div>
      </div>

      {/* My Balances */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {myBalances.map((balance) => (
          <div
            key={balance.id}
 className="bg-theme-surface border border-theme rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: balance.leave_type_color }}
              />
              <span className="text-sm text-theme-secondary">{balance.leave_type_name}</span>
            </div>
            <div className="text-2xl font-bold text-theme-primary">
              {balance.remaining_days}
              <span className="text-sm font-normal text-theme-secondary"> / {balance.entitled_days}</span>
            </div>
            {balance.pending_days > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{balance.pending_days} pending</p>
            )}
          </div>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView('calendar')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeView === 'calendar' 
              ? 'bg-module-fg/10 border border-module-fg text-module-fg' 
 : 'bg-theme-surface border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-hover'
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          Calendar
        </button>
        <button
          onClick={() => setActiveView('requests')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeView === 'requests' 
              ? 'bg-module-fg/10 border border-module-fg text-module-fg' 
 : 'bg-theme-surface border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-hover'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Requests
          {pendingRequests.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-amber-500 dark:bg-amber-500 text-white text-xs rounded-full font-medium">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Calendar View */}
      {activeView === 'calendar' && (
 <div className="bg-theme-surface border border-theme rounded-lg p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-theme-hover rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-theme-secondary" />
            </button>
            <h2 className="text-lg font-semibold text-theme-primary">
              {currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-theme-hover rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-theme-secondary" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm text-theme-secondary py-2">{day}</div>
            ))}
            
            {getDaysInMonth().map((day, index) => {
              const events = day ? getEventsForDay(day) : [];
              const isToday = day && 
                new Date().getDate() === day && 
                new Date().getMonth() === currentMonth.getMonth() &&
                new Date().getFullYear() === currentMonth.getFullYear();
              
              return (
                <div key={index} className={`min-h-24 p-1 border border-theme rounded ${day ? 'bg-theme-surface-elevated' : ''}`}>
                  {day && (
                    <>
                      <div className={`text-sm mb-1 ${isToday ? 'w-6 h-6 bg-module-fg rounded-full flex items-center justify-center text-white font-medium' : 'text-theme-secondary'}`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {events.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className="text-xs px-1 py-0.5 rounded truncate"
                            style={{ backgroundColor: `${event.color}30`, color: event.color }}
                            title={`${event.full_name} - ${event.leave_type_name}`}
                          >
                            {event.full_name.split(' ')[0]}
                          </div>
                        ))}
                        {events.length > 3 && (
                          <div className="text-xs text-theme-tertiary px-1">+{events.length - 3} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Requests View */}
      {activeView === 'requests' && (
 <div className="bg-theme-surface border border-theme rounded-lg overflow-hidden">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-module-fg mx-auto mb-4" />
              <p className="text-theme-primary font-medium">No pending requests</p>
              <p className="text-theme-secondary text-sm">All leave requests have been processed</p>
            </div>
          ) : (
            <div className="divide-y divide-theme">
              {pendingRequests.map((request) => (
                <div key={request.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-module-fg flex items-center justify-center text-white font-medium">
                      {request.employee_avatar ? (
                        <img src={request.employee_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        getInitials(request.employee_name)
                      )}
                    </div>
                    <div>
                      <p className="text-theme-primary font-medium">{request.employee_name}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span 
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ backgroundColor: `${request.leave_type_color}30`, color: request.leave_type_color }}
                        >
                          {request.leave_type_name}
                        </span>
                        <span className="text-theme-secondary">
                          {new Date(request.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          {request.start_date !== request.end_date && (
                            <> - {new Date(request.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</>
                          )}
                        </span>
                        <span className="text-theme-tertiary">({request.total_days} day{request.total_days !== 1 ? 's' : ''})</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Show approve/decline buttons for managers viewing other employees' requests, or admins/owners viewing their own */}
                    {(isManager && request.profile_id !== profile?.id) || (isAdminOrOwner && request.profile_id === profile?.id) ? (
                      <>
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-transparent border border-module-fg text-module-fg rounded-lg hover:shadow-module-glow dark:hover:shadow-module-glow transition-all duration-200 ease-in-out"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleDecline(request.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-transparent border border-red-500 dark:border-red-500 text-red-600 dark:text-red-400 rounded-lg hover:shadow-module-glow dark:hover:shadow-module-glow transition-all duration-200 ease-in-out"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline
                        </button>
                      </>
                    ) : request.profile_id === profile?.id && !isAdminOrOwner ? (
                      <span className="px-3 py-1 bg-amber-500/20 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-medium">Pending</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

