'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Download, Printer, ArrowLeft, GraduationCap, AlertTriangle } from '@/components/ui/icons';
import { PASS_MARK_PERCENTAGE } from '@/lib/quiz-utils';
import { COURSE_MAPPINGS } from '@/lib/certificates/courseMapping';

const COURSE_TITLES: Record<string, string> = Object.fromEntries(
  COURSE_MAPPINGS.map(m => [m.courseId, m.courseName])
);

interface CourseResultsClientProps {
  courseId: string;
  trainingRecordId: string | null;
  certificateNumber: string | null;
  scorePercentage: number;
  passed: boolean;
  error: string | null;
}

export function CourseResultsClient({
  courseId,
  trainingRecordId,
  certificateNumber,
  scorePercentage,
  passed,
  error,
}: CourseResultsClientProps) {
  const courseTitle = COURSE_TITLES[courseId] || courseId;
  const completionDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6 print:max-w-none print:p-0">
        {/* Print Header - only visible when printing */}
        <div className="hidden print:block text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Course Completion Certificate</h1>
          <div className="w-24 h-1 bg-[#D37E91] mx-auto" />
        </div>

        {/* Status Icon */}
        <div className="text-center print:hidden">
          {passed ? (
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-green-500" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle size={40} className="text-red-500" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-2">
            {passed ? 'Congratulations!' : 'Not Passed'}
          </h1>
          <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
            {passed
              ? 'You have successfully completed the course.'
              : `You need ${PASS_MARK_PERCENTAGE}% to pass this course.`}
          </p>
        </div>

        {/* Score Card */}
        <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/5 border border-[rgb(var(--border))] dark:border-white/10 rounded-xl p-6 text-center print:border-black/20 print:bg-white">
          <div className={`text-6xl font-bold mb-2 ${passed ? 'text-green-500 print:text-green-700' : 'text-red-500 print:text-red-700'}`}>
            {scorePercentage}%
          </div>
          <p className="text-[rgb(var(--text-secondary))] dark:text-theme-secondary print:text-gray-600">
            Final Assessment Score
          </p>
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
              passed
                ? 'bg-green-500/10 border border-green-500/30 text-green-400 print:bg-green-50 print:text-green-700 print:border-green-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-400 print:bg-red-50 print:text-red-700 print:border-red-300'
            }`}>
              {passed ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {passed ? 'Passed' : 'Not Passed'}
            </span>
          </div>
        </div>

        {/* Course Details */}
        <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/5 border border-[rgb(var(--border))] dark:border-white/10 rounded-xl p-6 space-y-4 print:border-black/20 print:bg-white">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap size={20} className="text-[#D37E91]" />
            <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white print:text-black">
              Course Details
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary print:text-gray-500">Course</p>
              <p className="font-medium text-[rgb(var(--text-primary))] dark:text-white print:text-black">{courseTitle}</p>
            </div>
            <div>
              <p className="text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary print:text-gray-500">Date</p>
              <p className="font-medium text-[rgb(var(--text-primary))] dark:text-white print:text-black">{completionDate}</p>
            </div>
            {certificateNumber && (
              <div>
                <p className="text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary print:text-gray-500">Certificate No.</p>
                <p className="font-medium text-[rgb(var(--text-primary))] dark:text-white print:text-black">{certificateNumber}</p>
              </div>
            )}
            <div>
              <p className="text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary print:text-gray-500">Pass Mark</p>
              <p className="font-medium text-[rgb(var(--text-primary))] dark:text-white print:text-black">{PASS_MARK_PERCENTAGE}%</p>
            </div>
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl print:hidden">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200">
              <p className="font-medium mb-1">Note</p>
              <p className="text-amber-200/80">
                There was an issue recording your completion: {error}.
                Please contact your manager if your certificate does not appear.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 print:hidden">
          {passed && trainingRecordId && (
            <>
              <a
                href={`/api/certificates/${trainingRecordId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#D37E91] hover:bg-[#c06b7e] text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download Certificate (PDF)
              </a>
              <button
                onClick={() => window.print()}
                className="w-full py-3 border border-[rgb(var(--border))] dark:border-white/10 hover:bg-[rgb(var(--surface))] dark:hover:bg-white/5 text-[rgb(var(--text-primary))] dark:text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Print Results
              </button>
            </>
          )}

          {!passed && (
            <Link
              href={`/learn/${courseId}`}
              className="w-full py-3 bg-[#D37E91] hover:bg-[#c06b7e] text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              Retry Course
            </Link>
          )}

          <Link
            href="/dashboard/my-training"
            className="w-full py-3 text-center border border-[rgb(var(--border))] dark:border-white/10 hover:bg-[rgb(var(--surface))] dark:hover:bg-white/5 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary rounded-xl font-medium transition-colors text-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Return to My Training
          </Link>
        </div>
      </div>
    </div>
  );
}
