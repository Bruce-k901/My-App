/**
 * Stockly Module TypeScript Types
 * Types for inventory management, stock counting, and production planning
 */

// @salsa - SALSA Compliance: Batch tracking types
// ============================================================================
// Batch Tracking Types (SALSA Phase 1)
// ============================================================================

export type BatchStatus = 'active' | 'depleted' | 'expired' | 'quarantined' | 'recalled';

export type BatchMovementType =
  | 'received'
  | 'consumed_production'
  | 'consumed_waste'
  | 'adjustment'
  | 'transfer'
  | 'recalled'
  | 'rework';

export interface StockBatch {
  id: string;
  company_id: string;
  site_id: string | null;
  stock_item_id: string;
  delivery_line_id: string | null;
  production_batch_id: string | null;
  batch_code: string;
  supplier_batch_code: string | null;
  quantity_received: number;
  quantity_remaining: number;
  unit: string;
  use_by_date: string | null; // ISO date — safety-critical, mandatory discard
  best_before_date: string | null; // ISO date — quality, softer warning
  temperature_on_receipt: number | null;
  condition_notes: string | null;
  status: BatchStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data (optional, from queries)
  stock_item?: {
    id: string;
    name: string;
    category_id: string | null;
    stock_unit: string | null;
  };
  delivery?: {
    id: string;
    supplier_id: string | null;
    delivery_date: string | null;
    suppliers?: { name: string } | null;
  };
}

export type StockBatchInsert = Omit<StockBatch,
  'id' | 'created_at' | 'updated_at' | 'stock_item' | 'delivery'
>;

export type StockBatchUpdate = Partial<Pick<StockBatch,
  'quantity_remaining' | 'status' | 'condition_notes' | 'use_by_date' | 'best_before_date'
>>;

export interface BatchMovement {
  id: string;
  company_id: string;
  site_id: string | null;
  batch_id: string;
  movement_type: BatchMovementType;
  quantity: number; // positive for in, negative for out
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  // Joined data
  created_by_profile?: { full_name: string } | null;
}

export interface BatchWithMovements extends StockBatch {
  movements: BatchMovement[];
}

// Condition assessment structure for delivery goods-in
export interface ConditionAssessment {
  packaging_ok: boolean;
  pest_signs: boolean;
  cleanliness_ok: boolean;
  notes: string;
}

// Batch tracking settings (added to StocklySettings JSONB)
export interface BatchTrackingSettings {
  batch_code_format: string; // e.g. '{SITE}-{YYYY}-{MMDD}-{SEQ}'
  batch_code_auto_generate: boolean;
  require_temp_for_chilled: boolean;
  expiry_warning_days_use_by: number; // e.g. 3
  expiry_warning_days_best_before: number; // e.g. 7
}

// FIFO warning for display
export interface FifoWarning {
  older_batch_code: string;
  older_batch_remaining: number;
  older_batch_use_by: string | null;
  older_batch_best_before: string | null;
  unit: string;
}

// Expiry alert for dashboard widget
export interface ExpiryAlert {
  batch_id: string;
  batch_code: string;
  stock_item_name: string;
  quantity_remaining: number;
  unit: string;
  expiry_type: 'use_by' | 'best_before';
  expiry_date: string;
  days_until_expiry: number;
  severity: 'expired' | 'critical' | 'warning'; // expired = past date, critical = use_by approaching, warning = best_before approaching
}

export interface StorageArea {
  id: string;
  company_id: string;
  name: string;
  division: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  ingredient_count?: number; // Computed field from join
}

export type StorageAreaInsert = Omit<
  StorageArea, 
  'id' | 'created_at' | 'updated_at' | 'ingredient_count'
>;

export type StorageAreaUpdate = Partial<StorageAreaInsert>;

// Division constants
export const STORAGE_DIVISIONS = [
  'Bar',
  'Kitchen',
  'FOH',
  'Bakery',
  'Warehouse',
  'Other'
] as const;

export type StorageDivision = typeof STORAGE_DIVISIONS[number];

// ============================================================================
// Stock Count Types (Library-Based System)
// ============================================================================

export type StockCountStatus = 'draft' | 'active' | 'finalized' | 'locked';
export type StockCountFrequency = 'weekly' | 'monthly' | 'adhoc';
export type CountItemStatus = 'pending' | 'counted' | 'skipped';
export type LibraryType = string; // Dynamic - can be any library type

export interface StockCount {
  id: string;
  company_id: string;
  name: string;
  count_date: string; // ISO date string
  frequency: StockCountFrequency;
  status: StockCountStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  finalized_at: string | null;
  finalized_by: string | null;
  locked_at: string | null;
  locked_by: string | null;
  total_items: number;
  items_counted: number;
  variance_count: number;
  total_variance_value: number;
  libraries_included: LibraryType[]; // NEW: Array of libraries included
}

