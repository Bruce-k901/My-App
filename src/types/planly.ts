// ============================================================================
// Planly Module Type Definitions
// Reference: Planly_Cursor_Implementation_Brief.md
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

export type ShipState = 'baked' | 'frozen';
export type OrderStatus = 'confirmed' | 'locked';
export type IssueType = 'short' | 'damaged' | 'wrong_item' | 'quality';
export type IssueStatus = 'pending' | 'approved' | 'rejected';
export type TrayType = 'full' | 'half' | 'ring';
export type CalendarCategory = 'Tasks' | 'Reminders' | 'Messages';

// ============================================================================
// PROCESS TEMPLATES
// ============================================================================

export interface ProcessTemplate {
  id: string;
  name: string;
  description?: string;
  is_master: boolean;
  master_template_id?: string;
  site_id?: string;
  buffer_days_override?: number;
  cutoff_time_override?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Relations
  stages?: ProcessStage[];
  products?: PlanlyProduct[];
}

export interface ProcessStage {
  id: string;
  template_id: string;
  name: string;
  sequence: number;
  day_offset: number;
  duration_hours?: number;
  is_overnight: boolean;
  instructions?: string;
  sop_id?: string;
  // Deprecated single-group columns (keep for backwards compatibility)
  bake_group_id?: string | null;
  destination_group_id?: string | null;
  // New multi-group columns
  bake_group_ids?: string[];
  destination_group_ids?: string[];
  time_constraint?: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  equipment?: StageEquipment[];
  bake_group?: BakeGroup;
  destination_group?: DestinationGroup;
  // Relations (arrays for multi-group)
  bake_groups?: BakeGroup[];
  destination_groups?: DestinationGroup[];
}

export interface StageEquipment {
  id: string;
  stage_id: string;
  equipment_type_id: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
}

// ============================================================================
// BAKE GROUPS
// ============================================================================

export interface BakeGroup {
  id: string;
  name: string;
  description?: string;
  target_temp_celsius?: number;
  target_time_mins?: number;
  equipment_type_id?: string;
  assigned_asset_id?: string;
  priority: number;
  min_trays_for_efficiency?: number;
  site_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  products?: PlanlyProduct[];
}

// Simplified bake group for the settings page (grouping only, no bake settings)
export interface PlanlyBakeGroup {
  id: string;
  site_id: string;
  name: string;
  priority: number; // Used as sort_order
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  products?: PlanlyProduct[];
}

// ============================================================================
// CUTOFF SETTINGS
// ============================================================================

