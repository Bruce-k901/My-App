"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Edit, 
  Save, 
  X, 
  Calculator,
  UtensilsCrossed,
  Beaker,
  Layers,
  PlusCircle,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  CheckCircle,
  FileText,
  Plus,
  Loader2,
  ExternalLink
} from '@/components/ui/icons';
import { RecipeIngredientsTable } from './RecipeIngredientsTable';
import { supabase } from '@/lib/supabase';
// @salsa — Shared allergen utility for label display
import { allergenKeyToLabel } from '@/lib/stockly/allergens';
import { createFoodSOPFromRecipe } from '@/lib/utils/sopCreator';
import { updateFoodSOPFromRecipe } from '@/lib/utils/sopUpdater';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import Link from 'next/link';

interface Recipe {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  recipe_type?: 'prep' | 'dish' | 'composite' | 'modifier' | 'sub_recipe' | null;
  recipe_status?: 'draft' | 'active' | 'archived' | null;
  output_ingredient_id?: string | null;
  yield_qty?: number | null;
  yield_unit_id?: string | null;
  ingredient_cost?: number | null;
  version_number?: number | null;
  allergens?: string[] | null;
  shelf_life_days?: number | null;
  storage_requirements?: string | null;
  is_active?: boolean | null;
  linked_sop_id?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
}

interface ExpandableRecipeCardProps {
  recipe: Recipe;
  isExpanded: boolean;
  isEditing: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onSave: (recipe: Recipe) => Promise<void>;
  onCancel: () => void;
  onDelete?: (id: string) => Promise<void>;
  onRecipeUpdate?: () => void; // Callback to refresh recipe data
  companyId: string;
  uomList?: Array<{ id: string; name: string; abbreviation: string }>; // UOM units for dropdown
  userId?: string; // User ID for SOP creation
}

