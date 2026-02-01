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
import { Loader2, CheckCircle, AlertTriangle, Plus, Link } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { generateRecipeId } from '@/lib/utils/recipeIdGenerator';
import { toast } from 'sonner';

interface PrepItemRecipeDialogProps {
  open: boolean;
  onClose: () => void;
  ingredientId: string;
  ingredientName: string;
  companyId: string;
  userId: string;
  onRecipeCreated?: (recipeId: string) => void;
}

export function PrepItemRecipeDialog({
  open,
  onClose,
  ingredientId,
  ingredientName,
  companyId,
  userId,
  onRecipeCreated,
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
      // Get ingredient details for recipe creation
      const { data: ingredient } = await supabase
        .from('ingredients_library')
        .select('ingredient_name, base_unit_id')
        .eq('id', ingredientId)
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
          output_ingredient_id: ingredientId,
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
              output_ingredient_id: ingredientId,
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
            .eq('id', ingredientId);

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
        .eq('id', ingredientId);

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
      await supabase
        .from('ingredients_library')
        .update({ is_prep_item: true })
        .eq('id', ingredientId);
      
      toast.success('Ingredient marked as prep item');
      onClose();
    } catch (err) {
      console.error('Error updating ingredient:', err);
      setError('Failed to update ingredient');
      toast.error('Failed to update ingredient');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0B0D13] border border-white/[0.06] sm:max-w-[500px]">
        {isChecking ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-white">Checking for recipe...</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          </>
        ) : existingRecipe ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                </div>
                <DialogTitle className="text-white">Recipe Found</DialogTitle>
              </div>
              <DialogDescription className="pt-4 text-white/60">
                A recipe already exists for <strong className="text-white">{ingredientName}</strong>:
              </DialogDescription>
              
              <div className="mt-4 p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/60">Name:</span>
                    <span className="text-white font-medium">{existingRecipe.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Code:</span>
                    <span className="text-emerald-400 font-mono">{existingRecipe.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Status:</span>
                    <span className="capitalize text-white">{existingRecipe.recipe_status}</span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm text-white/60">
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Plus className="h-6 w-6 text-emerald-500" />
                </div>
                <DialogTitle className="text-white">Create Recipe</DialogTitle>
              </div>
              <DialogDescription className="pt-4 text-white/60">
                No recipe exists for <strong className="text-white">{ingredientName}</strong> yet.
              </DialogDescription>
              
              <p className="mt-4 text-white/60">
                Would you like to create a recipe placeholder? You can then:
              </p>
              <ul className="mt-2 space-y-1 text-sm list-disc list-inside text-white/60">
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
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

