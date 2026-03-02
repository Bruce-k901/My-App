import { supabase } from '@/lib/supabase';
import { FOOD_SOP_TEMPLATE } from '@/lib/templates/foodSOPTemplate';

/**
 * Creates a Food SOP from a recipe
 * Pre-populates ingredient table with recipe ingredients
 */
export async function createFoodSOPFromRecipe(
  recipe: any,
  companyId: string,
  userId: string
): Promise<string> {
  try {
    // 1. Fetch recipe ingredients - the view already has joined data (ingredient_name, supplier, allergens, unit_abbreviation)
    const { data: recipeIngredients, error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipe.id)
      .order('sort_order', { ascending: true });
    
    if (ingredientsError) {
      console.error('Error fetching ingredients:', ingredientsError);
      throw new Error(`Failed to fetch recipe ingredients: ${ingredientsError.message}`);
    }
    
    // 2. Get user profile for author name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();
    
    const authorName = profile?.full_name || profile?.email || 'System';
    
    // 3. Build ingredient rows with full details including allergens
    // The recipe_ingredients view already includes: ingredient_name, supplier, allergens, unit_abbreviation
    const ingredientRows = (recipeIngredients || []).map((ri: any) => {
      const ingredientName = ri.ingredient_name || 'Unknown ingredient';
      const quantity = ri.quantity || 0;
      const unitAbbreviation = ri.unit_abbreviation || 'g';
      const supplier = ri.supplier || '';
      
      // Get allergens from view (already joined)
      const allergens = ri.allergens || [];
      const allergenArray = Array.isArray(allergens) ? allergens : (allergens ? [allergens] : []);
      
      return {
        ingredient: ingredientName,
        quantity: quantity.toString(),
        unit: unitAbbreviation,
        supplier: supplier,
        allergen: allergenArray,
        prepState: '',
        useByDate: '',
        costPerUnit: '',
        photo: null
      };
    });
    
    // 4. Collect all unique allergens from recipe and ingredients
    const recipeAllergens = recipe.allergens || [];
    const ingredientAllergens = ingredientRows.flatMap(row => row.allergen || []);
    const allAllergens = [...new Set([...recipeAllergens, ...ingredientAllergens])];
    
    // 5. Create SOP data from template
    const sopData = JSON.parse(JSON.stringify(FOOD_SOP_TEMPLATE));
    
    // 6. Update header with recipe info including allergen warning
    const headerIndex = sopData.content.findIndex((node: any) => node.type === 'prepHeader');
    if (headerIndex !== -1) {
      // Build safety notes with allergen warning
      let safetyNotes = '';
      if (allAllergens.length > 0) {
        safetyNotes = `⚠️ ALLERGEN WARNING ⚠️\nThis recipe contains: ${allAllergens.join(', ')}\n\n`;
      }
      safetyNotes += recipe.storage_requirements ? `Storage: ${recipe.storage_requirements}\n` : '';
      safetyNotes += recipe.shelf_life_days ? `Shelf Life: ${recipe.shelf_life_days} days\n` : '';
      
      sopData.content[headerIndex].attrs = {
        ...sopData.content[headerIndex].attrs,
        title: recipe.name || '',
        ref_code: recipe.code || '',
        version: (recipe.version_number || recipe.version || 1.0).toString(),
        status: 'Draft',
        author: authorName,
        last_edited: new Date().toISOString(),
        sopType: 'Prep',
        yieldValue: recipe.yield_qty || recipe.output_qty || 0,
        unit: recipe.yield_unit_id ? '' : (recipe.output_unit_id ? '' : ''),
        safetyNotes: safetyNotes.trim(),
        // Store allergens in metadata for easy access
        allergens: allAllergens,
        // Leave other header fields blank for user to complete
      };
    }
    
    // 7. Pre-populate ingredient table with allergens
    const ingredientTableIndex = sopData.content.findIndex((node: any) => node.type === 'ingredientTable');
    if (ingredientTableIndex !== -1) {
      sopData.content[ingredientTableIndex].attrs = {
        ...sopData.content[ingredientTableIndex].attrs,
        rows: ingredientRows,
        multiplier: 1
      };
    }
    
    // 8. Update storage info section with recipe data
    const storageIndex = sopData.content.findIndex((node: any) => node.type === 'storageInfo');
    if (storageIndex !== -1) {
      sopData.content[storageIndex].attrs = {
        ...sopData.content[storageIndex].attrs,
        type: recipe.storage_requirements || '',
        durationDays: recipe.shelf_life_days || null,
        storageNotes: recipe.storage_requirements || ''
      };
    }
    
    // 9. Build structured metadata for print template
    // Ensure we have latest cost and yield values
    let finalTotalCost = recipe.total_cost 
      || recipe.total_ingredient_cost 
      || recipe.ingredient_cost 
      || 0;
    let finalYieldQty = recipe.yield_qty 
      || recipe.yield_quantity 
      || recipe.output_qty 
      || recipe.calculated_yield_qty 
      || 0;
    
    // Get yield unit abbreviation if available
    const yieldUnitAbbr = recipe.yield_unit?.abbreviation 
      || (recipe.yield_unit_id ? 'g' : (recipe.output_unit_id ? 'g' : 'g'));
    
    const metadata = {
      recipe: {
        name: recipe.name || '',
        code: recipe.code || '',
        version_number: recipe.version_number || recipe.version || 1.0,
        allergens: allAllergens,
        total_cost: finalTotalCost, // Use calculated cost
        yield_qty: finalYieldQty, // Use calculated yield
        yield_unit: yieldUnitAbbr,
        shelf_life_days: recipe.shelf_life_days || null,
        storage_requirements: recipe.storage_requirements || ''
      },
      ingredients: ingredientRows.map((row: any) => ({
        ingredient_name: row.ingredient,
        quantity: parseFloat(row.quantity) || 0,
        unit: row.unit,
        supplier: row.supplier || null,
        allergens: row.allergen || []
      })),
      equipment: [], // Will be populated when user adds equipment
      method_steps: [] // Will be populated when user adds method steps
    };

    // 10. Embed structured metadata inside sop_data for the print template
    // (sop_entries table does not have a separate metadata column)
    sopData.metadata = metadata;

    // 11. Create SOP entry
    const { data: sopEntry, error: sopError } = await supabase
      .from('sop_entries')
      .insert({
        company_id: companyId,
        title: recipe.name || 'Food Prep SOP',
        ref_code: recipe.code || '',
        version: '1.0',
        status: 'Draft',
        author: authorName,
        category: 'Food Prep', // Must match sop_entries_category_check constraint
        sop_data: sopData, // TipTap format for editor + embedded metadata
        linked_recipe_id: recipe.id,
        version_number: 1,
        created_by: userId,
      })
      .select()
      .single();
    
    if (sopError || !sopEntry) {
      throw new Error(`Failed to create SOP: ${sopError?.message || 'Unknown error'}`);
    }
    
    // 12. Link recipe to SOP (bidirectional)
    await supabase
      .from('recipes')
      .update({ linked_sop_id: sopEntry.id })
      .eq('id', recipe.id);

    // 13. Set sync timestamp
    await supabase
      .from('sop_entries')
      .update({
        needs_update: false,
        last_synced_with_recipe_at: new Date().toISOString(),
      })
      .eq('id', sopEntry.id);
    
    return sopEntry.id;
  } catch (error: any) {
    console.error('Error in createFoodSOPFromRecipe:', error);
    throw error;
  }
}

