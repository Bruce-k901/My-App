'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, BookOpen, AlertCircle } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface BookCourseFromTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  profileId: string;
  courseId: string;
  courseName: string;
  employeeName: string;
  companyId: string;
  siteId: string | null;
  managerId: string;
  onSuccess: (assignmentId: string) => void;
}

export function BookCourseFromTaskModal({
  isOpen,
  onClose,
  taskId,
  profileId,
  courseId,
  courseName,
  employeeName,
  companyId,
  siteId,
  managerId,
  onSuccess,
}: BookCourseFromTaskModalProps) {
  // Default deadline: 30 days from now
  const defaultDeadline = new Date();
  defaultDeadline.setDate(defaultDeadline.getDate() + 30);

  const [deadline, setDeadline] = useState<string>(
    defaultDeadline.toISOString().split('T')[0]
  );
  const [booking, setBooking] = useState(false);
  const [actualCourseName, setActualCourseName] = useState<string>(courseName);

  // Fetch actual course name from database
  useEffect(() => {
    if (courseId) {
      supabase
        .from('training_courses')
        .select('name')
        .eq('id', courseId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setActualCourseName(data.name);
          }
        });
    }
  }, [courseId]);

  if (!isOpen) return null;

  const handleBook = async () => {
    if (!deadline) {
      toast.error('Please select a deadline date');
      return;
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      toast.error('Invalid date');
      return;
    }

    // Don't allow dates in the past
    if (deadlineDate < new Date()) {
      toast.error('Deadline cannot be in the past');
      return;
    }

    setBooking(true);

    console.log('📤 [BOOK COURSE MODAL] Sending request:', {
      taskId,
      profileId,
      courseId,
      deadline: deadlineDate.toISOString(),
      companyId,
      siteId,
      courseName: actualCourseName
    });

    try {
      const response = await fetch('/api/training/book-course-from-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          profileId,
          courseId,
          deadline: deadlineDate.toISOString(),
          companyId,
          siteId,
        }),
      });

      console.log('📥 [BOOK COURSE MODAL] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [BOOK COURSE MODAL] API error response:', {
          status: response.status,
          statusText: response.statusText,
          error
        });
        throw new Error(error.details || error.error || `Failed to create course assignment (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ [BOOK COURSE MODAL] API success response:', data);
      
      if (!data.assignmentId) {
        console.error('❌ [BOOK COURSE MODAL] No assignment ID in response:', data);
        throw new Error('No assignment ID returned from server');
      }

      toast.success(`${employeeName} has been booked on ${actualCourseName}`);
      onSuccess(data.assignmentId);
      onClose();
    } catch (error: any) {
      console.error('Error booking course:', error);
      toast.error(error.message || 'Failed to book course');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-theme-surface rounded-lg border border-theme w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme">
          <h2 className="text-xl font-semibold text-theme-primary">Book Course</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            disabled={booking}
          >
            <X className="w-5 h-5 text-theme-tertiary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-theme-tertiary mb-1">Employee</p>
            <p className="text-theme-primary font-medium">{employeeName}</p>
          </div>

          <div>
            <p className="text-sm text-theme-tertiary mb-1">Course</p>
            <p className="text-theme-primary font-medium">{actualCourseName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-primary mb-2">
              Course Deadline <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-theme-primary focus:ring-2 focus:ring-[#D37E91] focus:border-transparent"
                disabled={booking}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-tertiary pointer-events-none" />
            </div>
            <p className="text-xs text-theme-tertiary mt-1">
              The employee will receive a notification to confirm and start the course
            </p>
          </div>

          {/* Charge Notice */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200 mb-1">Course Charge</p>
                <p className="text-xs text-amber-200/80">
                  A £5.00 charge will be applied to the site when {employeeName} successfully completes this course.
                </p>
              </div>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-200 mb-2">What happens next:</p>
                <ul className="text-xs text-blue-200/80 space-y-1 list-disc list-inside">
                  <li>{employeeName} will receive a message with a link to confirm enrollment</li>
                  <li>A calendar reminder will be created for the course deadline</li>
                  <li>A follow-up task will be added to your task list to track completion</li>
                  <li>Once confirmed, {employeeName} can access the course content</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-theme">
          <button
            onClick={onClose}
            disabled={booking}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-theme-primary rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleBook}
            disabled={booking || !deadline}
            className="px-4 py-2 bg-[#D37E91] hover:bg-[#D37E91]/80 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {booking ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Booking...
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                Book Course
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
