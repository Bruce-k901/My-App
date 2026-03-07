/**
 * Certificate Type to Course Code Mapping
 * 
 * Maps certificate types from task_data to training_courses codes.
 * Used to link certificate expiry tasks to available courses in the app.
 */

/**
 * Maps certificate type from task_data to training_courses.code
 * 
 * @param certificateType - Certificate type from task (e.g., 'food_safety', 'h_and_s')
 * @param level - Optional level for food_safety and h_and_s (e.g., 2, 3, 4)
 * @returns Course code (e.g., 'FS-L2', 'HS-L2') or null if course not available in app
 */
export function certificateTypeToCourseCode(
  certificateType: string,
  level?: number
): string | null {
  const normalizedType = certificateType.toLowerCase().trim();

  switch (normalizedType) {
    case 'food_safety':
      // Default to Level 2 if no level specified
      const fsLevel = level || 2;
      if (fsLevel === 2) return 'FS-L2';
      if (fsLevel === 3) return 'FS-L3';
      // Level 4+ not currently available in app
      return null;

    case 'h_and_s':
    case 'health_and_safety':
    case 'health_safety':
      // Default to Level 2 if no level specified
      const hsLevel = level || 2;
      if (hsLevel === 2) return 'HS-L2';
      if (hsLevel === 3) return 'HS-L3';
      // Level 4+ not currently available in app
      return null;

    case 'fire_marshal':
    case 'fire':
      return 'FIRE';

    case 'first_aid':
      return 'FIRST-AID';

    case 'cossh':
    case 'coshh':
      return 'COSHH';

    case 'allergen':
    case 'allergen_awareness':
      return 'ALLERGY';

    default:
      return null;
  }
}

/**
 * Check if a course is available in the app based on certificate type
 * 
 * @param certificateType - Certificate type from task
 * @param level - Optional level
 * @returns true if course exists in app, false otherwise
 */
export function isCourseAvailableInApp(
  certificateType: string,
  level?: number
): boolean {
  return certificateTypeToCourseCode(certificateType, level) !== null;
}
