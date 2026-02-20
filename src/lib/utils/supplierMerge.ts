import { supabase } from '@/lib/supabase';

export interface MergeResult {
  success: boolean;
  updatedRecords: number;
  error?: string;
}

/**
 * Merges multiple supplier records into one canonical supplier.
 * Updates all references across library tables (text name) and FK tables (supplier_id),
 * then soft-deletes the merged suppliers (is_active = false).
 *
 * @param canonicalSupplierId - The supplier ID to keep
 * @param mergeSupplierIds - The supplier IDs to merge INTO the canonical one
 * @param companyId - Company ID for safety check
 */
export async function mergeSuppliers(
  canonicalSupplierId: string,
  mergeSupplierIds: string[],
  companyId: string
): Promise<MergeResult> {
  let updatedRecords = 0;

  try {
    // 1. Get the canonical supplier's name
    const { data: canonical, error: fetchError } = await supabase
      .from('suppliers')
      .select('name')
      .eq('id', canonicalSupplierId)
      .eq('company_id', companyId)
      .single();

    if (fetchError || !canonical) {
      return { success: false, updatedRecords: 0, error: 'Canonical supplier not found' };
    }

    // 2. Get the names of suppliers being merged
    const { data: mergeRecords, error: mergeError } = await supabase
      .from('suppliers')
      .select('id, name')
      .in('id', mergeSupplierIds)
      .eq('company_id', companyId);

    if (mergeError || !mergeRecords?.length) {
      return { success: false, updatedRecords: 0, error: 'Merge suppliers not found' };
    }

    const mergeNames = mergeRecords.map(s => s.name);

    // 3. Update library tables — supplier column is TEXT (name, not ID)
    const libraryTables = [
      'ingredients_library',
      'packaging_library',
      'chemicals_library',
      'disposables_library',
      'ppe_library',
      'first_aid_supplies_library',
    ];

    for (const table of libraryTables) {
      for (const oldName of mergeNames) {
        try {
          const { count } = await supabase
            .from(table)
            .update({ supplier: canonical.name })
            .eq('company_id', companyId)
            .ilike('supplier', oldName)
            .select('id', { count: 'exact', head: true });

          if (count) updatedRecords += count;
        } catch {
          // Table may not exist for all companies — skip gracefully
        }
      }
    }

    // 4. Update FK tables — supplier_id UUID references
    const fkTables = [
      'product_variants',
      'deliveries',
      'purchase_orders',
      'credit_notes',
      'product_specifications',
      'supplier_documents',
    ];

    for (const table of fkTables) {
      for (const oldId of mergeSupplierIds) {
        try {
          const { count } = await supabase
            .from(table)
            .update({ supplier_id: canonicalSupplierId })
            .eq('supplier_id', oldId)
            .select('id', { count: 'exact', head: true });

          if (count) updatedRecords += count;
        } catch {
          // Table may not exist — skip gracefully
        }
      }
    }

    // 5. Soft-delete merged suppliers (set is_active = false)
    // We soft-delete rather than hard-delete to preserve audit trail
    const { error: deactivateError } = await supabase
      .from('suppliers')
      .update({
        is_active: false,
        source_library: 'merged',
      })
      .in('id', mergeSupplierIds)
      .eq('company_id', companyId);

    if (deactivateError) {
      return {
        success: false,
        updatedRecords,
        error: `References updated but failed to deactivate old suppliers: ${deactivateError.message}`,
      };
    }

    return { success: true, updatedRecords };
  } catch (error) {
    return { success: false, updatedRecords: 0, error: String(error) };
  }
}
