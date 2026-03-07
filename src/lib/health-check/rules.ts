import type { ScanRuleDefinition, ScannedItem } from '@/types/health-check'
import type { SupabaseClient } from '@supabase/supabase-js'

// The 14 major allergens (UK/EU)
const MAJOR_ALLERGENS = [
  'Celery', 'Cereals containing gluten', 'Crustaceans', 'Eggs',
  'Fish', 'Lupin', 'Milk', 'Molluscs', 'Mustard', 'Nuts',
  'Peanuts', 'Sesame', 'Soybeans', 'Sulphur dioxide',
]

// ---------- Rule Definitions ----------

export const RULES: ScanRuleDefinition[] = [
  // =============================================
  // STOCKLY — Stock & Inventory
  // =============================================
  {
    id: 'stockly_missing_supplier',
    module: 'stockly',
    category: 'missing_supplier',
    severity: 'medium',
    title: 'Missing Supplier',
    description: 'Product variant has no supplier assigned',
    table_name: 'product_variants',
    field_name: 'supplier_id',
    field_label: 'Supplier',
    field_type: 'relationship',
  },
  {
    id: 'stockly_missing_par_level',
    module: 'stockly',
    category: 'missing_par_level',
    severity: 'low',
    title: 'Missing PAR Level',
    description: 'Tracked stock item has no PAR level set',
    table_name: 'stock_items',
    field_name: 'par_level',
    field_label: 'PAR Level',
    field_type: 'number',
  },
  {
    id: 'stockly_missing_category',
    module: 'stockly',
    category: 'missing_category',
    severity: 'low',
    title: 'Missing Category',
    description: 'Stock item has no category assigned',
    table_name: 'stock_items',
    field_name: 'category_id',
    field_label: 'Category',
    field_type: 'relationship',
  },

  // =============================================
  // CHECKLY — Compliance & Food Safety
  // =============================================
  {
    id: 'checkly_missing_allergens',
    module: 'checkly',
    category: 'missing_allergens',
    severity: 'critical',
    title: 'Missing Allergens',
    description: 'Stock item has no allergen information recorded',
    table_name: 'stock_items',
    field_name: 'allergens',
    field_label: 'Allergens',
    field_type: 'multiselect',
    field_options: MAJOR_ALLERGENS,
  },
  {
    id: 'checkly_missing_risk_assessment',
    module: 'checkly',
    category: 'missing_risk_assessment',
    severity: 'critical',
    title: 'Missing Risk Assessment',
    description: 'Task template requires a risk assessment but none is linked',
    table_name: 'task_templates',
    field_name: 'linked_risk_id',
    field_label: 'Risk Assessment',
    field_type: 'relationship',
  },
  {
    id: 'checkly_draft_sop',
    module: 'checkly',
    category: 'draft_sop',
    severity: 'low',
    title: 'SOP Still in Draft',
    description: 'Standard Operating Procedure has not been published',
    table_name: 'sop_entries',
    field_name: 'status',
    field_label: 'Status',
    field_type: 'select',
    field_options: ['Draft', 'Published', 'Archived'],
  },
  {
    id: 'checkly_expired_document',
    module: 'checkly',
    category: 'expired_document',
    severity: 'medium',
    title: 'Expired Document',
    description: 'Employee document has passed its expiry date',
    table_name: 'employee_documents',
    field_name: 'expires_at',
    field_label: 'Expiry Date',
    field_type: 'date',
  },

  // =============================================
  // TEAMLY — Training
  // =============================================
  {
    id: 'teamly_expired_training',
    module: 'teamly',
    category: 'expired_training',
    severity: 'critical',
    title: 'Expired Training',
    description: 'Staff member has expired or overdue training certification',
    table_name: 'training_records',
    field_name: 'expiry_date',
    field_label: 'Expiry Date',
    field_type: 'date',
  },
  {
    id: 'teamly_incomplete_training',
    module: 'teamly',
    category: 'incomplete_training',
    severity: 'medium',
    title: 'Incomplete Required Training',
    description: 'Staff member has not started a required training course',
    table_name: 'training_records',
    field_name: 'status',
    field_label: 'Status',
    field_type: 'select',
    field_options: ['not_started', 'in_progress', 'completed', 'expired', 'failed'],
  },

  // =============================================
  // TEAMLY — Staff HR / Employee Records
  // =============================================
  {
    id: 'teamly_missing_emergency_contact',
    module: 'teamly',
    category: 'missing_emergency_contact',
    severity: 'medium',
    title: 'Missing Emergency Contact',
    description: 'Staff member has no emergency contact on file',
    table_name: 'profiles',
    field_name: 'emergency_contacts',
    field_label: 'Emergency Contact',
    field_type: 'json',
  },
  {
    id: 'teamly_missing_bank_details',
    module: 'teamly',
    category: 'missing_bank_details',
    severity: 'medium',
    title: 'Missing Bank Details',
    description: 'Staff member has no bank account details for payroll',
    table_name: 'profiles',
    field_name: 'bank_account_number',
    field_label: 'Bank Account Number',
    field_type: 'text',
  },
  {
    id: 'teamly_missing_right_to_work',
    module: 'teamly',
    category: 'missing_right_to_work',
    severity: 'critical',
    title: 'Unverified Right to Work',
    description: 'Staff member right to work has not been verified',
    table_name: 'profiles',
    field_name: 'right_to_work_status',
    field_label: 'Right to Work Status',
    field_type: 'select',
    field_options: ['pending', 'verified', 'expired', 'not_required'],
  },
  {
    id: 'teamly_expired_right_to_work',
    module: 'teamly',
    category: 'expired_right_to_work',
    severity: 'critical',
    title: 'Expired Right to Work',
    description: 'Staff member right to work document has expired',
    table_name: 'profiles',
    field_name: 'right_to_work_expiry',
    field_label: 'RTW Expiry Date',
    field_type: 'date',
  },
  {
    id: 'teamly_missing_ni_number',
    module: 'teamly',
    category: 'missing_ni_number',
    severity: 'medium',
    title: 'Missing NI Number',
    description: 'Staff member has no National Insurance number on file',
    table_name: 'profiles',
    field_name: 'national_insurance_number',
    field_label: 'NI Number',
    field_type: 'text',
  },
  {
    id: 'teamly_missing_address',
    module: 'teamly',
    category: 'missing_address',
    severity: 'low',
    title: 'Missing Address',
    description: 'Staff member has no address on file',
    table_name: 'profiles',
    field_name: 'address_line_1',
    field_label: 'Address',
    field_type: 'text',
  },
  {
    id: 'teamly_missing_dob',
    module: 'teamly',
    category: 'missing_dob',
    severity: 'low',
    title: 'Missing Date of Birth',
    description: 'Staff member has no date of birth recorded',
    table_name: 'profiles',
    field_name: 'date_of_birth',
    field_label: 'Date of Birth',
    field_type: 'date',
  },
  {
    id: 'teamly_missing_start_date',
    module: 'teamly',
    category: 'missing_start_date',
    severity: 'low',
    title: 'Missing Start Date',
    description: 'Staff member has no employment start date recorded',
    table_name: 'profiles',
    field_name: 'start_date',
    field_label: 'Start Date',
    field_type: 'date',
  },
  {
    id: 'teamly_pending_dbs',
    module: 'teamly',
    category: 'pending_dbs',
    severity: 'medium',
    title: 'Pending DBS Check',
    description: 'Staff member has a DBS check still pending',
    table_name: 'profiles',
    field_name: 'dbs_status',
    field_label: 'DBS Status',
    field_type: 'select',
    field_options: ['not_required', 'pending', 'clear', 'issues_found'],
  },

  // =============================================
  // TEAMLY — Certificate Expiries (on profiles)
  // =============================================
  {
    id: 'teamly_expired_food_safety',
    module: 'teamly',
    category: 'expired_food_safety',
    severity: 'critical',
    title: 'Expired Food Safety Certificate',
    description: 'Staff member food safety certificate has expired',
    table_name: 'profiles',
    field_name: 'food_safety_expiry_date',
    field_label: 'Food Safety Expiry',
    field_type: 'date',
  },
  {
    id: 'teamly_expired_first_aid',
    module: 'teamly',
    category: 'expired_first_aid',
    severity: 'medium',
    title: 'Expired First Aid Certificate',
    description: 'Staff member first aid certificate has expired',
    table_name: 'profiles',
    field_name: 'first_aid_expiry_date',
    field_label: 'First Aid Expiry',
    field_type: 'date',
  },
  {
    id: 'teamly_expired_h_and_s',
    module: 'teamly',
    category: 'expired_h_and_s',
    severity: 'medium',
    title: 'Expired Health & Safety Certificate',
    description: 'Staff member H&S certificate has expired',
    table_name: 'profiles',
    field_name: 'h_and_s_expiry_date',
    field_label: 'H&S Expiry',
    field_type: 'date',
  },
  {
    id: 'teamly_expired_fire_marshal',
    module: 'teamly',
    category: 'expired_fire_marshal',
    severity: 'medium',
    title: 'Expired Fire Marshal Certificate',
    description: 'Staff member fire marshal certificate has expired',
    table_name: 'profiles',
    field_name: 'fire_marshal_expiry_date',
    field_label: 'Fire Marshal Expiry',
    field_type: 'date',
  },
  {
    id: 'teamly_expired_coshh',
    module: 'teamly',
    category: 'expired_coshh',
    severity: 'medium',
    title: 'Expired COSHH Certificate',
    description: 'Staff member COSHH certificate has expired',
    table_name: 'profiles',
    field_name: 'cossh_expiry_date',
    field_label: 'COSHH Expiry',
    field_type: 'date',
  },

  // =============================================
  // ASSETLY — Assets & Maintenance
  // =============================================
  {
    id: 'assetly_overdue_ppm',
    module: 'assetly',
    category: 'overdue_ppm',
    severity: 'critical',
    title: 'Overdue PPM Service',
    description: 'Asset has an overdue planned preventative maintenance service',
    table_name: 'assets',
    field_name: 'next_service_date',
    field_label: 'Next Service Date',
    field_type: 'date',
  },
  {
    id: 'assetly_missing_ppm_contractor',
    module: 'assetly',
    category: 'missing_ppm_contractor',
    severity: 'medium',
    title: 'Missing PPM Contractor',
    description: 'Asset has PPM schedule but no contractor assigned',
    table_name: 'assets',
    field_name: 'ppm_contractor_id',
    field_label: 'PPM Contractor',
    field_type: 'relationship',
  },
]

