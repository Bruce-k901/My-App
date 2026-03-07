// ============================================================================
// Repairs & Maintenance Types
// ============================================================================

// -- Fabric Categories --

export type FabricCategory = 'structural' | 'internal' | 'building_services' | 'external';

export type FabricSubcategory =
  // Structural
  | 'roof' | 'external_walls' | 'windows' | 'external_doors' | 'foundations'
  // Internal
  | 'internal_walls' | 'ceilings' | 'floors' | 'internal_doors' | 'staircases' | 'decorations'
  // Building Services (M&E)
  | 'plumbing' | 'electrical' | 'hvac' | 'fire_systems' | 'lifts' | 'security_systems'
  // External / Grounds
  | 'car_parks' | 'fencing' | 'landscaping' | 'signage';

export const FABRIC_CATEGORIES: Record<FabricCategory, {
  label: string;
  subcategories: { value: FabricSubcategory; label: string }[];
}> = {
  structural: {
    label: 'Structural / Envelope',
    subcategories: [
      { value: 'roof', label: 'Roof' },
      { value: 'external_walls', label: 'External Walls' },
      { value: 'windows', label: 'Windows' },
      { value: 'external_doors', label: 'External Doors' },
      { value: 'foundations', label: 'Foundations' },
    ],
  },
  internal: {
    label: 'Internal Fabric',
    subcategories: [
      { value: 'internal_walls', label: 'Internal Walls & Partitions' },
      { value: 'ceilings', label: 'Ceilings' },
      { value: 'floors', label: 'Floors' },
      { value: 'internal_doors', label: 'Internal Doors' },
      { value: 'staircases', label: 'Staircases & Balustrades' },
      { value: 'decorations', label: 'Decorations' },
    ],
  },
  building_services: {
    label: 'Building Services (M&E)',
    subcategories: [
      { value: 'plumbing', label: 'Plumbing' },
      { value: 'electrical', label: 'Electrical' },
      { value: 'hvac', label: 'HVAC' },
      { value: 'fire_systems', label: 'Fire Systems' },
      { value: 'lifts', label: 'Lifts & Escalators' },
      { value: 'security_systems', label: 'Security Systems' },
    ],
  },
  external: {
    label: 'External / Grounds',
    subcategories: [
      { value: 'car_parks', label: 'Car Parks & Paving' },
      { value: 'fencing', label: 'Fencing & Gates' },
      { value: 'landscaping', label: 'Landscaping & Drainage' },
      { value: 'signage', label: 'Signage' },
    ],
  },
};

// Helper: flat list of all subcategories with their parent category
export const ALL_SUBCATEGORIES = Object.entries(FABRIC_CATEGORIES).flatMap(
  ([cat, config]) => config.subcategories.map(sub => ({ ...sub, category: cat as FabricCategory, categoryLabel: config.label }))
);

// -- Building Asset --

export interface BuildingAsset {
  id: string;
  company_id: string;
  site_id: string;
  name: string;
  fabric_category: FabricCategory;
  fabric_subcategory: FabricSubcategory;
  location_description: string | null;
  condition_rating: number | null;
  condition_notes: string | null;
  install_year: number | null;
  expected_life_years: number | null;
  area_or_quantity: string | null;
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  inspection_frequency_months: number | null;
  maintenance_contractor_id: string | null;
  emergency_contractor_id: string | null;
  photos: { url: string; caption?: string; taken_at?: string }[];
  status: 'active' | 'archived' | 'decommissioned';
  archived_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Enriched (not in DB)
  site_name?: string;
  maintenance_contractor_name?: string;
  emergency_contractor_name?: string;
}

// -- Work Order --

export type WOType = 'reactive' | 'planned' | 'emergency' | 'inspection' | 'improvement';
export type WOPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type WOStatus =
  | 'requested' | 'triaged' | 'approved' | 'assigned' | 'scheduled'
  | 'in_progress' | 'on_hold' | 'completed' | 'verified' | 'closed' | 'cancelled';
export type WOTargetType = 'equipment' | 'building_fabric';

export interface WorkOrder {
  id: string;
  company_id: string;
  site_id: string;
  wo_number: string;
  target_type: WOTargetType;
  asset_id: string | null;
  building_asset_id: string | null;
  wo_type: WOType;
  priority: WOPriority;
  status: WOStatus;
  title: string;
  description: string | null;
  reported_by: string | null;
  assigned_to_contractor_id: string | null;
  assigned_to_user_id: string | null;
  scheduled_date: string | null;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  closed_at: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  invoice_reference: string | null;
  before_photos: { url: string; caption?: string }[];
  after_photos: { url: string; caption?: string }[];
  documents: { url: string; name: string; type?: string }[];
  resolution_notes: string | null;
  root_cause: string | null;
  timeline: WOTimelineEntry[];
  sla_target_hours: number | null;
  sla_breached: boolean;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  // Enriched (not in DB)
  site_name?: string;
  asset_name?: string;
  building_asset_name?: string;
  contractor_name?: string;
  assigned_user_name?: string;
  reported_by_name?: string;
}

export interface WOTimelineEntry {
  action: string;
  from?: string;
  to?: string;
  by?: string;
  at: string;
  notes?: string;
}

export interface WorkOrderComment {
  id: string;
  work_order_id: string;
  author_id: string;
  content: string;
  attachments: { url: string; name: string }[];
  is_internal: boolean;
  created_at: string;
  // Enriched
  author_name?: string;
}

// -- Configuration --

