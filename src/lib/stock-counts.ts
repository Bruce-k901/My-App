import { supabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

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

/**
 * Get approver for stock count based on hierarchy and settings
 * Returns approver profile ID and role, or null if not found
 */
export async function getApproverForStockCount(
  companyId: string,
  siteId: string,
  readyForApprovalBy?: string
): Promise<{ approverId: string; approverRole: string } | null> {
  try {
    // Get site details including area_id and region_id
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, area_id, company_id')
      .eq('id', siteId)
      .eq('company_id', companyId)
      .single();

    if (siteError || !site) {
      console.error('Error fetching site:', siteError);
      return null;
    }

    // Get approval workflow settings for stock counts
    // Check if there's a workflow configured
    const { data: workflow } = await supabase
      .from('approval_workflows')
      .select('id, name, type')
      .eq('company_id', companyId)
      .eq('type', 'stock_count')
      .eq('is_active', true)
      .single();

    let approverRole: string | null = null;

    // If workflow exists, get the first step's approver role
    if (workflow) {
      const { data: step } = await supabase
        .from('approval_steps')
        .select('approver_role')
        .eq('workflow_id', workflow.id)
        .eq('step_number', 1)
        .single();

      if (step) {
        approverRole = step.approver_role;
      }
    }

    // Default to Regional Manager if no workflow configured
    if (!approverRole) {
      approverRole = 'Regional Manager';
    }

    // Get approver based on role
    let approverId: string | null = null;

    if (approverRole === 'Regional Manager') {
      // Get region from site's area or directly
      let regionId: string | null = null;

      if (site.area_id) {
        const { data: area } = await supabase
          .from('areas')
          .select('region_id')
          .eq('id', site.area_id)
          .single();

        if (area) {
          regionId = area.region_id;
        }
      } else {
        // Check if site has direct region_id
        const { data: siteWithRegion } = await supabase
          .from('sites')
          .select('region_id')
          .eq('id', siteId)
          .single();

        if (siteWithRegion?.region_id) {
          regionId = siteWithRegion.region_id;
        }
      }

      if (regionId) {
        const { data: region } = await supabase
          .from('regions')
          .select('regional_manager_id, manager_id')
          .eq('id', regionId)
          .single();

        // Check both regional_manager_id and manager_id for compatibility
        if (region?.regional_manager_id) {
          approverId = region.regional_manager_id;
        } else if (region?.manager_id) {
          approverId = region.manager_id;
        }
      }
    } else if (approverRole === 'Area Manager') {
      if (site.area_id) {
        const { data: area } = await supabase
          .from('areas')
          .select('area_manager_id, manager_id')
          .eq('id', site.area_id)
          .single();

        // Check both area_manager_id and manager_id for compatibility
        if (area?.area_manager_id) {
          approverId = area.area_manager_id;
        } else if (area?.manager_id) {
          approverId = area.manager_id;
        }
      }
    } else if (approverRole === 'General Manager' || approverRole === 'Manager') {
      // Get site manager
      const { data: siteManager } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', companyId)
        .eq('site_id', siteId)
        .eq('app_role', 'Manager')
        .limit(1)
        .single();

      if (siteManager) {
        approverId = siteManager.id;
      }
    }

    // Fallback logic: Follow org chart hierarchy if no approver found for specific role
    // If no approver found, try multiple fallback options following org chart structure
    if (!approverId) {
      // 1. Try site manager (any manager at the site) - from org chart
      const { data: siteManagers } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', companyId)
        .eq('site_id', siteId)
        .in('app_role', ['Manager', 'Site Manager', 'General Manager'])
        .limit(1);

      if (siteManagers && siteManagers.length > 0) {
        approverId = siteManagers[0].id;
        approverRole = 'Site Manager';
      } else if (site.area_id) {
        // 2. Try area manager from org chart
        const { data: area } = await supabase
          .from('areas')
          .select('area_manager_id, manager_id')
          .eq('id', site.area_id)
          .single();

        if (area?.area_manager_id) {
          approverId = area.area_manager_id;
          approverRole = 'Area Manager';
        } else if (area?.manager_id) {
          approverId = area.manager_id;
          approverRole = 'Area Manager';
        } else {
          // 3. Try regional manager from org chart
          if (area?.region_id) {
            const { data: region } = await supabase
              .from('regions')
              .select('regional_manager_id, manager_id')
              .eq('id', area.region_id)
              .single();

            if (region?.regional_manager_id) {
              approverId = region.regional_manager_id;
              approverRole = 'Regional Manager';
            } else if (region?.manager_id) {
              approverId = region.manager_id;
              approverRole = 'Regional Manager';
            }
          }
        }
      }

      // 4. If still no approver from org chart, try company-level fallbacks
      if (!approverId) {
        if (readyForApprovalBy) {
          // Use the person who marked it ready (self-approval fallback)
          approverId = readyForApprovalBy;
          approverRole = 'Counter';
        } else {
          // Try any manager in the company
          const { data: anyManager } = await supabase
            .from('profiles')
            .select('id')
            .eq('company_id', companyId)
            .in('app_role', ['Manager', 'General Manager', 'Area Manager', 'Regional Manager'])
            .limit(1);

          if (anyManager && anyManager.length > 0) {
            approverId = anyManager[0].id;
            approverRole = 'Manager';
          } else {
            // Final fallback: Owner or Admin
            const { data: owner } = await supabase
              .from('profiles')
              .select('id')
              .eq('company_id', companyId)
              .in('app_role', ['Owner', 'Admin', 'Super Admin'])
              .limit(1);

            if (owner) {
              approverId = owner.id;
              approverRole = 'Owner';
            }
          }
        }
      }
    }

    // If still no approver, return the person who marked it ready (self-approval)
    if (!approverId && readyForApprovalBy) {
      approverId = readyForApprovalBy;
      approverRole = 'Counter';
    }

    // Last resort: return null only if we truly can't find anyone
    if (!approverId) {
      console.error('Could not find any approver for stock count', { companyId, siteId, readyForApprovalBy });
      return null;
    }

    return {
      approverId,
      approverRole,
    };
  } catch (error) {
    console.error('Error getting approver for stock count:', error);
    return null;
  }
}

/**
 * Get all available approvers for a stock count based on site hierarchy
 * Returns list of approvers: Owner, Regional Manager, Area Manager, Site Manager
 */
export async function getAvailableApproversForSite(
  companyId: string,
  siteId: string,
  supabaseClient?: SupabaseClient<any>
): Promise<Array<{ id: string; name: string; role: string; email?: string }>> {
  try {
    const approvers: Array<{ id: string; name: string; role: string; email?: string }> = [];
    const client = supabaseClient || supabase;

    console.log('🔍 getAvailableApproversForSite called:', { companyId, siteId });

    // Get site details
    const { data: site, error: siteError } = await client
      .from('sites')
      .select('id, area_id, company_id')
      .eq('id', siteId)
      .eq('company_id', companyId)
      .single();

    if (siteError) {
      console.error('❌ Error fetching site:', siteError);
      return approvers;
    }

    if (!site) {
      console.error('❌ Site not found:', { siteId, companyId });
      return approvers;
    }

    console.log('✅ Site found:', { siteId: site.id, areaId: site.area_id });

    // 1. Get Owners/Admins (don't filter by status - include all)
    const { data: owners, error: ownersError } = await client
      .from('profiles')
      .select('id, full_name, email, app_role, status')
      .eq('company_id', companyId)
      .in('app_role', ['Owner', 'Admin', 'Super Admin', 'owner', 'admin', 'super admin'])
      .order('full_name');

    if (ownersError) {
      console.error('❌ Error fetching owners:', ownersError);
    } else if (owners && owners.length > 0) {
      console.log(`✅ Found ${owners.length} owner(s)/admin(s)`);
      owners.forEach(owner => {
        approvers.push({
          id: owner.id,
          name: owner.full_name || owner.email || 'Unknown',
          role: owner.app_role || 'Owner',
          email: owner.email,
        });
      });
    } else {
      console.log('⚠️ No owners/admins found');
    }

    // 2. Get Regional Manager (if site has area/region)
    let regionId: string | null = null;
    
    // Check if site has direct region_id
    const { data: siteWithRegion } = await client
      .from('sites')
      .select('region_id, area_id')
      .eq('id', siteId)
      .single();
    
    if (siteWithRegion?.region_id) {
      regionId = siteWithRegion.region_id;
    } else if (site.area_id) {
      // Try to get region through area
      const { data: area } = await client
        .from('areas')
        .select('region_id')
        .eq('id', site.area_id)
        .single();
      if (area) {
        regionId = area.region_id;
      }
    }

    if (regionId) {
      console.log('🔍 Looking for regional manager in region:', regionId);
      const { data: region, error: regionError } = await client
        .from('regions')
        .select('id, name, regional_manager_id, manager_id')
        .eq('id', regionId)
        .single();

      if (regionError) {
        console.error('❌ Error fetching region:', regionError);
      } else if (region) {
        // Check both regional_manager_id and manager_id for compatibility
        const regionalManagerId = region?.regional_manager_id || region?.manager_id;
        
        if (regionalManagerId) {
          console.log('✅ Found regional manager ID:', regionalManagerId);
          const { data: regionalManager, error: rmError } = await client
            .from('profiles')
            .select('id, full_name, email, app_role, status')
            .eq('id', regionalManagerId)
            .single();

          if (rmError) {
            console.error('❌ Error fetching regional manager profile:', rmError);
          } else if (regionalManager && !approvers.find(a => a.id === regionalManager.id)) {
            console.log('✅ Added regional manager:', regionalManager.full_name || regionalManager.email);
            approvers.push({
              id: regionalManager.id,
              name: regionalManager.full_name || regionalManager.email || 'Unknown',
              role: `Regional Manager${region?.name ? ` (${region.name})` : ''}`,
              email: regionalManager.email,
            });
          } else {
            console.log('⚠️ Regional manager profile not found or already added');
          }
        } else {
          console.log('⚠️ No regional manager assigned to region');
        }
      } else {
        console.log('⚠️ Region not found');
      }
    } else {
      console.log('⚠️ No region ID found for site');
    }
    
    // Also check for profiles with app_role = 'Regional Manager' in the company (fallback)
    const { data: regionalManagersByRole } = await client
      .from('profiles')
      .select('id, full_name, email, app_role, status')
      .eq('company_id', companyId)
      .in('app_role', ['Regional Manager', 'regional_manager', 'Regional manager'])
      .order('full_name');
    
    if (regionalManagersByRole && regionalManagersByRole.length > 0) {
      regionalManagersByRole.forEach(rm => {
        if (!approvers.find(a => a.id === rm.id)) {
          approvers.push({
            id: rm.id,
            name: rm.full_name || rm.email || 'Unknown',
            role: 'Regional Manager',
            email: rm.email,
          });
        }
      });
    }

    // 3. Get Area Manager (if site has area) - from org chart
    if (site.area_id) {
      console.log('🔍 Looking for area manager in area:', site.area_id);
      const { data: area, error: areaError } = await client
        .from('areas')
        .select('id, name, area_manager_id, manager_id')
        .eq('id', site.area_id)
        .single();

      if (areaError) {
        console.error('❌ Error fetching area:', areaError);
      } else if (area) {
        // Check both area_manager_id and manager_id for compatibility
        const areaManagerId = area?.area_manager_id || area?.manager_id;
        
        if (areaManagerId) {
          console.log('✅ Found area manager ID:', areaManagerId);
          const { data: areaManager, error: amError } = await client
            .from('profiles')
            .select('id, full_name, email, app_role, status')
            .eq('id', areaManagerId)
            .single();

          if (amError) {
            console.error('❌ Error fetching area manager profile:', amError);
          } else if (areaManager && !approvers.find(a => a.id === areaManager.id)) {
            console.log('✅ Added area manager:', areaManager.full_name || areaManager.email);
            approvers.push({
              id: areaManager.id,
              name: areaManager.full_name || areaManager.email || 'Unknown',
              role: `Area Manager${area?.name ? ` (${area.name})` : ''}`,
              email: areaManager.email,
            });
          } else {
            console.log('⚠️ Area manager profile not found or already added');
          }
        } else {
          console.log('⚠️ No area manager assigned to area');
        }
      } else {
        console.log('⚠️ Area not found');
      }
    } else {
      console.log('⚠️ Site has no area_id');
    }
    
    // Also check for profiles with app_role = 'Area Manager' in the company (fallback)
    const { data: areaManagersByRole } = await client
      .from('profiles')
      .select('id, full_name, email, app_role, status')
      .eq('company_id', companyId)
      .in('app_role', ['Area Manager', 'area_manager', 'Area manager'])
      .order('full_name');
    
    if (areaManagersByRole && areaManagersByRole.length > 0) {
      areaManagersByRole.forEach(am => {
        if (!approvers.find(a => a.id === am.id)) {
          approvers.push({
            id: am.id,
            name: am.full_name || am.email || 'Unknown',
            role: 'Area Manager',
            email: am.email,
          });
        }
      });
    }

    // 4. Get Site Manager from org chart (don't filter by status - include all managers at the site)
    const { data: siteData } = await client
      .from('sites')
      .select('id, name')
      .eq('id', siteId)
      .single();

    const { data: siteManagers, error: siteManagersError } = await client
      .from('profiles')
      .select('id, full_name, email, app_role, status')
      .eq('company_id', companyId)
      .eq('site_id', siteId)
      .in('app_role', ['Manager', 'Site Manager', 'General Manager', 'manager', 'site manager', 'general manager', 'General manager'])
      .order('full_name');

    if (siteManagersError) {
      console.error('❌ Error fetching site managers:', siteManagersError);
    } else if (siteManagers && siteManagers.length > 0) {
      console.log(`✅ Found ${siteManagers.length} site manager(s)`);
      siteManagers.forEach(manager => {
        if (!approvers.find(a => a.id === manager.id)) {
          approvers.push({
            id: manager.id,
            name: manager.full_name || manager.email || 'Unknown',
            role: `Site Manager${siteData?.name ? ` (${siteData.name})` : ''}`,
            email: manager.email,
          });
        }
      });
    } else {
      console.log('⚠️ No site managers found');
    }
    
    // If still no approvers found, try fallback: get ANY user in the company with manager/admin/owner role
    if (approvers.length === 0) {
      console.error('❌❌❌ No approvers found for site! Trying fallback...', {
        companyId,
        siteId,
        site,
        siteWithRegion,
        regionId,
      });
      
      // Fallback: Get any manager/admin/owner in the company
      const { data: fallbackApprovers, error: fallbackError } = await client
        .from('profiles')
        .select('id, full_name, email, app_role, status')
        .eq('company_id', companyId)
        .in('app_role', [
          'Owner', 'Admin', 'Super Admin', 'owner', 'admin', 'super admin',
          'Manager', 'General Manager', 'Area Manager', 'Regional Manager',
          'manager', 'general manager', 'area manager', 'regional manager'
        ])
        .limit(10)
        .order('full_name');
      
      if (fallbackError) {
        console.error('❌ Error in fallback approver query:', fallbackError);
      } else if (fallbackApprovers && fallbackApprovers.length > 0) {
        console.log(`✅ Fallback: Found ${fallbackApprovers.length} approver(s) by role`);
        fallbackApprovers.forEach(approver => {
          approvers.push({
            id: approver.id,
            name: approver.full_name || approver.email || 'Unknown',
            role: approver.app_role || 'Manager',
            email: approver.email,
          });
        });
      } else {
        console.error('❌ Even fallback query returned no approvers!');
      }
    } else {
      console.log(`✅✅✅ Found ${approvers.length} total approver(s):`, approvers.map(a => ({ name: a.name, role: a.role })));
    }

    // Sort by role hierarchy: Owner > Regional Manager > Area Manager > Site Manager
    const roleOrder: Record<string, number> = {
      'Owner': 1,
      'Admin': 1,
      'Super Admin': 1,
      'Regional Manager': 2,
      'Area Manager': 3,
      'Site Manager': 4,
      'Manager': 4,
      'General Manager': 4,
    };

    const sortedApprovers = approvers.sort((a, b) => {
      const orderA = roleOrder[a.role] || 99;
      const orderB = roleOrder[b.role] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
    
    console.log(`✅✅✅ getAvailableApproversForSite FINAL RESULT: ${sortedApprovers.length} approver(s)`, 
      sortedApprovers.map(a => ({ name: a.name, role: a.role, id: a.id }))
    );
    
    return sortedApprovers;
  } catch (error: any) {
    console.error('❌❌❌ Error getting available approvers:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);
    return [];
  }
}