export function getRuleById(id: string): ScanRuleDefinition | undefined {
  return RULES.find(r => r.id === id)
}

export function getRuleByCategory(category: string): ScanRuleDefinition | undefined {
  return RULES.find(r => r.category === category)
}

// ---------- Scan Functions ----------

type ScanFn = (supabase: SupabaseClient, companyId: string, siteId: string) => Promise<ScannedItem[]>

async function scanMissingSupplier(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('stockly_missing_supplier')!
  // product_variants with null supplier, joined to stock_items for name
  // Note: stock_items is company-scoped (no site_id column)
  const { data, error } = await supabase
    .from('product_variants')
    .select('id, supplier_id, stock_item_id, stock_items!inner(id, name, company_id)')
    .is('supplier_id', null)
    .eq('stock_items.company_id', companyId)

  if (error) throw error
  if (!data) return []

  return data
    .filter((row: any) => row.stock_items != null)
    .map((row: any) => ({
      rule,
      record_id: row.id,
      record_name: row.stock_items?.name ?? 'Unknown',
      site_id: siteId,
      current_value: null,
    }))
}

async function scanMissingParLevel(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('stockly_missing_par_level')!
  // stock_items is company-scoped (no site_id column)
  const { data, error } = await supabase
    .from('stock_items')
    .select('id, name, par_level')
    .eq('company_id', companyId)
    .eq('track_stock', true)
    .or('par_level.is.null,par_level.eq.0')

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.name,
    site_id: siteId,
    current_value: row.par_level,
  }))
}