export interface CutoffSettings {
  id: string;
  site_id: string;
  default_buffer_days: number;
  default_cutoff_time: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CATEGORIES
// ============================================================================

export interface PlanlyCategory {
  id: string;
  name: string;
  base_prep_type?: string;
  description?: string;
  display_order: number;
  site_id: string;
  created_at: string;
  updated_at: string;
  // Relations
  products?: PlanlyProduct[];
}

// ============================================================================
// DESTINATION GROUPS
// ============================================================================

export interface DestinationGroup {
  id: string;
  name: string;
  description?: string;
  bake_deadline?: string;
  dispatch_time?: string;
  is_onsite: boolean;
  priority: number;
  site_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  customers?: PlanlyCustomer[];
}

// ============================================================================
// CUSTOMERS
// ============================================================================

export type PaymentTerms = 'prepaid' | 'net_7' | 'net_14' | 'net_30' | 'net_60';

export interface PlanlyCustomer {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  postcode?: string;
  destination_group_id?: string;
  default_ship_state: ShipState;
  minimum_order_value?: number;
  below_minimum_delivery_charge?: number;
  is_ad_hoc: boolean;
  frozen_only: boolean;
  is_active: boolean;
  notes?: string;
  site_id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // New fields from spec
  delivery_instructions?: string;
  finance_contact_name?: string;
  finance_contact_email?: string;
  finance_contact_phone?: string;
  default_payment_terms?: PaymentTerms;
  portal_enabled: boolean;
  archived_at?: string | null;
  // Relations
  destination_group?: DestinationGroup;
  orders?: PlanlyOrder[];
  prices?: CustomerProductPrice[];
  portal_users?: CustomerPortalUser[];
}

// ============================================================================
// CUSTOMER PORTAL USERS
// ============================================================================

export interface CustomerPortalUser {
  id: string;
  customer_id: string;
  email: string;
  name: string;
  is_primary: boolean;
  is_active: boolean;
  last_login_at?: string;
  invited_at: string;
  invited_by?: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PRODUCTS
// ============================================================================

export interface PlanlyProduct {
  id: string;
  stockly_product_id: string;
  category_id?: string;
  process_template_id?: string;
  bake_group_id?: string;
  items_per_tray: number;
  tray_type: TrayType;
  can_ship_frozen: boolean;
  default_ship_state: ShipState;
  is_vatable: boolean;
  vat_rate?: number;
  is_active: boolean;
  site_id: string;
  created_at: string;
  updated_at: string;
  // New fields from spec
  description?: string;
  is_new: boolean;
  is_paused: boolean;
  archived_at?: string;
  // Relations
  category?: PlanlyCategory;
  process_template?: ProcessTemplate;
  bake_group?: BakeGroup;
  list_prices?: ProductListPrice[];
  // From Stockly/Ingredients Library (joined)
  stockly_product?: {
    id: string;
    name?: string;
    ingredient_name?: string;
    sku?: string;
    category?: string;
    unit?: string;
  };
}

// ============================================================================
// PRICING
// ============================================================================

export interface ProductListPrice {
  id: string;
  product_id: string;
  list_price: number;
  effective_from: string;
  effective_to?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface CustomerProductPrice {
  id: string;
  customer_id: string;
  product_id: string;
  unit_price: number;
  effective_from: string;
  effective_to?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
  // Relations
  product?: PlanlyProduct;
}

// ============================================================================
// ORDERS
// ============================================================================

export interface PlanlyOrder {
  id: string;
  customer_id: string;
  delivery_date: string;
  status: OrderStatus;
  total_value?: number;
  notes?: string;
  locked_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Relations
  customer?: PlanlyCustomer;
  lines?: OrderLine[];
}

export interface OrderLine {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_snapshot: number;
  ship_state: ShipState;
  is_locked: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  product?: PlanlyProduct;
  order?: PlanlyOrder;
  issues?: DeliveryIssue[];
}

// ============================================================================
// DELIVERY ISSUES & CREDITS
// ============================================================================

export interface DeliveryIssue {
  id: string;
  order_line_id: string;
  issue_type: IssueType;
  quantity_affected: number;
  description?: string;
  reported_by?: string;
  reported_at: string;
  status: IssueStatus;
  resolved_by?: string;
  resolved_at?: string;
  // Relations
  order_line?: OrderLine;
}

export interface CreditNote {
  id: string;
  credit_number: string;
  customer_id: string;
  issue_date: string;
  total_amount: number;
  notes?: string;
  created_at: string;
  created_by?: string;
  // Relations
  customer?: PlanlyCustomer;
  lines?: CreditNoteLine[];
}

export interface CreditNoteLine {
  id: string;
  credit_note_id: string;
  delivery_issue_id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
  // Relations
  product?: PlanlyProduct;
}

// ============================================================================
// CALENDAR & NOTIFICATIONS
// ============================================================================

export interface PlanlyCalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time?: string;
  category: CalendarCategory;
  source_reference_id?: string;
  source_reference_type?: string;
  site_id: string;
  visibility_level: string;
  is_auto_generated: boolean;
  is_archived: boolean;
  created_at: string;
}

export interface PlanlyNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  recipient_user_id?: string;
  recipient_role?: string;
  source_reference_id?: string;
  source_reference_type?: string;
  is_read: boolean;
  is_portal: boolean;
  created_at: string;
}

// ============================================================================
// SITE SETTINGS
// ============================================================================

export interface PlanlySiteSettings {
  id: string;
  site_id: string;
  credit_approval_required: boolean;
  credit_auto_approve_threshold?: number;
  company_name?: string;
  company_address?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// COMPUTED / VIEW TYPES
// ============================================================================

export interface ProductionTask {
  date: string;
  stage: string;
  delivery_date: string;
  items: ProductionTaskItem[];
}

export interface ProductionTaskItem {
  product_id: string;
  product_name: string;
  quantity: number;
  base_prep_kg?: number;
  trays_needed?: number;
}

export interface TrayLayout {
  tray_number: number;
  bake_group_id: string;
  bake_group_name: string;
  items: TrayItem[];
  total_items: number;
}

export interface TrayItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

export interface DoughRequirement {
  dough_type: string;
  total_kg: number;
  ingredients: IngredientRequirement[];
}

export interface IngredientRequirement {
  name: string;
  quantity_g: number;
}

export interface OrderBookEntry {
  customer_id: string;
  customer_name: string;
  delivery_date: string;
  products: OrderBookProduct[];
  total_value: number;
  is_locked: boolean;
}

export interface OrderBookProduct {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  is_locked: boolean;
}

export interface DropsReportEntry {
  contact_name: string;
  customer_name: string;
  address: string;
  postcode: string;
  is_frozen_only: boolean;
  deliveries: { [day: string]: boolean };
}

export interface MonthlySalesEntry {
  customer_id: string;
  customer_name: string;
  products: MonthlySalesProduct[];
  gross_total: number;
  credits_total: number;
  net_total: number;
}

export interface MonthlySalesProduct {
  product_id: string;
  product_name: string;
  total_quantity: number;
  unit_price: number;
  total_value: number;
}

// ============================================================================
// PRODUCTION PLANNING
// ============================================================================

export interface ProductionPlan {
  date: string;
  is_past_cutoff: boolean;
  delivery_orders: DeliveryOrderSummary[];
  production_tasks: ProductionTask[];
  dough_ingredients: IngredientRequirement[];
  tray_setup: TrayRequirement[];
  cookie_layout: CookieRequirement[];
}

export interface DeliveryOrderSummary {
  order_id: string;
  customer_name: string;
  destination_group_id?: string;
  destination_group_name?: string;
  lines: DeliveryOrderLine[];
}

export interface DeliveryOrderLine {
  product_id: string;
  product_name: string;
  quantity: number;
  bake_group_id?: string;
  bake_group_name?: string;
}

export interface ProductionTask {
  delivery_date: string;
  product_id: string;
  product_name: string;
  template_name: string;
  stage_name: string;
  day_offset: number;
  quantity: number;
  bake_group_id?: string;
  bake_group_name?: string;
  destination_group_id?: string;
  destination_group_name?: string;
}

export interface IngredientRequirement {
  ingredient_name: string;
  unit: string;
  calculated_quantity: number;
  override_quantity?: number;
  final_quantity: number;
}

export interface TrayRequirement {
  product_id: string;
  product_name: string;
  total_quantity: number;
  items_per_tray: number;
  trays_needed: number;
  tray_start: number;
  tray_end: number;
  bake_group_name?: string;
  destination_group_name?: string;
}

export interface CookieRequirement {
  product_id: string;
  product_name: string;
  quantity: number;
  destination_group_name?: string;
}

export interface ProductionPlanOverride {
  id: string;
  site_id: string;
  production_date: string;
  ingredient_name: string;
  override_quantity: number;
  reason?: string;
  created_at: string;
  created_by?: string;
}
