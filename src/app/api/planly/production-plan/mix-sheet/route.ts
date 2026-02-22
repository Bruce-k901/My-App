import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { normalizeYieldToKg } from '@/lib/utils/unitConversions';

interface LaminationStyleData {
  id: string;
  name: string;
  recipe_id: string | null;
  products_per_sheet: number;
  dough_per_sheet_g: number | null;
  laminate_lead_days: number;
  base_dough_id: string;
  recipe?: { id: string; name: string; yield_quantity: number; yield_unit: string } | null;
}

interface BaseDoughData {
  id: string;
  name: string;
  recipe_id: string | null;
  mix_lead_days: number;
  batch_size_kg: number | null;
  units_per_batch: number | null;
  recipe?: { id: string; name: string; yield_quantity: number; yield_unit: string } | null;
  lamination_styles?: LaminationStyleData[];
}

interface ProductOrder {
  product_id: string;
  product_name: string;
  base_dough_id: string | null;
  lamination_style_id: string | null;
  total_quantity: number;
}

interface LaminationSheetResult {
  style_id: string;
  style_name: string;
  base_dough_id: string;
  base_dough_name: string;
  products_per_sheet: number;
  laminate_lead_days: number;
  recipe_id: string | null;
  recipe_name: string | null;
  total_products: number;
  sheets_needed: number;
  ingredients: { name: string; quantity: number; unit: string }[];
  products: { name: string; quantity: number }[];
}

interface DoughMixResult {
  dough_id: string;
  dough_name: string;
  mix_lead_days: number;
  recipe_id: string | null;
  recipe_name: string | null;
  total_kg: number;
  total_batches: number | null;
  batch_size_kg: number | null;
  units_per_batch: number | null;
  ingredients: { name: string; quantity: number; unit: string }[];
  lamination_styles: LaminationSheetResult[];
  direct_products: { name: string; quantity: number }[];
}