async function scanMissingCategory(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('stockly_missing_category')!
  // stock_items is company-scoped (no site_id column)
  const { data, error } = await supabase
    .from('stock_items')
    .select('id, name, category_id')
    .eq('company_id', companyId)
    .is('category_id', null)

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.name,
    site_id: siteId,
    current_value: null,
  }))
}

async function scanMissingAllergens(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('checkly_missing_allergens')!
  // stock_items is company-scoped (no site_id column)
  // allergens is TEXT[] — filter null or empty array
  const { data, error } = await supabase
    .from('stock_items')
    .select('id, name, allergens')
    .eq('company_id', companyId)
    .or('allergens.is.null,allergens.eq.{}')

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.name,
    site_id: siteId,
    current_value: row.allergens,
  }))
}

async function scanMissingRiskAssessment(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('checkly_missing_risk_assessment')!
  let query = supabase
    .from('task_templates')
    .select('id, name, linked_risk_id, site_id')
    .eq('company_id', companyId)
    .eq('requires_risk_assessment', true)
    .is('linked_risk_id', null)

  if (siteId) query = query.eq('site_id', siteId)

  const { data, error } = await query
  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.name,
    site_id: row.site_id ?? siteId,
    current_value: null,
  }))
}

async function scanExpiredTraining(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_expired_training')!
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('training_records')
    .select('id, profile_id, course_id, expiry_date, status, profiles!inner(full_name, company_id), training_courses!inner(name)')
    .eq('profiles.company_id', companyId)
    .or(`status.eq.expired,expiry_date.lt.${now}`)

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: `${row.profiles?.full_name ?? 'Unknown'} - ${row.training_courses?.name ?? 'Unknown course'}`,
    site_id: siteId,
    current_value: row.expiry_date,
  }))
}

