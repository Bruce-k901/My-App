import React from 'react';
import { CourseLayout } from '@/components/course-v3/CourseLayout';
import foodSafetyData from '@/data/courses/level2-food-safety.json';
import healthSafetyData from '@/data/courses/level2-health-and-safety.json';
import allergensData from '@/data/courses/level2-allergens.json';
import { Course } from '@/data/courses/schema';

interface PageProps {
  params: Promise<{
    courseId: string;
  }>;
}

/**
 * Learn page for v3 CourseLayout courses.
 * Food Safety, Health & Safety, and Allergen Awareness use Learn flow only.
 * Old PlayerShell (/training/courses/l2-food-hygiene/start) and selfstudy redirect → /learn/uk-l2-food-safety.
 */
export default async function CoursePage({ params }: PageProps) {
  const { courseId } = await params;

  let course: Course;
  if (courseId === 'uk-l2-food-safety') {
    course = foodSafetyData as unknown as Course;
  } else if (courseId === 'uk-l2-health-and-safety') {
    course = healthSafetyData as unknown as Course;
  } else if (courseId === 'uk-l2-allergens') {
    course = allergensData as unknown as Course;
  } else {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          <p className="text-slate-400 mb-4">{courseId}</p>
          <a href="/dashboard/courses" className="text-pink-500 hover:underline">
            Return to Courses
          </a>
        </div>
      </div>
    );
  }

  return <CourseLayout course={course} />;
}
