import { supabase } from '@/lib/supabase';
import { generateRecipeId } from './recipeIdGenerator';
import { createFoodSOPFromRecipe } from './sopCreator';
import { archiveAndVersionRecipe } from './versioningSystem';

/**
 * STEP 1: When user marks ingredient as prep item
 * Search for existing recipe or offer to create one
 */
export async function handlePrepItemToggle(
  ingredientId: string,
  isPrepItem: boolean,
  companyId: string,
  userId: string
): Promise<{ recipeId?: string; sopId?: string; action: 'found' | 'created' | 'disabled' | 'none' }> {
  if (!isPrepItem) {
    // User unchecked prep item - keep recipe/SOP but set is_active = false
    const { data: ingredient } = await supabase
      .from('ingredients_library')
      .select('linked_recipe_id')
      .eq('id', ingredientId)
      .single();
    
    if (ingredient?.linked_recipe_id) {
      // Set recipe is_active = false
      await supabase
        .from('recipes')
        .update({ is_active: false })
        .eq('id', ingredient.linked_recipe_id);
    }
    
    // Update ingredient
    await supabase
      .from('ingredients_library')
      .update({ is_prep_item: false })
      .eq('id', ingredientId);
    
    return { action: 'disabled' };
  }
  
  // Check if recipe already exists for this ingredient (check both active and draft)
  const { data: existingRecipe } = await supabase
    .from('recipes')
    .select('id, recipe_status')
    .eq('output_ingredient_id', ingredientId)
    .in('recipe_status', ['active', 'draft'])
    .maybeSingle();
  if (existingRecipe) {
    // Link existing recipe to ingredient
    await supabase
      .from('ingredients_library')
      .update({
        is_prep_item: true,
        linked_recipe_id: existingRecipe.id,
      })
      .eq('id', ingredientId);
      
    return { recipeId: existingRecipe.id, action: 'found' };
  }
  
  // No recipe found - create placeholder
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d76799fe-e8cb-47ea-99db-c575c4658e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prepItemRecipeFlow.ts:63',message:'Creating new recipe placeholder',data:{ingredientId,companyId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const recipeId = await createRecipePlaceholder(ingredientId, companyId, userId);
  return { recipeId, action: 'created' };
}

/**
 * STEP 2: Create recipe placeholder (called after user confirms or automatically)
 */
