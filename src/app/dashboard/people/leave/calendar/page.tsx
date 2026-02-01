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
          <h1 className="text-2xl font-bold text-theme-primary">Team Calendar</h1>
          <p className="text-gray-600 dark:text-white/70 mt-1">View all scheduled reviews and meetings</p>
        </div>
      </div>

      <div className="bg-white dark:bg-white/[0.05] border border-theme rounded-lg p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-theme-primary flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-gray-600 dark:text-white/70 hover:text-theme-primary hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm text-gray-600 dark:text-white/70 hover:text-theme-primary hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-gray-600 dark:text-white/70 hover:text-theme-primary hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded-lg transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 dark:text-white/70 border-b border-theme">
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
                  className={`min-h-[100px] p-2 border border-theme ${
                    isCurrentMonthDay ? 'bg-gray-50 dark:bg-white/[0.03]' : 'bg-white dark:bg-white/[0.05]'
                  } ${isTodayDay ? 'ring-2 ring-blue-500 dark:ring-blue-500' : ''}`}
                >
                  <div className={`text-sm mb-1 ${isCurrentMonthDay ? 'text-theme-primary' : 'text-theme-tertiary'} ${isTodayDay ? 'font-bold text-blue-600 dark:text-blue-400' : ''}`}>
                    {format(date, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {dayReviews.slice(0, 3).map((review) => (
                      <Link
                        key={review.id}
                        href={review.review_id ? `/dashboard/people/reviews/${review.review_id}` : `/dashboard/people/reviews`}
                        className="block text-xs p-1 rounded bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/50 hover:bg-blue-500/20 dark:hover:bg-blue-500/30 transition-colors truncate"
                        title={review.title}
                      >
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">{review.employee_name}</span>
                        </div>
                        <div className="truncate text-[10px] text-gray-600 dark:text-white/70 mt-0.5">
                          {review.title}
                        </div>
                      </Link>
                    ))}
                    {dayReviews.length > 3 && (
                      <div className="text-xs text-theme-tertiary px-1">
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

