import { supabase } from '@/lib/supabase';

/**
 * Ensures a supplier exists for the given name and company.
 * Creates a placeholder if not found.
 * 
 * @param supplierName - Name from ingredient card
 * @param companyId - Current company ID
 * @returns Supplier ID if found/created, null if invalid input
 */
export async function ensureSupplierExists(
  supplierName: string | null | undefined,
  companyId: string
): Promise<string | null> {
  // Normalize and validate
  const normalizedName = supplierName?.trim();
  if (!normalizedName || !companyId) {
    return null;
  }

  try {
    // Check if supplier exists (case-insensitive)
    const { data: existing, error: searchError } = await supabase
      .from('suppliers')
      .select('id')
      .eq('company_id', companyId)
      .ilike('name', normalizedName)
      .maybeSingle();

    if (searchError) {
      console.error('Error checking supplier existence:', searchError);
      return null;
    }

    // Return existing supplier ID
    if (existing) {
      return existing.id;
    }

    // Generate supplier code
    const code = await generateSupplierCode(normalizedName, companyId);

    // Create placeholder supplier
    const { data: newSupplier, error: insertError } = await supabase
      .from('suppliers')
      .insert({
        company_id: companyId,
        name: normalizedName,
        code: code,
        is_active: true,
        is_approved: false, // Placeholder - needs approval
        // All contact fields null - user completes later
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating supplier placeholder:', insertError);
      return null;
    }

    return newSupplier.id;

  } catch (error) {
    console.error('Unexpected error in ensureSupplierExists:', error);
    return null; // Don't block ingredient save if supplier creation fails
  }
}

/**
 * Generates a unique supplier code in format: SUP-{first3}-{number}
 * Example: SUP-ABC-001
 */
async function generateSupplierCode(
  supplierName: string,
  companyId: string
): Promise<string> {
  // Extract first 3 letters (uppercase, letters only)
  const prefix = supplierName
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X'); // Pad with X if less than 3 letters

  // Find highest existing number for this prefix
  const { data: existing } = await supabase
    .from('suppliers')
    .select('code')
    .eq('company_id', companyId)
    .ilike('code', `SUP-${prefix}-%`)
    .order('code', { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (existing && existing.length > 0) {
    const lastCode = existing[0].code;
    const match = lastCode.match(/SUP-[A-Z]{3}-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Format: SUP-ABC-001
  return `SUP-${prefix}-${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Batch version for CSV uploads - creates placeholders for all unique suppliers
 */
export async function ensureSuppliersExist(
  supplierNames: (string | null | undefined)[],
  companyId: string
): Promise<void> {
  // Get unique, valid supplier names
  const uniqueSuppliers = [...new Set(
    supplierNames
      .map(name => name?.trim())
      .filter((name): name is string => Boolean(name))
  )];

  // Create all placeholders concurrently
  await Promise.all(
    uniqueSuppliers.map(name => ensureSupplierExists(name, companyId))
  );
}