async function scanIncompleteTraining(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_incomplete_training')!

  const { data, error } = await supabase
    .from('training_records')
    .select('id, profile_id, course_id, status, profiles!inner(full_name, company_id), training_courses!inner(name, is_mandatory)')
    .eq('profiles.company_id', companyId)
    .eq('status', 'not_started')
    .eq('training_courses.is_mandatory', true)

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: `${row.profiles?.full_name ?? 'Unknown'} - ${row.training_courses?.name ?? 'Unknown course'}`,
    site_id: siteId,
    current_value: row.status,
  }))
}

async function scanMissingEmergencyContact(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_missing_emergency_contact')!

  // Check both emergency_contact (singular, health-check migration) and emergency_contacts (plural, employee fields migration)
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, emergency_contact, emergency_contacts, app_role')
    .eq('company_id', companyId)
    .not('app_role', 'eq', 'Owner')

  if (error) throw error
  if (!data) return []

  return data
    .filter((row: any) => !row.emergency_contact && !row.emergency_contacts)
    .map((row: any) => ({
      rule,
      record_id: row.id,
      record_name: row.full_name ?? 'Unknown',
      site_id: siteId,
      current_value: null,
    }))
}

// --- Staff HR fields (profiles) ---

async function scanMissingBankDetails(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_missing_bank_details')!

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, bank_account_number, bank_sort_code, app_role')
    .eq('company_id', companyId)
    .not('app_role', 'eq', 'Owner')

  if (error) throw error
  if (!data) return []

  return data
    .filter((row: any) => !row.bank_account_number || !row.bank_sort_code)
    .map((row: any) => ({
      rule,
      record_id: row.id,
      record_name: row.full_name ?? 'Unknown',
      site_id: siteId,
      current_value: null,
    }))
}

async function scanMissingRightToWork(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_missing_right_to_work')!

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, right_to_work_status, app_role')
    .eq('company_id', companyId)
    .not('app_role', 'eq', 'Owner')
    .or('right_to_work_status.is.null,right_to_work_status.eq.pending')

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.full_name ?? 'Unknown',
    site_id: siteId,
    current_value: row.right_to_work_status ?? null,
  }))
}

async function scanExpiredRightToWork(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_expired_right_to_work')!
  const now = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, right_to_work_expiry, right_to_work_status, app_role')
    .eq('company_id', companyId)
    .not('app_role', 'eq', 'Owner')
    .not('right_to_work_status', 'eq', 'not_required')
    .not('right_to_work_expiry', 'is', null)
    .lt('right_to_work_expiry', now)

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.full_name ?? 'Unknown',
    site_id: siteId,
    current_value: row.right_to_work_expiry,
  }))
}

