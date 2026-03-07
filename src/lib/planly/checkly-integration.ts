import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Get SOPs from Checkly
 */
export async function getSOPs(siteId: string) {
  const supabase = await createServerSupabaseClient();
  
  // Get site's company_id
  const { data: site } = await supabase
    .from('sites')
    .select('company_id')
    .eq('id', siteId)
    .single();

  if (!site) {
    return [];
  }

  const { data } = await supabase
    .from('checkly_sops')
    .select('id, title, category')
    .eq('company_id', site.company_id)
    .eq('is_active', true);

  return data || [];
}

/**
 * Get SOP details
 */
export async function getSOPDetails(sopId: string) {
  const supabase = await createServerSupabaseClient();
  
  const { data } = await supabase
    .from('checkly_sops')
    .select('*')
    .eq('id', sopId)
    .single();

  return data;
}
