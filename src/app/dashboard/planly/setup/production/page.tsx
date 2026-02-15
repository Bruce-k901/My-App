'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { useBaseDoughs } from '@/hooks/planly/useBaseDoughs';
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
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  Loader2,
  Package,
  Scale,
  Layers,
  Eye,
  Pencil,
} from '@/components/ui/icons';
import { toast } from 'sonner';
import useSWR from 'swr';

// ─── Types ───────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Recipe {
  id: string;
  name: string;
  yield_quantity: number;
  yield_unit: string;
}

interface Product {
  id: string;
  stockly_product_id: string;
  stockly_product?: {
    id: string;
    name?: string;
    ingredient_name?: string;
  };
}

interface WizardLaminationStyle {
  id?: string; // undefined = new, not yet saved
  name: string;
  recipe_id: string | null;
  products_per_sheet: number;
  dough_per_sheet_g: number | null;
  product_ids: string[];
}

interface WizardState {
  // Step 1
  name: string;
  recipe_id: string;
  mix_lead_days: number;
  selected_product_ids: string[];
  // Step 2
  is_laminated: boolean;
  lamination_styles: WizardLaminationStyle[];
  laminate_lead_days: number;
  // For non-laminated
  batch_size_kg: number | null;
  units_per_batch: number | null;
}

const INITIAL_STATE: WizardState = {
  name: '',
  recipe_id: '',
  mix_lead_days: 0,
  selected_product_ids: [],
  is_laminated: true,
  lamination_styles: [],
  laminate_lead_days: 1,
  batch_size_kg: null,
  units_per_batch: null,
};

// ─── Component ───────────────────────────────────────────────

