import { supabase } from '@/lib/supabase';

/**
 * Updates a Food SOP from a recipe
 * Updates ingredient table and header with current recipe data
 */
export async function updateFoodSOPFromRecipe(
  recipeId: string,
  sopId: string
): Promise<void> {
  try {
    // 1. Fetch current recipe data with yield unit
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select(`
        *,
        yield_unit:uom!yield_unit_id(abbreviation, name)
      `)
      .eq('id', recipeId)
      .single();

    if (recipeError || !recipe) {
      throw new Error(`Failed to fetch recipe: ${recipeError?.message || 'Recipe not found'}`);
    }

    // Ensure we have the latest calculated cost and yield
    // Check multiple possible field names for cost and yield
    let finalTotalCost = recipe.total_cost 
      || recipe.total_ingredient_cost 
      || recipe.ingredient_cost 
      || 0;
    let finalYieldQty = recipe.yield_qty 
      || recipe.yield_quantity 
      || recipe.output_qty 
      || recipe.calculated_yield_qty 
      || 0;
    
    // If cost is missing or 0, try to calculate it from ingredients
    if (!finalTotalCost || finalTotalCost === 0) {
      try {
        // Try stockly.calculate_recipe_cost first (for stockly schema)
        const { data: costData, error: costError } = await supabase.rpc('calculate_recipe_cost', {
          p_recipe_id: recipeId
        });
        if (!costError && costData !== null && costData !== undefined) {
          finalTotalCost = parseFloat(String(costData)) || 0;
        } else {
          // Try alternative function name
          const { data: costData2, error: costError2 } = await supabase.rpc('calculate_recipe_total_cost', {
            p_recipe_id: recipeId
          });
          if (!costError2 && costData2 !== null && costData2 !== undefined) {
            finalTotalCost = parseFloat(String(costData2)) || 0;
          }
        }
      } catch (e) {
        console.warn('Could not calculate recipe cost:', e);
      }
    }
    
    // If yield is missing or 0, try to calculate it
    if (!finalYieldQty || finalYieldQty === 0) {
      try {
        const { data: yieldData, error: yieldError } = await supabase.rpc('calculate_recipe_yield', {
          p_recipe_id: recipeId
        });
        if (!yieldError && yieldData !== null && yieldData !== undefined) {
          finalYieldQty = parseFloat(String(yieldData)) || 0;
        }
      } catch (e) {
        console.warn('Could not calculate recipe yield:', e);
      }
    }
    
    // Use the latest values
    const recipeWithCost = {
      ...recipe,
      total_cost: finalTotalCost,
      yield_qty: finalYieldQty
    };
    
    console.log('📊 Recipe cost/yield sync:', {
      recipeId,
      originalCost: recipe.total_cost || recipe.total_ingredient_cost,
      finalCost: finalTotalCost,
      originalYield: recipe.yield_qty || recipe.output_qty,
      finalYield: finalYieldQty
    });

    // 2. Fetch recipe ingredients - the view already has joined data (ingredient_name, supplier, allergens, unit_abbreviation)
    console.log('🔍 Fetching recipe ingredients for recipe ID:', recipeId);
    
    const { data: recipeIngredients, error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('sort_order', { ascending: true });

    console.log('📊 Recipe ingredients query result:', {
      count: recipeIngredients?.length || 0,
      ingredients: recipeIngredients,
      error: ingredientsError
    });

    if (ingredientsError) {
      console.error('❌ Error fetching ingredients:', ingredientsError);
      throw new Error(`Failed to fetch recipe ingredients: ${ingredientsError.message}`);
    }
    
    if (!recipeIngredients || recipeIngredients.length === 0) {
      console.warn('⚠️ Recipe has no ingredients! Recipe ID:', recipeId);
      // Don't throw error - just sync with empty ingredients
    }

    // 3. Fetch current SOP to preserve user-entered data
    const { data: sopEntry, error: sopError } = await supabase
      .from('sop_entries')
      .select('*')
      .eq('id', sopId)
      .single();

    if (sopError || !sopEntry) {
      throw new Error(`Failed to fetch SOP: ${sopError?.message || 'SOP not found'}`);
    }

    // 4. Parse existing SOP data
    let sopData: any = sopEntry.sop_data || {};
    if (typeof sopData === 'string') {
      try {
        sopData = JSON.parse(sopData);
      } catch (e) {
        sopData = {};
      }
    }
    
    // 5. Ensure sopData has content array - if empty, initialize with template structure
    // Preserve equipment and processSteps from simple format before overwriting
    const simpleEquipment = (!sopData.content && sopData.equipment) ? sopData.equipment : null;
    const simpleProcessSteps = (!sopData.content && sopData.processSteps) ? sopData.processSteps : null;

    if (!sopData.content || !Array.isArray(sopData.content)) {
      // Import template to get structure
      const { FOOD_SOP_TEMPLATE } = await import('@/lib/templates/foodSOPTemplate');
      sopData = JSON.parse(JSON.stringify(FOOD_SOP_TEMPLATE));
    }

    // If we had simple format equipment/steps, inject them into the TipTap structure
    if (simpleEquipment && Array.isArray(simpleEquipment)) {
      let eqIdx = sopData.content.findIndex((node: any) => node.type === 'equipmentList');
      if (eqIdx === -1) {
        sopData.content.push({ type: 'equipmentList', attrs: { rows: [] } });
        eqIdx = sopData.content.length - 1;
      }
      sopData.content[eqIdx].attrs = {
        ...sopData.content[eqIdx].attrs,
        rows: simpleEquipment.map((eq: any) => ({
          item: eq.item || eq.name || '',
          colour_code: eq.colour_code || '',
          sanitation_notes: eq.sanitation_notes || ''
        }))
      };
    }
    if (simpleProcessSteps && Array.isArray(simpleProcessSteps)) {
      let stepsIdx = sopData.content.findIndex((node: any) => node.type === 'processSteps');
      if (stepsIdx === -1) {
        sopData.content.push({ type: 'processSteps', attrs: { steps: [] } });
        stepsIdx = sopData.content.length - 1;
      }
      sopData.content[stepsIdx].attrs = {
        ...sopData.content[stepsIdx].attrs,
        steps: simpleProcessSteps.map((step: any) => ({
          description: step.description || step.text || '',
          title: step.title || '',
          temperature: step.temperature || '',
          duration: step.duration || '',
          haccp_note: step.haccp_note || '',
          is_ccp: step.is_ccp || false,
          photo_url: step.photo_url || ''
        }))
      };
    }

    // 6. Build ingredient rows with full details including allergens
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

    // 7. Collect all unique allergens from recipe and ingredients
    const recipeAllergens = recipeWithCost.allergens || [];
    const ingredientAllergens = ingredientRows.flatMap(row => row.allergen || []);
    const allAllergens = [...new Set([...recipeAllergens, ...ingredientAllergens])];

    // 8. Ensure header exists, create if not
    let headerIndex = sopData.content.findIndex((node: any) => node.type === 'prepHeader');
    if (headerIndex === -1) {
      // Create header node
      sopData.content.unshift({
        type: 'prepHeader',
        attrs: {
          title: '',
          ref_code: '',
          version: '1.0',
          status: 'Draft',
          author: '',
          last_edited: '',
          sopType: 'Prep',
          yieldValue: 0,
          unit: '',
          toolColour: '',
          toolColourHex: '',
          safetyNotes: '',
          subRecipes: []
        }
      });
      headerIndex = 0;
    }

    // Update header with recipe info including allergen warning
    if (headerIndex !== -1 && sopData.content) {
      // Always update allergen warning and storage info (don't preserve old ones)
      let safetyNotes = '';
      
      // Add allergen warning at the top if allergens exist
      if (allAllergens.length > 0) {
        safetyNotes = `⚠️ ALLERGEN WARNING ⚠️\nThis recipe contains: ${allAllergens.join(', ')}\n\n`;
      }
      
      // Add storage info
      if (recipeWithCost.storage_requirements) {
        safetyNotes += `Storage: ${recipeWithCost.storage_requirements}\n`;
      }
      if (recipeWithCost.shelf_life_days) {
        safetyNotes += `Shelf Life: ${recipeWithCost.shelf_life_days} days\n`;
      }
      
      sopData.content[headerIndex].attrs = {
        ...sopData.content[headerIndex].attrs,
        title: recipeWithCost.name || sopData.content[headerIndex].attrs?.title || '',
        ref_code: recipeWithCost.code || sopData.content[headerIndex].attrs?.ref_code || '',
        version: (recipeWithCost.version_number || recipeWithCost.version || 1.0).toString(),
        yieldValue: finalYieldQty,
        safetyNotes: safetyNotes.trim(),
        // Store allergens in metadata for easy access
        allergens: allAllergens,
      };
    }

    // 9. Ensure ingredient table exists, create if not
    let ingredientTableIndex = sopData.content.findIndex((node: any) => node.type === 'ingredientTable');
    if (ingredientTableIndex === -1) {
      // Create ingredient table node after header
      const insertIndex = headerIndex !== -1 ? headerIndex + 1 : 0;
      sopData.content.splice(insertIndex, 0, {
        type: 'ingredientTable',
        attrs: {
          rows: [],
          multiplier: 1
        }
      });
      ingredientTableIndex = insertIndex;
    }

    // Always update ingredient table with current recipe data (force complete replacement)
    // This ensures ingredients are always synced, even if SOP was empty
    sopData.content[ingredientTableIndex].attrs = {
      rows: ingredientRows, // Always replace with current recipe ingredients - no preservation
      multiplier: sopData.content[ingredientTableIndex].attrs?.multiplier || 1
    };
    
    console.log('Ingredient rows to update:', ingredientRows.length, ingredientRows);

    // 10. Ensure storage info section exists, create if not
    let storageIndex = sopData.content.findIndex((node: any) => node.type === 'storageInfo');
    if (storageIndex === -1) {
      // Create storage info node
      sopData.content.push({
        type: 'storageInfo',
        attrs: {
          type: '',
          tempMin: null,
          tempMax: null,
          durationDays: null,
          storageNotes: ''
        }
      });
      storageIndex = sopData.content.length - 1;
    }

    // Always update storage info with recipe data
    sopData.content[storageIndex].attrs = {
      ...sopData.content[storageIndex].attrs,
      type: recipeWithCost.storage_requirements || '',
      durationDays: recipeWithCost.shelf_life_days || null,
      storageNotes: recipeWithCost.storage_requirements || ''
    };

    // 10b. Preserve existing equipment list (if it exists)
    let equipmentListIndex = sopData.content.findIndex((node: any) => node.type === 'equipmentList');
    if (equipmentListIndex === -1) {
      // Equipment list doesn't exist, create empty one if needed
      // But don't create it automatically - let user add it manually if needed
      console.log('No equipment list found - preserving existing structure');
    } else {
      console.log('Equipment list found at index', equipmentListIndex, '- preserving it');
      // Equipment list exists, we preserve it - no changes needed
    }

    // 10c. Preserve existing process steps (if they exist)
    let processStepsIndex = sopData.content.findIndex((node: any) => node.type === 'processSteps');
    if (processStepsIndex === -1) {
      // Process steps don't exist, create empty one if needed
      // But don't create it automatically - let user add it manually if needed
      console.log('No process steps found - preserving existing structure');
    } else {
      console.log('Process steps found at index', processStepsIndex, '- preserving it');
      // Process steps exist, we preserve them - no changes needed
    }

    // 11. Build structured metadata for print template
    // Get yield unit abbreviation if available
    const yieldUnitAbbr = recipeWithCost.yield_unit?.abbreviation 
      || (recipeWithCost.yield_unit_id ? 'g' : (recipeWithCost.output_unit_id ? 'g' : 'g'));
    
    const metadata = {
      recipe: {
        name: recipeWithCost.name || '',
        code: recipeWithCost.code || '',
        version_number: recipeWithCost.version_number || recipeWithCost.version || 1.0,
        allergens: allAllergens,
        total_cost: finalTotalCost, // Use calculated cost
        yield_qty: finalYieldQty, // Use calculated yield
        yield_unit: yieldUnitAbbr,
        shelf_life_days: recipeWithCost.shelf_life_days || null,
        storage_requirements: recipeWithCost.storage_requirements || ''
      },
      ingredients: ingredientRows.map((row: any) => ({
        ingredient_name: row.ingredient,
        quantity: parseFloat(row.quantity) || 0,
        unit: row.unit,
        supplier: row.supplier || null,
        allergens: row.allergen || []
      })),
      // Preserve existing equipment and steps from sop_data
      equipment: equipmentListIndex !== -1 
        ? (sopData.content[equipmentListIndex]?.attrs?.rows || []).map((eq: any) => eq.item || eq.name || '')
        : [],
      method_steps: processStepsIndex !== -1
        ? (sopData.content[processStepsIndex]?.attrs?.steps || []).map((step: any) => step.description || step.text || '')
        : []
    };

    // 12. Update SOP entry - always update with current recipe data
    // Note: metadata column doesn't exist in all schemas, so we only update sop_data
    // The metadata structure is already included in sop_data (TipTap format)
    console.log('Updating SOP with', ingredientRows.length, 'ingredients');
    
    const { data: updatedSop, error: updateError } = await supabase
      .from('sop_entries')
      .update({
        sop_data: sopData, // TipTap format for editor - contains all data including ingredients
        updated_at: new Date().toISOString(),
      })
      .eq('id', sopId)
      .select('sop_data')
      .single();

    if (updateError) {
      console.error('Error updating SOP:', updateError);
      throw new Error(`Failed to update SOP: ${updateError.message}`);
    }

    // Verify the update worked
    const updatedIngredientTable = updatedSop?.sop_data?.content?.find((n: any) => n.type === 'ingredientTable');
    console.log('✅ SOP updated successfully. Ingredient table has', 
      updatedIngredientTable?.attrs?.rows?.length || 0, 
      'ingredients');
    
    if ((updatedIngredientTable?.attrs?.rows?.length || 0) === 0 && ingredientRows.length > 0) {
      console.warn('⚠️ WARNING: Ingredients were not saved to SOP!');
      throw new Error('Ingredients were not saved to SOP. Please check the console for details.');
    }
  } catch (error: any) {
    console.error('Error updating SOP from recipe:', error);
    throw error;
  }
}

