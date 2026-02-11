'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Calendar, Plus, Video, MapPin, Clock, MessageSquare, ChevronRight } from '@/components/ui/icons';
import type { OneOnOneView } from '@/types/teamly';

export default function OneOnOnesPage() {
  const { profile } = useAppContext();
  const [meetings, setMeetings] = useState<OneOnOneView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  
  const isManager = profile?.app_role && ['admin', 'owner', 'manager'].includes(profile.app_role.toLowerCase());

  useEffect(() => {
    if (profile?.id) {
      fetchMeetings();
    }
  }, [profile?.id, showPast]);

  const fetchMeetings = async () => {
    setLoading(true);
    
    let query = supabase
      .from('one_on_one_view')
      .select('*')
      .or(`employee_id.eq.${profile?.id},manager_id.eq.${profile?.id}`);
    
    if (!showPast) {
      query = query.gte('scheduled_date', new Date().toISOString().split('T')[0]);
    }
    
    const { data } = await query.order('scheduled_date').order('scheduled_time');
    setMeetings(data || []);
    setLoading(false);
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const formatTime = (time: string | null) => {
    if (!time) return '';
    return time.slice(0, 5);
  };

  const isMyMeeting = (meeting: OneOnOneView) => meeting.employee_id === profile?.id;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D37E91]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">1:1 Meetings</h1>
          <p className="text-gray-500 dark:text-white/60">Schedule and track one-on-one conversations</p>
        </div>
        {isManager && (
          <Link
            href="/dashboard/people/reviews/1on1s/schedule"
            className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#D37E91] text-[#D37E91] rounded-lg hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] transition-all duration-200 ease-in-out"
          >
            <Plus className="w-5 h-5" />
            Schedule 1:1
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowPast(!showPast)}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            showPast 
              ? 'bg-transparent border border-[#D37E91] text-[#D37E91]' 
              : 'bg-white/[0.03] border border-white/[0.06] text-gray-500 dark:text-white/60 hover:text-white'
          }`}
        >
          {showPast ? 'Showing All' : 'Upcoming Only'}
        </button>
      </div>

      {/* Meetings List */}
      <div className="space-y-4">
        {meetings.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-12 text-center">
            <Calendar className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
            <p className="text-white font-medium">No 1:1 meetings scheduled</p>
            <p className="text-gray-500 dark:text-white/60 text-sm mt-1">
              {isManager ? 'Schedule a 1:1 with your team members' : 'Your manager will schedule 1:1s with you'}
            </p>
          </div>
        ) : (
          meetings.map((meeting) => {
            const isPast = new Date(meeting.scheduled_date) < new Date();
            const otherPerson = isMyMeeting(meeting) ? meeting.manager_name : meeting.employee_name;
            const otherAvatar = isMyMeeting(meeting) ? null : meeting.employee_avatar;
            
            return (
              <Link
                key={meeting.meeting_id}
                href={`/dashboard/people/reviews/1on1s/${meeting.meeting_id}`}
                className={`block bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:border-white/[0.1] transition-colors ${
                  isPast ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D37E91] to-blue-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                    {otherAvatar ? (
                      <img src={otherAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(otherPerson)
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">1:1 with {otherPerson}</p>
                      {meeting.is_recurring && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs border border-blue-500/30">
                          {meeting.recurrence_pattern}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-white/60">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(meeting.scheduled_date).toLocaleDateString('en-GB', { 
                          weekday: 'short', day: 'numeric', month: 'short' 
                        })}
                        {meeting.scheduled_time && ` at ${formatTime(meeting.scheduled_time)}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {meeting.duration_minutes} min
                      </span>
                      {meeting.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {meeting.location}
                        </span>
                      )}
                      {meeting.meeting_link && (
                        <span className="flex items-center gap-1 text-blue-400">
                          <Video className="w-4 h-4" />
                          Video call
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    {meeting.pending_topics > 0 && (
                      <span className="flex items-center gap-1 text-amber-400 text-sm">
                        <MessageSquare className="w-4 h-4" />
                        {meeting.pending_topics} topics
                      </span>
                    )}
                    <span className={`text-xs ${
                      meeting.status === 'completed' ? 'text-green-400' :
                      meeting.status === 'cancelled' ? 'text-red-400' :
                      'text-neutral-500'
                    }`}>
                      {meeting.status}
                    </span>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-neutral-500 flex-shrink-0" />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