export interface StockCountItem {
  id: string;
  stock_count_id: string;
  stock_item_id?: string; // Auto-populated by DB trigger from ingredient_id
  storage_area_id: string | null; // Now nullable - pre-assigned area (may be null)
  ingredient_id: string;

  // @salsa — Batch tracking
  batch_id?: string | null; // null = aggregate item, set = specific batch count

  // Library fields
  library_type: LibraryType;
  counted_storage_area_id: string | null; // Where item was actually found during counting
  item_type: string | null;

  // Stock movement
  opening_stock: number | null;
  stock_in: number;
  sales: number;
  waste: number;
  transfers_in: number;
  transfers_out: number;
  theoretical_closing: number | null;

  // Count data
  counted_quantity: number | null;
  variance_quantity: number | null;
  variance_percentage: number | null;
  variance_value: number | null;

  // Metadata
  unit_of_measurement: string | null;
  unit_cost: number | null;
  status: CountItemStatus;
  counted_at: string | null;
  notes: string | null;
  created_at: string;

  // Joined data
  ingredient?: Ingredient;
  storage_area?: StorageArea; // Pre-assigned area (may be null)
  counted_storage_area?: StorageArea; // Where actually found during counting
  // @salsa — Joined batch data (when batch_id is set)
  batch?: {
    id: string;
    batch_code: string;
    use_by_date: string | null;
    best_before_date: string | null;
    quantity_remaining: number;
    status: BatchStatus;
  };
}

export interface StockCountWithDetails extends StockCount {
  items?: StockCountItem[];
}

// Library info for selection
export interface LibraryInfo {
  type: LibraryType;
  name: string;
  count: number;
  description: string;
  tableName?: string; // The actual table name (e.g., 'ingredients_library')
}

export type StockCountInsert = Omit<
  StockCount,
  'id' | 'created_at' | 'finalized_at' | 'finalized_by' | 'locked_at' | 'locked_by' | 'total_items' | 'items_counted' | 'variance_count' | 'total_variance_value'
>;

export type StockCountUpdate = Partial<StockCountInsert>;

// Ingredient interface (for stock count items)
export interface Ingredient {
  id: string;
  ingredient_name?: string;
  name?: string;
  unit_of_measurement?: string;
  cost_per_unit?: number;
  current_stock_level?: number;
  storage_area_id?: string;
}

// ============================================================================
// Price Change Detection Types (Phase 2)
// ============================================================================

export interface PriceChange {
  deliveryLineId: string;
  ingredientId: string;
  ingredientName: string;

  // Current state
  currentUnitCost: number;
  currentPackCost: number;
  currentPackSize: number;

  // Invoice state
  invoiceUnitPrice: number; // Price per pack from invoice
  invoicePackSize: number;   // Pack size extracted from description
  invoiceUnitCost: number;   // Calculated: invoiceUnitPrice / invoicePackSize

  // Change metrics
  unitCostChange: number;      // Absolute change in £/unit
  unitCostChangePercent: number; // Percentage change
  packCostChange: number;       // Absolute change in £/pack

  // Flags
  isSignificantChange: boolean;  // > 10%
  isPriceIncrease: boolean;

  // User decision
  accepted: boolean;  // Default true, user can uncheck

  // Optional impact preview
  affectedRecipes?: {
    recipeId: string;
    recipeName: string;
    currentCost: number;
    newCost: number;
  }[];
}

// @salsa - SALSA Compliance: Phase 2 types
// ============================================================================
// Supplier Approval Types (SALSA Phase 2)
// ============================================================================

export type SupplierApprovalStatus = 'pending' | 'approved' | 'conditional' | 'suspended' | 'rejected';
export type RiskRating = 'low' | 'medium' | 'high' | 'critical';
export type SupplierDocumentType = 'certificate' | 'insurance' | 'spec_sheet' | 'audit_report' | 'contract' | 'other';

export interface Supplier {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
  };
  ordering_method?: 'phone' | 'email' | 'whatsapp' | 'portal' | 'rep';
  ordering_config?: {
    whatsapp_number?: string;
    portal_url?: string;
    rep_name?: string;
  };
  payment_terms_days?: number;
  minimum_order_value?: number;
  delivery_days?: string[];
  lead_time_days?: number;
  order_cutoff_time?: string;
  account_number?: string;
  is_active: boolean;
  is_approved: boolean;
  // @salsa Phase 2 fields
  approval_status?: SupplierApprovalStatus;
  risk_rating?: RiskRating;
  next_review_date?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
}

