/**
 * Course ID Mapping
 * 
 * Maps course IDs from course JSON files to training_courses in the database.
 * This ensures certificates can be generated for completed courses.
 * 
 * When adding a new course:
 * 1. Add the course JSON file to src/data/courses/
 * 2. Add the mapping here with the course ID from the JSON file
 * 3. Ensure the training_courses table has a matching course (by name or code)
 */

export interface CourseMapping {
  /** Course ID from the course JSON file (e.g., "uk-l2-food-safety") */
  courseId: string;
  /** Course name that should match training_courses.name in the database */
  courseName: string;
  /** Optional: Course code that should match training_courses.code */
  courseCode?: string;
  /** Whether this course should generate certificates */
  generatesCertificate: boolean;
}

/**
 * Mapping of course IDs to their database course names
 * This allows us to link course completions to training_records
 */
export const COURSE_MAPPINGS: CourseMapping[] = [
  {
    courseId: "uk-l2-food-safety",
    courseName: "Food Safety Level 2 (UK)",
    courseCode: "FS-L2",
    generatesCertificate: true,
  },
  {
    courseId: "uk-l2-health-and-safety",
    courseName: "Health and Safety Level 2 (UK)",
    courseCode: "HS-L2",
    generatesCertificate: true,
  },
  {
    courseId: "uk-l2-allergens",
    courseName: "Allergen Awareness Level 2 (UK)",
    courseCode: "ALG-L2",
    generatesCertificate: true,
  },
];

/**
 * Get course mapping by course ID
 */
export function getCourseMapping(courseId: string): CourseMapping | undefined {
  return COURSE_MAPPINGS.find((m) => m.courseId === courseId);
}

/**
 * Get course mapping by course name (for database lookup)
 */
export function getCourseMappingByName(courseName: string): CourseMapping | undefined {
  return COURSE_MAPPINGS.find((m) => m.courseName === courseName);
}

/**
 * Check if a course generates certificates
 */
export function courseGeneratesCertificate(courseId: string): boolean {
  const mapping = getCourseMapping(courseId);
  return mapping?.generatesCertificate ?? false;
}
