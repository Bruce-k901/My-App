"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { SOPPrintTemplate } from '@/components/sops/SOPPrintTemplate';
import { 
  Edit, 
  Download, 
  Printer, 
  ArrowLeft,
  RefreshCw
} from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';

export default function SOPViewPage() {
  const params = useParams();
  const router = useRouter();
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  const sopId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [sop, setSop] = useState<any>(null);
  const [printData, setPrintData] = useState<any>(null);
  const [multiplier, setMultiplier] = useState(1); // Recipe scaling multiplier
  const [multiplierInput, setMultiplierInput] = useState('1'); // Local input state for editing
  const [syncing, setSyncing] = useState(false); // Track sync state

  // Helper function to process SOP data and build print data
  const processSOPData = async (data: any, currentMultiplier: number = 1) => {
    // Fetch creator profile separately if created_by exists
    let creatorName = data.author || 'System';
    if (data.created_by) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', data.created_by)
          .single();
        
        if (profile) {
          creatorName = profile.full_name || profile.email || creatorName;
        }
      } catch (profileError) {
        console.warn('Could not fetch creator profile:', profileError);
      }
    }
    
    // Parse sop_data
    let parsedData = data.sop_data || {};
    if (typeof parsedData === 'string') {
      try {
        parsedData = JSON.parse(parsedData);
      } catch (e) {
        console.error('Error parsing sop_data:', e);
        parsedData = {};
      }
    }

    // Extract structured data for print template
    const metadata = data.metadata || {};
    const isTipTapFormat = parsedData.content && Array.isArray(parsedData.content);
    
    console.log('🔍 Processing SOP data:', {
      hasMetadata: !!metadata.ingredients,
      metadataIngredientCount: metadata.ingredients?.length || 0,
      isTipTapFormat,
      hasLinkedRecipe: !!data.linked_recipe_id
    });
    
    let ingredients: any[] = [];
    let equipment: string[] = [];
    let methodSteps: string[] = [];
    let recipe: any = null;

    if (metadata.ingredients && metadata.ingredients.length > 0) {
      console.log('✅ Using metadata.ingredients:', metadata.ingredients.length);
      ingredients = metadata.ingredients;
      equipment = metadata.equipment || [];
      methodSteps = metadata.method_steps || [];
      recipe = metadata.recipe || data.linked_recipe;
    } else if (isTipTapFormat) {
      console.log('✅ Using TipTap format');
      const ingredientTableNode = parsedData.content.find((n: any) => n.type === 'ingredientTable');
      const equipmentListNode = parsedData.content.find((n: any) => n.type === 'equipmentList');
      const processStepsNode = parsedData.content.find((n: any) => n.type === 'processSteps');
      const headerNode = parsedData.content.find((n: any) => n.type === 'prepHeader');
      const storageInfoNode = parsedData.content.find((n: any) => n.type === 'storageInfo');

      if (ingredientTableNode?.attrs?.rows) {
        console.log('✅ Found ingredientTable with', ingredientTableNode.attrs.rows.length, 'rows');
        ingredients = ingredientTableNode.attrs.rows.map((row: any) => ({
          ingredient_name: row.ingredient || '',
          quantity: parseFloat(row.quantity) || 0,
          unit: row.unit || '',
          supplier: row.supplier || '',
          allergens: Array.isArray(row.allergen) ? row.allergen : (row.allergen ? [row.allergen] : [])
        }));
        console.log('📝 Parsed ingredients:', ingredients.map(i => i.ingredient_name));
      } else {
        console.log('⚠️ No ingredientTable found in TipTap format');
      }

      if (equipmentListNode?.attrs?.rows) {
        equipment = equipmentListNode.attrs.rows.map((eq: any) => eq.item || eq.name || 'Equipment');
      }

      if (processStepsNode?.attrs?.steps) {
        methodSteps = processStepsNode.attrs.steps.map((step: any) => step.description || step.text || '');
      }

      if (headerNode?.attrs) {
        recipe = {
          name: headerNode.attrs.title || data.title,
          code: headerNode.attrs.ref_code || data.ref_code,
          version_number: parseFloat(headerNode.attrs.version) || data.version_number || 1.0,
          allergens: headerNode.attrs.allergens || [],
          yield_qty: headerNode.attrs.yieldValue || 0,
          yield_unit: headerNode.attrs.unit || 'g',
          storage_requirements: storageInfoNode?.attrs?.type || '',
          shelf_life_days: storageInfoNode?.attrs?.durationDays || null
        };
      }
    } else {
      console.log('✅ Using simple format');
      if (parsedData.ingredients) {
        console.log('✅ Found simple format ingredients:', parsedData.ingredients.length);
        ingredients = parsedData.ingredients.map((ing: any) => ({
          ingredient_name: ing.ingredient_name || ing.ingredient || '',
          quantity: ing.quantity || 0,
          unit: ing.unit || '',
          supplier: ing.supplier || '',
          allergens: ing.allergens || []
        }));
      } else {
        console.log('⚠️ No ingredients found in simple format');
      }
      equipment = parsedData.equipment?.map((eq: any) => eq.item || eq.name || '') || [];
      methodSteps = parsedData.processSteps?.map((step: any) => step.description || step.text || '') || [];
      recipe = data.linked_recipe || parsedData.header;
    }

    // Fallback: if equipment or method are still empty, check sop_data (handles case where
    // metadata has ingredients from recipe sync but equipment/method were added via form)
    if (equipment.length === 0 || equipment.every((e: string) => !e)) {
      if (parsedData.equipment && Array.isArray(parsedData.equipment)) {
        const fromSimple = parsedData.equipment.map((eq: any) => eq.item || eq.name || '').filter(Boolean);
        if (fromSimple.length > 0) {
          console.log('✅ Fallback: found equipment in sop_data simple format:', fromSimple.length);
          equipment = fromSimple;
        }
      }
      if (equipment.length === 0 && isTipTapFormat) {
        const eqNode = parsedData.content.find((n: any) => n.type === 'equipmentList');
        if (eqNode?.attrs?.rows) {
          const fromTipTap = eqNode.attrs.rows.map((eq: any) => eq.item || eq.name || '').filter(Boolean);
          if (fromTipTap.length > 0) {
            console.log('✅ Fallback: found equipment in TipTap format:', fromTipTap.length);
            equipment = fromTipTap;
          }
        }
      }
    }
    if (methodSteps.length === 0 || methodSteps.every((s: string) => !s)) {
      if (parsedData.processSteps && Array.isArray(parsedData.processSteps)) {
        const fromSimple = parsedData.processSteps.map((step: any) => step.description || step.text || '').filter(Boolean);
        if (fromSimple.length > 0) {
          console.log('✅ Fallback: found method steps in sop_data simple format:', fromSimple.length);
          methodSteps = fromSimple;
        }
      }
      if (methodSteps.length === 0 && isTipTapFormat) {
        const stepsNode = parsedData.content.find((n: any) => n.type === 'processSteps');
        if (stepsNode?.attrs?.steps) {
          const fromTipTap = stepsNode.attrs.steps.map((step: any) => step.description || step.text || '').filter(Boolean);
          if (fromTipTap.length > 0) {
            console.log('✅ Fallback: found method steps in TipTap format:', fromTipTap.length);
            methodSteps = fromTipTap;
          }
        }
      }
    }

    // Use linked recipe if available
    if (data.linked_recipe && !recipe) {
      recipe = {
        name: data.linked_recipe.name,
        code: data.linked_recipe.code,
        version_number: data.linked_recipe.version_number || 1.0,
        allergens: data.linked_recipe.allergens || [],
        total_cost: data.linked_recipe.total_cost || 0,
        yield_qty: data.linked_recipe.yield_qty || 0,
        yield_unit: 'g',
        shelf_life_days: data.linked_recipe.shelf_life_days,
        storage_requirements: data.linked_recipe.storage_requirements
      };
    }

    // Build print data with multiplier support
    const ingredientNames = ingredients.map((ing: any) => ing.ingredient_name || ing.ingredient).filter(Boolean);
    let ingredientCostsMap: Record<string, number> = {};
    
    if (ingredientNames.length > 0) {
      try {
        const { data: ingredientsData } = await supabase
          .from('ingredients_library')
          .select('ingredient_name, unit_cost, pack_cost, pack_size, yield_percent')
          .in('ingredient_name', ingredientNames);
        
        if (ingredientsData) {
          ingredientsData.forEach((ing: any) => {
            let unitCost = ing.unit_cost || 0;
            if (!unitCost && ing.pack_cost && ing.pack_size && ing.pack_size > 0) {
              unitCost = ing.pack_cost / ing.pack_size;
            }
            if (ing.yield_percent && ing.yield_percent > 0 && ing.yield_percent !== 100) {
              unitCost = unitCost * (100 / ing.yield_percent);
            }
            ingredientCostsMap[ing.ingredient_name] = unitCost;
          });
        }
      } catch (error) {
        console.warn('Could not fetch ingredient costs:', error);
      }
    }
    
    // Store original quantities and calculate base cost/yield from ingredients
    const baseIngredients = ingredients.map((ing: any) => {
      const quantity = parseFloat(String(ing.quantity || 0));
      const ingredientName = ing.ingredient_name || ing.ingredient || '';
      const unitCost = ingredientCostsMap[ingredientName] || 0;
      const lineCost = quantity * unitCost;
      
      return {
        ...ing,
        originalQuantity: quantity,
        unitCost: unitCost,
        lineCost: lineCost
      };
    });
    
    // Calculate base cost and yield from ingredients
    const baseCost = baseIngredients.reduce((sum, ing) => sum + (ing.lineCost || 0), 0);
    const baseYield = recipe?.yield_qty || baseIngredients.reduce((sum, ing) => sum + (ing.originalQuantity || 0), 0);
    
    // Apply multiplier
    const scaledIngredients = baseIngredients.map((ing: any) => ({
      ...ing,
      quantity: ing.originalQuantity * currentMultiplier,
      lineCost: (ing.lineCost || 0) * currentMultiplier
    }));
    
    // Calculate scaled cost and yield
    const scaledCost = baseCost * currentMultiplier;
    const scaledYield = baseYield * currentMultiplier;
    
    const scaledRecipe = recipe ? {
      ...recipe,
      total_cost: scaledCost,
      yield_qty: scaledYield,
      original_cost: baseCost,
      original_yield: baseYield
    } : null;
    
    return {
      sop_code: data.ref_code || data.sop_code,
      ref_code: data.ref_code,
      title: data.title,
      version: data.version_number || parseFloat(data.version) || 1.0,
      version_number: data.version_number || parseFloat(data.version) || 1.0,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by_name: creatorName,
      recipe: scaledRecipe,
      ingredients: scaledIngredients,
      baseIngredients: baseIngredients,
      equipment: equipment.filter(Boolean).length > 0 ? equipment.filter(Boolean) : undefined,
      method_steps: methodSteps.filter(Boolean).length > 0 ? methodSteps.filter(Boolean) : undefined,
      multiplier: currentMultiplier
    };
  };

  useEffect(() => {
    if (!sopId || !companyId) return;

    const loadSOP = async () => {
      try {
        setLoading(true);
        // First, fetch the SOP entry
        const { data, error } = await supabase
          .from('sop_entries')
          .select(`
            *,
            linked_recipe:recipes!linked_recipe_id(
              id,
              name,
              code,
              version_number,
              allergens,
              total_cost,
              yield_qty,
              yield_unit_id,
              shelf_life_days,
              storage_requirements
            )
          `)
          .eq('id', sopId)
          .eq('company_id', companyId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('SOP not found');

        setSop(data);
        
        // Debug: Log linked recipe info
        console.log('📋 SOP loaded:', {
          sopId: data.id,
          linked_recipe_id: data.linked_recipe_id,
          hasLinkedRecipe: !!data.linked_recipe_id,
          linkedRecipeData: data.linked_recipe,
          linkedRecipeId: data.linked_recipe?.id,
          allKeys: Object.keys(data).filter(k => k.includes('recipe') || k.includes('Recipe'))
        });
        
        // Process SOP data and build print data
        const printSopData = await processSOPData(data, 1);

        // Reset multiplier when SOP loads (before setting printData)
        setMultiplier(1);
        setMultiplierInput('1');
        
        setPrintData(printSopData);
        console.log('📊 Print data prepared:', {
          ingredientsCount: printSopData?.ingredients?.length || 0,
          ingredients: printSopData?.ingredients?.map((i: any) => i.ingredient_name),
          recipe: printSopData?.recipe?.name
        });
      } catch (error: any) {
        console.error('Error loading SOP:', error);
        showToast({
          title: 'Error loading SOP',
          description: error.message || 'Failed to load SOP',
          type: 'error'
        });
        router.push('/dashboard/sops/list');
      } finally {
        setLoading(false);
      }
    };

    loadSOP();
  }, [sopId, companyId, router, showToast]);

  // Helper function to reload SOP data
  const reloadSOP = React.useCallback(async () => {
    if (!sopId || !companyId) return;
    
    try {
      const { data, error } = await supabase
        .from('sop_entries')
        .select(`
          *,
          linked_recipe:recipes!linked_recipe_id(
            id,
            name,
            code,
            version_number,
            allergens,
            total_cost,
            yield_qty,
            yield_unit_id,
            shelf_life_days,
            storage_requirements
          )
        `)
        .eq('id', sopId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      if (!data) return;

      // Debug: Log linked recipe info after reload
      console.log('🔄 SOP reloaded:', {
        sopId: data.id,
        linked_recipe_id: data.linked_recipe_id,
        hasLinkedRecipe: !!data.linked_recipe_id,
        linkedRecipeId: data.linked_recipe?.id,
        allRecipeFields: Object.keys(data).filter(k => k.includes('recipe') || k.includes('Recipe'))
      });

      setSop(data);
      
      // Process SOP data and build print data, preserving current multiplier
      const currentMultiplier = printData?.multiplier || multiplier || 1;
      const printSopData = await processSOPData(data, currentMultiplier);

      setPrintData(printSopData);
      console.log('✅ SOP reloaded. Ingredients:', printSopData?.ingredients?.length || 0);
      console.log('✅ Print data:', printSopData);
    } catch (error: any) {
      console.error('❌ Error reloading SOP:', error);
    }
  }, [sopId, companyId, multiplier, printData]);

  // Manual sync function - can be called from UI
  const handleManualSync = React.useCallback(async () => {
    // Try multiple ways to get the recipe ID
    let recipeId = sop?.linked_recipe_id || sop?.linked_recipe?.id;
    
    // If no recipe ID, try to find it by recipe code
    if (!recipeId) {
      const recipeCode = printData?.recipe?.code || sop?.ref_code || sop?.linked_recipe?.code;
      console.log('🔍 No direct recipe ID, searching by code:', recipeCode);
      
      if (recipeCode) {
        try {
          // Debug: Check what recipes exist with similar codes
          console.log('🔍 Searching for recipe with code:', recipeCode);
          
          // Try exact match first
          let { data: recipeData, error: recipeError } = await supabase
            .from('recipes')
            .select('id, code, name, is_active, is_archived')
            .eq('code', recipeCode.trim())
            .eq('company_id', companyId)
            .maybeSingle();
          
          console.log('📊 Exact match result:', { recipeData, recipeError });
          
          // If exact match fails, try case-insensitive
          if (recipeError || !recipeData) {
            console.log('⚠️ Exact match failed, trying case-insensitive search...', recipeError);
            const { data: recipeData2, error: recipeError2 } = await supabase
              .from('recipes')
              .select('id, code, name, is_active, is_archived')
              .eq('company_id', companyId)
              .ilike('code', recipeCode.trim())
              .maybeSingle();
            
            console.log('📊 Case-insensitive result:', { recipeData2, recipeError2 });
            
            if (!recipeError2 && recipeData2) {
              recipeData = recipeData2;
              recipeError = null;
            }
          }
          
          // Debug: Check if there are any recipes with similar codes
          if (!recipeData) {
            const recipeName = printData?.recipe?.name || sop?.title;
            const { data: similarRecipes } = await supabase
              .from('recipes')
              .select('id, code, name, is_active, is_archived')
              .eq('company_id', companyId)
              .like('code', `REC-CAS-%`)
              .limit(20);
            
            console.log('📋 Similar recipes found:', similarRecipes);
            
            // If we found similar recipes, try to match by name
            if (similarRecipes && similarRecipes.length > 0 && recipeName) {
              const matchedByName = similarRecipes.filter(r => 
                r.name && r.name.toLowerCase().trim() === recipeName.toLowerCase().trim()
              );
              
              console.log('📋 Recipes matching name "' + recipeName + '":', matchedByName);
              
              if (matchedByName.length > 0) {
                // If multiple recipes match by name, prefer one that has ingredients
                // Check which recipes have ingredients
                let bestMatch = matchedByName[0]; // Default to first match
                let bestIngredientCount = 0;
                
                for (const recipe of matchedByName) {
                  try {
                    const { data: ingredients, count } = await supabase
                      .from('recipe_ingredients')
                      .select('id', { count: 'exact', head: false })
                      .eq('recipe_id', recipe.id);
                    
                    const ingredientCount = count || 0;
                    console.log(`📊 Recipe ${recipe.code} has ${ingredientCount} ingredients`);
                    
                    // Prefer recipe with most ingredients
                    if (ingredientCount > bestIngredientCount) {
                      bestMatch = recipe;
                      bestIngredientCount = ingredientCount;
                    }
                  } catch (err) {
                    console.warn(`⚠️ Could not check ingredients for recipe ${recipe.code}:`, err);
                  }
                }
                
                if (bestIngredientCount > 0) {
                  console.log(`✅ Selected recipe ${bestMatch.code} (has ${bestIngredientCount} ingredients)`);
                } else {
                  console.log(`⚠️ Selected recipe ${bestMatch.code} (no ingredients found, but name matches)`);
                }
                
                recipeData = bestMatch;
                recipeError = null;
              }
              
              // If still no match, log all available recipes for user reference
              if (!recipeData) {
                console.log('💡 Available recipes with similar codes:', 
                  similarRecipes.map(r => ({ code: r.code, name: r.name, id: r.id }))
                );
              }
            }
          }
          
          // Also try finding by name if code doesn't work
          if (recipeError || !recipeData) {
            const recipeName = printData?.recipe?.name || sop?.title;
            if (recipeName) {
              console.log('🔍 Trying to find recipe by name:', recipeName);
              const { data: recipeData3, error: recipeError3 } = await supabase
                .from('recipes')
                .select('id, code, name, is_active, is_archived')
                .eq('company_id', companyId)
                .ilike('name', recipeName.trim())
                .maybeSingle();
              
              console.log('📊 Name search result:', { recipeData3, recipeError3 });
              
              if (!recipeError3 && recipeData3) {
                recipeData = recipeData3;
                recipeError = null;
                console.log('✅ Found recipe by name instead of code');
              }
            }
          }
          
          if (recipeError) {
            console.error('❌ Recipe lookup error:', recipeError);
            throw new Error(`Recipe lookup failed: ${recipeError.message}`);
          }
          
          if (recipeData && recipeData.id) {
            // Check if recipe is archived or inactive
            if (recipeData.is_archived) {
              console.warn('⚠️ Recipe is archived:', recipeData);
            }
            if (recipeData.is_active === false) {
              console.warn('⚠️ Recipe is inactive:', recipeData);
            }
            
            recipeId = recipeData.id;
            console.log('✅ Found recipe:', { 
              code: recipeData.code, 
              name: recipeData.name,
              id: recipeId,
              is_active: recipeData.is_active,
              is_archived: recipeData.is_archived,
              searchedBy: recipeCode 
            });
            
            // Link the SOP to this recipe for future syncs
            const { error: linkError } = await supabase
              .from('sop_entries')
              .update({ linked_recipe_id: recipeId })
              .eq('id', sopId);
            
            if (linkError) {
              console.error('❌ Failed to link SOP to recipe:', linkError);
              // Don't fail the sync if linking fails - we can still sync
            } else {
              console.log('✅ Linked SOP to recipe');
              // Update local state so button becomes enabled
              setSop((prev: any) => ({ ...prev, linked_recipe_id: recipeId }));
            }
          } else {
            console.warn('⚠️ Recipe lookup returned no data for code:', recipeCode);
          }
        } catch (err: any) {
          console.error('❌ Error finding recipe by code:', err);
          throw new Error(`Could not find recipe: ${err.message || 'Unknown error'}`);
        }
      }
    }
    
    if (!recipeId) {
      const recipeCode = printData?.recipe?.code || sop?.ref_code || sop?.linked_recipe?.code;
      const recipeName = printData?.recipe?.name || sop?.title;
      
      // Get list of available recipes to show in error
      let availableRecipes: any[] = [];
      try {
        const { data: allRecipes } = await supabase
          .from('recipes')
          .select('id, code, name')
          .eq('company_id', companyId)
          .limit(10);
        availableRecipes = allRecipes || [];
      } catch (e) {
        console.warn('Could not fetch available recipes:', e);
      }
      
      console.error('❌ No recipe ID found after all attempts:', { 
        linked_recipe_id: sop?.linked_recipe_id,
        linked_recipe: sop?.linked_recipe,
        printDataRecipe: printData?.recipe,
        recipeCode,
        recipeName,
        companyId,
        availableRecipes: availableRecipes.map(r => ({ code: r.code, name: r.name }))
      });
      
      const availableCodes = availableRecipes.map(r => r.code).filter(Boolean).join(', ');
      const errorMsg = availableCodes 
        ? `Recipe "${recipeCode}" not found. Available recipes: ${availableCodes.substring(0, 100)}${availableCodes.length > 100 ? '...' : ''}. Please link the SOP to the correct recipe code.`
        : `Could not find recipe with code "${recipeCode}" or name "${recipeName}". Please ensure the recipe exists in the recipes library.`;
      
      showToast({
        title: 'Recipe not found',
        description: errorMsg,
        type: 'error',
        duration: 8000
      });
      return;
    }

    setSyncing(true);
    try {
      console.log('🔄 Manual sync: Syncing recipe to SOP...', { 
        recipeId: recipeId, 
        sopId,
        source: sop?.linked_recipe_id ? 'linked_recipe_id' : 'linked_recipe.id'
      });
      
      const { updateFoodSOPFromRecipe } = await import('@/lib/utils/sopUpdater');
      await updateFoodSOPFromRecipe(recipeId, sopId);
      
      console.log('✅ Manual sync: Recipe synced successfully');
      
      // Reload SOP after sync (this will also update linked_recipe_id if we just linked it)
      await new Promise(resolve => setTimeout(resolve, 500));
      await reloadSOP();
      
      showToast({
        title: 'Recipe synced',
        description: 'SOP has been updated with latest recipe ingredients',
        type: 'success'
      });
    } catch (error: any) {
      console.error('❌ Manual sync error:', error);
      showToast({
        title: 'Sync failed',
        description: error.message || 'Failed to sync recipe to SOP',
        type: 'error'
      });
    } finally {
      setSyncing(false);
    }
  }, [sop, sopId, companyId, printData, reloadSOP, showToast]);

  // Real-time subscription for SOP updates and linked recipe changes
  useEffect(() => {
    if (!sopId || !companyId || !sop) return;

    const linkedRecipeId = sop.linked_recipe_id;
    const channels: any[] = [];

    // Helper function to sync recipe to SOP and then reload (for real-time)
    const syncRecipeToSOP = async () => {
      const recipeId = linkedRecipeId || sop?.linked_recipe?.id;
      
      if (!recipeId) {
        console.log('No linked recipe ID found, skipping auto-sync');
        return;
      }
      
      try {
        console.log('🔄 Auto-sync: Syncing recipe to SOP...', { recipeId, sopId });
        
        const { updateFoodSOPFromRecipe } = await import('@/lib/utils/sopUpdater');
        await updateFoodSOPFromRecipe(recipeId, sopId);
        
        console.log('✅ Auto-sync: Recipe synced successfully');
        
        setTimeout(async () => {
          await reloadSOP();
          showToast({
            title: 'Recipe synced',
            description: 'SOP has been updated with latest recipe ingredients',
            type: 'success'
          });
        }, 1000);
      } catch (error: any) {
        console.error('❌ Auto-sync error:', error);
        showToast({
          title: 'Sync failed',
          description: error.message || 'Failed to sync recipe to SOP',
          type: 'error'
        });
      }
    };

    // Subscribe to SOP updates
    const sopChannel = supabase
      .channel(`sop-updates-${sopId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sop_entries',
          filter: `id=eq.${sopId}`,
        },
        (payload) => {
          console.log('SOP updated in real-time:', payload);
          reloadSOP();
        }
      )
      .subscribe();
    channels.push(sopChannel);

    // Get recipe ID from multiple possible sources
    const recipeIdForSync = linkedRecipeId || sop?.linked_recipe?.id;
    
    // Subscribe to linked recipe updates (if recipe is linked)
    if (recipeIdForSync) {
      const recipeChannel = supabase
        .channel(`recipe-updates-${recipeIdForSync}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'recipes',
            filter: `id=eq.${recipeIdForSync}`,
          },
          (payload) => {
            console.log('Linked recipe updated, syncing to SOP:', payload);
            syncRecipeToSOP();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'recipe_ingredients',
            filter: `recipe_id=eq.${recipeIdForSync}`,
          },
          (payload) => {
            console.log('🔔 Recipe ingredients changed, syncing to SOP:', payload);
            console.log('Event type:', payload.eventType, 'Recipe ID:', payload.new?.recipe_id || payload.old?.recipe_id);
            // Sync recipe to SOP when ingredients change
            // Add a small delay to ensure the database transaction is complete
            setTimeout(() => {
              syncRecipeToSOP();
            }, 300);
          }
        )
        .subscribe();
      channels.push(recipeChannel);
    }

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [sopId, companyId, multiplier, printData, sop?.linked_recipe_id, sop?.linked_recipe?.id, showToast, reloadSOP]);
  
  // Recalculate print data when multiplier changes
  useEffect(() => {
    if (!printData || !printData.baseIngredients || !printData.recipe) return;
    
    // Skip if multiplier hasn't changed from what's already in printData
    if (printData.multiplier === multiplier) return;
    
    // Always use original_cost/yield (calculated from ingredients on first load, never changes)
    const baseCost = printData.recipe.original_cost !== undefined && printData.recipe.original_cost !== null
      ? printData.recipe.original_cost 
      : (printData.recipe.total_cost || 0) / (printData.multiplier || 1);
    const baseYield = printData.recipe.original_yield !== undefined && printData.recipe.original_yield !== null
      ? printData.recipe.original_yield
      : (printData.recipe.yield_qty || 0) / (printData.multiplier || 1);
    
    // Rebuild print data with new multiplier using stored base ingredients
    // Recalculate cost from ingredients with new multiplier
    const scaledIngredients = printData.baseIngredients.map((ing: any) => ({
      ...ing,
      quantity: ing.originalQuantity * multiplier,
      lineCost: (ing.lineCost || 0) * multiplier
    }));
    
    // Recalculate total cost from scaled ingredients
    const recalculatedCost = scaledIngredients.reduce((sum: number, ing: any) => sum + (ing.lineCost || 0), 0);
    const scaledCost = recalculatedCost; // Use calculated cost from ingredients
    const scaledYield = baseYield * multiplier;
    
    const scaledRecipe = {
      ...printData.recipe,
      total_cost: scaledCost,
      yield_qty: scaledYield,
      // Preserve original values (never change these)
      original_cost: baseCost,
      original_yield: baseYield
    };
    
    setPrintData((prev: any) => ({
      ...prev,
      recipe: scaledRecipe,
      ingredients: scaledIngredients,
      multiplier: multiplier
    }));
  }, [multiplier, printData]);

  const handlePrint = () => {
    // Open dedicated print page in new window
    window.open(
      `/dashboard/sops/view/${sopId}/print`,
      '_blank',
      'width=210mm,height=297mm' // A4 dimensions
    );
  };

  const getCategoryTemplate = (category: string) => {
    const templates: Record<string, string> = {
      'Food Prep': '/dashboard/sops/food-template',
      'Service (FOH)': '/dashboard/sops/service-template',
      'Drinks': '/dashboard/sops/drinks-template',
      'Hot Beverages': '/dashboard/sops/hot-drinks-template',
      'Cold Beverages': '/dashboard/sops/cold-drinks-template',
      'Cleaning': '/dashboard/sops/cleaning-template',
      'Opening': '/dashboard/sops/opening-template',
      'Closing': '/dashboard/sops/closing-template',
    };
    return templates[category] || '/dashboard/sops/food-template';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[rgb(var(--background-primary))] dark:bg-neutral-900">
 <div className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Loading SOP...</div>
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[rgb(var(--background-primary))] dark:bg-neutral-900">
 <div className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">SOP not found</div>
      </div>
    );
  }

  return (
 <div className="min-h-screen bg-[rgb(var(--background-primary))] print:bg-theme-surface">
      {/* Header - Hidden when printing */}
      <div className="no-print sticky top-0 z-10 bg-[rgb(var(--background-primary))] dark:bg-neutral-900 border-b border-[rgb(var(--border))] dark:border-theme">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              onClick={() => router.push('/dashboard/sops/list')}
 className="flex items-center gap-2 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors self-start"
            >
              <ArrowLeft size={20} />
              <span>Back to SOPs</span>
            </button>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              {/* Recipe Scaling Multiplier */}
              {printData?.recipe && (
                <div className="flex items-center gap-3 px-4 sm:px-5 py-2.5 sm:py-3 bg-[rgb(var(--surface-elevated))] dark:bg-neutral-800 rounded-xl border-2 border-module-fg dark:border-module-fg/70 shadow-lg shadow-module-fg/20 dark:shadow-module-fg/30">
                  <label htmlFor="multiplier" className="text-sm sm:text-base font-semibold text-[rgb(var(--text-primary))] dark:text-white whitespace-nowrap">
                    Portions:
                  </label>
                  <input
                    id="multiplier"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    autoComplete="off"
                    autoCorrect="off"
                    value={multiplierInput}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      // Allow empty string, numbers, and decimal point
                      if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                        setMultiplierInput(inputValue);
                        // Update multiplier if valid number
                        const numValue = parseFloat(inputValue);
                        if (!isNaN(numValue) && numValue > 0) {
                          const clampedValue = Math.max(0.1, Math.min(100, numValue));
                          setMultiplier(clampedValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // Validate and clamp on blur
                      const numValue = parseFloat(e.target.value);
                      if (isNaN(numValue) || numValue <= 0) {
                        setMultiplierInput('1');
                        setMultiplier(1);
                      } else {
                        const clampedValue = Math.max(0.1, Math.min(100, numValue));
                        setMultiplierInput(clampedValue.toString());
                        setMultiplier(clampedValue);
                      }
                    }}
                    className="w-20 sm:w-28 bg-[rgb(var(--background-primary))] dark:bg-neutral-900 border-2 border-module-fg dark:border-module-fg rounded-lg px-3 py-2 text-lg font-bold text-[rgb(var(--text-primary))] dark:text-white focus:border-module-fg dark:focus:border-module-fg focus:outline-none focus:ring-2 focus:ring-module-fg/40 dark:focus:ring-module-fg/40"
                  />
                  <span className="text-sm sm:text-base font-bold text-module-fg dark:text-module-fg">
                    ×{multiplier.toFixed(1)}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                {/* Always show sync button - will try to find recipe by code if not linked */}
                {/* Debug: Show recipe ID status */}
                {process.env.NODE_ENV === 'development' && (
                  <span className="text-xs text-theme-tertiary">
                    Recipe ID: {sop?.linked_recipe_id || sop?.linked_recipe?.id || printData?.recipe?.code || 'none'}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="gap-2"
                  title={printData?.recipe?.code
                    ? `Sync recipe ingredients (will find recipe by code: ${printData.recipe.code})`
                    : "Sync recipe ingredients to SOP"}
                >
                  <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync Recipe'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`${getCategoryTemplate(sop.category)}?edit=${sop.id}`)}
                  className="gap-2"
                >
                  <Edit size={16} />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="gap-2"
                >
                  <Printer size={16} />
                  <span className="hidden sm:inline">Print / PDF</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Use Print Template */}
      <div className="max-w-5xl mx-auto px-2 sm:px-6 py-4 sm:py-8 print:px-0 print:py-4 overflow-x-hidden">
        {printData ? (
          <SOPPrintTemplate 
            sop={printData}
            companyName="Checkly"
          />
        ) : (
 <div className="text-center py-12 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
            <p>No SOP data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
