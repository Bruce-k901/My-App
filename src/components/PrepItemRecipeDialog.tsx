'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Loader2, CheckCircle, AlertTriangle, Plus, Link } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { generateRecipeId } from '@/lib/utils/recipeIdGenerator';
import { toast } from 'sonner';

interface PrepItemRecipeDialogProps {
  open: boolean;
  onClose: () => void;
  ingredientId: string;
  ingredientName: string;
  ingredientData?: any; // Full ingredient data for saving temp ingredients
  companyId: string;
  userId: string;
  onRecipeCreated?: (recipeId: string) => void;
  onIngredientSaved?: (savedIngredient: any) => void; // Callback when ingredient is saved
}

export function PrepItemRecipeDialog({
  open,
  onClose,
  ingredientId,
  ingredientName,
  ingredientData,
  companyId,
  userId,
  onRecipeCreated,
  onIngredientSaved,
}: PrepItemRecipeDialogProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [existingRecipe, setExistingRecipe] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing recipe when dialog opens
  useEffect(() => {
    if (open) {
      checkForExistingRecipe();
    } else {
      // Reset state when dialog closes
      setIsChecking(true);
      setExistingRecipe(null);
      setError(null);
    }
  }, [open, ingredientId]);

  const checkForExistingRecipe = async () => {
    setIsChecking(true);
    setError(null);

    try {
      // If this is a temp/unsaved ingredient or undefined, skip DB checks - no recipe can exist yet
      if (!ingredientId || ingredientId.startsWith('temp-')) {
        setExistingRecipe(null);
        setIsChecking(false);
        return;
      }

      // Check if ingredient already has linked recipe
      const { data: ingredient } = await supabase
        .from('ingredients_library')
        .select('linked_recipe_id')
        .eq('id', ingredientId)
        .single();

      if (ingredient?.linked_recipe_id) {
        // Get recipe details
        const { data: recipe } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', ingredient.linked_recipe_id)
          .single();

        if (recipe) {
          setExistingRecipe(recipe);
          setIsChecking(false);
          return;
        }
      }

      // Check if a recipe exists with this ingredient as output
      const { data: recipe } = await supabase
        .from('recipes')
        .select('*')
        .eq('output_ingredient_id', ingredientId)
        .eq('company_id', companyId)
        .maybeSingle();

      setExistingRecipe(recipe || null);
    } catch (err) {
      console.error('Error checking for recipe:', err);
      setError('Failed to check for existing recipe');
    } finally {
      setIsChecking(false);
    }
  };

  const handleCreateRecipe = async () => {
    setIsCreating(true);
    setError(null);

    try {
      let realIngredientId = ingredientId;

      // If this is a temp/unsaved ingredient, save it first
      if (ingredientId.startsWith('temp-')) {
        if (!ingredientData) {
          throw new Error('Ingredient data required to save new ingredient');
        }

        // Save the ingredient first
        const { data: savedIngredient, error: saveError } = await supabase
          .from('ingredients_library')
          .insert({
            company_id: companyId,
            ingredient_name: ingredientData.ingredient_name || ingredientName,
            supplier: ingredientData.supplier || null,
            pack_cost: ingredientData.pack_cost || null,
            pack_size: ingredientData.pack_size || null,
            unit: ingredientData.unit || null,
            base_unit_id: ingredientData.base_unit_id || null,
            yield_percent: ingredientData.yield_percent || 100,
            is_prep_item: true,
            category: ingredientData.category || null,
            allergens: ingredientData.allergens || null,
            storage_area_id: ingredientData.storage_area_id || null,
          })
          .select()
          .single();

        if (saveError || !savedIngredient) {
          throw new Error(`Failed to save ingredient: ${saveError?.message || 'Unknown error'}`);
        }

        realIngredientId = savedIngredient.id;

        // Notify parent that ingredient was saved (so they can update their state)
        if (onIngredientSaved) {
          onIngredientSaved(savedIngredient);
        }
      }

      // Now get ingredient details using the real ID
      const { data: ingredient } = await supabase
        .from('ingredients_library')
        .select('ingredient_name, base_unit_id')
        .eq('id', realIngredientId)
        .single();

      if (!ingredient) {
        throw new Error('Ingredient not found');
      }

      // Generate recipe code
      const recipeCode = await generateRecipeId(ingredient.ingredient_name, companyId);

      // Create recipe placeholder
      const { data: recipe, error: createError } = await supabase
        .from('recipes')
        .insert({
          company_id: companyId,
          name: ingredient.ingredient_name,
          code: recipeCode,
          recipe_type: 'prep',
          output_ingredient_id: realIngredientId, // Use real ID
          yield_qty: 1,
          yield_unit_id: ingredient.base_unit_id || null,
          total_cost: 0,
          cost_per_portion: 0,
          is_active: false,
          created_by: userId,
        })
        .select()
        .single();

      if (createError) {
        // Check if it's a duplicate code error
        if (createError.code === '23505' && createError.message?.includes('code')) {
          // Try again with incremented number
          const retryCode = await generateRecipeId(ingredient.ingredient_name, companyId);
          const { data: retryRecipe, error: retryError } = await supabase
            .from('recipes')
            .insert({
              company_id: companyId,
              name: ingredient.ingredient_name,
              code: retryCode,
              recipe_type: 'prep',
              output_ingredient_id: realIngredientId,
              yield_qty: 1,
              yield_unit_id: ingredient.base_unit_id || null,
              total_cost: 0,
              cost_per_portion: 0,
              is_active: false,
              created_by: userId,
            })
            .select()
            .single();

          if (retryError) throw retryError;

          // Link recipe back to ingredient
          await supabase
            .from('ingredients_library')
            .update({
              linked_recipe_id: retryRecipe.id,
              is_prep_item: true
            })
            .eq('id', realIngredientId);

          if (onRecipeCreated) {
            onRecipeCreated(retryRecipe.id);
          }

          toast.success('Recipe created successfully!');
          onClose();
          return;
        }
        throw createError;
      }

      // Link recipe back to ingredient
      await supabase
        .from('ingredients_library')
        .update({
          linked_recipe_id: recipe.id,
          is_prep_item: true
        })
        .eq('id', realIngredientId);

      // Callback with recipe ID
      if (onRecipeCreated) {
        onRecipeCreated(recipe.id);
      }

      toast.success('Recipe created successfully!');
      onClose();
    } catch (err: any) {
      console.error('Error creating recipe:', err);
      setError(err.message || 'Failed to create recipe');
      toast.error(`Failed to create recipe: ${err.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleLinkExistingRecipe = async () => {
    if (!existingRecipe) return;

    setIsCreating(true);
    setError(null);

    try {
      // Link recipe to ingredient
      await supabase
        .from('ingredients_library')
        .update({ 
          linked_recipe_id: existingRecipe.id,
          is_prep_item: true 
        })
        .eq('id', ingredientId);

      // Callback with recipe ID
      if (onRecipeCreated) {
        onRecipeCreated(existingRecipe.id);
      }

      toast.success('Recipe linked successfully!');
      onClose();
    } catch (err: any) {
      console.error('Error linking recipe:', err);
      setError(err.message || 'Failed to link recipe');
      toast.error(`Failed to link recipe: ${err.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkip = async () => {
    // User wants to mark as prep item but not create/link recipe yet
    try {
      let realIngredientId = ingredientId;

      // If this is a temp/unsaved ingredient, save it first
      if (ingredientId.startsWith('temp-')) {
        if (!ingredientData) {
          throw new Error('Ingredient data required to save new ingredient');
        }

        // Save the ingredient first
        const { data: savedIngredient, error: saveError } = await supabase
          .from('ingredients_library')
          .insert({
            company_id: companyId,
            ingredient_name: ingredientData.ingredient_name || ingredientName,
            supplier: ingredientData.supplier || null,
            pack_cost: ingredientData.pack_cost || null,
            pack_size: ingredientData.pack_size || null,
            unit: ingredientData.unit || null,
            base_unit_id: ingredientData.base_unit_id || null,
            yield_percent: ingredientData.yield_percent || 100,
            is_prep_item: true,
            category: ingredientData.category || null,
            allergens: ingredientData.allergens || null,
            storage_area_id: ingredientData.storage_area_id || null,
          })
          .select()
          .single();

        if (saveError || !savedIngredient) {
          throw new Error(`Failed to save ingredient: ${saveError?.message || 'Unknown error'}`);
        }

        realIngredientId = savedIngredient.id;

        // Notify parent that ingredient was saved
        if (onIngredientSaved) {
          onIngredientSaved(savedIngredient);
        }

        toast.success('Ingredient saved and marked as prep item');
        onClose();
        return;
      }

      // For existing ingredients, just update the flag
      await supabase
        .from('ingredients_library')
        .update({ is_prep_item: true })
        .eq('id', realIngredientId);

      toast.success('Ingredient marked as prep item');
      onClose();
    } catch (err: any) {
      console.error('Error updating ingredient:', err);
      setError(err.message || 'Failed to update ingredient');
      toast.error(err.message || 'Failed to update ingredient');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0B0D13] border border-white/[0.06] sm:max-w-[500px]">
        {isChecking ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-theme-primary">Checking for recipe...</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          </>
        ) : existingRecipe ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-module-fg/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                </div>
                <DialogTitle className="text-theme-primary">Recipe Found</DialogTitle>
              </div>
              <DialogDescription className="pt-4 text-theme-tertiary">
                A recipe already exists for <strong className="text-theme-primary">{ingredientName}</strong>:
              </DialogDescription>
              
              <div className="mt-4 p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-theme-tertiary">Name:</span>
                    <span className="text-theme-primary font-medium">{existingRecipe.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-tertiary">Code:</span>
                    <span className="text-module-fg font-mono">{existingRecipe.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-tertiary">Status:</span>
                    <span className="capitalize text-theme-primary">{existingRecipe.recipe_status}</span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm text-theme-tertiary">
                Would you like to link this recipe to the ingredient?
              </p>
            </DialogHeader>
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleSkip}
                disabled={isCreating}
              >
                Skip
              </Button>
              <Button 
                onClick={handleLinkExistingRecipe}
                disabled={isCreating}
                className="bg-module-fg hover:bg-module-fg/90 text-white"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Link Recipe
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-module-fg/10 rounded-lg">
                  <Plus className="h-6 w-6 text-emerald-500" />
                </div>
                <DialogTitle className="text-theme-primary">Create Recipe</DialogTitle>
              </div>
              <DialogDescription className="pt-4 text-theme-tertiary">
                No recipe exists for <strong className="text-theme-primary">{ingredientName}</strong> yet.
              </DialogDescription>
              
              <p className="mt-4 text-theme-tertiary">
                Would you like to create a recipe placeholder? You can then:
              </p>
              <ul className="mt-2 space-y-1 text-sm list-disc list-inside text-theme-tertiary">
                <li>Add ingredients to the recipe</li>
                <li>Set yield quantities</li>
                <li>Calculate costs automatically</li>
                <li>Create an SOP when complete</li>
              </ul>
            </DialogHeader>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleSkip}
                disabled={isCreating}
              >
                Skip for Now
              </Button>
              <Button 
                onClick={handleCreateRecipe}
                disabled={isCreating}
                className="bg-module-fg hover:bg-module-fg/90 text-white"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Recipe
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

