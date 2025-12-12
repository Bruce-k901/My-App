// Shared navigation constants for courses and libraries
// These are used by the sidebar and other components to ensure consistency

export interface Course {
  slug: string;
  title: string;
  description: string;
  duration: string;
  level: string;
  badge: string;
}

export interface Library {
  id: string;
  name: string;
  href: string;
}

// Courses list - add new courses here and they'll appear in the sidebar automatically
export const COURSES: Course[] = [
  {
    slug: "food-safety",
    title: "Food Safety Level 2 (UK)",
    description:
      "Self-study, mobile-friendly flow with interactive content, module quizzes, and a 30-question final assessment aligned to UK hygiene law.",
    duration: "Approx. 4 hours",
    level: "Level 2 • Self-study",
    badge: "Updated"
  },
  {
    slug: "health-and-safety",
    title: "Health and Safety Level 2 (UK)",
    description:
      "Comprehensive workplace safety course covering risk assessment, fire safety, manual handling, and kitchen-specific hazards.",
    duration: "Approx. 4 hours",
    level: "Level 2 • Self-study",
    badge: "New"
  },
  {
    slug: "allergens",
    title: "Allergen Awareness Level 2 (UK)",
    description:
      "Essential training on the 14 major allergens, legal responsibilities (Natasha's Law), and preventing cross-contamination.",
    duration: "Approx. 3 hours",
    level: "Level 2 • Self-study",
    badge: "New"
  },
];

// Libraries list - add new libraries here and they'll appear in the sidebar automatically
export const LIBRARIES: Library[] = [
  { id: 'ingredients', name: 'Ingredients Library', href: '/dashboard/libraries/ingredients' },
  { id: 'ppe', name: 'PPE Library', href: '/dashboard/libraries/ppe' },
  { id: 'chemicals', name: 'Chemicals Library', href: '/dashboard/libraries/chemicals' },
  { id: 'drinks', name: 'Drinks Library', href: '/dashboard/libraries/drinks' },
  { id: 'disposables', name: 'Disposables Library', href: '/dashboard/libraries/disposables' },
  { id: 'glassware', name: 'Glassware Library', href: '/dashboard/libraries/glassware' },
  { id: 'packaging', name: 'Packaging Library', href: '/dashboard/libraries/packaging' },
  { id: 'serving-equipment', name: 'Serving Equipment', href: '/dashboard/libraries/serving-equipment' },
  { id: 'appliances', name: 'Appliances', href: '/dashboard/libraries/appliances' },
  { id: 'first-aid', name: 'First Aid Supplies', href: '/dashboard/libraries/first-aid' },
];







