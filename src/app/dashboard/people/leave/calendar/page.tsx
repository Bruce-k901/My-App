'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react';
import { useReviewCalendar, CalendarReview } from '@/components/reviews/ReviewCalendarIntegration';
import { useAppContext } from '@/context/AppContext';
import Link from 'next/link';

export default function TeamCalendarPage() {
  const { companyId } = useAppContext();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const { reviews, loading, getReviewsForDate } = useReviewCalendar(companyId || '');

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  
  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const formatDateKey = (date: Date) => format(date, 'yyyy-MM-dd');
  const isCurrentMonth = (date: Date) => isSameMonth(date, currentDate);
  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Calendar</h1>
          <p className="text-neutral-400 mt-1">View all scheduled reviews and meetings</p>
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#EC4899]" />
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm text-neutral-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EC4899]" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center text-sm font-medium text-neutral-400 border-b border-white/[0.06]">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((date, index) => {
              const dateKey = formatDateKey(date);
              const dayReviews = getReviewsForDate(date);
              const isCurrentMonthDay = isCurrentMonth(date);
              const isTodayDay = isToday(date);

              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 border border-white/[0.06] ${
                    isCurrentMonthDay ? 'bg-white/[0.02]' : 'bg-white/[0.01]'
                  } ${isTodayDay ? 'ring-2 ring-[#EC4899]' : ''}`}
                >
                  <div className={`text-sm mb-1 ${isCurrentMonthDay ? 'text-white' : 'text-neutral-600'} ${isTodayDay ? 'font-bold text-[#EC4899]' : ''}`}>
                    {format(date, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {dayReviews.slice(0, 3).map((review) => (
                      <Link
                        key={review.id}
                        href={review.review_id ? `/dashboard/people/reviews/${review.review_id}` : `/dashboard/people/reviews`}
                        className="block text-xs p-1 rounded bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/30 hover:bg-[#EC4899]/30 transition-colors truncate"
                        title={review.title}
                      >
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">{review.employee_name}</span>
                        </div>
                        <div className="truncate text-[10px] text-neutral-300 mt-0.5">
                          {review.title}
                        </div>
                      </Link>
                    ))}
                    {dayReviews.length > 3 && (
                      <div className="text-xs text-neutral-500 px-1">
                        +{dayReviews.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