export interface SupplierDocument {
  id: string;
  company_id: string;
  supplier_id: string;
  document_type: SupplierDocumentType;
  name: string;
  description?: string | null;
  file_path?: string | null;
  version: string;
  expiry_date?: string | null;
  is_archived: boolean;
  uploaded_by?: string | null;
  uploaded_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierApprovalLog {
  id: string;
  company_id: string;
  supplier_id: string;
  action: string;
  old_status?: string | null;
  new_status?: string | null;
  old_risk_rating?: string | null;
  new_risk_rating?: string | null;
  notes?: string | null;
  performed_by?: string | null;
  performed_at: string;
  // Joined data
  performed_by_profile?: { full_name: string } | null;
}

// ============================================================================
// Product Specification Types (SALSA Phase 2)
// ============================================================================

export type SpecStatus = 'draft' | 'active' | 'superseded';
export type StorageCondition = 'ambient' | 'chilled' | 'frozen' | 'dry' | 'cool_dry';
export type ShelfLifeUnit = 'days' | 'weeks' | 'months';

export interface ProductSpecification {
  id: string;
  company_id: string;
  stock_item_id: string;
  supplier_id?: string | null;
  version_number: number;
  allergens?: string[] | null;
  may_contain_allergens?: string[] | null;
  storage_temp_min?: number | null;
  storage_temp_max?: number | null;
  storage_conditions?: StorageCondition | null;
  shelf_life_days?: number | null;
  shelf_life_unit: ShelfLifeUnit;
  handling_instructions?: string | null;
  country_of_origin?: string | null;
  spec_document_id?: string | null;
  status: SpecStatus;
  last_reviewed_at?: string | null;
  next_review_date?: string | null;
  reviewed_by?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  // Joined data
  stock_item?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
  spec_document?: SupplierDocument | null;
}

// @salsa - SALSA Compliance: Phase 3 types
// ============================================================================
// Production Batch Types (SALSA Phase 3)
// ============================================================================

export type ProductionBatchStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type CCPType = 'cooking_temp' | 'cooling_temp' | 'cooling_time' | 'metal_detection' | 'ph_level' | 'other';

export interface ProductionBatch {
  id: string;
  company_id: string;
  site_id: string | null;
  batch_code: string;
  recipe_id: string | null;
  process_template_id: string | null;
  production_date: string;
  status: ProductionBatchStatus;
  planned_quantity: number | null;
  actual_quantity: number | null;
  unit: string | null;
  started_at: string | null;
  completed_at: string | null;
  operator_id: string | null;
  notes: string | null;
  allergens: string[] | null;
  may_contain_allergens: string[] | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  recipe?: { id: string; name: string; allergens?: string[] | null; may_contain_allergens?: string[] | null } | null;
  inputs?: ProductionBatchInput[];
  outputs?: ProductionBatchOutput[];
  ccp_records?: ProductionCCPRecord[];
}

export interface ProductionBatchInput {
  id: string;
  company_id: string;
  production_batch_id: string;
  stock_batch_id: string;
  stock_item_id: string;
  planned_quantity: number | null;
  actual_quantity: number | null;
  unit: string | null;
  added_at: string;
  added_by: string | null;
  // @salsa — Rework tracking
  is_rework: boolean;
  rework_source_batch_id: string | null;
  // Joined data
  stock_batch?: StockBatch | null;
  stock_item?: { id: string; name: string; stock_unit?: string | null } | null;
  rework_source_batch?: { id: string; batch_code: string; production_date: string } | null;
}

export interface ProductionBatchOutput {
  id: string;
  company_id: string;
  production_batch_id: string;
  stock_item_id: string;
  batch_code: string;
  quantity: number | null;
  unit: string | null;
  use_by_date: string | null;
  best_before_date: string | null;
  created_at: string;
  // Joined data
  stock_item?: { id: string; name: string } | null;
  stock_batch?: StockBatch | null; // The created stock_batch record
}

export interface ProductionCCPRecord {
  id: string;
  company_id: string;
  production_batch_id: string;
  ccp_type: CCPType;
  target_value: string | null;
  actual_value: string | null;
  unit: string | null;
  is_within_spec: boolean | null;
  corrective_action: string | null;
  recorded_at: string;
  recorded_by: string | null;
  // Joined data
  recorded_by_profile?: { full_name: string } | null;
}

// @salsa - SALSA Compliance: Phase 4 types
// ============================================================================
// Traceability + Recall Types (SALSA Phase 4)
// ============================================================================

export type RecallType = 'recall' | 'withdrawal';
export type RecallSeverity = 'class_1' | 'class_2' | 'class_3';
export type RecallStatus = 'draft' | 'active' | 'investigating' | 'notified' | 'resolved' | 'closed';
export type RecallBatchAction = 'quarantined' | 'destroyed' | 'returned' | 'released' | 'pending';

export interface Recall {
  id: string;
  company_id: string;
  site_id: string | null;
  recall_code: string;
  title: string;
  description: string | null;
  recall_type: RecallType;
  severity: RecallSeverity;
  status: RecallStatus;
  reason: string | null;
  root_cause: string | null;
  corrective_actions: string | null;
  initiated_at: string;
  initiated_by: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  fsa_notified: boolean;
  fsa_notified_at: string | null;
  fsa_reference: string | null;
  salsa_notified: boolean;
  salsa_notified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  affected_batches?: RecallAffectedBatch[];
  notifications?: RecallNotification[];
}

export interface RecallAffectedBatch {
  id: string;
  company_id: string;
  recall_id: string;
  stock_batch_id: string;
  batch_type: 'raw_material' | 'finished_product';
  quantity_affected: number | null;
  quantity_recovered: number | null;
  action_taken: RecallBatchAction;
  notes: string | null;
  added_at: string;
  // Joined
  stock_batch?: StockBatch | null;
}

export interface RecallNotification {
  id: string;
  company_id: string;
  recall_id: string;
  customer_id: string | null;
  customer_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  notification_method: string | null;
  notified_at: string | null;
  notified_by: string | null;
  response_received: boolean;
  response_notes: string | null;
  stock_returned: boolean;
  stock_return_quantity: number | null;
  created_at: string;
}

export interface BatchDispatchRecord {
  id: string;
  company_id: string;
  site_id: string | null;
  stock_batch_id: string;
  order_id: string | null;
  customer_id: string | null;
  customer_name: string;
  dispatch_date: string;
  quantity: number;
  unit: string | null;
  delivery_note_reference: string | null;
  created_at: string;
  created_by: string | null;
  // Joined
  stock_batch?: StockBatch | null;
}

// Traceability report types
export interface TraceNode {
  type: 'supplier' | 'raw_material_batch' | 'production_batch' | 'finished_product_batch' | 'customer';
  id: string;
  label: string;
  sublabel?: string;
  date?: string;
  quantity?: number;
  unit?: string;
  allergens?: string[];
  status?: string;
}

export interface TraceLink {
  from: string;
  to: string;
  label?: string;
  quantity?: number;
}

export interface TraceResult {
  nodes: TraceNode[];
  links: TraceLink[];
  batch: StockBatch;
  direction: 'forward' | 'backward';
  mass_balance?: {
    total_input: number;
    total_output: number;
    variance: number;
    variance_percent: number;
    unit: string;
  };
}

export interface ProductSpecificationHistory {
  id: string;
  spec_id: string;
  company_id: string;
  stock_item_id: string;
  version_number: number;
  allergens?: string[] | null;
  may_contain_allergens?: string[] | null;
  storage_temp_min?: number | null;
  storage_temp_max?: number | null;
  storage_conditions?: string | null;
  shelf_life_days?: number | null;
  shelf_life_unit?: string | null;
  handling_instructions?: string | null;
  country_of_origin?: string | null;
  spec_document_id?: string | null;
  change_notes?: string | null;
  archived_at: string;
  archived_by?: string | null;
  // Joined data
  archived_by_profile?: { full_name: string } | null;
}

// @salsa - SALSA Compliance: Phase 5 — Calibration + Non-Conformance types

export interface AssetCalibration {
  id: string;
  company_id: string;
  site_id: string | null;
  asset_id: string;
  calibration_date: string;
  next_calibration_due: string | null;
  calibrated_by: string;
  certificate_reference: string | null;
  certificate_url: string | null;
  method: string | null;
  readings: Record<string, number> | null;
  result: 'pass' | 'fail' | 'adjusted';
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export type NonConformanceCategory = 'hygiene' | 'temperature' | 'cleaning' | 'documentation' | 'allergen' | 'pest_control' | 'supplier' | 'traceability' | 'calibration' | 'labelling' | 'other';
export type NonConformanceSeverity = 'minor' | 'major' | 'critical';
export type NonConformanceSource = 'internal_audit' | 'external_audit' | 'customer_complaint' | 'staff_observation' | 'monitoring' | 'other';
export type NonConformanceStatus = 'open' | 'investigating' | 'corrective_action' | 'verification' | 'closed';

export interface NonConformance {
  id: string;
  company_id: string;
  site_id: string | null;
  nc_code: string;
  title: string;
  description: string | null;
  category: NonConformanceCategory;
  severity: NonConformanceSeverity;
  source: NonConformanceSource;
  source_reference: string | null;
  status: NonConformanceStatus;
  root_cause: string | null;
  corrective_action: string | null;
  corrective_action_due: string | null;
  corrective_action_completed_at: string | null;
  corrective_action_verified_by: string | null;
  corrective_action_evidence: string | null;
  preventive_action: string | null;
  raised_by: string | null;
  raised_at: string;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
}