/**
 * GET /api/planly/production-plan/mix-sheet
 *
 * Calculates the mix sheet for a given delivery date using base doughs and lamination styles.
 * New model:
 * - Products link to either base_dough_id (non-laminated) OR lamination_style_id (laminated)
 * - Laminated products: sheets_needed = total_products / products_per_sheet
 * - Non-laminated products: batches = total_products / units_per_batch
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const deliveryDate = searchParams.get('date');
    const siteId = searchParams.get('siteId');

    if (!deliveryDate || !siteId) {
      return NextResponse.json(
        { error: 'date and siteId are required' },
        { status: 400 }
      );
    }

    // Get site info
    const { data: site } = await supabase
      .from('sites')
      .select('company_id')
      .eq('id', siteId)
      .single();

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Get order counts for summary
    const { data: orderCounts } = await supabase
      .from('planly_orders')
      .select('status')
      .eq('delivery_date', deliveryDate)
      .in('status', ['confirmed', 'locked']);

    const confirmedOrders = orderCounts?.filter(o => o.status === 'confirmed' || o.status === 'locked').length || 0;

    // Get all base doughs for this site with their lamination styles
    const { data: baseDoughs, error: doughError } = await supabase
      .from('planly_base_doughs')
      .select(`
        id,
        name,
        recipe_id,
        mix_lead_days,
        batch_size_kg,
        units_per_batch,
        lamination_styles:planly_lamination_styles(
          id,
          name,
          recipe_id,
          products_per_sheet,
          dough_per_sheet_g,
          laminate_lead_days
        )
      `)
      .eq('site_id', siteId)
      .eq('is_active', true);

    if (doughError) {
      console.error('Error fetching base doughs:', doughError);
      return NextResponse.json({ error: doughError.message }, { status: 500 });
    }

    // Fetch recipe details separately from stockly schema
    const recipeIds = new Set<string>();
    for (const dough of baseDoughs || []) {
      if (dough.recipe_id) recipeIds.add(dough.recipe_id);
      for (const style of dough.lamination_styles || []) {
        if (style.recipe_id) recipeIds.add(style.recipe_id);
      }
    }

    let recipeMap = new Map<string, { id: string; name: string; yield_quantity: number; yield_unit: string }>();
    if (recipeIds.size > 0) {
      const { data: recipes } = await supabase
        .from('recipes')
        .select('id, name, yield_quantity, yield_unit')
        .in('id', Array.from(recipeIds));
      recipeMap = new Map((recipes || []).map(r => [r.id, r]));
    }

    // Attach recipe data to base doughs and lamination styles
    const baseDoughsWithRecipes = (baseDoughs || []).map(dough => ({
      ...dough,
      recipe: dough.recipe_id ? recipeMap.get(dough.recipe_id) || null : null,
      lamination_styles: (dough.lamination_styles || []).map(style => ({
        ...style,
        recipe: style.recipe_id ? recipeMap.get(style.recipe_id) || null : null,
      })),
    }));

    // Get products with their dough/lamination assignments
    const { data: products } = await supabase
      .from('planly_products')
      .select(`
        id,
        base_dough_id,
        lamination_style_id,
        stockly_product_id
      `)
      .eq('site_id', siteId)
      .or('base_dough_id.not.is.null,lamination_style_id.not.is.null');

    if (!products || products.length === 0) {
      return NextResponse.json({
        delivery_date: deliveryDate,
        mix_day: deliveryDate,
        order_summary: {
          confirmed_orders: confirmedOrders,
          pending_orders: 0,
        },
        dough_mixes: [],
        sheet_summary: null,
      });
    }

    // Get product names from ingredients library
    const stocklyIds = products.map(p => p.stockly_product_id).filter(Boolean);
    let productNameMap = new Map<string, string>();
    if (stocklyIds.length > 0) {
      const { data: ingredients } = await supabase
        .from('ingredients_library')
        .select('id, ingredient_name')
        .in('id', stocklyIds);
      productNameMap = new Map((ingredients || []).map(i => [i.id, i.ingredient_name || 'Unknown']));
    }

    // Get order lines for the delivery date
    const { data: orderLines } = await supabase
      .from('planly_order_lines')
      .select(`
        product_id,
        quantity,
        order:planly_orders!inner(delivery_date, status)
      `)
      .eq('order.delivery_date', deliveryDate)
      .in('order.status', ['confirmed', 'locked']);

    // Aggregate order quantities by product
    const productQuantities = new Map<string, number>();
    for (const line of orderLines || []) {
      const current = productQuantities.get(line.product_id) || 0;
      productQuantities.set(line.product_id, current + line.quantity);
    }

    // Build product orders with dough/lamination info
    const productOrders: ProductOrder[] = products.map(p => ({
      product_id: p.id,
      product_name: productNameMap.get(p.stockly_product_id) || 'Unknown Product',
      base_dough_id: p.base_dough_id,
      lamination_style_id: p.lamination_style_id,
      total_quantity: productQuantities.get(p.id) || 0,
    })).filter(p => p.total_quantity > 0);

    // Build dough mix results
    const doughMixResults: DoughMixResult[] = [];
    const baseDoughMap = new Map(baseDoughsWithRecipes.map(d => [d.id, d]));
    const laminationStyleMap = new Map<string, LaminationStyleData>();

    // Build lamination style map for quick lookup
    for (const dough of baseDoughsWithRecipes) {
      for (const style of dough.lamination_styles || []) {
        laminationStyleMap.set(style.id, {
          ...style,
          base_dough_id: dough.id,
        } as LaminationStyleData);
      }
    }

    // Group products by base dough (including laminated products via their style's base dough)
    const doughProductsMap = new Map<string, {
      direct: ProductOrder[];
      byStyle: Map<string, ProductOrder[]>;
    }>();

    for (const product of productOrders) {
      let baseDoughId: string | null = null;

      if (product.lamination_style_id) {
        const style = laminationStyleMap.get(product.lamination_style_id);
        if (style) {
          baseDoughId = style.base_dough_id;
        }
      } else if (product.base_dough_id) {
        baseDoughId = product.base_dough_id;
      }

      if (!baseDoughId) continue;

      if (!doughProductsMap.has(baseDoughId)) {
        doughProductsMap.set(baseDoughId, { direct: [], byStyle: new Map() });
      }

      const entry = doughProductsMap.get(baseDoughId)!;

      if (product.lamination_style_id) {
        if (!entry.byStyle.has(product.lamination_style_id)) {
          entry.byStyle.set(product.lamination_style_id, []);
        }
        entry.byStyle.get(product.lamination_style_id)!.push(product);
      } else {
        entry.direct.push(product);
      }
    }

    // Process each base dough with orders
    for (const [doughId, productData] of doughProductsMap.entries()) {
      const dough = baseDoughMap.get(doughId);
      if (!dough) continue;

      // Calculate lamination sheet requirements
      const laminationResults: LaminationSheetResult[] = [];
      let totalLaminationDoughG = 0;

      for (const [styleId, styleProducts] of productData.byStyle.entries()) {
        const style = laminationStyleMap.get(styleId);
        if (!style) continue;

        const totalProducts = styleProducts.reduce((sum, p) => sum + p.total_quantity, 0);
        const sheetsNeeded = Math.ceil(totalProducts / style.products_per_sheet);

        // Get lamination recipe ingredients if available
        const laminationIngredients = await getScaledIngredients(
          supabase,
          style.recipe_id,
          sheetsNeeded // Scale by number of sheets
        );

        laminationResults.push({
          style_id: style.id,
          style_name: style.name,
          base_dough_id: doughId,
          base_dough_name: dough.name,
          products_per_sheet: style.products_per_sheet,
          laminate_lead_days: style.laminate_lead_days,
          recipe_id: style.recipe_id,
          recipe_name: style.recipe?.name || null,
          total_products: totalProducts,
          sheets_needed: sheetsNeeded,
          ingredients: laminationIngredients,
          products: styleProducts.map(p => ({
            name: p.product_name,
            quantity: p.total_quantity,
          })),
        });

        // Track total dough weight needed for all lamination sheets
        if (style.dough_per_sheet_g) {
          totalLaminationDoughG += sheetsNeeded * Number(style.dough_per_sheet_g);
        }
      }

      // Calculate direct (non-laminated) product requirements
      const directTotalUnits = productData.direct.reduce((sum, p) => sum + p.total_quantity, 0);
      let totalBatches: number | null = null;
      let totalKgFromDirect = 0;

      if (directTotalUnits > 0 && dough.units_per_batch && dough.batch_size_kg) {
        totalBatches = Math.ceil(directTotalUnits / dough.units_per_batch);
        totalKgFromDirect = totalBatches * Number(dough.batch_size_kg);
      }

      // Skip if no products ordered for this dough
      const totalSheetsNeeded = laminationResults.reduce((sum, r) => sum + r.sheets_needed, 0);
      if (totalSheetsNeeded === 0 && directTotalUnits === 0) continue;

      // Calculate total dough needed in kg
      const totalLaminationDoughKg = totalLaminationDoughG / 1000;
      const totalDoughNeededKg = totalLaminationDoughKg + totalKgFromDirect;

      // Get base dough recipe ingredients scaled by recipe yield
      // Uses dough_per_sheet_g to calculate actual dough weight, then divides by recipe yield
      let doughIngredients: { name: string; quantity: number; unit: string }[] = [];
      let totalKg = 0;

      if (totalDoughNeededKg > 0 && dough.recipe_id && dough.recipe) {
        // Use recipe yield to correctly scale ingredients
        doughIngredients = await getScaledIngredientsForKg(
          supabase,
          dough.recipe_id,
          totalDoughNeededKg,
          dough.recipe
        );
        totalKg = totalDoughNeededKg;
      } else if (totalDoughNeededKg > 0) {
        // No recipe linked - just use the calculated weight
        totalKg = totalDoughNeededKg;
      } else if (totalSheetsNeeded > 0 && dough.recipe) {
        // Fallback: dough_per_sheet_g not set, use old sheet-count scaling
        const scaleFactor = totalSheetsNeeded + (totalBatches || 0);
        doughIngredients = scaleFactor > 0
          ? await getScaledIngredients(supabase, dough.recipe_id, scaleFactor)
          : [];
        // Estimate total kg from ingredients
        if (doughIngredients.length > 0) {
          const ingredientTotalG = doughIngredients.reduce((sum, ing) => {
            const qty = ing.quantity || 0;
            if (ing.unit === 'kg') return sum + qty * 1000;
            if (ing.unit === 'g') return sum + qty;
            if (ing.unit === 'ml' || ing.unit === 'l') return sum + (ing.unit === 'l' ? qty * 1000 : qty);
            return sum + qty;
          }, 0);
          totalKg = Math.round(ingredientTotalG / 10) / 100;
        } else {
          const doughYieldKg = normalizeYieldToKg(dough.recipe.yield_quantity || 1, dough.recipe.yield_unit || 'kg');
          totalKg = totalSheetsNeeded * doughYieldKg;
        }
      }

      doughMixResults.push({
        dough_id: dough.id,
        dough_name: dough.name,
        mix_lead_days: dough.mix_lead_days,
        recipe_id: dough.recipe_id,
        recipe_name: dough.recipe?.name || null,
        total_kg: Math.ceil(totalKg), // Round up to nearest whole kg
        total_batches: totalBatches,
        batch_size_kg: dough.batch_size_kg ? Number(dough.batch_size_kg) : null,
        units_per_batch: dough.units_per_batch,
        ingredients: doughIngredients,
        lamination_styles: laminationResults,
        direct_products: productData.direct.map(p => ({
          name: p.product_name,
          quantity: p.total_quantity,
        })),
      });
    }

    // Calculate mix day based on earliest mix_lead_days
    const earliestLeadDays = Math.max(
      ...doughMixResults.map(d => d.mix_lead_days),
      0
    );
    const deliveryDateObj = new Date(deliveryDate);
    deliveryDateObj.setDate(deliveryDateObj.getDate() - earliestLeadDays);
    const mixDay = deliveryDateObj.toISOString().split('T')[0];

    // Build sheet summary
    const allSheets = doughMixResults.flatMap(d => d.lamination_styles);
    const sheetSummary = allSheets.length > 0 ? {
      total_sheets: allSheets.reduce((sum, s) => sum + s.sheets_needed, 0),
      by_style: allSheets.map(s => ({
        style_name: s.style_name,
        base_dough_name: s.base_dough_name,
        sheets_needed: s.sheets_needed,
        total_products: s.total_products,
        products_per_sheet: s.products_per_sheet,
        laminate_lead_days: s.laminate_lead_days,
      })),
    } : null;

    return NextResponse.json({
      delivery_date: deliveryDate,
      mix_day: mixDay,
      order_summary: {
        confirmed_orders: confirmedOrders,
        pending_orders: 0,
      },
      dough_mixes: doughMixResults,
      sheet_summary: sheetSummary,
    });
  } catch (error) {
    console.error('Error in GET /api/planly/production-plan/mix-sheet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get recipe ingredients scaled by a multiplier (e.g., number of sheets/batches)
 */