const recipeTypeConfig = {
  prep: { label: 'Prep', icon: Beaker, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  dish: { label: 'Dish', icon: UtensilsCrossed, color: 'text-green-400', bg: 'bg-green-500/10' },
  composite: { label: 'Composite', icon: Layers, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  modifier: { label: 'Modifier', icon: PlusCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  sub_recipe: { label: 'Sub Recipe', icon: Layers, color: 'text-module-fg', bg: 'bg-module-fg/10' }
};

export function ExpandableRecipeCard({
  recipe,
  isExpanded,
  isEditing,
  onToggleExpand,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onRecipeUpdate,
  companyId,
  uomList = [],
  userId
}: ExpandableRecipeCardProps) {
  const [draft, setDraft] = useState<Partial<Recipe>>(recipe);
  const [saving, setSaving] = useState(false);
  const [showFinaliseDialog, setShowFinaliseDialog] = useState(false);
  const [finalising, setFinalising] = useState(false);
  const [createSOP, setCreateSOP] = useState(true);
  const [calculatedYield, setCalculatedYield] = useState<number | null>(null);
  const [linkedSOPId, setLinkedSOPId] = useState<string | null>(null);
  const [linkedSOPNeedsUpdate, setLinkedSOPNeedsUpdate] = useState(false);
  const [updatingSOP, setUpdatingSOP] = useState(false);
  const [showSopDialog, setShowSopDialog] = useState(false);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Memoize the yield calculation callback to prevent unnecessary re-renders
  const handleYieldCalculated = useCallback((calculatedYield: number) => {
    setCalculatedYield(calculatedYield);
  }, []);

  // Load audit trail when expanded
  useEffect(() => {
    if (isExpanded && recipe.id) {
      loadAuditTrail(5); // Load first 5 events
    }
  }, [isExpanded, recipe.id]);

  const loadAuditTrail = async (limit: number = 5) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase.rpc('get_recipe_complete_audit_trail', {
        p_recipe_id: recipe.id,
        p_limit: limit
      });

      if (error) {
        // Silently handle all audit trail errors - it's not critical functionality
        // Common causes: function doesn't exist, new recipe with no history, 400 errors
        console.warn('Audit trail not available:', error.code, error.message);
        setAuditTrail([]);
        return;
      }

      setAuditTrail(data || []);
    } catch (err: any) {
      // Silently handle exceptions - audit trail is non-critical
      console.warn('Audit trail load failed:', err?.message);
      setAuditTrail([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Check for linked SOP when recipe changes
  useEffect(() => {
    let isMounted = true;
    
    async function checkLinkedSOP() {
      if (!recipe.id) return;
      
      // First check if recipe has linked_sop_id directly
      if (recipe.linked_sop_id) {
        if (isMounted) {
          setLinkedSOPId(recipe.linked_sop_id);
          // Check if SOP needs update
          try {
            const { data } = await supabase
              .from('sop_entries')
              .select('needs_update')
              .eq('id', recipe.linked_sop_id)
              .maybeSingle();
            if (data && isMounted) {
              setLinkedSOPNeedsUpdate(data.needs_update || false);
            }
          } catch (err) {
            // Ignore error, just set to false
            if (isMounted) setLinkedSOPNeedsUpdate(false);
          }
        }
        return;
      }
      
      // Fallback: check sop_entries for linked_recipe_id (if column exists)
      try {
        const { data, error } = await supabase
          .from('sop_entries')
          .select('id, title')
          .eq('linked_recipe_id', recipe.id)
          .limit(1)
          .maybeSingle();
        
        if (!error && data && isMounted) {
          setLinkedSOPId(data.id);
          setLinkedSOPNeedsUpdate(false);
        } else if (isMounted) {
          setLinkedSOPId(null);
          setLinkedSOPNeedsUpdate(false);
        }
      } catch (err) {
        // Column might not exist, ignore error
        if (isMounted) {
          setLinkedSOPId(null);
          setLinkedSOPNeedsUpdate(false);
        }
      }
    }
    
    checkLinkedSOP();
    
    return () => {
      isMounted = false;
    };
  }, [recipe.id, recipe.linked_sop_id]);

  // Update draft when recipe changes or editing state changes - ensure all fields are properly initialized
  useEffect(() => {
    let isMounted = true;
    
    // Create a fresh draft object with all fields properly initialized
    const freshDraft: Partial<Recipe> = {
      id: recipe.id,
      name: recipe.name || '',
      code: recipe.code ?? null,
      description: recipe.description ?? null,
      recipe_type: recipe.recipe_type ?? null,
      recipe_status: recipe.recipe_status ?? null,
      output_ingredient_id: recipe.output_ingredient_id ?? null,
      yield_qty: recipe.yield_qty ?? null,
      yield_unit_id: recipe.yield_unit_id ?? null,
      ingredient_cost: recipe.ingredient_cost ?? null,
      version_number: recipe.version_number ?? null,
      allergens: recipe.allergens ?? null,
      shelf_life_days: recipe.shelf_life_days ?? null,
      storage_requirements: recipe.storage_requirements ?? null,
      is_active: recipe.is_active ?? null,
      created_at: recipe.created_at,
      updated_at: recipe.updated_at,
    };
    
    if (isMounted) {
      setDraft(freshDraft);
      
      // Reset calculated yield when recipe changes or editing ends
      if (!isEditing) {
        setCalculatedYield(null);
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, [recipe.id, recipe.name, recipe.code, recipe.description, recipe.recipe_type, recipe.recipe_status, recipe.output_ingredient_id, recipe.yield_qty, recipe.yield_unit_id, recipe.ingredient_cost, recipe.version_number, recipe.allergens, recipe.shelf_life_days, recipe.storage_requirements, recipe.is_active, recipe.created_at, recipe.updated_at, isEditing]);

  // Auto-update yield_qty when calculated yield changes (from RecipeIngredientsTable)
  useEffect(() => {
    let isMounted = true;
    
    if (calculatedYield !== null && isEditing && isMounted) {
      setDraft(prev => ({ ...prev, yield_qty: calculatedYield }));
    }
    
    return () => {
      isMounted = false;
    };
  }, [calculatedYield, isEditing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft as Recipe);
      // Force reload ingredients after recipe save
      // The RecipeIngredientsTable will remount due to key={recipe.id}, but we want to ensure it loads
      if (onRecipeUpdate) {
        // Small delay to ensure database has updated
        setTimeout(() => {
          onRecipeUpdate();
        }, 100);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSOP = async () => {
    if (!linkedSOPId || !recipe.id) return;
    
    setUpdatingSOP(true);
    try {
      // Dynamic import to avoid loading on initial render
      const { updateFoodSOPFromRecipe } = await import('@/lib/utils/sopUpdater');
      await updateFoodSOPFromRecipe(recipe.id, linkedSOPId);
      toast.success('Linked SOP updated successfully');
      if (onRecipeUpdate) {
        onRecipeUpdate();
      }
    } catch (error: any) {
      console.error('Error updating SOP:', error);
      toast.error(`Failed to update SOP: ${error?.message || 'Unknown error'}`);
    } finally {
      setUpdatingSOP(false);
    }
  };

  const getStatusBadge = () => {
    const status = recipe.recipe_status || 'draft';
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-module-fg/10 text-module-fg border border-module-fg/30">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 line-through">
            <AlertTriangle className="w-3 h-3" />
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-theme-surface-elevated0/10 text-theme-tertiary border border-gray-500/20 italic">
            <Clock className="w-3 h-3" />
            Draft
          </span>
        );
    }
  };

  const TypeIcon = recipe.recipe_type ? recipeTypeConfig[recipe.recipe_type]?.icon || UtensilsCrossed : UtensilsCrossed;
  const typeLabel = recipe.recipe_type ? recipeTypeConfig[recipe.recipe_type]?.label || 'Recipe' : 'Recipe';
  const typeColor = recipe.recipe_type ? recipeTypeConfig[recipe.recipe_type]?.color || 'text-theme-tertiary' : 'text-theme-tertiary';
  const typeBg = recipe.recipe_type ? recipeTypeConfig[recipe.recipe_type]?.bg || 'bg-white/5' : 'bg-white/5';

  return (
    <div className="bg-theme-surface border border-theme rounded-lg overflow-hidden">
      {/* Compact Row View */}
 <div className="flex items-center gap-3 p-4 hover:bg-theme-button transition-colors">
        <button
          onClick={onToggleExpand}
 className="p-1 rounded hover:bg-theme-button text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isEditing ? (
              <input
                type="text"
                value={draft.name || ''}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
 className="flex-1 min-w-[200px] px-3 py-1.5 bg-theme-button border border-theme rounded-md text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Recipe name"
              />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[rgb(var(--text-primary))] dark:text-white font-medium">{recipe.name}</span>
                  {recipe.version_number && recipe.version_number > 1.0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-700/50 text-theme-tertiary border border-neutral-600">
                      v{recipe.version_number.toFixed(1)}
                    </span>
                  )}
                </div>
                {recipe.code && (
                  <span className="text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary text-sm">({recipe.code})</span>
                )}
              </>
            )}
            {getStatusBadge()}
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeBg} ${typeColor}`}>
              <TypeIcon className="w-3 h-3" />
              {typeLabel}
            </span>
            {linkedSOPId && linkedSOPNeedsUpdate && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse">
                ⚠️ SOP needs review
              </span>
            )}
          </div>
          {!isEditing && recipe.description && (
            <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm mt-1 truncate">{recipe.description}</p>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm">
          {/* Removed duplicate cost and yield display - now shown in table footer */}
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-2 rounded-lg bg-module-fg/10 hover:bg-module-fg/10 text-module-fg border border-module-fg/30 transition-colors disabled:opacity-50"
                aria-label="Save"
              >
                <Save className="w-4 h-4" />
              </button>
              {recipe.recipe_status === 'draft' && (
                <>
                  <button
                    onClick={async () => {
                      // Mark recipe as active
                      const { error } = await supabase
                        .from('recipes')
                        .update({ 
                          recipe_status: 'active',
                          is_active: true 
                        })
                        .eq('id', recipe.id);
                      
                      if (error) {
                        toast.error('Failed to update recipe');
                        return;
                      }
                      
                      // Show SOP creation dialog
                      setShowSopDialog(true);
                      if (onRecipeUpdate) {
                        onRecipeUpdate();
                      }
                    }}
                    disabled={finalising || saving}
                    className="px-3 py-1.5 rounded-lg bg-module-fg hover:bg-module-fg/90 text-white transition-colors disabled:opacity-50 text-sm"
                    aria-label="Complete & Save"
                  >
                    Complete & Save
                  </button>
                  <button
                    onClick={() => setShowFinaliseDialog(true)}
                    disabled={finalising || saving}
                    className="p-2 rounded-lg bg-module-fg/10 hover:bg-module-fg/10 text-module-fg border border-module-fg/30 transition-colors disabled:opacity-50"
                    aria-label="Finalise Recipe"
                    title="Finalise Recipe"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </>
              )}
              {/* SOP Management Button */}
              {linkedSOPId ? (
                <button
                  onClick={handleUpdateSOP}
                  disabled={updatingSOP}
                  className="px-3 py-1.5 rounded-lg bg-module-fg/10 hover:bg-module-fg/10 text-module-fg border border-module-fg/30 hover:border-module-fg/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                  aria-label="Update Linked SOP"
                >
                  {updatingSOP ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Update SOP
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setShowSopDialog(true)}
                  className="px-3 py-1.5 rounded-lg bg-module-fg/10 hover:bg-module-fg/10 text-module-fg border border-module-fg/30 hover:border-module-fg/30 transition-colors text-sm flex items-center gap-2"
                  aria-label="Create SOP"
                >
                  <Plus className="w-4 h-4" />
                  Create SOP
                </button>
              )}
              <button
                onClick={onCancel}
 className="p-2 rounded-lg bg-theme-button hover:bg-theme-button-hover text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* View SOP link - visible when SOP exists */}
              {linkedSOPId && (
                <Link
                  href={`/dashboard/sops/view/${linkedSOPId}`}
                  className="px-3 py-1.5 rounded-lg bg-module-fg/10 hover:bg-module-fg/10 text-module-fg border border-module-fg/30 hover:border-module-fg/30 transition-colors text-sm flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View SOP
                </Link>
              )}
              <button
                onClick={onEdit}
 className="p-2 rounded-lg bg-theme-button hover:bg-theme-button-hover text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors"
                aria-label="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
              {onDelete && (
                <button
                  onClick={() => onDelete(recipe.id)}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
                  aria-label="Delete"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* EXPANDED VIEW - New Layout */}
      {isExpanded && (
        <div className="border-t border-theme dark:border-theme bg-theme-surface-elevated dark:bg-[#0B0D13]">
          <div className="p-6 space-y-6">
            
            {/* Editing Form */}
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-1">Recipe Name</label>
                    <input
                      type="text"
                      value={draft.name || ''}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
 className="w-full px-3 py-2 bg-theme-button border border-theme rounded-md text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-1">Recipe Code</label>
                    <input
                      type="text"
                      value={draft.code || ''}
                      onChange={(e) => setDraft({ ...draft, code: e.target.value })}
 className="w-full px-3 py-2 bg-theme-button border border-theme rounded-md text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="REC-XXX-001"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-1">Description</label>
                  <textarea
                    value={draft.description || ''}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    rows={3}
 className="w-full px-3 py-2 bg-theme-button border border-theme rounded-md text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="Recipe description..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-1">Yield Quantity</label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculatedYield !== null && isEditing ? calculatedYield : (draft.yield_qty || '')}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || null;
                        setDraft({ ...draft, yield_qty: value });
                        setCalculatedYield(value);
                      }}
 className="w-full px-3 py-2 bg-theme-button border border-theme rounded-md text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    {calculatedYield !== null && isEditing && (
                      <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mt-1">Auto-calculated from ingredients</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-1">Yield Unit</label>
                    <select
                      value={draft.yield_unit_id || ''}
                      onChange={(e) => {
                        const newUnitId = e.target.value || null;
                        setDraft({ ...draft, yield_unit_id: newUnitId });
                        setCalculatedYield(null);
                      }}
 className="w-full px-3 py-2 bg-theme-button border border-theme rounded-md text-[rgb(var(--text-primary))] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      <option value="">Select unit...</option>
                      {(uomList || []).filter((uom: any) => {
                        const allowedAbbreviations = ['mg', 'g', 'kg', 'ml', 'L'];
                        return allowedAbbreviations.includes(uom.abbreviation?.toLowerCase() || '');
                      }).map((uom: any) => (
                        <option key={uom.id} value={uom.id}>
                          {uom.name} ({uom.abbreviation})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-1">Shelf Life (days)</label>
                    <input
                      type="number"
                      value={draft.shelf_life_days || ''}
                      onChange={(e) => setDraft({ ...draft, shelf_life_days: parseInt(e.target.value) || null })}
 className="w-full px-3 py-2 bg-theme-button border border-theme rounded-md text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-1">Storage Requirements</label>
                  <textarea
                    value={draft.storage_requirements || ''}
                    onChange={(e) => setDraft({ ...draft, storage_requirements: e.target.value })}
                    rows={2}
 className="w-full px-3 py-2 bg-theme-button border border-theme rounded-md text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="Storage instructions..."
                  />
                </div>
              </div>
            ) : (
              <>
                {/* 1. METADATA LINE - All on one row */}
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <div>
 <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Code:</span>
                    <span className="ml-2 text-[rgb(var(--text-primary))] dark:text-white font-mono">{recipe.code || '-'}</span>
                  </div>
                  <div className="h-4 w-px bg-theme dark:bg-neutral-700" />
                  <div>
 <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Shelf Life:</span>
                    <span className="ml-2 text-[rgb(var(--text-primary))] dark:text-white">
                      {recipe.shelf_life_days ? `${recipe.shelf_life_days} days` : 'Not set'}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-theme dark:bg-neutral-700" />
                  <div>
 <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Version:</span>
                    <span className="ml-2 text-module-fg font-mono">
                      v{(recipe.version_number || recipe.version || 1.0).toFixed(1)}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-theme dark:bg-neutral-700" />
                  <div>
 <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Storage:</span>
                    <span className="ml-2 text-[rgb(var(--text-primary))] dark:text-white">
                      {recipe.storage_requirements || 'Not specified'}
                    </span>
                  </div>
                  {linkedSOPId && (
                    <>
                      <div className="h-4 w-px bg-theme dark:bg-neutral-700" />
                      <div>
                        <Link
                          href={`/dashboard/sops/view/${linkedSOPId}`}
                          className="inline-flex items-center gap-1 text-module-fg hover:text-emerald-300 transition-colors"
                        >
                          <FileText size={14} />
                          <span>View SOP</span>
                          <ExternalLink size={12} className="opacity-70" />
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* 2. ALLERGENS - Always visible */}
            <div className={`rounded-lg p-4 border ${
              recipe.allergens && recipe.allergens.length > 0
                ? 'bg-red-500/10 border-red-500/20'
 : 'bg-theme-button border-theme dark:border-theme'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {recipe.allergens && recipe.allergens.length > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                ) : (
 <AlertCircle className="h-4 w-4 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary"/>
                )}
                <span className={`text-sm font-medium ${
                  recipe.allergens && recipe.allergens.length > 0
                    ? 'text-red-400'
 :'text-[rgb(var(--text-secondary))] dark:text-theme-tertiary'
                }`}>
                  Allergens
                </span>
              </div>
              {recipe.allergens && recipe.allergens.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {/* @salsa — Display allergen labels from short keys */}
                  {recipe.allergens.map((allergen) => (
                    <span
                      key={allergen}
                      className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-300 border border-red-500/30"
                    >
                      {allergenKeyToLabel(allergen)}
                    </span>
                  ))}
                </div>
              ) : (
 <p className="text-sm text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">No allergens detected</p>
              )}
              {/* @salsa — May Contain (cross-contamination) section */}
              {(recipe as any).may_contain_allergens && (recipe as any).may_contain_allergens.length > 0 && (
                <div className="mt-3 pt-3 border-t border-red-500/20">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-amber-400">May Contain</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(recipe as any).may_contain_allergens.map((allergen: string) => (
                      <span
                        key={allergen}
                        className="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      >
                        {allergenKeyToLabel(allergen)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. INGREDIENTS TABLE */}
            <div>
              <div className="flex items-center justify-between mb-3">
 <h4 className="text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Recipe Ingredients</h4>
                {isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Handle add ingredient - this would open a dialog or inline form
                      toast.info('Add ingredient functionality');
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Ingredient
                  </Button>
                )}
              </div>
              <RecipeIngredientsTable
                key={recipe.id || 'no-id'} // Force remount when recipe changes
                recipeId={recipe.id || ''}
                companyId={companyId}
                isEditing={isEditing}
                onRecipeUpdate={() => {
                  if (onRecipeUpdate) {
                    onRecipeUpdate();
                  }
                  // Refresh audit trail when ingredients change
                  if (!isEditing) {
                    loadAuditTrail(showAllHistory ? 50 : 5);
                  }
                }}
                yieldQty={draft.yield_qty || recipe.yield_qty}
                yieldUnit={draft.yield_unit_id || recipe.yield_unit_id || null}
                uomList={uomList}
                onYieldCalculated={handleYieldCalculated}
                isExpanded={isExpanded}
              />
            </div>

            {/* 4. RECIPE HISTORY */}
            <div>
 <h4 className="text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-3">Recipe History</h4>
              
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : auditTrail.length > 0 ? (
                <div className="border border-theme dark:border-theme rounded-lg overflow-hidden">
                  <table className="w-full">
 <thead className="bg-theme-button">
 <tr className="text-left text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
                        <th className="p-3 font-medium w-[180px]">Date & Time</th>
                        <th className="p-3 font-medium w-[150px]">Changed By</th>
                        <th className="p-3 font-medium">Event</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditTrail.slice(0, showAllHistory ? undefined : 5).map((event, idx) => (
                        <tr 
                          key={event.id} 
                          className={`border-t border-theme dark:border-theme ${
 idx % 2 === 0 ? 'bg-theme-surface' : 'bg-theme-surface-elevated'
                          }`}
                        >
                          <td className="p-3 text-sm text-[rgb(var(--text-secondary))] dark:text-neutral-300">
                            {new Date(event.changed_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="p-3 text-sm text-[rgb(var(--text-secondary))] dark:text-neutral-300">
                            {event.changed_by_name}
                          </td>
                          <td className="p-3 text-sm text-[rgb(var(--text-primary))] dark:text-white">
                            {event.change_summary}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {auditTrail.length > 5 && !showAllHistory && (
                    <button
                      onClick={() => {
                        setShowAllHistory(true);
                        loadAuditTrail(50); // Load more events
                      }}
                      className="w-full p-3 text-sm text-module-fg hover:bg-theme-button dark:hover:bg-neutral-800 transition-colors border-t border-theme dark:border-theme"
                    >
                      Show {auditTrail.length - 5} more events...
                    </button>
                  )}
                </div>
              ) : (
 <div className="text-sm text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary text-center py-8 border border-theme dark:border-theme rounded-lg">
                  No history available yet
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isEditing ? (
              <div className="flex justify-between items-center pt-4 border-t border-theme dark:border-theme">
                <div className="flex gap-2">
                  {/* SOP Management Button - Always visible */}
                  {linkedSOPId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await handleUpdateSOP();
                      }}
                      disabled={updatingSOP}
                      className="gap-2"
                    >
                      {updatingSOP ? (
                        <>
                          <Clock className="h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          Update SOP
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowSopDialog(true);
                      }}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create SOP
                    </Button>
                  )}

                  {/* Complete & Save - for draft recipes */}
                  {recipe.recipe_status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        const { error } = await supabase
                          .from('recipes')
                          .update({
                            recipe_status: 'active',
                            is_active: true
                          })
                          .eq('id', recipe.id);

                        if (error) {
                          toast.error('Failed to update recipe');
                          return;
                        }

                        setShowSopDialog(true);
                        if (onRecipeUpdate) {
                          onRecipeUpdate();
                        }
                      }}
                      disabled={finalising || saving}
                      className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Complete & Save
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* Cancel Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onCancel();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>

                  {/* Save Button */}
                  <Button
                    size="sm"
                    onClick={() => {
                      handleSave();
                    }}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Recipe
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center gap-2 pt-4 border-t border-theme dark:border-theme">
                {/* View SOP link - visible when SOP exists */}
                <div>
                  {linkedSOPId && (
                    <Link
                      href={`/dashboard/sops/view/${linkedSOPId}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-module-fg/10 hover:bg-module-fg/10 text-module-fg border border-module-fg/30 hover:border-module-fg/30 transition-colors text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      View SOP
                    </Link>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit()}
                >
                  Edit Recipe
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Finalise Recipe Dialog */}
      <ConfirmDialog
        open={showFinaliseDialog}
        onClose={() => {
          setShowFinaliseDialog(false);
          setCreateSOP(true); // Reset to default
        }}
        onConfirm={handleFinaliseRecipe}
        title="Finalise Recipe"
        description={
          <div className="space-y-3">
            <p className="text-[rgb(var(--text-secondary))] dark:text-neutral-300">This will mark the recipe as active and update ingredient costs.</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createSOP}
                onChange={(e) => setCreateSOP(e.target.checked)}
 className="w-4 h-4 rounded border-theme bg-theme-button text-emerald-500 focus:ring-emerald-500/50"
              />
              <span className="text-sm text-[rgb(var(--text-secondary))] dark:text-neutral-300">Create Food Prep SOP from this recipe</span>
            </label>
          </div>
        }
        confirmText="Finalise"
        cancelText="Cancel"
        variant="default"
      />

      {/* Enhanced SOP Creation/Update Dialog */}
      <Dialog open={showSopDialog} onOpenChange={setShowSopDialog}>
        <DialogContent className="bg-theme-surface-elevated dark:bg-[#0B0D13] border border-theme">
          <DialogHeader>
            <DialogTitle className="text-[rgb(var(--text-primary))] dark:text-white">
              {linkedSOPId ? 'Update SOP' : 'Create SOP'} for {recipe.name}
            </DialogTitle>
            <DialogDescription className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
              {linkedSOPId ? (
                <>
                  Update the linked Standard Operating Procedure with the latest 
                  recipe ingredients and quantities.
                </>
              ) : (
                <>
                  Create a Standard Operating Procedure with the recipe 
                  ingredients pre-filled. You can then add method, equipment, 
                  and storage instructions.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Show Current SOP Status if Linked */}
          {linkedSOPId && (
 <div className="bg-theme-button p-3 rounded-lg border border-theme">
              <div className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Linked SOP:</div>
              <div className="text-[rgb(var(--text-primary))] dark:text-white font-medium">
                {recipe.code || recipe.name} - Food Preparation SOP
              </div>
              <div className="text-xs text-module-fg mt-1">
                Click Update to sync with latest recipe changes
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSopDialog(false)}
 className="bg-transparent text-[rgb(var(--text-primary))] dark:text-white border-theme hover:bg-theme-button"
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!userId || !companyId) {
                  toast.error('User or company information missing');
                  return;
                }
                
                try {
                  if (linkedSOPId) {
                    await updateFoodSOPFromRecipe(recipe.id, linkedSOPId);
                    toast.success('SOP updated successfully');
                  } else {
                    const sopId = await createFoodSOPFromRecipe(recipe, companyId, userId);
                    
                    // Link recipe to SOP
                    await supabase
                      .from('recipes')
                      .update({ linked_sop_id: sopId })
                      .eq('id', recipe.id);
                    
                    setLinkedSOPId(sopId);
                    toast.success('SOP created successfully');
                  }
                  
                  setShowSopDialog(false);
                  
                  if (onRecipeUpdate) {
                    onRecipeUpdate();
                  }
                } catch (error: any) {
                  console.error('Error managing SOP:', error);
                  toast.error(`Failed to ${linkedSOPId ? 'update' : 'create'} SOP: ${error?.message || 'Unknown error'}`);
                }
              }}
              className="bg-module-fg hover:bg-module-fg/90 text-white"
            >
              {linkedSOPId ? 'Update SOP' : 'Create SOP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  
  async function handleFinaliseRecipe() {
    if (!userId || !companyId) {
      alert('User or company information missing');
      return;
    }

    setFinalising(true);
    try {
      // 1. Update recipe status to active
      const { error: updateError } = await supabase
        .from('recipes')
        .update({
          recipe_status: 'active',
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', recipe.id);

      if (updateError) throw updateError;

      // 2. Create SOP if requested
      if (createSOP) {
        try {
          const sopId = await createFoodSOPFromRecipe(recipe, companyId, userId);
          console.info('SOP created successfully:', sopId);
        } catch (sopError: any) {
          console.error('Error creating SOP:', sopError);
          // Don't throw - recipe was finalised successfully, SOP can be created manually
          alert(`Recipe finalised, but SOP creation failed: ${sopError?.message || 'Unknown error'}`);
        }
      }

      // 3. Refresh recipe data
      if (onRecipeUpdate) {
        await onRecipeUpdate();
      }

      setShowFinaliseDialog(false);
      alert('Recipe finalised successfully!');
    } catch (error: any) {
      console.error('Error finalising recipe:', error);
      alert(`Error finalising recipe: ${error?.message || 'Unknown error'}`);
    } finally {
      setFinalising(false);
    }
  }
}

