// Shared navigation constants for courses and libraries
// These are used by the sidebar and other components to ensure consistency

export interface Course {
  slug: string;
  title: string;
  description: string;
  duration: string;
  level: string;
  badge: string;
  /** Learn page URL. Use this for sidebar and course links to avoid 404s. */
  href: string;
  /** Category for filtering on the courses page */
  category?: "food-hygiene" | "workplace-safety" | "compliance" | "people";
  /** Lucide icon name */
  icon?: string;
}

export interface Library {
  id: string;
  name: string;
  href: string;
}

// Courses list - add new courses here and they'll appear in the sidebar automatically
// href must point to an existing route (e.g. /learn/[courseId] or /training/courses/...)
// Food Safety: Learn flow only (/learn/uk-l2-food-safety). Old PlayerShell and selfstudy redirect here.
export const COURSES: Course[] = [
  // ── Food & Hygiene ──
  {
    slug: "food-safety",
    title: "Food Safety Level 2 (UK)",
    description:
      "Self-study, mobile-friendly flow with interactive content aligned to UK hygiene law.",
    duration: "Approx. 4 hours",
    level: "Level 2 • Self-study",
    badge: "Updated",
    href: "/learn/uk-l2-food-safety",
    category: "food-hygiene",
    icon: "UtensilsCrossed",
  },
  {
    slug: "allergens",
    title: "Allergen Awareness Level 2 (UK)",
    description:
      "Essential training on the 14 major allergens, legal responsibilities (Natasha's Law), and preventing cross-contamination.",
    duration: "Approx. 3 hours",
    level: "Level 2 • Self-study",
    badge: "Popular",
    href: "/learn/uk-l2-allergens",
    category: "food-hygiene",
    icon: "ShieldAlert",
  },
  {
    slug: "haccp",
    title: "HACCP Level 3 (UK)",
    description:
      "Advanced food safety management – the 7 HACCP principles, CCPs, and documentation for supervisors and managers.",
    duration: "Approx. 6 hours",
    level: "Level 3 • Self-study",
    badge: "New",
    href: "/learn/uk-l3-haccp",
    category: "food-hygiene",
    icon: "ClipboardCheck",
  },
  {
    slug: "allergens-advanced",
    title: "Advanced Allergen Management (UK)",
    description:
      "Beyond the basics – menu engineering, kitchen protocols, supplier verification, and audit compliance.",
    duration: "Approx. 3 hours",
    level: "Level 2 • Self-study",
    badge: "New",
    href: "/learn/uk-l2-food-allergens-advanced",
    category: "food-hygiene",
    icon: "ListChecks",
  },
  // ── Workplace Safety ──
  {
    slug: "health-and-safety",
    title: "Health and Safety Level 2 (UK)",
    description:
      "Comprehensive workplace safety course covering risk assessment, fire safety, manual handling, and kitchen-specific hazards.",
    duration: "Approx. 4 hours",
    level: "Level 2 • Self-study",
    badge: "Popular",
    href: "/learn/uk-l2-health-and-safety",
    category: "workplace-safety",
    icon: "HardHat",
  },
  {
    slug: "fire-safety",
    title: "Fire Safety Level 2 (UK)",
    description:
      "Fire prevention, detection systems, evacuation procedures, extinguisher types, and kitchen-specific fire risks.",
    duration: "Approx. 3 hours",
    level: "Level 2 • Self-study",
    badge: "New",
    href: "/learn/uk-l2-fire-safety",
    category: "workplace-safety",
    icon: "Flame",
  },
  {
    slug: "manual-handling",
    title: "Manual Handling Level 2 (UK)",
    description:
      "Safe lifting techniques, the TILE framework, team handling, and mechanical aids for injury prevention.",
    duration: "Approx. 2.5 hours",
    level: "Level 2 • Self-study",
    badge: "New",
    href: "/learn/uk-l2-manual-handling",
    category: "workplace-safety",
    icon: "Package",
  },
  {
    slug: "coshh",
    title: "COSHH Awareness Level 2 (UK)",
    description:
      "Safe use, storage, and disposal of hazardous substances – GHS symbols, risk assessment, and emergency procedures.",
    duration: "Approx. 2.5 hours",
    level: "Level 2 • Self-study",
    badge: "New",
    href: "/learn/uk-l2-coshh",
    category: "workplace-safety",
    icon: "FlaskConical",
  },
  {
    slug: "first-aid",
    title: "First Aid Awareness Level 2 (UK)",
    description:
      "CPR, AED, burns, bleeding, choking, and anaphylaxis – essential first aid for hospitality environments.",
    duration: "Approx. 3.5 hours",
    level: "Level 2 • Self-study",
    badge: "New",
    href: "/learn/uk-l2-first-aid",
    category: "workplace-safety",
    icon: "Stethoscope",
  },
  // ── People ──
  {
    slug: "safeguarding",
    title: "Safeguarding Awareness Level 2 (UK)",
    description:
      "Recognising abuse, reporting procedures, record keeping, and the Prevent duty for all staff.",
    duration: "Approx. 3 hours",
    level: "Level 2 • Self-study",
    badge: "New",
    href: "/learn/uk-l2-safeguarding",
    category: "people",
    icon: "Heart",
  },
];

// Libraries list - add new libraries here and they'll appear in the sidebar automatically
export const LIBRARIES: Library[] = [
  {
    id: "ingredients",
    name: "Ingredients Library",
    href: "/dashboard/libraries/ingredients",
  },
  { id: "ppe", name: "PPE Library", href: "/dashboard/libraries/ppe" },
  {
    id: "chemicals",
    name: "Chemicals Library",
    href: "/dashboard/libraries/chemicals",
  },
  { id: "drinks", name: "Drinks Library", href: "/dashboard/libraries/drinks" },
  {
    id: "disposables",
    name: "Disposables Library",
    href: "/dashboard/libraries/disposables",
  },
  {
    id: "glassware",
    name: "Glassware Library",
    href: "/dashboard/libraries/glassware",
  },
  {
    id: "packaging",
    name: "Packaging Library",
    href: "/dashboard/libraries/packaging",
  },
  {
    id: "serving-equipment",
    name: "Serving Equipment",
    href: "/dashboard/libraries/serving-equipment",
  },
  {
    id: "appliances",
    name: "Appliances",
    href: "/dashboard/libraries/appliances",
  },
  {
    id: "first-aid",
    name: "First Aid Supplies",
    href: "/dashboard/libraries/first-aid",
  },
];