async function getScaledIngredients(
  supabase: any,
  recipeId: string | null,
  multiplier: number
): Promise<{ name: string; quantity: number; unit: string }[]> {
  if (!recipeId || multiplier === 0) return [];

  // The recipe_ingredients view has pre-joined ingredient_name and unit_abbreviation
  const { data: ingredients, error } = await supabase
    .from('recipe_ingredients')
    .select('ingredient_name, quantity, unit_abbreviation, sub_recipe_name')
    .eq('recipe_id', recipeId);

  if (error) {
    console.error('Error fetching recipe ingredients:', error);
    return [];
  }

  if (!ingredients || ingredients.length === 0) return [];

  return ingredients.map((ing: any) => ({
    name: ing.ingredient_name || ing.sub_recipe_name || 'Unknown',
    quantity: Math.round((ing.quantity || 0) * multiplier * 100) / 100,
    unit: ing.unit_abbreviation || 'g',
  }));
}

/**
 * Get recipe ingredients scaled to a target total kg
 */
async function getScaledIngredientsForKg(
  supabase: any,
  recipeId: string | null,
  targetKg: number,
  recipeInfo: { yield_quantity: number; yield_unit: string } | null
): Promise<{ name: string; quantity: number; unit: string }[]> {
  if (!recipeId || targetKg === 0 || !recipeInfo) return [];

  const yieldKg = normalizeYieldToKg(recipeInfo.yield_quantity || 1, recipeInfo.yield_unit || 'kg');
  const scaleFactor = targetKg / yieldKg;

  return getScaledIngredients(supabase, recipeId, scaleFactor);
}