export const WO_TYPE_CONFIG: Record<WOType, { label: string; description: string }> = {
  reactive: { label: 'Reactive', description: 'Unplanned repair in response to a fault or breakdown' },
  planned: { label: 'Planned', description: 'Scheduled preventive maintenance' },
  emergency: { label: 'Emergency', description: 'Urgent safety-critical issue requiring immediate response' },
  inspection: { label: 'Inspection', description: 'Routine building inspection or survey' },
  improvement: { label: 'Improvement', description: 'Upgrade, enhancement, or capital improvement' },
};

export const PRIORITY_CONFIG: Record<WOPriority, {
  label: string;
  slaHours: number;
  description: string;
  colour: string;
  bgColour: string;
}> = {
  P1: { label: 'Emergency', slaHours: 2, description: '1-2 hours', colour: 'text-red-600 dark:text-red-400', bgColour: 'bg-red-100 dark:bg-red-900/30' },
  P2: { label: 'Urgent', slaHours: 48, description: '24-48 hours', colour: 'text-orange-600 dark:text-orange-400', bgColour: 'bg-orange-100 dark:bg-orange-900/30' },
  P3: { label: 'Routine', slaHours: 168, description: '3-7 days', colour: 'text-blue-600 dark:text-blue-400', bgColour: 'bg-blue-100 dark:bg-blue-900/30' },
  P4: { label: 'Cosmetic', slaHours: 672, description: '2-4 weeks', colour: 'text-gray-600 dark:text-gray-400', bgColour: 'bg-gray-100 dark:bg-gray-800/30' },
};

export const WO_STATUS_CONFIG: Record<WOStatus, {
  label: string;
  colour: string;
  bgColour: string;
  nextStatuses: WOStatus[];
}> = {
  requested:   { label: 'Requested',   colour: 'text-gray-600 dark:text-gray-400',   bgColour: 'bg-gray-100 dark:bg-gray-800/30',    nextStatuses: ['triaged', 'cancelled'] },
  triaged:     { label: 'Triaged',     colour: 'text-purple-600 dark:text-purple-400', bgColour: 'bg-purple-100 dark:bg-purple-900/30', nextStatuses: ['approved', 'cancelled'] },
  approved:    { label: 'Approved',    colour: 'text-blue-600 dark:text-blue-400',   bgColour: 'bg-blue-100 dark:bg-blue-900/30',    nextStatuses: ['assigned', 'cancelled'] },
  assigned:    { label: 'Assigned',    colour: 'text-indigo-600 dark:text-indigo-400', bgColour: 'bg-indigo-100 dark:bg-indigo-900/30', nextStatuses: ['scheduled', 'in_progress', 'cancelled'] },
  scheduled:   { label: 'Scheduled',   colour: 'text-cyan-600 dark:text-cyan-400',   bgColour: 'bg-cyan-100 dark:bg-cyan-900/30',    nextStatuses: ['in_progress', 'cancelled'] },
  in_progress: { label: 'In Progress', colour: 'text-yellow-600 dark:text-yellow-400', bgColour: 'bg-yellow-100 dark:bg-yellow-900/30', nextStatuses: ['on_hold', 'completed', 'cancelled'] },
  on_hold:     { label: 'On Hold',     colour: 'text-amber-600 dark:text-amber-400', bgColour: 'bg-amber-100 dark:bg-amber-900/30',  nextStatuses: ['in_progress', 'cancelled'] },
  completed:   { label: 'Completed',   colour: 'text-green-600 dark:text-green-400', bgColour: 'bg-green-100 dark:bg-green-900/30',  nextStatuses: ['verified', 'in_progress'] },
  verified:    { label: 'Verified',    colour: 'text-emerald-600 dark:text-emerald-400', bgColour: 'bg-emerald-100 dark:bg-emerald-900/30', nextStatuses: ['closed'] },
  closed:      { label: 'Closed',      colour: 'text-gray-500 dark:text-gray-500',   bgColour: 'bg-gray-50 dark:bg-gray-900/20',     nextStatuses: [] },
  cancelled:   { label: 'Cancelled',   colour: 'text-red-500 dark:text-red-500',     bgColour: 'bg-red-50 dark:bg-red-900/20',       nextStatuses: [] },
};

// Statuses considered "open" (active work)
export const OPEN_STATUSES: WOStatus[] = ['requested', 'triaged', 'approved', 'assigned', 'scheduled', 'in_progress', 'on_hold'];
export const CLOSED_STATUSES: WOStatus[] = ['completed', 'verified', 'closed', 'cancelled'];

// Condition rating config
export const CONDITION_RATINGS: { value: number; label: string; colour: string; bgColour: string }[] = [
  { value: 1, label: 'Critical', colour: 'text-red-600 dark:text-red-400', bgColour: 'bg-red-100 dark:bg-red-900/30' },
  { value: 2, label: 'Poor', colour: 'text-orange-600 dark:text-orange-400', bgColour: 'bg-orange-100 dark:bg-orange-900/30' },
  { value: 3, label: 'Fair', colour: 'text-yellow-600 dark:text-yellow-400', bgColour: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { value: 4, label: 'Good', colour: 'text-blue-600 dark:text-blue-400', bgColour: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: 5, label: 'Excellent', colour: 'text-green-600 dark:text-green-400', bgColour: 'bg-green-100 dark:bg-green-900/30' },
];

// -- Building Inspection Schedule --

export interface BuildingInspectionSchedule {
  id: string;
  building_asset_id: string;
  company_id: string;
  description: string | null;
  frequency_months: number;
  next_due_date: string | null;
  last_completed_date: string | null;
  assigned_contractor_id: string | null;
  auto_create_wo: boolean;
  created_at: string;
  // Enriched
  building_asset_name?: string;
  contractor_name?: string;
}
