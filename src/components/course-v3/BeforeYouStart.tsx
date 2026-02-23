'use client';

import React, { useState, useEffect } from 'react';
import { Course } from '@/data/courses/schema';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { GraduationCap, User, MapPin, Clock, AlertCircle, BookOpen, Save } from '@/components/ui/icons';
import Link from 'next/link';

interface BeforeYouStartProps {
  course: Course;
  assignmentId?: string | null;
  onBegin: () => void;
}

interface AssignmentInfo {
  deadline_date: string | null;
  confirmation_name: string | null;
  confirmation_site_id: string | null;
  site_name: string | null;
}

export function BeforeYouStart({ course, assignmentId, onBegin }: BeforeYouStartProps) {
  const { profile, siteId } = useAppContext();
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!assignmentId);

  useEffect(() => {
    const loadData = async () => {
      // Load site name
      if (profile?.home_site || siteId) {
        const targetSiteId = profile?.home_site || siteId;
        if (targetSiteId) {
          const { data } = await supabase
            .from('sites')
            .select('name')
            .eq('id', targetSiteId)
            .maybeSingle();
          if (data) setSiteName(data.name);
        }
      }

      // Load assignment details if we have one
      if (assignmentId && profile?.id) {
        const { data } = await supabase
          .from('course_assignments')
          .select('deadline_date, confirmation_name, confirmation_site_id, site:sites!confirmation_site_id(name)')
          .eq('id', assignmentId)
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (data) {
          setAssignment({
            deadline_date: data.deadline_date,
            confirmation_name: data.confirmation_name,
            confirmation_site_id: data.confirmation_site_id,
            site_name: (data as any).site?.name || null,
          });
          if ((data as any).site?.name) setSiteName((data as any).site.name);
        }
      }
      setLoading(false);
    };

    loadData();
  }, [assignmentId, profile, siteId]);

  const userName = assignment?.confirmation_name || profile?.full_name || 'Learner';
  const displaySite = assignment?.site_name || siteName || null;

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-[#D37E91]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={32} className="text-[#D37E91]" />
          </div>
          <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-2">
            Before You Start
          </h1>
          <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
            Please confirm your details before beginning the course
          </p>
        </div>

        {/* Course Info Card */}
        <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/5 border border-[rgb(var(--border))] dark:border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-2">
            {course.title}
          </h2>
          <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-4">
            {course.description}
          </p>

          {assignment?.deadline_date && (
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <Clock size={14} />
              <span>Deadline: {new Date(assignment.deadline_date).toLocaleDateString('en-GB')}</span>
            </div>
          )}
        </div>

        {/* Identity Confirmation */}
        <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/5 border border-[rgb(var(--border))] dark:border-white/10 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
            Your Details
          </h3>

          {loading ? (
            <div className="h-16 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#D37E91]" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[rgb(var(--surface))] dark:bg-white/5 rounded-lg">
                <User size={18} className="text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary" />
                <div>
                  <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">Name</p>
                  <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">{userName}</p>
                </div>
              </div>

              {displaySite && (
                <div className="flex items-center gap-3 p-3 bg-[rgb(var(--surface))] dark:bg-white/5 rounded-lg">
                  <MapPin size={18} className="text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary" />
                  <div>
                    <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">Site</p>
                    <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">{displaySite}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Charge Notice */}
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            <p className="font-medium mb-1">Course Charge</p>
            <p className="text-amber-200/80">
              A <strong>£5 charge</strong> will be applied to{' '}
              {displaySite || 'your site'} upon successful completion of this course.
            </p>
          </div>
        </div>

        {/* Save Progress Info */}
        <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <Save size={20} className="text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-medium mb-1">Save & Resume</p>
            <p className="text-blue-200/80">
              Your progress can be saved and you can return to complete the course at a later time if needed.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onBegin}
            disabled={loading}
            className="w-full py-3 bg-[#D37E91] hover:bg-[#c06b7e] disabled:opacity-50 text-white rounded-xl font-bold transition-colors text-lg flex items-center justify-center gap-2"
          >
            <BookOpen size={20} />
            Begin Course
          </button>
          <Link
            href="/dashboard/courses"
            className="w-full py-3 text-center border border-[rgb(var(--border))] dark:border-white/10 hover:bg-[rgb(var(--surface))] dark:hover:bg-white/5 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary rounded-xl font-medium transition-colors text-sm"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
