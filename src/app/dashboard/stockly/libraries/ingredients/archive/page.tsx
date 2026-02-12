"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Archive, Loader2 } from '@/components/ui/icons';
import Link from 'next/link';
import { toast } from 'sonner';

interface ArchivedIngredient {
  id: string;
  ingredient_name: string;
  category: string | null;
  archived_at: string | null;
}

export default function IngredientsArchivePage() {
  const { companyId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<ArchivedIngredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (companyId) {
      loadArchivedIngredients();
    }
  }, [companyId]);

  async function loadArchivedIngredients() {
    if (!companyId) return;
    setLoading(true);
    
    try {
      // Note: This assumes there's an archived_at or is_archived field
      // Adjust based on your actual schema
      const { data, error } = await supabase
        .from('ingredients_library')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', false)
        .order('ingredient_name');

      if (error) throw error;
      setIngredients(data || []);
    } catch (error: any) {
      console.error('Error loading archived ingredients:', error);
      toast.error(error?.message || 'Failed to load archived ingredients');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(id: string) {
    if (!confirm('Restore this ingredient?')) return;
    
    try {
      const { error } = await supabase
        .from('ingredients_library')
        .update({ is_active: true })
        .eq('id', id);
      
      if (error) throw error;
      await loadArchivedIngredients();
      toast.success('Ingredient restored');
    } catch (error: any) {
      console.error('Error restoring ingredient:', error);
      toast.error(error?.message || 'Failed to restore ingredient');
    }
  }

  const filteredIngredients = ingredients.filter(ingredient =>
    ingredient.ingredient_name.toLowerCase().includes(searchQuery.toLowerCase())
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
          href="/dashboard/stockly/libraries/ingredients"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-theme-tertiary hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Archived Ingredients</h1>
          <p className="text-theme-tertiary text-sm mt-1">View and restore archived ingredients</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search archived ingredients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:border-emerald-500"
        />
        <Archive className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-tertiary" />
      </div>

      {/* Ingredient List */}
      {filteredIngredients.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
          <Archive className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-theme-primary mb-2">
            {ingredients.length === 0 ? 'No archived ingredients' : 'No matching ingredients'}
          </h3>
          <p className="text-theme-tertiary">
            {ingredients.length === 0 
              ? 'Archived ingredients will appear here'
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-tertiary">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-tertiary">Category</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-theme-tertiary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIngredients.map((ingredient) => (
                  <tr key={ingredient.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-theme-primary font-medium">{ingredient.ingredient_name}</td>
                    <td className="px-4 py-3 text-theme-tertiary text-sm">{ingredient.category || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRestore(ingredient.id)}
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

