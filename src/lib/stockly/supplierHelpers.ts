import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Get the supplier_id for the currently authenticated user
 * Looks up order_book_suppliers table using the user's company_id
 * If no supplier exists, automatically creates one using company information
 * 
 * @returns Promise<string | null> - The supplier_id or null if not found/created
 */
export async function getSupplierIdFromAuth(): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return null;
    }
    
    // Get profile to find company_id
    // Check both id and auth_user_id since profiles can use either
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .maybeSingle();
    
    if (profileError || !profile?.company_id) {
      console.error('Error getting profile or company_id:', profileError);
      return null;
    }
    
    // Look up supplier record
    const { data: supplier, error: supplierError } = await supabase
      .from('order_book_suppliers')
      .select('id')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .maybeSingle();
    
    if (supplierError) {
      console.error('Error getting supplier:', supplierError);
      return null;
    }
    
    // If supplier exists, return it
    if (supplier?.id) {
      return supplier.id;
    }
    
    // No supplier found - auto-create one using company information
    console.log('[getSupplierIdFromAuth] No supplier found, auto-creating...');
    
    // Get company information
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, legal_name, contact_email, address_line1, city, postcode, country')
      .eq('id', profile.company_id)
      .single();
    
    if (companyError || !company) {
      console.error('Error getting company:', companyError);
      return null;
    }
    
    // Create supplier record using company information
    const { data: newSupplier, error: createError } = await supabase
      .from('order_book_suppliers')
      .insert({
        company_id: profile.company_id,
        business_name: company.legal_name || company.name || 'My Business',
        trading_name: company.name || null,
        email: company.contact_email || user.email || null,
        address_line1: company.address_line1 || null,
        city: company.city || null,
        postcode: company.postcode || null,
        country: company.country || 'UK',
        is_active: true,
        is_approved: true,
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error('Error creating supplier:', createError);
      return null;
    }
    
    console.log('[getSupplierIdFromAuth] Supplier auto-created:', newSupplier.id);
    return newSupplier.id;
  } catch (error) {
    console.error('Error in getSupplierIdFromAuth:', error);
    return null;
  }
}

