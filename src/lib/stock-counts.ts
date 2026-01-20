import { supabase } from './supabase';

/**
 * Check if a company has area managers or regional managers who can review stock counts
 */
export async function hasReviewManagers(companyId: string): Promise<boolean> {
  try {
    // First, get the role IDs for area_manager and regional_manager for this company
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id')
      .eq('company_id', companyId)
      .in('slug', ['area_manager', 'regional_manager'])
      .eq('is_active', true);

    if (rolesError) {
      console.error('Error fetching review roles:', rolesError);
      return false;
    }

    if (!roles || roles.length === 0) {
      return false;
    }

    const roleIds = roles.map(r => r.id);

    // Then check if any user_roles exist with these role_ids
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('id')
      .in('role_id', roleIds)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .limit(1);

    if (userRolesError) {
      console.error('Error checking for review managers:', userRolesError);
      return false;
    }

    return (userRoles?.length || 0) > 0;
  } catch (error) {
    console.error('Exception checking for review managers:', error);
    return false;
  }
}

/**
 * Get the current user's profile ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    return profile?.id || null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
}
