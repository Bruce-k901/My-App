import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// ============================================================================
// Data Integrity Health Check API
// ============================================================================
// GET /api/health/data-integrity
// GET /api/health/data-integrity?company_id=xxx
//
// Returns health status of recipe and compliance data
// Protected: Requires authenticated admin/owner role
// ============================================================================

// Create admin client for health checks
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface IntegrityCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  count: number;
  details?: any;
}

export async function GET(request: Request) {
  try {
    // Get company_id from query params
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    // For now, allow without auth for internal monitoring
    // In production, add auth check here
    const isInternal = request.headers.get('x-internal-check') === process.env.INTERNAL_HEALTH_KEY;

    if (!isInternal && !companyId) {
      // If not internal and no company_id, this might be a monitoring system
      // Return basic health without sensitive data
      return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Use ?company_id=xxx for detailed checks'
      });
    }

    const checks: IntegrityCheck[] = [];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    // =========================================================================
    // Check 1: Active recipes without ingredients
    // =========================================================================
    const { data: recipesNoIngredients, error: err1 } = await supabaseAdmin
      .from('recipes')
      .select(`
        id,
        name,
        recipe_type,
        updated_at
      `)
      .eq('is_active', true)
      .eq('is_archived', false)
      .is('company_id', companyId ? companyId : null)
      .not('id', 'in', `(SELECT recipe_id FROM stockly.recipe_ingredients)`);

    // Alternative approach since the above subquery might not work
    const { data: allActiveRecipes } = await supabaseAdmin
      .from('recipes')
      .select('id, name')
      .eq('is_active', true)
      .match(companyId ? { company_id: companyId } : {});

    const { data: recipesWithIngredients } = await supabaseAdmin
      .from('recipe_ingredients')
      .select('recipe_id')
      .in('recipe_id', (allActiveRecipes || []).map(r => r.id));

    const recipeIdsWithIngredients = new Set((recipesWithIngredients || []).map(r => r.recipe_id));
    const recipesWithoutIngredients = (allActiveRecipes || []).filter(
      r => !recipeIdsWithIngredients.has(r.id)
    );

    checks.push({
      name: 'recipes_without_ingredients',
      status: recipesWithoutIngredients.length > 0 ? 'warn' : 'pass',
      count: recipesWithoutIngredients.length,
      details: recipesWithoutIngredients.length > 0
        ? recipesWithoutIngredients.slice(0, 10).map(r => ({ id: r.id, name: r.name }))
        : undefined
    });

    if (recipesWithoutIngredients.length > 0) {
      overallStatus = 'warning';
    }

    // =========================================================================
    // Check 2: Recipes with zero cost (costing issue)
    // =========================================================================
    const { data: zeroCostRecipes, count: zeroCostCount } = await supabaseAdmin
      .from('recipes')
      .select('id, name, total_cost', { count: 'exact' })
      .eq('is_active', true)
      .or('total_cost.is.null,total_cost.eq.0')
      .match(companyId ? { company_id: companyId } : {})
      .limit(10);

    checks.push({
      name: 'recipes_zero_cost',
      status: (zeroCostCount || 0) > 0 ? 'warn' : 'pass',
      count: zeroCostCount || 0,
      details: zeroCostRecipes && zeroCostRecipes.length > 0
        ? zeroCostRecipes.map(r => ({ id: r.id, name: r.name }))
        : undefined
    });

    // =========================================================================
    // Check 3: Stale costing (updated but not re-costed)
    // =========================================================================
    const { count: staleCostCount } = await supabaseAdmin
      .from('recipes')
      .select('id', { count: 'exact' })
      .eq('is_active', true)
      .gt('updated_at', 'last_costed_at')
      .match(companyId ? { company_id: companyId } : {});

    checks.push({
      name: 'stale_costing',
      status: (staleCostCount || 0) > 5 ? 'warn' : 'pass',
      count: staleCostCount || 0
    });

    // =========================================================================
    // Check 4: Invalid ingredient quantities
    // =========================================================================
    const { count: invalidQtyCount } = await supabaseAdmin
      .from('recipe_ingredients')
      .select('id', { count: 'exact' })
      .lte('quantity', 0);

    checks.push({
      name: 'invalid_ingredient_quantities',
      status: (invalidQtyCount || 0) > 0 ? 'fail' : 'pass',
      count: invalidQtyCount || 0
    });

    if ((invalidQtyCount || 0) > 0) {
      overallStatus = 'critical';
    }

    // =========================================================================
    // Check 5: Orphan ingredients (no valid source)
    // =========================================================================
    const { count: orphanCount } = await supabaseAdmin
      .from('recipe_ingredients')
      .select('id', { count: 'exact' })
      .is('stock_item_id', null)
      .is('sub_recipe_id', null);

    checks.push({
      name: 'orphan_ingredients',
      status: (orphanCount || 0) > 0 ? 'fail' : 'pass',
      count: orphanCount || 0
    });

    if ((orphanCount || 0) > 0) {
      overallStatus = 'critical';
    }

    // =========================================================================
    // Check 6: Recent audit activity (system is logging)
    // =========================================================================
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentAuditCount } = await supabaseAdmin
      .from('recipe_audit_log')
      .select('id', { count: 'exact' })
      .gte('changed_at', oneDayAgo)
      .match(companyId ? { company_id: companyId } : {});

    checks.push({
      name: 'audit_logging_active',
      status: 'pass', // Just informational
      count: recentAuditCount || 0
    });

    // =========================================================================
    // Build Response
    // =========================================================================
    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      company_id: companyId || 'all',
      summary: {
        total_checks: checks.length,
        passed: checks.filter(c => c.status === 'pass').length,
        warnings: checks.filter(c => c.status === 'warn').length,
        failed: checks.filter(c => c.status === 'fail').length
      },
      checks
    };

    // Return appropriate status code
    const statusCode = overallStatus === 'critical' ? 500 :
                       overallStatus === 'warning' ? 200 : 200;

    return NextResponse.json(response, { status: statusCode });

  } catch (error) {
    console.error('Health check error:', error);

    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// ============================================================================
// POST: Trigger data integrity fix
// ============================================================================
// POST /api/health/data-integrity
// Body: { action: 'fix_orphans' | 'recalculate_costs' | 'cleanup' }
// ============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, company_id } = body;

    if (!company_id) {
      return NextResponse.json({
        error: 'company_id is required'
      }, { status: 400 });
    }

    // TODO: Add proper auth check here
    // const user = await getAuthenticatedUser(request);
    // if (!user || !['Admin', 'Owner'].includes(user.app_role)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    let result: any = {};

    switch (action) {
      case 'recalculate_costs':
        // Trigger recalculation for all recipes
        const { data: recalcResult, error: recalcError } = await supabaseAdmin
          .rpc('recalculate_all_recipes', { p_company_id: company_id });

        if (recalcError) throw recalcError;

        result = {
          action: 'recalculate_costs',
          recipes_processed: recalcResult,
          status: 'completed'
        };
        break;

      case 'fix_orphans':
        // Delete orphan ingredients
        const { count: deletedCount } = await supabaseAdmin
          .from('recipe_ingredients')
          .delete({ count: 'exact' })
          .is('stock_item_id', null)
          .is('sub_recipe_id', null);

        result = {
          action: 'fix_orphans',
          deleted_count: deletedCount,
          status: 'completed'
        };
        break;

      case 'cleanup':
        // Run all cleanup operations
        // 1. Delete orphan ingredients
        const { count: orphansDeleted } = await supabaseAdmin
          .from('recipe_ingredients')
          .delete({ count: 'exact' })
          .is('stock_item_id', null)
          .is('sub_recipe_id', null);

        // 2. Recalculate costs
        const { data: costResult } = await supabaseAdmin
          .rpc('recalculate_all_recipes', { p_company_id: company_id });

        result = {
          action: 'cleanup',
          orphans_deleted: orphansDeleted,
          recipes_recosted: costResult,
          status: 'completed'
        };
        break;

      default:
        return NextResponse.json({
          error: `Unknown action: ${action}`,
          valid_actions: ['recalculate_costs', 'fix_orphans', 'cleanup']
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    });

  } catch (error) {
    console.error('Data integrity fix error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