async function scanMissingNINumber(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_missing_ni_number')!

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, national_insurance_number, app_role')
    .eq('company_id', companyId)
    .not('app_role', 'eq', 'Owner')
    .is('national_insurance_number', null)

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.full_name ?? 'Unknown',
    site_id: siteId,
    current_value: null,
  }))
}

async function scanMissingAddress(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_missing_address')!

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, address_line_1, app_role')
    .eq('company_id', companyId)
    .not('app_role', 'eq', 'Owner')
    .is('address_line_1', null)

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.full_name ?? 'Unknown',
    site_id: siteId,
    current_value: null,
  }))
}

async function scanMissingDOB(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_missing_dob')!

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, date_of_birth, app_role')
    .eq('company_id', companyId)
    .not('app_role', 'eq', 'Owner')
    .is('date_of_birth', null)

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.full_name ?? 'Unknown',
    site_id: siteId,
    current_value: null,
  }))
}

async function scanMissingStartDate(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_missing_start_date')!

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, start_date, app_role')
    .eq('company_id', companyId)
    .not('app_role', 'eq', 'Owner')
    .is('start_date', null)

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.full_name ?? 'Unknown',
    site_id: siteId,
    current_value: null,
  }))
}

async function scanPendingDBS(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_pending_dbs')!

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, dbs_status, app_role')
    .eq('company_id', companyId)
    .not('app_role', 'eq', 'Owner')
    .eq('dbs_status', 'pending')

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.full_name ?? 'Unknown',
    site_id: siteId,
    current_value: 'pending',
  }))
}

// --- Certificate Expiries (profiles) ---

async function scanExpiredFoodSafety(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_expired_food_safety')!
  const now = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, food_safety_expiry_date, food_safety_level, app_role')
    .eq('company_id', companyId)
    .not('app_role', 'eq', 'Owner')
    .not('food_safety_expiry_date', 'is', null)
    .lt('food_safety_expiry_date', now)

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: `${row.full_name ?? 'Unknown'} (L${row.food_safety_level ?? '?'})`,
    site_id: siteId,
    current_value: row.food_safety_expiry_date,
  }))
}

async function scanExpiredFirstAid(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_expired_first_aid')!
  const now = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, first_aid_expiry_date, first_aid_trained, app_role')
    .eq('company_id', companyId)
    .not('app_role', 'eq', 'Owner')
    .eq('first_aid_trained', true)
    .not('first_aid_expiry_date', 'is', null)
    .lt('first_aid_expiry_date', now)

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.full_name ?? 'Unknown',
    site_id: siteId,
    current_value: row.first_aid_expiry_date,
  }))
}

async function scanExpiredHandS(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_expired_h_and_s')!
  const now = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, h_and_s_expiry_date, h_and_s_level, app_role')
    .eq('company_id', companyId)
    .not('app_role', 'eq', 'Owner')
    .not('h_and_s_expiry_date', 'is', null)
    .lt('h_and_s_expiry_date', now)

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: `${row.full_name ?? 'Unknown'} (L${row.h_and_s_level ?? '?'})`,
    site_id: siteId,
    current_value: row.h_and_s_expiry_date,
  }))
}

async function scanExpiredFireMarshal(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_expired_fire_marshal')!
  const now = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, fire_marshal_expiry_date, fire_marshal_trained, app_role')
    .eq('company_id', companyId)
    .not('app_role', 'eq', 'Owner')
    .eq('fire_marshal_trained', true)
    .not('fire_marshal_expiry_date', 'is', null)
    .lt('fire_marshal_expiry_date', now)

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.full_name ?? 'Unknown',
    site_id: siteId,
    current_value: row.fire_marshal_expiry_date,
  }))
}

async function scanExpiredCOSHH(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('teamly_expired_coshh')!
  const now = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, cossh_expiry_date, cossh_trained, app_role')
    .eq('company_id', companyId)
    .not('app_role', 'eq', 'Owner')
    .eq('cossh_trained', true)
    .not('cossh_expiry_date', 'is', null)
    .lt('cossh_expiry_date', now)

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.full_name ?? 'Unknown',
    site_id: siteId,
    current_value: row.cossh_expiry_date,
  }))
}

