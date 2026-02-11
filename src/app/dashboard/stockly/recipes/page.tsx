"use client";

import { useState, useEffect, Suspense, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { 
  ChefHat,
  Plus,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Layers,
  UtensilsCrossed,
  Beaker,
  PlusCircle,
  Calculator,
  ArrowLeft
} from '@/components/ui/icons';
import { toast } from 'sonner';
import { ExpandableRecipeCard } from '@/components/recipes/ExpandableRecipeCard';

interface Recipe {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  recipe_type?: 'prep' | 'dish' | 'composite' | 'modifier' | 'sub_recipe' | null;
  recipe_status?: 'draft' | 'active' | 'archived' | null;
  menu_category?: string | null;
  yield_qty?: number | null;
  yield_unit_id?: string | null;
  yield_quantity?: number | null;
  yield_unit?: string | null;
  ingredient_cost?: number | null;
  total_cost?: number | null;
  cost_per_portion?: number | null;
  sell_price?: number | null;
  target_gp_percent?: number | null;
  actual_gp_percent?: number | null;
  is_active?: boolean | null;
  last_costed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  version_number?: number | null;
  allergens?: string[] | null;
  shelf_life_days?: number | null;
  storage_requirements?: string | null;
  output_ingredient_id?: string | null;
  linked_sop_id?: string | null;
  ingredient_count?: number;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
}

const recipeTypeConfig = {
  prep: { label: 'Prep', icon: Beaker, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  dish: { label: 'Dish', icon: UtensilsCrossed, color: 'text-green-400', bg: 'bg-green-500/10' },
  composite: { label: 'Composite', icon: Layers, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  modifier: { label: 'Modifier', icon: PlusCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' }
};

function RecipesPage() {
  const { companyId, user } = useAppContext();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [uomList, setUomList] = useState<any[]>([]);
  const processedRecipeId = useRef<string | null>(null); // Track if we've processed a recipe ID

  useEffect(() => {
    if (companyId) {
      loadRecipes();
      loadUOM();
    }
  }, [companyId]);

  // Real-time subscription for ingredient price updates and recipe cost changes
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`recipes-price-updates-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ingredients_library',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('Ingredient price updated, reloading recipes...', payload);
          // Check if price-related fields changed
          const oldData = payload.old as any;
          const newData = payload.new as any;
          
          const priceChanged = 
            oldData.unit_cost !== newData.unit_cost ||
            oldData.pack_cost !== newData.pack_cost ||
            oldData.pack_size !== newData.pack_size ||
            oldData.yield_percent !== newData.yield_percent;
          
          if (priceChanged) {
            console.log('Price change detected, reloading recipes to update costs...');
            loadRecipes();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'stockly',
          table: 'recipes',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('Recipe cost updated in real-time:', payload);
          // Check if cost-related fields changed
          const oldData = payload.old as any;
          const newData = payload.new as any;
          
          const costChanged = 
            oldData.total_cost !== newData.total_cost ||
            oldData.total_ingredient_cost !== newData.total_ingredient_cost ||
            oldData.unit_cost !== newData.unit_cost;
          
          if (costChanged) {
            console.log('Recipe cost change detected, reloading recipes...');
            loadRecipes();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  // Auto-expand recipe if specified in URL query parameter
  useEffect(() => {
    const recipeId = searchParams?.get('recipe');
    if (!recipeId) {
      processedRecipeId.current = null;
      return;
    }
    
    // Skip if we've already processed this recipe ID
    if (processedRecipeId.current === recipeId) return;
    
    // Wait for recipes to load
    if (loading || recipes.length === 0) return;
    
    // Check if recipe exists
    const recipeExists = recipes.find(r => r.id === recipeId);
    if (!recipeExists) {
      console.warn('Recipe not found in loaded recipes:', recipeId, 'Total recipes:', recipes.length);
      return;
    }
    
    // Mark as processed
    processedRecipeId.current = recipeId;
    
    // Clear any active filters to ensure recipe is visible
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilter('all');
    
    // Expand the recipe
    setExpandedRecipes(prev => {
      if (prev.has(recipeId)) return prev; // Already expanded
      console.log('Auto-expanding recipe:', recipeId);
      const next = new Set(prev);
      next.add(recipeId);
      return next;
    });
    
    // Scroll to recipe with retries - wait for expansion to render
    const attemptScroll = (attempt = 0) => {
      const element = document.getElementById(`recipe-${recipeId}`);
      if (element) {
        console.log('Scrolling to recipe element, attempt:', attempt);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (attempt < 10) {
        setTimeout(() => attemptScroll(attempt + 1), 300);
      } else {
        console.warn('Failed to find recipe element after 10 attempts');
      }
    };
    
    // Start scrolling attempts after delays to allow expansion to render
    setTimeout(() => attemptScroll(), 800);
    setTimeout(() => attemptScroll(), 1500);
  }, [searchParams, recipes, loading]);

  async function loadUOM() {
    try {
      const { data, error } = await supabase
        .from('uom')
        .select('id, name, abbreviation, unit_type, base_multiplier')
        .order('sort_order, name');
      if (error) throw error;
      
      // Filter to only show: mg, g, kg, ml, L
      const allowedAbbreviations = ['mg', 'g', 'kg', 'ml', 'L'];
      const filtered = (data || []).filter(uom => 
        allowedAbbreviations.includes(uom.abbreviation?.toLowerCase() || '')
      );
      
      // If mg is missing, add it (milligram = 0.000001 kg)
      if (!filtered.find(u => u.abbreviation?.toLowerCase() === 'mg')) {
        const mgUnit = data?.find(u => u.abbreviation?.toLowerCase() === 'mg');
        if (mgUnit) {
          filtered.push(mgUnit);
        } else {
          // Add mg as fallback if not in database
          filtered.push({
            id: 'mg-fallback',
            name: 'Milligram',
            abbreviation: 'mg',
            unit_type: 'weight',
            base_multiplier: 0.000001
          });
        }
      }
      
      // Sort: mg, g, kg, ml, L
      const sortOrder = ['mg', 'g', 'kg', 'ml', 'L'];
      filtered.sort((a, b) => {
        const aIndex = sortOrder.indexOf(a.abbreviation?.toLowerCase() || '');
        const bIndex = sortOrder.indexOf(b.abbreviation?.toLowerCase() || '');
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
      
      setUomList(filtered);
    } catch (error) {
      console.error('Error loading UOM units:', error);
      // Fallback to only the 5 allowed units
      setUomList([
        { id: 'mg', name: 'Milligram', abbreviation: 'mg', unit_type: 'weight', base_multiplier: 0.000001 },
        { id: 'g', name: 'Gram', abbreviation: 'g', unit_type: 'weight', base_multiplier: 0.001 },
        { id: 'kg', name: 'Kilogram', abbreviation: 'kg', unit_type: 'weight', base_multiplier: 1 },
        { id: 'ml', name: 'Millilitre', abbreviation: 'ml', unit_type: 'volume', base_multiplier: 0.001 },
        { id: 'L', name: 'Litre', abbreviation: 'L', unit_type: 'volume', base_multiplier: 1 },
      ]);
    }
  }

  async function loadRecipes() {
    if (!companyId) return;
    setLoading(true);
    
    try {
      // Try RPC function first (if migration has been run)
      let recipesData: any[] = [];
      let useFallback = false;
      
      try {
        const { data, error } = await supabase.rpc('get_recipes_with_profiles', {
          p_company_id: companyId
        });

        if (error) {
          console.warn('RPC function error, falling back to direct query:', error);
          console.warn('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          useFallback = true;
        } else if (data) {
          recipesData = data;
        }
      } catch (rpcError: any) {
        console.warn('RPC function not available or error, using fallback:', rpcError);
        useFallback = true;
      }

      // Fallback: Direct query if RPC fails or doesn't exist
      if (useFallback || recipesData.length === 0) {
        console.log('Using fallback: Direct query to recipes table');
        const { data: directData, error: directError } = await supabase
          .from('recipes')
          .select('*')
          .eq('company_id', companyId)
          .order('name');

        if (directError) {
          console.error('Direct query error:', directError);
          toast.error(`Failed to load recipes: ${directError.message || 'Unknown error'}`);
          setRecipes([]);
          return;
        }

        // For fallback, we need to manually fetch creator/updater names
        const recipeIds = (directData || []).map((r: any) => r.id);
        const creatorIds = [...new Set((directData || []).map((r: any) => r.created_by).filter(Boolean))];
        const updaterIds = [...new Set((directData || []).map((r: any) => r.updated_by).filter(Boolean))];
        const allProfileIds = [...new Set([...creatorIds, ...updaterIds])];

        let profileMap: Record<string, { full_name?: string; email?: string }> = {};
        
        if (allProfileIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', allProfileIds);
          
          if (profiles) {
            profileMap = profiles.reduce((acc: any, p: any) => {
              acc[p.id] = { full_name: p.full_name, email: p.email };
              return acc;
            }, {});
          }
        }

        // Map direct query results to match RPC function format
        recipesData = (directData || []).map((recipe: any) => ({
          ...recipe,
          created_by_name: recipe.created_by 
            ? (profileMap[recipe.created_by]?.full_name || profileMap[recipe.created_by]?.email || 'Unknown')
            : 'Unknown',
          updated_by_name: recipe.updated_by
            ? (profileMap[recipe.updated_by]?.full_name || profileMap[recipe.updated_by]?.email || 'Unknown')
            : (recipe.created_by 
                ? (profileMap[recipe.created_by]?.full_name || profileMap[recipe.created_by]?.email || 'Unknown')
                : 'Unknown')
        }));
      }

      // Filter out archived recipes
      const activeRecipes = recipesData.filter((recipe: any) => {
        if (recipe.recipe_status === 'archived') return false;
        if (recipe.is_archived === true) return false;
        return true;
      });

      // Normalize recipe data to match our interface (handle any field name variations)
      const normalizedRecipes = activeRecipes.map((recipe: any) => ({
        ...recipe,
        yield_qty: recipe.yield_qty || recipe.yield_quantity || null,
        yield_unit_id: recipe.yield_unit_id || recipe.yield_unit || null,
        recipe_status: recipe.recipe_status || (recipe.is_active ? 'active' : 'draft'),
        code: recipe.code || null,
        version_number: recipe.version_number || 1.0,
        allergens: recipe.allergens || null,
        shelf_life_days: recipe.shelf_life_days || null,
        storage_requirements: recipe.storage_requirements || null,
        output_ingredient_id: recipe.output_ingredient_id || null,
        linked_sop_id: recipe.linked_sop_id || null,
        ingredient_cost: recipe.ingredient_cost ?? recipe.total_ingredient_cost ?? recipe.total_cost ?? null,
        // created_by_name and updated_by_name are already included from RPC or fallback
      }));
      
      console.log('Recipes loaded:', normalizedRecipes.length);
      if (normalizedRecipes.length > 0) {
        console.log('Sample recipe:', {
          id: normalizedRecipes[0].id,
          name: normalizedRecipes[0].name,
          created_by_name: normalizedRecipes[0].created_by_name,
          updated_by_name: normalizedRecipes[0].updated_by_name
        });
      }
      
      setRecipes(normalizedRecipes);
      
      // Extract unique categories from the data
      const cats = [...new Set(recipesData.map((r: any) => r.menu_category).filter(Boolean))] as string[];
      setCategories(cats.sort());
      
    } catch (err: any) {
      console.error('Exception loading recipes:', err);
      toast.error(`Failed to load recipes: ${err.message || 'Unknown error'}`);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadRecipes();
    setRefreshing(false);
  }

  async function handleRecalculateAll() {
    if (!companyId) return;
    setRecalculating(true);
    
    try {
      const { data, error } = await supabase.rpc('recalculate_all_recipes', {
        p_company_id: companyId
      });
      
      if (error) {
        const errorDetails: any = {
          query: 'recalculate_all_recipes',
          companyId: companyId,
          message: error?.message || 'No message',
          code: error?.code || 'NO_CODE',
          details: error?.details || 'No details',
          hint: error?.hint || 'No hint',
        };
        
        try {
          errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
        } catch (e) {
          errorDetails.fullError = 'Could not serialize error';
        }
        
        console.error('Error recalculating recipes:', errorDetails);
        throw error;
      }
      
      await loadRecipes();
      toast.success(`Recalculated ${data} recipes`);
    } catch (error: any) {
      const errorDetails: any = {
        message: error?.message || 'Unknown error',
        code: error?.code || 'NO_CODE',
        details: error?.details || 'No details',
        hint: error?.hint || 'No hint',
      };
      
      try {
        errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch (e) {
        errorDetails.fullError = 'Could not serialize error';
      }
      
      console.error('Error recalculating recipes:', errorDetails);
      
      const userMessage = error?.message || 'Failed to recalculate recipes';
      toast.error(userMessage);
    } finally {
      setRecalculating(false);
    }
  }

  async function handleDuplicate(recipe: Recipe) {
    if (!companyId) return;
    
    try {
      // Generate recipe code for the duplicate
      const { generateRecipeId } = await import('@/lib/utils/recipeIdGenerator');
      const recipeCode = await generateRecipeId(`${recipe.name} (Copy)`, companyId);
      
      // Create copy of recipe
      const { data: newRecipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          company_id: companyId,
          name: `${recipe.name} (Copy)`,
          code: recipeCode,
          description: recipe.description,
          recipe_type: recipe.recipe_type,
          menu_category: recipe.menu_category,
          yield_quantity: recipe.yield_quantity,
          yield_unit: recipe.yield_unit,
          sell_price: recipe.sell_price,
          target_gp_percent: recipe.target_gp_percent,
          is_active: false
        })
        .select()
        .single();
      
      if (recipeError) throw recipeError;
      
      // Copy ingredients
      const { data: ingredients } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipe.id);
      
      if (ingredients && ingredients.length > 0) {
        const newIngredients = ingredients.map(ing => ({
          recipe_id: newRecipe.id,
          ingredient_id: ing.ingredient_id,
          sub_recipe_id: ing.sub_recipe_id,
          quantity: ing.quantity,
          unit: ing.unit,
          yield_factor: ing.yield_factor,
          preparation_notes: ing.preparation_notes,
          sort_order: ing.sort_order || ing.display_order || 0, // CHANGED: display_order → sort_order (with fallback)
          is_optional: ing.is_optional
        }));
        
        await supabase
          .from('recipe_ingredients')
          .insert(newIngredients);
      }
      
      await loadRecipes();
      setShowMenu(null);
      toast.success('Recipe duplicated successfully');
    } catch (error: any) {
      const errorDetails: any = {
        message: error?.message || 'Unknown error',
        code: error?.code || 'NO_CODE',
        details: error?.details || 'No details',
        hint: error?.hint || 'No hint',
      };
      
      try {
        errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch (e) {
        errorDetails.fullError = 'Could not serialize error';
      }
      
      console.error('Error duplicating recipe:', errorDetails);
      
      const userMessage = error?.message || 'Failed to duplicate recipe';
      toast.error(userMessage);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to archive this recipe?')) return;
    
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ recipe_status: 'archived', is_active: false })
        .eq('id', id);
      
      if (error) throw error;
      await loadRecipes();
      toast.success('Recipe archived');
    } catch (error: any) {
      console.error('Error archiving recipe:', error);
      toast.error(error?.message || 'Failed to archive recipe');
    }
  }

  async function handleSaveRecipe(recipe: Recipe) {
    if (!user?.id || !companyId) return;
    
    try {
      // Generate code if missing
      let recipeCode = recipe.code;
      if (!recipeCode || recipeCode.trim() === '') {
        try {
          const { generateRecipeId } = await import('@/lib/utils/recipeIdGenerator');
          recipeCode = await generateRecipeId(recipe.name, companyId);
        } catch (genError: any) {
          console.warn('Error generating recipe code, continuing without code:', genError);
          recipeCode = null; // Allow saving without code if generation fails
        }
      }
      
      // Build update payload - only include columns that exist
      // Note: recipes view may not support all columns, so we'll be selective
      const updatePayload: any = {
        name: recipe.name,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };
      
      // Include fields only if they have values (but allow 0 for numeric fields)
      if (recipe.description !== null && recipe.description !== undefined && recipe.description !== '') {
        updatePayload.description = recipe.description;
      } else if (recipe.description === '') {
        updatePayload.description = null; // Explicitly set to null to clear the field
      }
      
      // yield_qty can be 0, so check for null/undefined specifically
      if (recipe.yield_qty !== null && recipe.yield_qty !== undefined) {
        updatePayload.yield_qty = recipe.yield_qty;
      } else {
        updatePayload.yield_qty = null; // Explicitly set to null
      }
      
      if (recipe.yield_unit_id !== null && recipe.yield_unit_id !== undefined && recipe.yield_unit_id !== '') {
        updatePayload.yield_unit_id = recipe.yield_unit_id;
      } else {
        updatePayload.yield_unit_id = null; // Explicitly set to null
      }
      
      // shelf_life_days can be 0, so check for null/undefined specifically
      if (recipe.shelf_life_days !== null && recipe.shelf_life_days !== undefined) {
        updatePayload.shelf_life_days = recipe.shelf_life_days;
      } else {
        updatePayload.shelf_life_days = null; // Explicitly set to null
      }
      
      if (recipe.storage_requirements !== null && recipe.storage_requirements !== undefined && recipe.storage_requirements !== '') {
        updatePayload.storage_requirements = recipe.storage_requirements;
      } else if (recipe.storage_requirements === '') {
        updatePayload.storage_requirements = null; // Explicitly set to null to clear the field
      }
      
      // Only include code if we have one (view might not support it yet)
      if (recipeCode) {
        updatePayload.code = recipeCode;
      }
      
      console.log('Saving recipe with payload:', updatePayload);
      
      const { error, data } = await supabase
        .from('recipes')
        .update(updatePayload)
        .eq('id', recipe.id)
        .select();
      
      if (error) {
        console.error('Error saving recipe:', error);
        console.error('Payload that failed:', updatePayload);
        
        // If error is about code column, try again without it
        if (error.code === 'PGRST204' || error.message?.includes('code') || error.message?.includes('column')) {
          console.warn('Code column not available, saving without code');
          delete updatePayload.code;
          const { error: retryError, data: retryData } = await supabase
            .from('recipes')
            .update(updatePayload)
            .eq('id', recipe.id)
            .select();
          if (retryError) {
            console.error('Retry also failed:', retryError);
            throw retryError;
          }
          console.log('Recipe saved successfully (without code):', retryData);
        } else {
          throw error;
        }
      } else {
        console.log('Recipe saved successfully:', data);
      }
      
      // Reload recipes to get fresh data from database
      await loadRecipes();
      setEditingRecipeId(null);
      toast.success('Recipe updated');
      
      // Auto-update linked SOPs (non-blocking)
      try {
        const { updateFoodSOPFromRecipe } = await import('@/lib/utils/sopUpdater');
        
        // Find all SOPs linked to this recipe
        const { data: linkedSOPs, error: sopQueryError } = await supabase
          .from('sop_entries')
          .select('id, title')
          .eq('linked_recipe_id', recipe.id);
        
        if (!sopQueryError && linkedSOPs && linkedSOPs.length > 0) {
          // Update each linked SOP
          const updatePromises = linkedSOPs.map(async (sop) => {
            try {
              await updateFoodSOPFromRecipe(recipe.id, sop.id);
              console.log(`Successfully updated SOP: ${sop.title} (${sop.id})`);
            } catch (sopError: any) {
              console.error(`Failed to update SOP ${sop.id}:`, sopError);
              // Don't throw - just log the error
            }
          });
          
          await Promise.all(updatePromises);
          
          if (linkedSOPs.length === 1) {
            toast.success(`Linked SOP "${linkedSOPs[0].title}" updated`);
          } else if (linkedSOPs.length > 1) {
            toast.success(`${linkedSOPs.length} linked SOPs updated`);
          }
        }
      } catch (sopUpdateError: any) {
        // Log but don't fail the recipe save
        console.error('Error updating linked SOPs:', sopUpdateError);
        // Don't show toast for auto-update failures to avoid cluttering UI
      }
    } catch (error: any) {
      console.error('Error saving recipe:', error);
      toast.error(error?.message || 'Failed to save recipe');
    }
  }

  const toggleExpand = (recipeId: string) => {
    setExpandedRecipes(prev => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || recipe.recipe_type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || recipe.menu_category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getGpColor = (gp: number | null, target: number) => {
    if (gp === null) return 'text-[rgb(var(--text-tertiary))] dark:text-white/40';
    if (gp >= target) return 'text-green-400';
    if (gp >= target - 10) return 'text-yellow-400';
    return 'text-red-400';
  };

  const stats = {
    total: recipes.length,
    prep: recipes.filter(r => r.recipe_type === 'prep').length,
    dish: recipes.filter(r => r.recipe_type === 'dish').length,
    composite: recipes.filter(r => r.recipe_type === 'composite').length,
    belowTarget: recipes.filter(r => r.actual_gp_percent !== null && r.actual_gp_percent < r.target_gp_percent).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-lg bg-theme-button dark:bg-white/5 hover:bg-theme-button-hover dark:hover:bg-white/10 text-[rgb(var(--text-secondary))] dark:text-white/60 hover:text-[rgb(var(--text-primary))] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">Recipes</h1>
            <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm mt-1">Manage prep items, dishes, and menu costing</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-theme-button dark:bg-white/5 hover:bg-theme-button-hover dark:hover:bg-white/10 text-[rgb(var(--text-secondary))] dark:text-white/60 hover:text-[rgb(var(--text-primary))] dark:hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleRecalculateAll}
            disabled={recalculating}
            className="flex items-center gap-2 px-3 py-2 bg-theme-button dark:bg-white/5 hover:bg-theme-button-hover dark:hover:bg-white/10 text-[rgb(var(--text-primary))] dark:text-white/80 rounded-lg transition-colors disabled:opacity-50"
          >
            <Calculator className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            Recost All
          </button>
          {/* Recipes are created automatically when ingredients are marked as prep items */}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ChefHat className="w-4 h-4 text-[rgb(var(--text-tertiary))] dark:text-white/40" />
            <span className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-xs">Total</span>
          </div>
          <p className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{stats.total}</p>
        </div>
        
        <div className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Beaker className="w-4 h-4 text-blue-400" />
            <span className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-xs">Prep Items</span>
          </div>
          <p className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{stats.prep}</p>
        </div>
        
        <div className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <UtensilsCrossed className="w-4 h-4 text-green-400" />
            <span className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-xs">Dishes</span>
          </div>
          <p className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{stats.dish}</p>
        </div>
        
        <div className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-xs">Composites</span>
          </div>
          <p className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{stats.composite}</p>
        </div>
        
        <div className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-xs">Below Target</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{stats.belowTarget}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--text-tertiary))] dark:text-white/40" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-theme-button dark:bg-white/5 border border-theme dark:border-white/10 rounded-lg text-[rgb(var(--text-primary))] dark:text-white placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-white/40 focus:outline-none focus:border-[#D37E91]"
          />
        </div>
        
        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-theme-button dark:bg-white/5 border border-theme dark:border-white/10 rounded-lg text-[rgb(var(--text-primary))] dark:text-white focus:outline-none focus:border-[#D37E91]"
        >
          <option value="all">All Types</option>
          <option value="prep">Prep Items</option>
          <option value="dish">Dishes</option>
          <option value="composite">Composites</option>
          <option value="modifier">Modifiers</option>
        </select>
        
        {/* Category Filter */}
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-theme-button dark:bg-white/5 border border-theme dark:border-white/10 rounded-lg text-[rgb(var(--text-primary))] dark:text-white focus:outline-none focus:border-[#D37E91]"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      {/* Recipe List */}
      {filteredRecipes.length === 0 ? (
        <div className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-12 text-center">
          <ChefHat className="w-16 h-16 text-[rgb(var(--text-tertiary))] dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-2">
            {recipes.length === 0 ? 'No recipes yet' : 'No matching recipes'}
          </h3>
          <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 mb-6">
            {recipes.length === 0 
              ? 'Create your first recipe to start tracking costs and GP'
              : 'Try adjusting your search or filters'
            }
          </p>
          {recipes.length === 0 && (
            <p className="text-[rgb(var(--text-tertiary))] dark:text-white/40 text-sm">
              Recipes are automatically created when you mark ingredients as prep items in the Ingredients Library.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecipes.map((recipe, index) => {
            return (
            <div key={recipe.id} id={`recipe-${recipe.id}`}>
              <ExpandableRecipeCard
                recipe={recipe}
                isExpanded={expandedRecipes.has(recipe.id)}
                isEditing={editingRecipeId === recipe.id}
                onToggleExpand={() => toggleExpand(recipe.id)}
                onEdit={() => setEditingRecipeId(recipe.id)}
                onSave={handleSaveRecipe}
                onCancel={() => setEditingRecipeId(null)}
                onDelete={handleDelete}
                onRecipeUpdate={loadRecipes}
                companyId={companyId || ''}
                uomList={uomList}
                userId={user?.id}
              />
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function RecipesPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[rgb(var(--text-secondary))]">Loading recipes...</div>
      </div>
    }>
      <RecipesPage />
    </Suspense>
  );
}

