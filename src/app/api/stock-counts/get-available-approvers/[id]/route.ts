import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getAvailableApproversForSite } from '@/lib/stock-counts';

/**
 * Get available approvers for a stock count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    let countId: string | undefined;
    
    // Handle both sync and async params
    if (params) {
      const resolvedParams = params instanceof Promise ? await params : params;
      countId = resolvedParams?.id;
    }
    
    // Fallback: extract from URL
    if (!countId) {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const idIndex = pathParts.indexOf('get-available-approvers');
      if (idIndex >= 0 && pathParts[idIndex + 1]) {
        countId = pathParts[idIndex + 1];
      }
    }
    
    if (!countId) {
      return NextResponse.json(
        { error: 'Stock count ID is required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use admin client to bypass RLS for approver queries
    let supabaseAdmin;
    try {
      supabaseAdmin = getSupabaseAdmin();
      console.log('✅ Admin client created successfully');
    } catch (adminError: any) {
      console.error('❌ Failed to create admin client:', adminError);
      console.error('Admin client error details:', {
        message: adminError.message,
        hasUrl: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasServiceKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE),
      });
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: adminError.message,
          hint: 'SUPABASE_SERVICE_ROLE_KEY environment variable may be missing'
        },
        { status: 500 }
      );
    }

    // Get the stock count to find site_id and company_id
    const { data: count, error: countError } = await supabaseAdmin
      .from('stock_counts')
      .select('company_id, site_id')
      .eq('id', countId)
      .single();

    if (countError || !count) {
      console.error('❌ Error fetching stock count:', countError);
      return NextResponse.json(
        { error: 'Stock count not found', details: countError?.message },
        { status: 404 }
      );
    }

    console.log('✅ Stock count found:', {
      countId,
      companyId: count.company_id,
      siteId: count.site_id,
    });

    // Get available approvers (use admin client to bypass RLS)
    console.log('🔍 API: Getting available approvers for stock count:', {
      countId,
      companyId: count.company_id,
      siteId: count.site_id,
      userId: user.id,
    });
    
    let approvers;
    try {
      approvers = await getAvailableApproversForSite(
        count.company_id,
        count.site_id,
        supabaseAdmin // Use admin client to bypass RLS
      );
      console.log('✅ getAvailableApproversForSite completed, returned:', approvers.length, 'approvers');
      
      // If getAvailableApproversForSite returned 0 but we know managers exist, use direct fallback
      if (approvers.length === 0) {
        console.log('⚠️ getAvailableApproversForSite returned 0, using direct fallback query...');
        const { data: directApprovers, error: directError } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email, app_role')
          .eq('company_id', count.company_id)
          .in('app_role', ['Owner', 'Admin', 'Manager', 'General Manager', 'Area Manager', 'Regional Manager'])
          .order('full_name');
        
        if (directError) {
          console.error('❌ Direct fallback query error:', directError);
        } else if (directApprovers && directApprovers.length > 0) {
          console.log(`✅ Direct fallback found ${directApprovers.length} approver(s)`);
          approvers = directApprovers.map(approver => ({
            id: approver.id,
            name: approver.full_name || approver.email || 'Unknown',
            role: approver.app_role || 'Manager',
            email: approver.email,
          }));
        }
      }
    } catch (approverError: any) {
      console.error('❌ Error in getAvailableApproversForSite:', approverError);
      console.error('Error stack:', approverError.stack);
      
      // Try direct fallback even on error
      console.log('⚠️ Trying direct fallback after error...');
      const { data: directApprovers, error: directError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, app_role')
        .eq('company_id', count.company_id)
        .in('app_role', ['Owner', 'Admin', 'Manager', 'General Manager', 'Area Manager', 'Regional Manager'])
        .order('full_name');
      
      if (!directError && directApprovers && directApprovers.length > 0) {
        console.log(`✅ Direct fallback found ${directApprovers.length} approver(s) after error`);
        approvers = directApprovers.map(approver => ({
          id: approver.id,
          name: approver.full_name || approver.email || 'Unknown',
          role: approver.app_role || 'Manager',
          email: approver.email,
        }));
      } else {
        return NextResponse.json(
          { 
            error: 'Error fetching approvers',
            details: approverError.message,
            stack: process.env.NODE_ENV === 'development' ? approverError.stack : undefined
          },
          { status: 500 }
        );
      }
    }

    console.log('📊 API: Returning approvers:', {
      count: approvers.length,
      approvers: approvers.map(a => ({ name: a.name, role: a.role, id: a.id })),
    });

    // If still no approvers, do a direct test query to see if ANY profiles exist
    if (approvers.length === 0) {
      console.error('❌ API: No approvers found! Running diagnostic queries...');
      
      // Test 1: Check if ANY profiles exist in the company
      const { data: anyProfiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, app_role')
        .eq('company_id', count.company_id)
        .limit(5);
      
      console.log('🔍 Diagnostic - Any profiles in company:', {
        count: anyProfiles?.length || 0,
        error: profilesError?.message,
        profiles: anyProfiles?.map(p => ({ id: p.id, name: p.full_name, role: p.app_role })),
      });
      
      // Test 2: Check if site exists
      const { data: siteData, error: siteError } = await supabaseAdmin
        .from('sites')
        .select('id, name, area_id, region_id')
        .eq('id', count.site_id)
        .single();
      
      console.log('🔍 Diagnostic - Site data:', {
        site: siteData,
        error: siteError?.message,
      });
      
      // Test 3: Check for managers by role
      const { data: managersByRole, error: managersError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, app_role')
        .eq('company_id', count.company_id)
        .in('app_role', ['Owner', 'Admin', 'Manager', 'General Manager', 'Area Manager', 'Regional Manager'])
        .limit(10);
      
      console.log('🔍 Diagnostic - Managers by role:', {
        count: managersByRole?.length || 0,
        error: managersError?.message,
        managers: managersByRole?.map(m => ({ id: m.id, name: m.full_name, role: m.app_role })),
      });
      
      // Get all unique app_role values in the company to see what roles actually exist
      const { data: allRoles, error: rolesError } = await supabaseAdmin
        .from('profiles')
        .select('app_role')
        .eq('company_id', count.company_id)
        .not('app_role', 'is', null);
      
      const uniqueRoles = allRoles 
        ? [...new Set(allRoles.map(p => p.app_role))].filter(Boolean)
        : [];
      
      console.log('🔍 Diagnostic - Unique app_role values in company:', uniqueRoles);
      
      return NextResponse.json({
        success: false,
        approvers: [],
        error: 'No approvers found. Please ensure managers are assigned in your organization structure.',
        debug: {
          companyId: count.company_id,
          siteId: count.site_id,
          diagnostic: {
            anyProfilesFound: (anyProfiles?.length || 0) > 0,
            profilesCount: anyProfiles?.length || 0,
            profiles: anyProfiles?.slice(0, 5).map(p => ({ id: p.id, name: p.full_name, role: p.app_role })),
            siteExists: !!siteData,
            siteData: siteData ? { id: siteData.id, name: siteData.name, area_id: siteData.area_id, region_id: siteData.region_id } : null,
            managersByRoleFound: (managersByRole?.length || 0) > 0,
            managersCount: managersByRole?.length || 0,
            managers: managersByRole?.slice(0, 5).map(m => ({ id: m.id, name: m.full_name, role: m.app_role })),
            uniqueRolesInCompany: uniqueRoles,
          },
          message: 'Check server console logs for detailed error information',
        },
      });
    }

    return NextResponse.json({
      success: true,
      approvers,
    });

  } catch (error: any) {
    console.error('Error in get-available-approvers endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
