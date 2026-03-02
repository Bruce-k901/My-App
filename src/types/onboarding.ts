// Onboarding step registry — single source of truth for all 23 setup steps
// Used by: hub page, admin progress tracker, API routes, useOnboardingProgress hook

export type StepStatus = 'not_started' | 'in_progress' | 'complete' | 'skipped';

export type OnboardingSection = 'core' | 'checkly' | 'stockly' | 'teamly' | 'assetly' | 'planly';

export interface OnboardingStepDef {
  stepId: string;
  section: OnboardingSection;
  name: string;
  description: string;
  /** Base path without ?from=setup — use useSetupNav() to append the param */
  href: string;
  /** Icon name from @/components/ui/icons */
  icon: string;
  /** Table and column used for row-count bootstrap check */
  check: {
    table: string;
    column: string; // column to .eq() against companyId (usually 'company_id')
    /** Extra .eq() filter to apply (e.g. app_role = 'Staff') */
    extraFilter?: { column: string; value: string };
    /** For checks that just need a non-null field on the company row itself */
    companyField?: string;
  } | null; // null = always manual (no auto-detect)
}

export interface OnboardingProgress {
  id: string;
  company_id: string;
  step_id: string;
  section: OnboardingSection;
  status: StepStatus;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SectionProgress {
  section: OnboardingSection;
  label: string;
  steps: OnboardingStepWithStatus[];
  completedCount: number;
  totalCount: number;
}

export interface OnboardingStepWithStatus extends OnboardingStepDef {
  status: StepStatus;
  detail: string;
  notes: string | null;
}

// ─── Section metadata ───────────────────────────────────────────────────────

export const ONBOARDING_SECTIONS: Record<OnboardingSection, { label: string; colour: string; description: string }> = {
  core: {
    label: 'Core Setup',
    colour: 'teamly',
    description: 'Essential setup — company details, sites, and team',
  },
  checkly: {
    label: 'Checkly',
    colour: 'checkly',
    description: 'Compliance templates, SOPs, equipment & risk assessments',
  },
  stockly: {
    label: 'Stockly',
    colour: 'stockly',
    description: 'Storage areas, suppliers, stock items & recipes',
  },
  teamly: {
    label: 'Teamly',
    colour: 'teamly',
    description: 'Employee profiles, onboarding packs & training',
  },
  assetly: {
    label: 'Assetly',
    colour: 'assetly',
    description: 'Assets, contractors & planned maintenance',
  },
  planly: {
    label: 'Planly',
    colour: 'planly',
    description: 'Production planning, products & customers',
  },
};

// ─── Step registry (all 23 steps) ───────────────────────────────────────────

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  // ── Core Setup ──
  {
    stepId: 'core_company',
    section: 'core',
    name: 'Company Details',
    description: 'Add your business name, address, and contact information',
    href: '/dashboard/business/details',
    icon: 'Building2',
    check: { table: 'companies', column: 'id', companyField: 'name' },
  },
  {
    stepId: 'core_sites',
    section: 'core',
    name: 'Add Sites',
    description: 'Set up your locations with addresses and operating hours',
    href: '/dashboard/sites',
    icon: 'MapPin',
    check: { table: 'sites', column: 'company_id' },
  },
  {
    stepId: 'core_team',
    section: 'core',
    name: 'Invite Team',
    description: 'Add team members and assign roles so everyone can get started',
    href: '/dashboard/users',
    icon: 'Users',
    check: { table: 'profiles', column: 'company_id' },
    // Note: bootstrap considers count > 1 as complete (more than just the owner)
  },
  {
    stepId: 'core_departments',
    section: 'core',
    name: 'Departments',
    description: 'Configure departments and organisational structure',
    href: '/dashboard/people/settings/departments',
    icon: 'UserCog',
    check: { table: 'departments', column: 'company_id' },
  },

  // ── Checkly ──
  {
    stepId: 'checkly_templates',
    section: 'checkly',
    name: 'Compliance Templates',
    description: 'Import industry checklist templates to hit the ground running',
    href: '/dashboard/tasks/compliance',
    icon: 'ClipboardCheck',
    check: { table: 'task_templates', column: 'company_id' },
  },
  {
    stepId: 'checkly_sops',
    section: 'checkly',
    name: 'Standard Operating Procedures',
    description: 'Create or import SOPs for your team to follow',
    href: '/dashboard/sops',
    icon: 'FileText',
    check: { table: 'sops', column: 'company_id' },
  },
  {
    stepId: 'checkly_equipment',
    section: 'checkly',
    name: 'Equipment',
    description: 'Register your equipment for temperature logs and inspections',
    href: '/dashboard/equipment',
    icon: 'Thermometer',
    check: { table: 'equipment', column: 'company_id' },
  },
  {
    stepId: 'checkly_risk',
    section: 'checkly',
    name: 'Risk Assessments',
    description: 'Set up risk assessment templates for your sites',
    href: '/dashboard/risk-assessments',
    icon: 'ShieldWarning',
    check: { table: 'risk_assessments', column: 'company_id' },
  },

