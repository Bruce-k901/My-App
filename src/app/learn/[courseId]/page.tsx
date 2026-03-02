import React from 'react';
import { CourseLayout } from '@/components/course-v3/CourseLayout';
import foodSafetyData from '@/data/courses/level2-food-safety.json';
import healthSafetyData from '@/data/courses/level2-health-and-safety.json';
import allergensData from '@/data/courses/level2-allergens.json';
import fireSafetyData from '@/data/courses/level2-fire-safety.json';
import manualHandlingData from '@/data/courses/level2-manual-handling.json';
import haccpData from '@/data/courses/level3-haccp.json';
import coshhData from '@/data/courses/level2-coshh.json';
import safeguardingData from '@/data/courses/level2-safeguarding.json';
import firstAidData from '@/data/courses/level2-first-aid.json';
import allergensAdvancedData from '@/data/courses/level2-food-allergens-advanced.json';
import { Course } from '@/data/courses/schema';

interface PageProps {
  params: Promise<{
    courseId: string;
  }>;
  searchParams: Promise<{
    assignmentId?: string;
  }>;
}

// Map of course IDs to their data
const COURSE_DATA: Record<string, unknown> = {
  'uk-l2-food-safety': foodSafetyData,
  'uk-l2-health-and-safety': healthSafetyData,
  'uk-l2-allergens': allergensData,
  'uk-l2-fire-safety': fireSafetyData,
  'uk-l2-manual-handling': manualHandlingData,
  'uk-l3-haccp': haccpData,
  'uk-l2-coshh': coshhData,
  'uk-l2-safeguarding': safeguardingData,
  'uk-l2-first-aid': firstAidData,
  'uk-l2-food-allergens-advanced': allergensAdvancedData,
};

/**
 * Learn page for v3 CourseLayout courses.
 * All courses use Learn flow only (/learn/[courseId]).
 */
export default async function CoursePage({ params, searchParams }: PageProps) {
  const { courseId } = await params;
  const { assignmentId } = await searchParams;

  const courseData = COURSE_DATA[courseId];

  if (!courseData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--background))] dark:bg-slate-900 text-[rgb(var(--text-primary))] dark:text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-4">{courseId}</p>
          <a href="/dashboard/courses" className="text-[#D37E91] dark:text-[#D37E91] hover:underline">
            Return to Courses
          </a>
        </div>
      </div>
    );
  }

  return <CourseLayout course={courseData as unknown as Course} assignmentId={assignmentId || null} />;
}

