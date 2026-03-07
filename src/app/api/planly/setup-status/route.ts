import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import type { SetupWizardStatus, SetupWizardStep } from '@/types/planly';

/**
 * GET /api/planly/setup-status
 *
 * Returns the current setup wizard status for a site.
 * Checks each configuration step and returns completion status.
 *
 * Steps are ordered to match the production plan flow:
 * 1. Packing & Delivery (destination groups)
 * 2. Production Setup (base doughs + lamination styles)
 * 3. Equipment (bake groups + equipment types)
 * 4. Production Timeline (process templates)
 * 5. Products
 * 6. Customers
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    // Get site and company info
    const { data: site } = await supabase
      .from('sites')
      .select('id, company_id')
      .eq('id', siteId)
      .single();

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Check each step
    const steps: SetupWizardStep[] = [];

    // Step 1: Packing & Delivery (was Destination Groups)
    const { count: destGroupCount } = await supabase
      .from('planly_destination_groups')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('is_active', true);

    steps.push({
      step: 1,
      name: 'Packing & Delivery',
      complete: (destGroupCount || 0) > 0,
      count: destGroupCount || 0,
    });

    // Step 2: Production Setup (Base Doughs + Lamination Styles)
    const { data: baseDoughs } = await supabase
      .from('planly_base_doughs')
      .select('id, name, recipe_id')
      .eq('site_id', siteId)
      .eq('is_active', true);

    const allDoughs = baseDoughs || [];
    const doughsWithRecipe = allDoughs.filter(d => d.recipe_id);
    const doughsWithoutRecipe = allDoughs.filter(d => !d.recipe_id);

    steps.push({
      step: 2,
      name: 'Production Setup',
      complete: doughsWithRecipe.length > 0,
      count: allDoughs.length,
      issues: doughsWithoutRecipe.length > 0
        ? [`${doughsWithoutRecipe.length} base dough${doughsWithoutRecipe.length > 1 ? 's' : ''} missing recipe`]
        : undefined,
    });

    // Step 3: Oven & Trays (combined Bake Groups + Equipment Types)
    const { count: bakeGroupCount } = await supabase
      .from('planly_bake_groups')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('is_active', true);

    const { count: equipmentCount } = await supabase
      .from('planly_equipment_types')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .or(`site_id.eq.${siteId},and(site_id.is.null,company_id.eq.${site.company_id})`);

    // Oven & Trays is complete if both bake groups AND equipment types are configured
    const ovenTraysCount = (bakeGroupCount || 0) + (equipmentCount || 0);
    const ovenTraysComplete = (bakeGroupCount || 0) > 0 && (equipmentCount || 0) > 0;

    steps.push({
      step: 3,
      name: 'Equipment',
      complete: ovenTraysComplete,
      count: ovenTraysCount,
    });

    // Step 4: Production Timeline (Process Templates)
    const { count: templateCount } = await supabase
      .from('planly_process_templates')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .or(`site_id.eq.${siteId},site_id.is.null`); // Site-specific or master templates

    steps.push({
      step: 4,
      name: 'Production Timeline',
      complete: (templateCount || 0) > 0,
      count: templateCount || 0,
    });

    // Step 5: Products
    // Validate that products are linked to base doughs or lamination styles
    const { data: products } = await supabase
      .from('planly_products')
      .select('id, base_dough_id, lamination_style_id')
      .eq('site_id', siteId)
      .eq('is_active', true)
      .is('archived_at', null);

    const allProducts = products || [];
    const linkedProducts = allProducts.filter(p => p.base_dough_id || p.lamination_style_id);
    const unlinkedProducts = allProducts.filter(p => !p.base_dough_id && !p.lamination_style_id);

    steps.push({
      step: 5,
      name: 'Products',
      complete: allProducts.length > 0 && unlinkedProducts.length === 0,
      count: allProducts.length,
      issues: unlinkedProducts.length > 0
        ? [`${unlinkedProducts.length} product${unlinkedProducts.length > 1 ? 's' : ''} not assigned to a base dough`]
        : undefined,
    });

    // Step 6: Customers
    const { count: customerCount } = await supabase
      .from('planly_customers')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('is_active', true);

    steps.push({
      step: 6,
      name: 'Customers',
      complete: (customerCount || 0) > 0,
      count: customerCount || 0,
    });

    // Calculate overall status
    const overallComplete = steps.every(s => s.complete);
    const nextIncompleteStep = steps.find(s => !s.complete)?.step || 0;

    const status: SetupWizardStatus = {
      steps,
      overall_complete: overallComplete,
      next_incomplete_step: nextIncompleteStep,
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error in GET /api/planly/setup-status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
