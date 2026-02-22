// @salsa - SALSA Compliance: Production batch create/edit form
'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { ChefHat, Calendar } from '@/components/ui/icons';

interface Recipe {
  id: string;
  name: string;
}

interface ProductionBatchFormProps {
  onCreated: (batch: any) => void;
  defaultRecipeId?: string;
  defaultDate?: string;
  defaultQuantity?: number;
  defaultUnit?: string;
}

export default function ProductionBatchForm({
  onCreated,
  defaultRecipeId,
  defaultDate,
  defaultQuantity,
  defaultUnit,
}: ProductionBatchFormProps) {
  const { companyId, siteId } = useAppContext();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeId, setRecipeId] = useState(defaultRecipeId || '');
  const [productionDate, setProductionDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [plannedQuantity, setPlannedQuantity] = useState(defaultQuantity?.toString() || '');
  const [unit, setUnit] = useState(defaultUnit || '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    async function loadRecipes() {
      if (!companyId) return;
      const { data } = await supabase
        .from('recipes')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');
      setRecipes(data || []);
    }
    loadRecipes();
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !productionDate) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/stockly/production-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          site_id: siteId && siteId !== 'all' ? siteId : null,
          recipe_id: recipeId || null,
          production_date: productionDate,
          planned_quantity: plannedQuantity ? parseFloat(plannedQuantity) : null,
          unit: unit || null,
          notes: notes || null,
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        onCreated(result.data);
      } else {
        setError(result.error || 'Failed to create production batch');
      }
    } catch {
      setError('Failed to create production batch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">
          <span className="flex items-center gap-1.5">
            <ChefHat className="w-4 h-4" />
            Recipe
          </span>
        </label>
        <select
          value={recipeId}
          onChange={(e) => setRecipeId(e.target.value)}
          className="w-full px-3 py-2 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary"
        >
          <option value="">No recipe (manual batch)</option>
          {recipes.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Production Date
          </span>
        </label>
        <input
          type="date"
          value={productionDate}
          onChange={(e) => setProductionDate(e.target.value)}
          required
          className="w-full px-3 py-2 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Planned Quantity</label>
          <input
            type="number"
            step="0.001"
            value={plannedQuantity}
            onChange={(e) => setPlannedQuantity(e.target.value)}
            className="w-full px-3 py-2 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary"
            placeholder="0.000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full px-3 py-2 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary"
          >
            <option value="">Select unit</option>
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="litres">litres</option>
            <option value="ml">ml</option>
            <option value="units">units</option>
            <option value="portions">portions</option>
            <option value="trays">trays</option>
            <option value="boxes">boxes</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary"
          placeholder="Optional production notes..."
        />
      </div>

      <button
        type="submit"
        disabled={saving || !productionDate}
        className="w-full px-4 py-2.5 bg-stockly-dark dark:bg-stockly text-white dark:text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {saving ? 'Creating...' : 'Create Production Batch'}
      </button>
    </form>
  );
}