export async function createRecipePlaceholder(
  ingredientId: string,
  companyId: string,
  userId: string
): Promise<string> {
  
  // Get ingredient details
  const { data: ingredient, error: ingredientError } = await supabase
    .from('ingredients_library')
    .select('ingredient_name, base_unit_id, linked_recipe_id')
    .eq('id', ingredientId)
    .single();
    
  if (ingredientError || !ingredient) {
    throw new Error('Ingredient not found');
  }
  
  // ✅ CHECK: Does this ingredient already have a recipe?
  if (ingredient.linked_recipe_id) {
    console.log('Recipe already exists for this ingredient:', ingredient.linked_recipe_id);
    // Verify the recipe still exists
    const { data: existingRecipe } = await supabase
      .from('recipes')
      .select('id')
      .eq('id', ingredient.linked_recipe_id)
      .single();
    
    if (existingRecipe) {
      return ingredient.linked_recipe_id; // Return existing recipe ID
    }
    // Recipe was deleted, continue to create new one
  }
  
  // ✅ CHECK: Does a recipe already exist with this ingredient as output?
  const { data: existingRecipe } = await supabase
    .from('recipes')
    .select('id')
    .eq('output_ingredient_id', ingredientId)
    .eq('company_id', companyId)
    .maybeSingle();
  
  if (existingRecipe) {
    console.log('Recipe already exists for this ingredient:', existingRecipe.id);
    
    // Update ingredient to link to existing recipe
    await supabase
      .from('ingredients_library')
      .update({ linked_recipe_id: existingRecipe.id })
      .eq('id', ingredientId);
    
    return existingRecipe.id;
  }
  
  // Generate recipe ID
  const recipeCode = await generateRecipeId(ingredient.ingredient_name, companyId);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d76799fe-e8cb-47ea-99db-c575c4658e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prepItemRecipeFlow.ts:88',message:'Before recipe insert',data:{ingredientId,ingredientName:ingredient.ingredient_name,recipeCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  // Create recipe placeholder
  // Note: recipes table uses total_cost and cost_per_portion, not ingredient_cost
  // The migration added yield_qty and yield_unit_id columns
  // Base table has yield_quantity and yield_unit (TEXT), but we use the migration-added columns
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      company_id: companyId,
      name: ingredient.ingredient_name,
      code: recipeCode,
      recipe_type: 'prep', // Use 'prep' for prep items (not 'sub_recipe')
      recipe_status: 'draft',
      output_ingredient_id: ingredientId,
      yield_qty: 1, // Use yield_qty (added by migration)
      yield_unit_id: ingredient.base_unit_id || null, // Use yield_unit_id (added by migration)
      total_cost: 0, // Use total_cost instead of ingredient_cost
      cost_per_portion: 0, // Use cost_per_portion instead of ingredient_cost
      is_active: false, // Not active until ingredients added
      version_number: 1.0,
    })
    .select()
    .single();
    
  if (recipeError || !recipe) {
    console.error('Error creating recipe placeholder:', recipeError);
    console.error('Recipe payload:', {
      company_id: companyId,
      name: ingredient.ingredient_name,
      code: recipeCode,
      recipe_type: 'prep',
      recipe_status: 'draft',
      output_ingredient_id: ingredientId,
      yield_qty: 1,
      yield_unit_id: ingredient.base_unit_id || null,
      total_cost: 0,
      cost_per_portion: 0,
      is_active: false,
      version_number: 1.0,
    });
    throw recipeError || new Error('Failed to create recipe');
  }
  
  console.info('Recipe placeholder created successfully:', recipe.id, recipe.code);
  
  // Link recipe back to ingredient
  const { error: linkError } = await supabase
    .from('ingredients_library')
    .update({
      is_prep_item: true,
      linked_recipe_id: recipe.id,
    })
    .eq('id', ingredientId);
  
  if (linkError) {
    console.error('Error linking recipe to ingredient:', linkError);
    // Don't throw - recipe was created, linking can be retried
  } else {
    console.info('Recipe linked to ingredient successfully');
  }
  
  return recipe.id;
}

/**
 * STEP 3: After user saves first recipe ingredient
 * Calculate cost, update ingredient cost, create SOP
 */
export async function onFirstRecipeIngredientSaved(
  recipeId: string,
  companyId: string,
  userId: string
): Promise<{ sopId: string }> {
  // Check if this is the first ingredient
  const { data: ingredients, count } = await supabase
    .from('recipe_ingredients')
    .select('id', { count: 'exact', head: false })
    .eq('recipe_id', recipeId);
    
  if ((count || 0) !== 1) {
    // Not first ingredient, skip SOP creation
    return { sopId: '' };
  }
  
  // Get recipe details
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('*, ingredients_library(*)')
    .eq('id', recipeId)
    .single();
    
  if (recipeError || !recipe) {
    throw new Error('Recipe not found');
  }
  
  // Create Food SOP
  const sopId = await createFoodSOPFromRecipe(recipe, companyId, userId);
  
  // Update recipe status to active (has ingredients now)
  await supabase
    .from('recipes')
    .update({
      is_active: true,
      recipe_status: 'active',
    })
    .eq('id', recipeId);
  
  return { sopId };
}

/**
 * STEP 4: When user saves recipe (draft or active)
 * Handle status updates and versioning
 */
export async function saveRecipe(
  recipeId: string,
  saveAsActive: boolean,
  userId: string
): Promise<void> {
  const { data: existingRecipe, error: fetchError } = await supabase
    .from('recipes')
    .select('recipe_status, version_number')
    .eq('id', recipeId)
    .single();
  
  if (fetchError || !existingRecipe) {
    throw new Error('Recipe not found');
  }
  
  // If recipe was already active and is being modified
  if (existingRecipe.recipe_status === 'active') {
    // Archive old version before updating
    await archiveAndVersionRecipe(recipeId, userId);
  }
  
  // Update recipe status
  await supabase
    .from('recipes')
    .update({
      recipe_status: saveAsActive ? 'active' : 'draft',
      is_active: saveAsActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recipeId);
}

