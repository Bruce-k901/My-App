"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Archive, RefreshCw, Loader2 } from '@/components/ui/icons';
import Link from 'next/link';
import { toast } from 'sonner';

interface ArchivedRecipe {
  id: string;
  name: string;
  code?: string | null;
  recipe_status: string;
  archived_at: string | null;
  archived_by: string | null;
  version_number: number | null;
}

export default function RecipesArchivePage() {
  const { companyId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<ArchivedRecipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (companyId) {
      loadArchivedRecipes();
    }
  }, [companyId]);

  async function loadArchivedRecipes() {
    if (!companyId) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('company_id', companyId)
        .eq('recipe_status', 'archived')
        .order('archived_at', { ascending: false });

      if (error) throw error;
      setRecipes(data || []);
    } catch (error: any) {
      console.error('Error loading archived recipes:', error);
      toast.error(error?.message || 'Failed to load archived recipes');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(id: string) {
    if (!confirm('Restore this recipe?')) return;
    
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ recipe_status: 'draft', is_active: false })
        .eq('id', id);
      
      if (error) throw error;
      await loadArchivedRecipes();
      toast.success('Recipe restored');
    } catch (error: any) {
      console.error('Error restoring recipe:', error);
      toast.error(error?.message || 'Failed to restore recipe');
    }
  }

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/stockly/recipes"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-theme-tertiary hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Archived Recipes</h1>
          <p className="text-theme-tertiary text-sm mt-1">View and restore archived recipes</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search archived recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:border-emerald-500"
        />
        <Archive className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-tertiary" />
      </div>

      {/* Recipe List */}
      {filteredRecipes.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
          <Archive className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-theme-primary mb-2">
            {recipes.length === 0 ? 'No archived recipes' : 'No matching recipes'}
          </h3>
          <p className="text-theme-tertiary">
            {recipes.length === 0 
              ? 'Archived recipes will appear here'
              : 'Try adjusting your search'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-tertiary">Recipe</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-tertiary">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-tertiary">Version</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-tertiary">Archived</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-theme-tertiary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipes.map((recipe) => (
                  <tr key={recipe.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-theme-primary font-medium">{recipe.name}</td>
                    <td className="px-4 py-3 text-theme-tertiary text-sm">{recipe.code || '-'}</td>
                    <td className="px-4 py-3 text-theme-tertiary text-sm">v{recipe.version_number || '1.0'}</td>
                    <td className="px-4 py-3 text-theme-tertiary text-sm">
                      {recipe.archived_at 
                        ? new Date(recipe.archived_at).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRestore(recipe.id)}
                        className="px-3 py-1.5 bg-module-fg/10 hover:bg-module-fg/10 text-module-fg border border-module-fg/30 rounded-lg transition-colors text-sm"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