export default function ProductionSetupWizardPage() {
  const router = useRouter();
  const { siteId, profile } = useAppContext();
  const companyId = profile?.company_id;

  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [saving, setSaving] = useState(false);
  const [editingStyleIndex, setEditingStyleIndex] = useState<number | null>(null);
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [styleForm, setStyleForm] = useState<WizardLaminationStyle>({
    name: '',
    recipe_id: null,
    products_per_sheet: 24,
    dough_per_sheet_g: null,
    product_ids: [],
  });

  // Fetch data
  const { baseDoughs, createBaseDough, refresh: refreshBaseDoughs } = useBaseDoughs(siteId);
  const { createLaminationStyle } = useLaminationStyles();

  const { data: recipesData } = useSWR<Recipe[]>(
    companyId ? `/api/planly/base-prep-recipes?companyId=${companyId}` : null,
    fetcher
  );
  const recipes = Array.isArray(recipesData) ? recipesData : [];

  const { data: productsData } = useSWR<Product[]>(
    siteId ? `/api/planly/products?siteId=${siteId}&archived=false` : null,
    fetcher
  );
  const products = Array.isArray(productsData) ? productsData : [];

  // Get product name helper
  const getProductName = (product: Product) =>
    product.stockly_product?.ingredient_name ||
    product.stockly_product?.name ||
    'Unknown Product';

  // Get recipe name helper
  const getRecipeName = (recipeId: string | null) => {
    if (!recipeId) return 'Not selected';
    return recipes.find(r => r.id === recipeId)?.name || 'Unknown Recipe';
  };

  // Unassigned products (not yet assigned to a lamination style)
  const assignedProductIds = useMemo(() => {
    const assigned = new Set<string>();
    for (const style of state.lamination_styles) {
      for (const pid of style.product_ids) {
        assigned.add(pid);
      }
    }
    return assigned;
  }, [state.lamination_styles]);

  const unassignedProducts = useMemo(() => {
    return state.selected_product_ids.filter(pid => !assignedProductIds.has(pid));
  }, [state.selected_product_ids, assignedProductIds]);

  // ─── Step Navigation ───────────────────────────────────────

  const canProceedStep1 = state.name.trim() && state.recipe_id && state.selected_product_ids.length > 0;

  const canProceedStep2 = state.is_laminated
    ? state.lamination_styles.length > 0 && unassignedProducts.length === 0
    : (state.batch_size_kg ?? 0) > 0 && (state.units_per_batch ?? 0) > 0;

  const goNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // ─── Product Selection ─────────────────────────────────────

  const toggleProduct = (productId: string) => {
    setState(prev => {
      const isSelected = prev.selected_product_ids.includes(productId);
      const newSelected = isSelected
        ? prev.selected_product_ids.filter(id => id !== productId)
        : [...prev.selected_product_ids, productId];

      // If removing a product, also remove from lamination styles
      const newStyles = isSelected
        ? prev.lamination_styles.map(style => ({
            ...style,
            product_ids: style.product_ids.filter(id => id !== productId),
          }))
        : prev.lamination_styles;

      return {
        ...prev,
        selected_product_ids: newSelected,
        lamination_styles: newStyles,
      };
    });
  };

  // ─── Lamination Style Management ───────────────────────────

  const openAddStyle = () => {
    setEditingStyleIndex(null);
    setStyleForm({
      name: '',
      recipe_id: null,
      products_per_sheet: 24,
      dough_per_sheet_g: null,
      product_ids: [],
    });
    setStyleDialogOpen(true);
  };

  const openEditStyle = (index: number) => {
    setEditingStyleIndex(index);
    setStyleForm({ ...state.lamination_styles[index] });
    setStyleDialogOpen(true);
  };

  const saveStyle = () => {
    if (!styleForm.name.trim()) {
      toast.error('Style name is required');
      return;
    }
    if (styleForm.products_per_sheet < 1) {
      toast.error('Products per sheet must be at least 1');
      return;
    }

    setState(prev => {
      const newStyles = [...prev.lamination_styles];
      if (editingStyleIndex !== null) {
        newStyles[editingStyleIndex] = styleForm;
      } else {
        newStyles.push(styleForm);
      }
      return { ...prev, lamination_styles: newStyles };
    });

    setStyleDialogOpen(false);
  };

  const deleteStyle = (index: number) => {
    setState(prev => ({
      ...prev,
      lamination_styles: prev.lamination_styles.filter((_, i) => i !== index),
    }));
  };

  const toggleProductInStyle = (productId: string) => {
    setStyleForm(prev => {
      const isSelected = prev.product_ids.includes(productId);
      return {
        ...prev,
        product_ids: isSelected
          ? prev.product_ids.filter(id => id !== productId)
          : [...prev.product_ids, productId],
      };
    });
  };

  // Available products for current style (not assigned to other styles)
  const availableProductsForStyle = useMemo(() => {
    const otherStyleProducts = new Set<string>();
    state.lamination_styles.forEach((style, i) => {
      if (i !== editingStyleIndex) {
        style.product_ids.forEach(pid => otherStyleProducts.add(pid));
      }
    });
    return state.selected_product_ids.filter(pid => !otherStyleProducts.has(pid));
  }, [state.selected_product_ids, state.lamination_styles, editingStyleIndex]);

  // ─── Save Wizard ───────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);

    try {
      // 1. Create the base dough
      const doughResult = await createBaseDough({
        name: state.name.trim(),
        recipe_id: state.recipe_id,
        mix_lead_days: state.mix_lead_days,
        batch_size_kg: state.is_laminated ? null : state.batch_size_kg,
        units_per_batch: state.is_laminated ? null : state.units_per_batch,
      });

      if ('error' in doughResult) {
        toast.error(doughResult.error);
        setSaving(false);
        return;
      }

      const baseDoughId = doughResult.id;

      // 2. If laminated, create lamination styles
      if (state.is_laminated) {
        for (const style of state.lamination_styles) {
          const styleResult = await createLaminationStyle({
            base_dough_id: baseDoughId,
            name: style.name.trim(),
            recipe_id: style.recipe_id,
            products_per_sheet: style.products_per_sheet,
            dough_per_sheet_g: style.dough_per_sheet_g,
            laminate_lead_days: state.laminate_lead_days,
          });

          if ('error' in styleResult) {
            toast.error(`Failed to create style "${style.name}": ${styleResult.error}`);
            // Continue with other styles
            continue;
          }

          // 3. Link products to the lamination style
          if (style.product_ids.length > 0) {
            await fetch('/api/planly/products/bulk-update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product_ids: style.product_ids,
                updates: { lamination_style_id: styleResult.id },
              }),
            });
          }
        }
      } else {
        // 4. For non-laminated, link products directly to base dough
        if (state.selected_product_ids.length > 0) {
          await fetch('/api/planly/products/bulk-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_ids: state.selected_product_ids,
              updates: { base_dough_id: baseDoughId },
            }),
          });
        }
      }

      toast.success('Production setup saved successfully!');
      refreshBaseDoughs();
      router.push('/dashboard/planly/settings/production');
    } catch (error) {
      console.error('Error saving wizard:', error);
      toast.error('Failed to save production setup');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-tertiary">Please select a site</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  s < step
                    ? 'bg-teal-500 text-white'
                    : s === step
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-200 dark:bg-white/10 text-theme-tertiary'
                }`}
              >
                {s < step ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-24 sm:w-32 h-1 mx-2 rounded ${
                    s < step ? 'bg-teal-500' : 'bg-gray-200 dark:bg-white/10'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm text-theme-tertiary">
          <span>Base Dough</span>
          <span>Lamination</span>
          <span>Preview</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-theme-surface rounded-lg border border-theme p-6">
        {/* ─── STEP 1: Base Dough ─────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-theme-primary">
                What's your main dough recipe?
              </h2>
              <p className="text-sm text-theme-tertiary mt-1">
                Select the dough recipe and products that use it.
              </p>
            </div>

            {/* Dough Name */}
            <div className="space-y-2">
              <Label>Dough Name *</Label>
              <Input
                placeholder="e.g., Sweet Pastry Dough"
                value={state.name}
                onChange={e => setState(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Recipe Selection */}
            <div className="space-y-2">
              <Label>Recipe *</Label>
              <StyledSelect
                value={state.recipe_id}
                onChange={e => setState(prev => ({ ...prev, recipe_id: e.target.value }))}
              >
                <StyledOption value="" disabled>
                  Select a recipe...
                </StyledOption>
                {recipes.map(r => (
                  <StyledOption key={r.id} value={r.id}>
                    {r.name} ({r.yield_quantity} {r.yield_unit})
                  </StyledOption>
                ))}
              </StyledSelect>
            </div>

            {/* Mix Lead Days */}
            <div className="space-y-2">
              <Label>How many days ahead do you mix this dough?</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={state.mix_lead_days}
                  onChange={e =>
                    setState(prev => ({ ...prev, mix_lead_days: parseInt(e.target.value) || 0 }))
                  }
                />
                <span className="text-theme-tertiary">days before delivery</span>
              </div>
              <p className="text-xs text-module-fg">
                Dough Mix will appear on the production plan {state.mix_lead_days} day
                {state.mix_lead_days !== 1 ? 's' : ''} ahead
              </p>
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <Label>Which products use this dough? *</Label>
              <div className="border border-theme rounded-lg max-h-64 overflow-y-auto">
                {products.length === 0 ? (
                  <p className="p-4 text-theme-tertiary text-center">
                    No products found. Create products first.
                  </p>
                ) : (
                  products.map(product => {
                    const isSelected = state.selected_product_ids.includes(product.id);
                    return (
                      <label
                        key={product.id}
                        className={`flex items-center gap-3 p-3 border-b border-theme last:border-0 cursor-pointer hover:bg-theme-hover transition-colors ${
                          isSelected ? 'bg-teal-50 dark:bg-module-fg/10' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProduct(product.id)}
                          className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                        />
                        <span className="text-theme-primary">
                          {getProductName(product)}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              {state.selected_product_ids.length > 0 && (
                <p className="text-sm text-module-fg">
                  {state.selected_product_ids.length} product
                  {state.selected_product_ids.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── STEP 2: Lamination ─────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-theme-primary">
                Do you laminate this dough?
              </h2>
              <p className="text-sm text-theme-tertiary mt-1">
                Laminated doughs are sheeted with butter (like croissants).
              </p>
            </div>

            {/* Lamination Toggle */}
            <div className="flex gap-4">
              <label
                className={`flex-1 p-4 border rounded-lg cursor-pointer transition-colors ${
                  state.is_laminated
                    ? 'border-teal-500 bg-teal-50 dark:bg-module-fg/10'
                    : 'border-theme hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  checked={state.is_laminated}
                  onChange={() => setState(prev => ({ ...prev, is_laminated: true }))}
                  className="sr-only"
                />
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-teal-500" />
                  <span className="font-medium text-theme-primary">
                    Yes, I make laminated sheets
                  </span>
                </div>
              </label>
              <label
                className={`flex-1 p-4 border rounded-lg cursor-pointer transition-colors ${
                  !state.is_laminated
                    ? 'border-teal-500 bg-teal-50 dark:bg-module-fg/10'
                    : 'border-theme hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  checked={!state.is_laminated}
                  onChange={() => setState(prev => ({ ...prev, is_laminated: false }))}
                  className="sr-only"
                />
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-theme-tertiary" />
                  <span className="font-medium text-theme-primary">
                    No, straight to shaping
                  </span>
                </div>
              </label>
            </div>

            {/* Laminated: Style Management */}
            {state.is_laminated && (
              <>
                <div className="space-y-2">
                  <Label>What lamination styles do you use?</Label>
                  <p className="text-xs text-theme-tertiary">
                    Different styles can have different recipes and product yields.
                  </p>
                </div>

                {/* Existing Styles */}
                <div className="space-y-2">
                  {state.lamination_styles.map((style, index) => (
                    <div
                      key={index}
                      className="p-4 border border-theme rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-theme-primary">
                            {style.name}
                          </h4>
                          <p className="text-sm text-theme-tertiary">
                            Recipe: {getRecipeName(style.recipe_id)} |{' '}
                            {style.products_per_sheet} products/sheet
                            {style.dough_per_sheet_g ? ` | ${style.dough_per_sheet_g}g dough/sheet` : ''}
                          </p>
                          <p className="text-xs text-module-fg mt-1">
                            {style.product_ids.length} product
                            {style.product_ids.length !== 1 ? 's' : ''} assigned
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditStyle(index)}
                            className="p-2 text-theme-tertiary hover:text-theme-secondary"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteStyle(index)}
                            className="p-2 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Style Button */}
                <Button variant="outline" onClick={openAddStyle} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lamination Style
                </Button>

                {/* Unassigned Products Warning */}
                {unassignedProducts.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      {unassignedProducts.length} product
                      {unassignedProducts.length !== 1 ? 's' : ''} not yet assigned to a style:
                    </p>
                    <ul className="mt-1 text-xs text-amber-600 dark:text-amber-400/80">
                      {unassignedProducts.slice(0, 5).map(pid => {
                        const product = products.find(p => p.id === pid);
                        return <li key={pid}>• {product ? getProductName(product) : pid}</li>;
                      })}
                      {unassignedProducts.length > 5 && (
                        <li>• ...and {unassignedProducts.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Lamination Lead Days */}
                <div className="space-y-2">
                  <Label>When do you laminate?</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      className="w-20"
                      value={state.laminate_lead_days}
                      onChange={e =>
                        setState(prev => ({
                          ...prev,
                          laminate_lead_days: parseInt(e.target.value) || 1,
                        }))
                      }
                    />
                    <span className="text-theme-tertiary">day(s) before delivery</span>
                  </div>
                </div>
              </>
            )}

            {/* Non-Laminated: Batch Settings */}
            {!state.is_laminated && (
              <div className="space-y-4">
                <Label>Batch settings</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Batch Size (kg)</Label>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      placeholder="e.g., 3.0"
                      value={state.batch_size_kg || ''}
                      onChange={e =>
                        setState(prev => ({
                          ...prev,
                          batch_size_kg: parseFloat(e.target.value) || null,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Products per Batch</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g., 6"
                      value={state.units_per_batch || ''}
                      onChange={e =>
                        setState(prev => ({
                          ...prev,
                          units_per_batch: parseInt(e.target.value) || null,
                        }))
                      }
                    />
                  </div>
                </div>
                {state.batch_size_kg && state.units_per_batch && (
                  <p className="text-sm text-module-fg">
                    Each batch: {state.batch_size_kg}kg = {state.units_per_batch} products
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 3: Preview ────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-theme-primary">
                Preview Your Setup
              </h2>
              <p className="text-sm text-theme-tertiary mt-1">
                Here's what your production plan will look like.
              </p>
            </div>

            {/* Preview Card */}
            <div className="border border-theme rounded-lg overflow-hidden">
              <div className="bg-theme-button px-4 py-3 border-b border-theme">
                <p className="text-sm text-theme-secondary">
                  Example: Working for delivery in {state.mix_lead_days + 1} days
                </p>
              </div>

              <div className="p-4 space-y-4">
                {/* Dough Mix */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-module-fg/10 flex items-center justify-center shrink-0">
                    <Scale className="h-4 w-4 text-module-fg" />
                  </div>
                  <div>
                    <h4 className="font-medium text-theme-primary">
                      DOUGH MIX {state.mix_lead_days > 0 && `(Day -${state.mix_lead_days})`}
                    </h4>
                    <p className="text-sm text-theme-secondary">
                      {state.name}: {getRecipeName(state.recipe_id)}
                    </p>
                    <p className="text-xs text-theme-tertiary">
                      Ingredients scaled based on orders
                    </p>
                  </div>
                </div>

                {/* Lamination Sheets */}
                {state.is_laminated && state.lamination_styles.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
                      <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-theme-primary">
                        DOUGH SHEETS {state.laminate_lead_days > 0 && `(Day -${state.laminate_lead_days})`}
                      </h4>
                      {state.lamination_styles.map((style, i) => (
                        <p key={i} className="text-sm text-theme-secondary">
                          {style.name}: {style.product_ids.length} products ({style.products_per_sheet}/sheet)
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Non-Laminated Batch */}
                {!state.is_laminated && state.batch_size_kg && state.units_per_batch && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-theme-primary">
                        BATCH PRODUCTION
                      </h4>
                      <p className="text-sm text-theme-secondary">
                        {state.batch_size_kg}kg per batch = {state.units_per_batch} products
                      </p>
                      <p className="text-xs text-theme-tertiary">
                        Batches calculated from orders
                      </p>
                    </div>
                  </div>
                )}

                {/* Products */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-theme-primary">PRODUCTS</h4>
                    <p className="text-sm text-theme-secondary">
                      {state.selected_product_ids.length} products linked to this dough
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-teal-50 dark:bg-module-fg/10 rounded-lg border border-teal-200 dark:border-module-fg/30">
              <p className="text-sm text-teal-700 dark:text-module-fg">
                <Check className="inline h-4 w-4 mr-1" />
                Setup looks good! You can edit this anytime in Production Settings.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-theme">
          <Button variant="outline" onClick={goBack} disabled={step === 1}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {step < 3 ? (
            <Button
              onClick={goNext}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save & Finish
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Lamination Style Dialog */}
      <Dialog open={styleDialogOpen} onOpenChange={setStyleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStyleIndex !== null ? 'Edit Lamination Style' : 'Add Lamination Style'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Style Name */}
            <div className="space-y-2">
              <Label>Style Name *</Label>
              <Input
                placeholder="e.g., Buns, Swirls"
                value={styleForm.name}
                onChange={e => setStyleForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Recipe */}
            <div className="space-y-2">
              <Label>Lamination Recipe</Label>
              <StyledSelect
                value={styleForm.recipe_id || ''}
                onChange={e =>
                  setStyleForm(prev => ({ ...prev, recipe_id: e.target.value || null }))
                }
              >
                <StyledOption value="">No recipe (just track sheets)</StyledOption>
                {recipes.map(r => (
                  <StyledOption key={r.id} value={r.id}>
                    {r.name}
                  </StyledOption>
                ))}
              </StyledSelect>
              <p className="text-xs text-theme-tertiary">
                The recipe for this lamination style (includes butter amounts)
              </p>
            </div>

            {/* Products Per Sheet & Dough Per Sheet */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Products Per Sheet *</Label>
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

            {/* Product Assignment */}
            <div className="space-y-2">
              <Label>Assign Products</Label>
              <div className="border border-theme rounded-lg max-h-48 overflow-y-auto">
                {availableProductsForStyle.length === 0 ? (
                  <p className="p-3 text-theme-tertiary text-center text-sm">
                    All products are assigned to other styles
                  </p>
                ) : (
                  availableProductsForStyle.map(pid => {
                    const product = products.find(p => p.id === pid);
                    if (!product) return null;
                    const isSelected = styleForm.product_ids.includes(pid);
                    return (
                      <label
                        key={pid}
                        className={`flex items-center gap-3 p-2 border-b border-theme last:border-0 cursor-pointer hover:bg-theme-hover ${
                          isSelected ? 'bg-teal-50 dark:bg-module-fg/10' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProductInStyle(pid)}
                          className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                        />
                        <span className="text-sm text-theme-primary">
                          {getProductName(product)}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStyleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveStyle}>
              {editingStyleIndex !== null ? 'Update Style' : 'Add Style'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
