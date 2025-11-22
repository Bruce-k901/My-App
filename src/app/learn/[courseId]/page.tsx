import React from 'react';
import { CourseLayout } from '@/components/course-v3/CourseLayout';
import courseData from '@/data/courses/level2-food-safety.json';
import { Course } from '@/data/courses/schema';

interface PageProps {
  params: Promise<{
    courseId: string;
  }>;
}

export default async function CoursePage({ params }: PageProps) {
  const { courseId } = await params;

  // In a real app, we would fetch from DB or API based on courseId
  // For now, we just use the imported JSON if the ID matches, or default to it for testing
  const course = courseData as unknown as Course;

  if (courseId !== course.id) {
      // Handle 404 or redirect
      // For prototype, we'll just render it anyway if it matches 'uk-l2-food-safety-v3'
      if (courseId !== 'uk-l2-food-safety-v3') {
          return <div>Course not found</div>;
      }
  }

  return <CourseLayout course={course} />;
}
