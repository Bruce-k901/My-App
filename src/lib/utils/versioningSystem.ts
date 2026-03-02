import { supabase } from '@/lib/supabase';

/**
 * Archives current recipe and creates new version
 * Called when user saves changes to existing recipe
 */
export async function archiveAndVersionRecipe(
  recipeId: string,
  userId: string,
  changeNotes?: string
): Promise<{ newRecipeId: string; archivedRecipeId: string }> {
  // 1. Get current recipe data
  const { data: currentRecipe, error: fetchError } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .single();
    
  if (fetchError) throw fetchError;
  if (!currentRecipe) throw new Error('Recipe not found');
  
  // 2. Create archived copy of current recipe
  const { data: archivedRecipe, error: archiveError } = await supabase
    .from('recipes')
    .insert({
      ...currentRecipe,
      id: undefined, // Let DB generate new ID
      recipe_status: 'archived',
      archived_from_recipe_id: recipeId,
      archived_at: new Date().toISOString(),
      archived_by: userId,
      version_number: currentRecipe.version_number || 1.0,
      is_active: false,
    })
    .select()
    .single();
    
  if (archiveError) throw archiveError;
  if (!archivedRecipe) throw new Error('Failed to create archived recipe');
  
  // 3. Copy recipe_ingredients to archived version
  const { data: ingredients, error: ingredientsError } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .eq('recipe_id', recipeId);
    
  if (ingredientsError) throw ingredientsError;
    
  if (ingredients && ingredients.length > 0) {
    const archivedIngredients = ingredients.map(ing => ({
      ...ing,
      id: undefined, // Let DB generate new ID
      recipe_id: archivedRecipe.id,
    }));
    
    const { error: insertError } = await supabase
      .from('recipe_ingredients')
      .insert(archivedIngredients);
      
    if (insertError) throw insertError;
  }
  
  // 4. Increment version on current recipe
  const newVersion = Number(currentRecipe.version_number || 1.0) + 0.1;
  const { error: updateError } = await supabase
    .from('recipes')
    .update({
      version_number: Number(newVersion.toFixed(1)),
      updated_at: new Date().toISOString(),
    })
    .eq('id', recipeId);
  
  if (updateError) throw updateError;
  
  // 5. If recipe has linked SOP, version that too
  if (currentRecipe.output_ingredient_id) {
    // Find SOP linked to this recipe via the ingredient
    const { data: sopEntries } = await supabase
      .from('sop_entries')
      .select('id')
      .eq('linked_recipe_id', recipeId)
      .limit(1);
      
    if (sopEntries && sopEntries.length > 0) {
      await archiveAndVersionSOP(sopEntries[0].id, userId, changeNotes);
    }
  }
  
  return {
    newRecipeId: recipeId, // Same ID, new version
    archivedRecipeId: archivedRecipe.id,
  };
}

/**
 * Archives current SOP and creates new version
 */
export async function archiveAndVersionSOP(
  sopId: string,
  userId: string,
  changeNotes?: string
): Promise<{ archivedSopId: string }> {
  const { data: currentSop, error: fetchError } = await supabase
    .from('sop_entries')
    .select('*')
    .eq('id', sopId)
    .single();
    
  if (fetchError) throw fetchError;
  if (!currentSop) return { archivedSopId: '' };
  
  // Create archived copy
  const { data: archivedSop, error: archiveError } = await supabase
    .from('sop_entries')
    .insert({
      ...currentSop,
      id: undefined, // Let DB generate new ID
      archived_from_sop_id: sopId,
      archived_at: new Date().toISOString(),
      archived_by: userId,
      version_number: currentSop.version_number || 1.0,
      status: 'Archived',
    })
    .select()
    .single();
  
  if (archiveError) throw archiveError;
  if (!archivedSop) return { archivedSopId: '' };
  
  // Increment version on current SOP
  const newVersion = Number(currentSop.version_number || 1.0) + 0.1;
  const { error: updateError } = await supabase
    .from('sop_entries')
    .update({
      version_number: Number(newVersion.toFixed(1)),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sopId);
  
  if (updateError) throw updateError;
  
  return { archivedSopId: archivedSop.id };
}