// --- SOPs & Documents ---

async function scanDraftSOPs(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('checkly_draft_sop')!

  const { data, error } = await supabase
    .from('sop_entries')
    .select('id, title, ref_code, status')
    .eq('company_id', companyId)
    .eq('status', 'Draft')
    .is('parent_id', null) // Only originals, not version children

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: `${row.ref_code ?? ''} ${row.title}`.trim(),
    site_id: siteId,
    current_value: 'Draft',
  }))
}

async function scanExpiredDocuments(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('checkly_expired_document')!
  const now = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('employee_documents')
    .select('id, title, document_type, expires_at, profile_id, profiles!inner(full_name, company_id)')
    .eq('profiles.company_id', companyId)
    .is('deleted_at', null)
    .not('expires_at', 'is', null)
    .lt('expires_at', now)

  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: `${row.profiles?.full_name ?? 'Unknown'} - ${row.title ?? row.document_type ?? 'Document'}`,
    site_id: siteId,
    current_value: row.expires_at,
  }))
}

async function scanOverduePPM(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('assetly_overdue_ppm')!
  const now = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('assets')
    .select('id, name, next_service_date, site_id')
    .eq('company_id', companyId)
    .not('next_service_date', 'is', null)
    .lt('next_service_date', now)
    .or('archived.is.null,archived.eq.false')

  if (siteId) query = query.eq('site_id', siteId)

  const { data, error } = await query
  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.name,
    site_id: row.site_id ?? siteId,
    current_value: row.next_service_date,
  }))
}

async function scanMissingPPMContractor(supabase: SupabaseClient, companyId: string, siteId: string): Promise<ScannedItem[]> {
  const rule = getRuleById('assetly_missing_ppm_contractor')!

  let query = supabase
    .from('assets')
    .select('id, name, ppm_frequency_months, ppm_contractor_id, site_id')
    .eq('company_id', companyId)
    .not('ppm_frequency_months', 'is', null)
    .is('ppm_contractor_id', null)
    .or('archived.is.null,archived.eq.false')

  if (siteId) query = query.eq('site_id', siteId)

  const { data, error } = await query
  if (error) throw error
  if (!data) return []

  return data.map((row: any) => ({
    rule,
    record_id: row.id,
    record_name: row.name,
    site_id: row.site_id ?? siteId,
    current_value: null,
  }))
}

// Map rule IDs to scan functions
export const SCAN_FUNCTIONS: Record<string, ScanFn> = {
  // Stockly
  stockly_missing_supplier: scanMissingSupplier,
  stockly_missing_par_level: scanMissingParLevel,
  stockly_missing_category: scanMissingCategory,
  // Checkly
  checkly_missing_allergens: scanMissingAllergens,
  checkly_missing_risk_assessment: scanMissingRiskAssessment,
  checkly_draft_sop: scanDraftSOPs,
  checkly_expired_document: scanExpiredDocuments,
  // Teamly — Training
  teamly_expired_training: scanExpiredTraining,
  teamly_incomplete_training: scanIncompleteTraining,
  // Teamly — Staff HR
  teamly_missing_emergency_contact: scanMissingEmergencyContact,
  teamly_missing_bank_details: scanMissingBankDetails,
  teamly_missing_right_to_work: scanMissingRightToWork,
  teamly_expired_right_to_work: scanExpiredRightToWork,
  teamly_missing_ni_number: scanMissingNINumber,
  teamly_missing_address: scanMissingAddress,
  teamly_missing_dob: scanMissingDOB,
  teamly_missing_start_date: scanMissingStartDate,
  teamly_pending_dbs: scanPendingDBS,
  // Teamly — Certificate Expiries
  teamly_expired_food_safety: scanExpiredFoodSafety,
  teamly_expired_first_aid: scanExpiredFirstAid,
  teamly_expired_h_and_s: scanExpiredHandS,
  teamly_expired_fire_marshal: scanExpiredFireMarshal,
  teamly_expired_coshh: scanExpiredCOSHH,
  // Assetly
  assetly_overdue_ppm: scanOverduePPM,
  assetly_missing_ppm_contractor: scanMissingPPMContractor,
}
