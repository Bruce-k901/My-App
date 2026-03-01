'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { useBaseDoughs, BaseDoughWithCount } from '@/hooks/planly/useBaseDoughs';
import { useLaminationStyles } from '@/hooks/planly/useLaminationStyles';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import StyledSelect, { StyledOption } from '@/components/ui/StyledSelect';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  Scale,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from '@/components/ui/icons';
import { toast } from 'sonner';
import useSWR from 'swr';
import { BaseDough, LaminationStyle } from '@/types/planly';

// ─── Types ───────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Recipe {
  id: string;
  name: string;
  yield_quantity: number;
  yield_unit: string;
}

// ─── Component ───────────────────────────────────────────────

export default function ProductionSettingsPage() {
  const router = useRouter();
  const { siteId, profile } = useAppContext();
  const companyId = profile?.company_id;

  const {
    baseDoughs,
    isLoading,
    error,
    updateBaseDough,
    deleteBaseDough,
    refresh,
  } = useBaseDoughs(siteId, { includeStyles: true, includeProducts: true });

  const { createLaminationStyle, updateLaminationStyle, deleteLaminationStyle } =
    useLaminationStyles();

  // Fetch recipes for dropdowns
  const { data: recipesData } = useSWR<Recipe[]>(
    companyId ? `/api/planly/base-prep-recipes?companyId=${companyId}` : null,
    fetcher
  );
  const recipes = Array.isArray(recipesData) ? recipesData : [];

  // State
  const [expandedDoughs, setExpandedDoughs] = useState<Set<string>>(new Set());
  const [editingDough, setEditingDough] = useState<BaseDough | null>(null);
  const [editingStyle, setEditingStyle] = useState<LaminationStyle | null>(null);
  const [parentDoughId, setParentDoughId] = useState<string | null>(null);
  const [deletingDough, setDeletingDough] = useState<BaseDoughWithCount | null>(null);
  const [deletingStyle, setDeletingStyle] = useState<LaminationStyle | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [doughForm, setDoughForm] = useState({
    name: '',
    recipe_id: '',
    mix_lead_days: 0,
    batch_size_kg: null as number | null,
    units_per_batch: null as number | null,
  });

  const [styleForm, setStyleForm] = useState({
    name: '',
    recipe_id: '',
    products_per_sheet: 24,
    dough_per_sheet_g: null as number | null,
    laminate_lead_days: 1,
  });

  // Helpers
  const getRecipeName = (recipeId: string | null | undefined) => {
    if (!recipeId) return 'Not set';
    return recipes.find(r => r.id === recipeId)?.name || 'Unknown';
  };

  const toggleExpanded = (id: string) => {
    setExpandedDoughs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ─── Dough Edit Modal ──────────────────────────────────────

  const openEditDough = (dough: BaseDough) => {
    setEditingDough(dough);
    setDoughForm({
      name: dough.name,
      recipe_id: dough.recipe_id || '',
      mix_lead_days: dough.mix_lead_days,
      batch_size_kg: dough.batch_size_kg ?? null,
      units_per_batch: dough.units_per_batch ?? null,
    });
  };

  const saveDough = async () => {
    if (!editingDough) return;
    if (!doughForm.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    const result = await updateBaseDough(editingDough.id, {
      name: doughForm.name.trim(),
      recipe_id: doughForm.recipe_id || null,
      mix_lead_days: doughForm.mix_lead_days,
      batch_size_kg: doughForm.batch_size_kg,
      units_per_batch: doughForm.units_per_batch,
    });

    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Base dough updated');
      setEditingDough(null);
    }
    setSaving(false);
  };

  const confirmDeleteDough = async () => {
    if (!deletingDough) return;

    const result = await deleteBaseDough(deletingDough.id);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Base dough deleted');
    }
    setDeletingDough(null);
  };

  // ─── Style Edit Modal ──────────────────────────────────────

  const openAddStyle = (baseDoughId: string) => {
    setParentDoughId(baseDoughId);
    setEditingStyle(null);
    setStyleForm({
      name: '',
      recipe_id: '',
      products_per_sheet: 24,
      dough_per_sheet_g: null,
      laminate_lead_days: 1,
    });
  };

  const openEditStyle = (style: LaminationStyle) => {
    setParentDoughId(style.base_dough_id);
    setEditingStyle(style);
    setStyleForm({
      name: style.name,
      recipe_id: style.recipe_id || '',
      products_per_sheet: style.products_per_sheet,
      dough_per_sheet_g: style.dough_per_sheet_g ?? null,
      laminate_lead_days: style.laminate_lead_days,
    });
  };

  const saveStyle = async () => {
    if (!styleForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (styleForm.products_per_sheet < 1) {
      toast.error('Products per sheet must be at least 1');
      return;
    }

    setSaving(true);

    if (editingStyle) {
      const result = await updateLaminationStyle(editingStyle.id, {
        name: styleForm.name.trim(),
        recipe_id: styleForm.recipe_id || null,
        products_per_sheet: styleForm.products_per_sheet,
        dough_per_sheet_g: styleForm.dough_per_sheet_g,
        laminate_lead_days: styleForm.laminate_lead_days,
      });
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Lamination style updated');
        setParentDoughId(null);
        refresh();
      }
    } else if (parentDoughId) {
      const result = await createLaminationStyle({
        base_dough_id: parentDoughId,
        name: styleForm.name.trim(),
        recipe_id: styleForm.recipe_id || null,
        products_per_sheet: styleForm.products_per_sheet,
        dough_per_sheet_g: styleForm.dough_per_sheet_g,
        laminate_lead_days: styleForm.laminate_lead_days,
      });
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Lamination style created');
        setParentDoughId(null);
        refresh();
      }
    }

    setSaving(false);
  };

  const confirmDeleteStyle = async () => {
    if (!deletingStyle) return;

    const result = await deleteLaminationStyle(deletingStyle.id);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Lamination style deleted');
      refresh();
    }
    setDeletingStyle(null);
  };

  // ─── Render ────────────────────────────────────────────────

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-tertiary">Please select a site</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500 dark:text-red-400">Error loading production settings</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Production Setup</h1>
          <p className="text-theme-tertiary text-sm mt-1">
            Manage your base doughs and lamination styles for mix sheet calculations.
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/planly/setup/production')}>
          <Sparkles className="h-4 w-4 mr-2" />
          Setup Wizard
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-theme-tertiary mr-2" />
          <span className="text-theme-tertiary">Loading...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && baseDoughs.length === 0 && (
        <div className="border border-dashed border-theme rounded-lg p-10 text-center space-y-4 bg-theme-button">
          <Scale className="h-12 w-12 mx-auto text-gray-300 dark:text-white/20" />
          <div className="space-y-2">
            <h3 className="font-medium text-theme-primary">No production setup yet</h3>
            <p className="text-theme-tertiary max-w-md mx-auto">
              Use the Setup Wizard to configure your doughs and lamination styles.
              This will enable automatic mix sheet calculations.
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/planly/setup/production')}>
            <Sparkles className="h-4 w-4 mr-2" />
            Start Setup Wizard
          </Button>
        </div>
      )}

      {/* Base Doughs List */}
      {!isLoading && baseDoughs.length > 0 && (
        <div className="space-y-4">
          {baseDoughs.map(dough => {
            const isExpanded = expandedDoughs.has(dough.id);
            const hasLamination = (dough.lamination_styles?.length || 0) > 0;

            return (
              <div
                key={dough.id}
                className="border border-theme rounded-lg overflow-hidden bg-theme-surface"
              >
                {/* Dough Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-module-fg/10 flex items-center justify-center shrink-0">
                        <Scale className="h-5 w-5 text-module-fg" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-theme-primary text-lg">
                          {dough.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-theme-tertiary mt-1">
                          <span>Recipe: {getRecipeName(dough.recipe_id)}</span>
                          <span>Mix: {dough.mix_lead_days} day{dough.mix_lead_days !== 1 ? 's' : ''} ahead</span>
                          {!hasLamination && dough.batch_size_kg && dough.units_per_batch && (
                            <span>Batch: {dough.batch_size_kg}kg = {dough.units_per_batch} products</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-module-fg/10 text-module-fg rounded text-xs">
                            <Package className="h-3 w-3" />
                            {dough.product_count || 0} products
                          </span>
                          {hasLamination && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded text-xs">
                              <Layers className="h-3 w-3" />
                              {dough.lamination_styles?.length} style{dough.lamination_styles?.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditDough(dough)}
                        className="p-2 rounded-lg text-theme-tertiary hover:text-theme-secondary hover:bg-theme-muted transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingDough(dough)}
                        className="p-2 rounded-lg text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {hasLamination && (
                        <button
                          onClick={() => toggleExpanded(dough.id)}
                          className="p-2 rounded-lg text-theme-tertiary hover:text-theme-secondary hover:bg-theme-muted transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lamination Styles (Expanded) */}
                {hasLamination && isExpanded && (
                  <div className="border-t border-theme bg-gray-50 dark:bg-white/[0.02] p-4 space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-theme-secondary">
                        Lamination Styles
                      </h4>
                      <Button variant="ghost" size="sm" onClick={() => openAddStyle(dough.id)}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Style
                      </Button>
                    </div>

                    {dough.lamination_styles?.map(style => (
                      <div
                        key={style.id}
                        className="flex items-center justify-between p-3 bg-theme-surface rounded-lg border border-theme"
                      >
                        <div>
                          <span className="font-medium text-theme-primary">
                            {style.name}
                          </span>
                          <p className="text-xs text-theme-tertiary">
                            {getRecipeName(style.recipe_id)} | {style.products_per_sheet} products/sheet
                            {style.dough_per_sheet_g ? ` | ${style.dough_per_sheet_g}g dough/sheet` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditStyle(style)}
                            className="p-1.5 rounded text-theme-tertiary hover:text-theme-secondary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingStyle(style)}
                            className="p-1.5 rounded text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dough Dialog */}
      <Dialog open={!!editingDough} onOpenChange={() => setEditingDough(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Base Dough</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={doughForm.name}
                onChange={e => setDoughForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Recipe</Label>
              <StyledSelect
                value={doughForm.recipe_id}
                onChange={e => setDoughForm(prev => ({ ...prev, recipe_id: e.target.value }))}
              >
                <StyledOption value="">No recipe</StyledOption>
                {recipes.map(r => (
                  <StyledOption key={r.id} value={r.id}>
                    {r.name}
                  </StyledOption>
                ))}
              </StyledSelect>
              {doughForm.recipe_id && (() => {
                const selectedRecipe = recipes.find(r => r.id === doughForm.recipe_id);
                return selectedRecipe ? (
                  <p className="text-xs text-module-fg">
                    Recipe yields: {selectedRecipe.yield_quantity}{selectedRecipe.yield_unit} per batch
                  </p>
                ) : null;
              })()}
            </div>

            <div className="space-y-2">
              <Label>Mix Lead Days</Label>
              <Input
                type="number"
                min={0}
                value={doughForm.mix_lead_days}
                onChange={e =>
                  setDoughForm(prev => ({ ...prev, mix_lead_days: parseInt(e.target.value) || 0 }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Batch Size (kg)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={doughForm.batch_size_kg ?? ''}
                  onChange={e =>
                    setDoughForm(prev => ({
                      ...prev,
                      batch_size_kg: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Units/Batch</Label>
                <Input
                  type="number"
                  min={1}
                  value={doughForm.units_per_batch ?? ''}
                  onChange={e =>
                    setDoughForm(prev => ({
                      ...prev,
                      units_per_batch: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDough(null)}>
              Cancel
            </Button>
            <Button onClick={saveDough} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Add Style Dialog */}
      <Dialog open={!!parentDoughId} onOpenChange={() => setParentDoughId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStyle ? 'Edit Lamination Style' : 'Add Lamination Style'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="e.g., Buns, Swirls"
                value={styleForm.name}
                onChange={e => setStyleForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Recipe</Label>
              <StyledSelect
                value={styleForm.recipe_id}
                onChange={e => setStyleForm(prev => ({ ...prev, recipe_id: e.target.value }))}
              >
                <StyledOption value="">No recipe</StyledOption>
                {recipes.map(r => (
                  <StyledOption key={r.id} value={r.id}>
                    {r.name}
                  </StyledOption>
                ))}
              </StyledSelect>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Products/Sheet *</Label>
                <Input
                  type="number"
                  min={1}
                  value={styleForm.products_per_sheet}
                  onChange={e =>
                    setStyleForm(prev => ({
                      ...prev,
                      products_per_sheet: parseInt(e.target.value) || 1,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Dough per Sheet (g)</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="e.g., 2000"
                  value={styleForm.dough_per_sheet_g ?? ''}
                  onChange={e =>
                    setStyleForm(prev => ({
                      ...prev,
                      dough_per_sheet_g: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Laminate Lead Days</Label>
              <Input
                type="number"
                min={0}
                value={styleForm.laminate_lead_days}
                onChange={e =>
                  setStyleForm(prev => ({
                    ...prev,
                    laminate_lead_days: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setParentDoughId(null)}>
              Cancel
            </Button>
            <Button onClick={saveStyle} disabled={saving}>
              {saving ? 'Saving...' : editingStyle ? 'Save Changes' : 'Add Style'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dough Confirmation */}
      <ConfirmDialog
        open={!!deletingDough}
        onClose={() => setDeletingDough(null)}
        onConfirm={confirmDeleteDough}
        title={`Delete "${deletingDough?.name}"?`}
        description={
          deletingDough?.product_count && deletingDough.product_count > 0
            ? `This base dough has ${deletingDough.product_count} linked product(s). They will be unlinked.`
            : 'This will permanently delete this base dough and all its lamination styles.'
        }
        confirmText="Delete"
        variant="destructive"
      />

      {/* Delete Style Confirmation */}
      <ConfirmDialog
        open={!!deletingStyle}
        onClose={() => setDeletingStyle(null)}
        onConfirm={confirmDeleteStyle}
        title={`Delete "${deletingStyle?.name}"?`}
        description="This will permanently delete this lamination style. Any linked products will be unlinked."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