  // ── Stockly ──
  {
    stepId: 'stockly_storage',
    section: 'stockly',
    name: 'Storage Areas',
    description: 'Define fridges, freezers, dry stores and other storage areas',
    href: '/dashboard/stockly/storage-areas',
    icon: 'Package',
    check: { table: 'storage_areas', column: 'company_id' },
  },
  {
    stepId: 'stockly_suppliers',
    section: 'stockly',
    name: 'Suppliers',
    description: 'Add your suppliers and their contact details',
    href: '/dashboard/stockly/suppliers',
    icon: 'Truck',
    check: { table: 'suppliers', column: 'company_id' },
  },
  {
    stepId: 'stockly_items',
    section: 'stockly',
    name: 'Stock Items',
    description: 'Create your stock item catalogue with units and categories',
    href: '/dashboard/stockly/stock-items',
    icon: 'Barcode',
    check: { table: 'stock_items', column: 'company_id' },
  },
  {
    stepId: 'stockly_recipes',
    section: 'stockly',
    name: 'Recipes',
    description: 'Build recipes with ingredients, costs and allergen tracking',
    href: '/dashboard/stockly/recipes',
    icon: 'CookingPot',
    check: { table: 'recipes', column: 'company_id' },
  },

  // ── Teamly ──
  {
    stepId: 'teamly_employees',
    section: 'teamly',
    name: 'Employee Profiles',
    description: 'Ensure staff profiles are created with roles assigned',
    href: '/dashboard/people/employees',
    icon: 'IdentificationCard',
    check: {
      table: 'profiles',
      column: 'company_id',
      extraFilter: { column: 'app_role', value: 'Staff' },
    },
  },
  {
    stepId: 'teamly_onboarding',
    section: 'teamly',
    name: 'Onboarding Packs',
    description: 'Create document packs for new employee onboarding',
    href: '/dashboard/people/onboarding',
    icon: 'Notebook',
    check: { table: 'company_onboarding_packs', column: 'company_id' },
  },
  {
    stepId: 'teamly_training',
    section: 'teamly',
    name: 'Training Courses',
    description: 'Set up training courses and compliance requirements',
    href: '/dashboard/courses',
    icon: 'GraduationCap',
    check: { table: 'courses', column: 'company_id' },
  },

  // ── Assetly ──
  {
    stepId: 'assetly_assets',
    section: 'assetly',
    name: 'Register Assets',
    description: 'Add your equipment, vehicles and other assets',
    href: '/dashboard/assets',
    icon: 'Wrench',
    check: { table: 'assets', column: 'company_id' },
  },
  {
    stepId: 'assetly_contractors',
    section: 'assetly',
    name: 'Contractors',
    description: 'Add contractors for maintenance, pest control and servicing',
    href: '/dashboard/assets/contractors',
    icon: 'HardHat',
    check: { table: 'contractors', column: 'company_id' },
  },
  {
    stepId: 'assetly_ppm',
    section: 'assetly',
    name: 'PPM Schedule',
    description: 'Set up planned preventive maintenance schedules',
    href: '/dashboard/ppm',
    icon: 'CalendarCheck',
    check: { table: 'ppm_schedules', column: 'company_id' },
  },
  {
    stepId: 'assetly_building_assets',
    section: 'assetly',
    name: 'Building Register',
    description: 'Add building fabric assets (roof, walls, HVAC, plumbing)',
    href: '/dashboard/assets/rm',
    icon: 'Building2',
    check: { table: 'building_assets', column: 'company_id' },
  },
  {
    stepId: 'assetly_inspections',
    section: 'assetly',
    name: 'Inspection Schedules',
    description: 'Set up recurring inspection schedules for buildings',
    href: '/dashboard/assets/rm/inspections',
    icon: 'Calendar',
    check: { table: 'building_inspection_schedules', column: 'company_id' },
  },
  {
    stepId: 'assetly_work_orders',
    section: 'assetly',
    name: 'Work Orders',
    description: 'Create your first R&M work order',
    href: '/dashboard/assets/rm/work-orders',
    icon: 'ClipboardList',
    check: { table: 'work_orders', column: 'company_id' },
  },

  // ── Planly ──
  {
    stepId: 'planly_destinations',
    section: 'planly',
    name: 'Packing & Delivery',
    description: 'Configure destination groups for delivery scheduling',
    href: '/dashboard/planly/settings',
    icon: 'MapTrifold',
    check: { table: 'planly_destination_groups', column: 'site_id' },
  },
  {
    stepId: 'planly_doughs',
    section: 'planly',
    name: 'Production Setup',
    description: 'Define base doughs and production types',
    href: '/dashboard/planly/settings',
    icon: 'Bread',
    check: { table: 'planly_base_doughs', column: 'site_id' },
  },
  {
    stepId: 'planly_equipment',
    section: 'planly',
    name: 'Equipment & Bake Groups',
    description: 'Set up ovens, bake groups and equipment types',
    href: '/dashboard/planly/settings',
    icon: 'Oven',
    check: { table: 'planly_bake_groups', column: 'site_id' },
  },
  {
    stepId: 'planly_products',
    section: 'planly',
    name: 'Products',
    description: 'Add your product catalogue with recipes and pricing',
    href: '/dashboard/planly/products',
    icon: 'ShoppingCart',
    check: { table: 'planly_products', column: 'site_id' },
  },
  {
    stepId: 'planly_customers',
    section: 'planly',
    name: 'Customers',
    description: 'Add wholesale customers and their delivery requirements',
    href: '/dashboard/planly/customers',
    icon: 'Storefront',
    check: { table: 'planly_customers', column: 'site_id' },
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getStepsBySection(section: OnboardingSection): OnboardingStepDef[] {
  return ONBOARDING_STEPS.filter((s) => s.section === section);
}

export function getStepDef(stepId: string): OnboardingStepDef | undefined {
  return ONBOARDING_STEPS.find((s) => s.stepId === stepId);
}

/** Ordered list of sections for rendering */
export const SECTION_ORDER: OnboardingSection[] = ['core', 'checkly', 'stockly', 'teamly', 'assetly', 'planly'];
