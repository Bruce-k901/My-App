"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
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
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  recipe_type: 'prep' | 'dish' | 'composite' | 'modifier';
  menu_category: string | null;
  yield_quantity: number;
  yield_unit: string;
  total_cost: number;
  cost_per_portion: number;
  sell_price: number | null;
  target_gp_percent: number;
  actual_gp_percent: number | null;
  is_active: boolean;
  last_costed_at: string | null;
  created_at: string;
  ingredient_count?: number;
}

const recipeTypeConfig = {
  prep: { label: 'Prep', icon: Beaker, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  dish: { label: 'Dish', icon: UtensilsCrossed, color: 'text-green-400', bg: 'bg-green-500/10' },
  composite: { label: 'Composite', icon: Layers, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  modifier: { label: 'Modifier', icon: PlusCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' }
};

export default function RecipesPage() {
  const { companyId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadRecipes();
    }
  }, [companyId]);

  async function loadRecipes() {
    if (!companyId) return;
    setLoading(true);
    
    try {
      // First get recipes
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_archived', false)
        .order('name');
      
      if (recipesError) {
        // Extract meaningful error details
        const errorDetails: any = {
          query: 'recipes',
          companyId: companyId,
          message: recipesError?.message || 'No message',
          code: recipesError?.code || 'NO_CODE',
          details: recipesError?.details || 'No details',
          hint: recipesError?.hint || 'No hint',
        };
        
        try {
          errorDetails.fullError = JSON.stringify(recipesError, Object.getOwnPropertyNames(recipesError));
        } catch (e) {
          errorDetails.fullError = 'Could not serialize error';
        }
        
        console.error('Error fetching recipes:', errorDetails);
        throw recipesError;
      }
      
      // Then get ingredient counts for each recipe
      const recipesWithCounts = await Promise.all(
        (recipesData || []).map(async (recipe) => {
          const { count, error: countError } = await supabase
            .from('recipe_ingredients')
            .select('*', { count: 'exact', head: true })
            .eq('recipe_id', recipe.id);
          
          if (countError) {
            // Log but don't fail - just use 0 for count
            const errorDetails: any = {
              query: 'recipe_ingredients (count)',
              recipeId: recipe.id,
              message: countError?.message || 'No message',
              code: countError?.code || 'NO_CODE',
            };
            console.warn('Error fetching ingredient count:', errorDetails);
          }
          
          return {
            ...recipe,
            ingredient_count: countError ? 0 : (count || 0)
          };
        })
      );
      
      setRecipes(recipesWithCounts);
      
      // Extract unique categories
      const cats = [...new Set(recipesData?.map(r => r.menu_category).filter(Boolean))] as string[];
      setCategories(cats.sort());
      
    } catch (error: any) {
      // Extract meaningful error information
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
      
      try {
        errorDetails.errorString = String(error);
      } catch (e) {
        errorDetails.errorString = 'Could not convert to string';
      }
      
      console.error('Error loading recipes:', errorDetails);
      
      const userMessage = error?.message || 'Failed to load recipes';
      toast.error(userMessage);
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
      // Create copy of recipe
      const { data: newRecipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          company_id: companyId,
          name: `${recipe.name} (Copy)`,
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
          stock_item_id: ing.stock_item_id,
          sub_recipe_id: ing.sub_recipe_id,
          quantity: ing.quantity,
          unit: ing.unit,
          yield_factor: ing.yield_factor,
          preparation_notes: ing.preparation_notes,
          display_order: ing.display_order,
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
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ is_archived: true })
        .eq('id', id);
      
      if (error) throw error;
      await loadRecipes();
      setShowMenu(null);
      toast.success('Recipe deleted');
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
      
      console.error('Error deleting recipe:', errorDetails);
      
      const userMessage = error?.message || 'Failed to delete recipe';
      toast.error(userMessage);
    }
  }

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
    if (gp === null) return 'text-white/40';
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
        <Loader2 className="w-8 h-8 text-[#EC4899] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/stockly"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Recipes</h1>
            <p className="text-white/60 text-sm mt-1">Manage prep items, dishes, and menu costing</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleRecalculateAll}
            disabled={recalculating}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg transition-colors disabled:opacity-50"
          >
            <Calculator className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            Recost All
          </button>
          <Link
            href="/dashboard/stockly/recipes/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#EC4899] hover:bg-[#EC4899]/90 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Recipe
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ChefHat className="w-4 h-4 text-white/40" />
            <span className="text-white/60 text-xs">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Beaker className="w-4 h-4 text-blue-400" />
            <span className="text-white/60 text-xs">Prep Items</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.prep}</p>
        </div>
        
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <UtensilsCrossed className="w-4 h-4 text-green-400" />
            <span className="text-white/60 text-xs">Dishes</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.dish}</p>
        </div>
        
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-white/60 text-xs">Composites</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.composite}</p>
        </div>
        
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-white/60 text-xs">Below Target</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{stats.belowTarget}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[#EC4899]"
          />
        </div>
        
        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#EC4899]"
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
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#EC4899]"
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
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
          <ChefHat className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {recipes.length === 0 ? 'No recipes yet' : 'No matching recipes'}
          </h3>
          <p className="text-white/60 mb-6">
            {recipes.length === 0 
              ? 'Create your first recipe to start tracking costs and GP'
              : 'Try adjusting your search or filters'
            }
          </p>
          {recipes.length === 0 && (
            <Link
              href="/dashboard/stockly/recipes/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#EC4899] hover:bg-[#EC4899]/90 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Recipe
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Recipe</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Type</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/60">Yield</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/60">Cost</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/60">Price</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/60">GP %</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-white/60">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/60"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipes.map((recipe) => {
                  const TypeIcon = recipeTypeConfig[recipe.recipe_type].icon;
                  
                  return (
                    <tr key={recipe.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/stockly/recipes/${recipe.id}`} className="block">
                          <span className="text-white font-medium hover:text-[#EC4899]">
                            {recipe.name}
                          </span>
                          {recipe.menu_category && (
                            <span className="text-white/40 text-xs ml-2">{recipe.menu_category}</span>
                          )}
                          {recipe.description && (
                            <p className="text-white/50 text-xs truncate max-w-xs">{recipe.description}</p>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${recipeTypeConfig[recipe.recipe_type].bg} ${recipeTypeConfig[recipe.recipe_type].color}`}>
                          <TypeIcon className="w-3 h-3" />
                          {recipeTypeConfig[recipe.recipe_type].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white/70">
                        {recipe.yield_quantity} {recipe.yield_unit}
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        {formatCurrency(recipe.cost_per_portion)}
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        {formatCurrency(recipe.sell_price)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {recipe.actual_gp_percent !== null && recipe.actual_gp_percent < recipe.target_gp_percent ? (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          ) : recipe.actual_gp_percent !== null && recipe.actual_gp_percent >= recipe.target_gp_percent ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : null}
                          <span className={`font-semibold ${getGpColor(recipe.actual_gp_percent, recipe.target_gp_percent)}`}>
                            {recipe.actual_gp_percent !== null ? `${recipe.actual_gp_percent}%` : '-'}
                          </span>
                        </div>
                        <span className="text-white/30 text-xs">Target: {recipe.target_gp_percent}%</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          recipe.is_active 
                            ? 'bg-green-500/10 text-green-400' 
                            : 'bg-white/5 text-white/40'
                        }`}>
                          {recipe.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative">
                          <button
                            onClick={() => setShowMenu(showMenu === recipe.id ? null : recipe.id)}
                            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          
                          {showMenu === recipe.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl z-10">
                              <Link
                                href={`/dashboard/stockly/recipes/${recipe.id}`}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </Link>
                              <button
                                onClick={() => handleDuplicate(recipe)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5 w-full text-left"
                              >
                                <Copy className="w-4 h-4" />
                                Duplicate
                              </button>
                              <button
                                onClick={() => handleDelete(recipe.id)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 w-full text-left"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowMenu(null)}
        />
      )}
    </div>
  );
}
