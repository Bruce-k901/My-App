import React from 'react';
import { CourseLayout } from '@/components/course-v3/CourseLayout';
import courseData from '@/data/courses/level2-food-safety.json';
import healthSafetyData from '@/data/courses/level2-health-and-safety.json';
import allergensData from '@/data/courses/level2-allergens.json';
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
  let course = courseData as unknown as Course;
  
  if (courseId === 'uk-l2-health-and-safety') {
    course = healthSafetyData as unknown as Course;
  } else if (courseId === 'uk-l2-allergens') {
    course = allergensData as unknown as Course;
  }

  if (courseId !== course.id) {
      // Handle 404 or redirect
      // For prototype, we'll just render it anyway if it matches known IDs
      if (courseId !== 'uk-l2-food-safety-v3' && courseId !== 'uk-l2-health-and-safety' && courseId !== 'uk-l2-allergens') {
          return <div>Course not found</div>;
      }
  }

  return <CourseLayout course={course} />;
}
