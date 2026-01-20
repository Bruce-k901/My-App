"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { SOPPrintTemplate } from '@/components/sops/SOPPrintTemplate';
import { 
  Edit, 
  Download, 
  Printer, 
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function SOPViewPage() {
  const params = useParams();
  const router = useRouter();
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  const sopId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [sop, setSop] = useState<any>(null);
  const [printData, setPrintData] = useState<any>(null);
  const [multiplier, setMultiplier] = useState(1); // Recipe scaling multiplier
  const [multiplierInput, setMultiplierInput] = useState('1'); // Local input state for editing

  useEffect(() => {
    if (!sopId || !companyId) return;

    const loadSOP = async () => {
      try {
        setLoading(true);
        // First, fetch the SOP entry
        const { data, error } = await supabase
          .from('sop_entries')
          .select(`
            *,
            linked_recipe:recipes!linked_recipe_id(
              id,
              name,
              code,
              version_number,
              allergens,
              total_cost,
              yield_qty,
              yield_unit_id,
              shelf_life_days,
              storage_requirements
            )
          `)
          .eq('id', sopId)
          .eq('company_id', companyId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('SOP not found');

        setSop(data);
        
        // Fetch creator profile separately if created_by exists
        let creatorName = data.author || 'System';
        if (data.created_by) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', data.created_by)
              .single();
            
            if (profile) {
              creatorName = profile.full_name || profile.email || creatorName;
            }
          } catch (profileError) {
            console.warn('Could not fetch creator profile:', profileError);
            // Use author field as fallback
          }
        }
        
        // Parse sop_data
        let parsedData = data.sop_data || {};
        if (typeof parsedData === 'string') {
          try {
            parsedData = JSON.parse(parsedData);
          } catch (e) {
            console.error('Error parsing sop_data:', e);
            parsedData = {};
          }
        }

        // Extract structured data for print template
        // Check if metadata exists (new format)
        const metadata = data.metadata || {};
        
        // Check if TipTap format (has content array)
        const isTipTapFormat = parsedData.content && Array.isArray(parsedData.content);
        
        let ingredients: any[] = [];
        let equipment: string[] = [];
        let methodSteps: string[] = [];
        let recipe: any = null;

        if (metadata.ingredients && metadata.ingredients.length > 0) {
          // Use metadata format (new structured format)
          ingredients = metadata.ingredients;
          equipment = metadata.equipment || [];
          methodSteps = metadata.method_steps || [];
          recipe = metadata.recipe || data.linked_recipe;
        } else if (isTipTapFormat) {
          // Extract from TipTap format
          const ingredientTableNode = parsedData.content.find((n: any) => n.type === 'ingredientTable');
          const equipmentListNode = parsedData.content.find((n: any) => n.type === 'equipmentList');
          const processStepsNode = parsedData.content.find((n: any) => n.type === 'processSteps');
          const headerNode = parsedData.content.find((n: any) => n.type === 'prepHeader');
          const storageInfoNode = parsedData.content.find((n: any) => n.type === 'storageInfo');

          if (ingredientTableNode?.attrs?.rows) {
            ingredients = ingredientTableNode.attrs.rows.map((row: any) => ({
              ingredient_name: row.ingredient || '',
              quantity: parseFloat(row.quantity) || 0,
              unit: row.unit || '',
              supplier: row.supplier || '',
              allergens: Array.isArray(row.allergen) ? row.allergen : (row.allergen ? [row.allergen] : [])
            }));
          }

          if (equipmentListNode?.attrs?.rows) {
            equipment = equipmentListNode.attrs.rows.map((eq: any) => eq.item || eq.name || 'Equipment');
          }

          if (processStepsNode?.attrs?.steps) {
            methodSteps = processStepsNode.attrs.steps.map((step: any) => step.description || step.text || '');
          }

          if (headerNode?.attrs) {
            recipe = {
              name: headerNode.attrs.title || data.title,
              code: headerNode.attrs.ref_code || data.ref_code,
              version_number: parseFloat(headerNode.attrs.version) || data.version_number || 1.0,
              allergens: headerNode.attrs.allergens || [],
              yield_qty: headerNode.attrs.yieldValue || 0,
              yield_unit: headerNode.attrs.unit || 'g',
              storage_requirements: storageInfoNode?.attrs?.type || '',
              shelf_life_days: storageInfoNode?.attrs?.durationDays || null
            };
          }
        } else {
          // Simple format
          if (parsedData.ingredients) {
            ingredients = parsedData.ingredients.map((ing: any) => ({
              ingredient_name: ing.ingredient_name || ing.ingredient || '',
              quantity: ing.quantity || 0,
              unit: ing.unit || '',
              supplier: ing.supplier || '',
              allergens: ing.allergens || []
            }));
          }
          equipment = parsedData.equipment?.map((eq: any) => eq.item || eq.name || '') || [];
          methodSteps = parsedData.processSteps?.map((step: any) => step.description || step.text || '') || [];
          recipe = data.linked_recipe || parsedData.header;
        }

        // Use linked recipe if available
        if (data.linked_recipe && !recipe) {
          recipe = {
            name: data.linked_recipe.name,
            code: data.linked_recipe.code,
            version_number: data.linked_recipe.version_number || 1.0,
            allergens: data.linked_recipe.allergens || [],
            total_cost: data.linked_recipe.total_cost || 0,
            yield_qty: data.linked_recipe.yield_qty || 0,
            yield_unit: 'g', // Will need to fetch unit name if needed
            shelf_life_days: data.linked_recipe.shelf_life_days,
            storage_requirements: data.linked_recipe.storage_requirements
          };
        }

        // Build print data with multiplier support
        // First, fetch ingredient costs from ingredients library
        const ingredientNames = ingredients.map((ing: any) => ing.ingredient_name || ing.ingredient).filter(Boolean);
        let ingredientCostsMap: Record<string, number> = {};
        
        if (ingredientNames.length > 0) {
          try {
            const { data: ingredientsData } = await supabase
              .from('ingredients_library')
              .select('ingredient_name, unit_cost, pack_cost, pack_size, yield_percent')
              .in('ingredient_name', ingredientNames);
            
            if (ingredientsData) {
              ingredientsData.forEach((ing: any) => {
                // Calculate unit cost: use unit_cost if available, otherwise calculate from pack_cost/pack_size
                let unitCost = ing.unit_cost || 0;
                if (!unitCost && ing.pack_cost && ing.pack_size && ing.pack_size > 0) {
                  unitCost = ing.pack_cost / ing.pack_size;
                }
                // Adjust for yield_percent if applicable
                if (ing.yield_percent && ing.yield_percent > 0 && ing.yield_percent !== 100) {
                  unitCost = unitCost * (100 / ing.yield_percent);
                }
                ingredientCostsMap[ing.ingredient_name] = unitCost;
              });
            }
          } catch (error) {
            console.warn('Could not fetch ingredient costs:', error);
          }
        }
        
        // Store original quantities and calculate base cost/yield from ingredients
        const baseIngredients = ingredients.map((ing: any) => {
          const quantity = parseFloat(String(ing.quantity || 0));
          const ingredientName = ing.ingredient_name || ing.ingredient || '';
          const unitCost = ingredientCostsMap[ingredientName] || 0;
          const lineCost = quantity * unitCost;
          
          return {
            ...ing,
            originalQuantity: quantity,
            unitCost: unitCost,
            lineCost: lineCost
          };
        });
        
        // Calculate base cost and yield from ingredients
        const baseCost = baseIngredients.reduce((sum, ing) => sum + (ing.lineCost || 0), 0);
        // For yield, use recipe yield if available, otherwise sum ingredient quantities
        const baseYield = recipe?.yield_qty || baseIngredients.reduce((sum, ing) => sum + (ing.originalQuantity || 0), 0);
        
        // Apply initial multiplier (default 1)
        const scaledIngredients = baseIngredients.map((ing: any) => ({
          ...ing,
          quantity: ing.originalQuantity * multiplier,
          lineCost: (ing.lineCost || 0) * multiplier
        }));
        
        // Calculate scaled cost and yield
        const scaledCost = baseCost * multiplier;
        const scaledYield = baseYield * multiplier;
        
        const scaledRecipe = recipe ? {
          ...recipe,
          total_cost: scaledCost,
          yield_qty: scaledYield,
          // Always preserve original values for recalculation
          original_cost: baseCost,
          original_yield: baseYield
        } : null;
        
        const printSopData = {
          sop_code: data.ref_code || data.sop_code,
          ref_code: data.ref_code,
          title: data.title,
          version: data.version_number || parseFloat(data.version) || 1.0,
          version_number: data.version_number || parseFloat(data.version) || 1.0,
          status: data.status,
          created_at: data.created_at,
          updated_at: data.updated_at,
          created_by_name: creatorName,
          recipe: scaledRecipe,
          ingredients: scaledIngredients,
          baseIngredients: baseIngredients, // Store original for recalculation
          equipment: equipment.length > 0 ? equipment : undefined,
          method_steps: methodSteps.length > 0 ? methodSteps : undefined,
          multiplier: multiplier // Store multiplier for display
        };

        // Reset multiplier when SOP loads (before setting printData)
        setMultiplier(1);
        setMultiplierInput('1');
        
        setPrintData(printSopData);
        console.log('Print data prepared:', printSopData);
      } catch (error: any) {
        console.error('Error loading SOP:', error);
        showToast({
          title: 'Error loading SOP',
          description: error.message || 'Failed to load SOP',
          type: 'error'
        });
        router.push('/dashboard/sops/list');
      } finally {
        setLoading(false);
      }
    };

    loadSOP();
  }, [sopId, companyId, router, showToast]);
  
  // Recalculate print data when multiplier changes
  useEffect(() => {
    if (!printData || !printData.baseIngredients || !printData.recipe) return;
    
    // Skip if multiplier hasn't changed from what's already in printData
    if (printData.multiplier === multiplier) return;
    
    // Always use original_cost/yield (calculated from ingredients on first load, never changes)
    const baseCost = printData.recipe.original_cost !== undefined && printData.recipe.original_cost !== null
      ? printData.recipe.original_cost 
      : (printData.recipe.total_cost || 0) / (printData.multiplier || 1);
    const baseYield = printData.recipe.original_yield !== undefined && printData.recipe.original_yield !== null
      ? printData.recipe.original_yield
      : (printData.recipe.yield_qty || 0) / (printData.multiplier || 1);
    
    // Rebuild print data with new multiplier using stored base ingredients
    // Recalculate cost from ingredients with new multiplier
    const scaledIngredients = printData.baseIngredients.map((ing: any) => ({
      ...ing,
      quantity: ing.originalQuantity * multiplier,
      lineCost: (ing.lineCost || 0) * multiplier
    }));
    
    // Recalculate total cost from scaled ingredients
    const recalculatedCost = scaledIngredients.reduce((sum: number, ing: any) => sum + (ing.lineCost || 0), 0);
    const scaledCost = recalculatedCost; // Use calculated cost from ingredients
    const scaledYield = baseYield * multiplier;
    
    const scaledRecipe = {
      ...printData.recipe,
      total_cost: scaledCost,
      yield_qty: scaledYield,
      // Preserve original values (never change these)
      original_cost: baseCost,
      original_yield: baseYield
    };
    
    setPrintData((prev: any) => ({
      ...prev,
      recipe: scaledRecipe,
      ingredients: scaledIngredients,
      multiplier: multiplier
    }));
  }, [multiplier, printData]);

  const handlePrint = () => {
    // Open dedicated print page in new window
    window.open(
      `/dashboard/sops/view/${sopId}/print`,
      '_blank',
      'width=210mm,height=297mm' // A4 dimensions
    );
  };

  const getCategoryTemplate = (category: string) => {
    const templates: Record<string, string> = {
      'Food Prep': '/dashboard/sops/food-template',
      'Service (FOH)': '/dashboard/sops/service-template',
      'Drinks': '/dashboard/sops/drinks-template',
      'Hot Beverages': '/dashboard/sops/hot-drinks-template',
      'Cold Beverages': '/dashboard/sops/cold-drinks-template',
      'Cleaning': '/dashboard/sops/cleaning-template',
      'Opening': '/dashboard/sops/opening-template',
      'Closing': '/dashboard/sops/closing-template',
    };
    return templates[category] || '/dashboard/sops/food-template';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[rgb(var(--background-primary))] dark:bg-neutral-900">
        <div className="text-[rgb(var(--text-secondary))] dark:text-neutral-400">Loading SOP...</div>
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[rgb(var(--background-primary))] dark:bg-neutral-900">
        <div className="text-[rgb(var(--text-secondary))] dark:text-neutral-400">SOP not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--background-primary))] dark:bg-neutral-900 print:bg-white">
      {/* Header - Hidden when printing */}
      <div className="no-print sticky top-0 z-10 bg-[rgb(var(--background-primary))] dark:bg-neutral-900 border-b border-[rgb(var(--border))] dark:border-neutral-700">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard/sops/list')}
              className="flex items-center gap-2 text-[rgb(var(--text-secondary))] dark:text-neutral-400 hover:text-[rgb(var(--text-primary))] dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to SOPs</span>
            </button>
            <div className="flex items-center gap-4">
              {/* Recipe Scaling Multiplier - More Prominent */}
              {printData?.recipe && (
                <div className="flex items-center gap-3 px-5 py-3 bg-[rgb(var(--surface-elevated))] dark:bg-neutral-800 rounded-xl border-2 border-pink-500 dark:border-pink-500/70 shadow-lg shadow-pink-500/20 dark:shadow-pink-500/30">
                  <label htmlFor="multiplier" className="text-base font-semibold text-[rgb(var(--text-primary))] dark:text-white whitespace-nowrap">
                    Portions:
                  </label>
                  <input
                    id="multiplier"
                    type="text"
                    inputMode="decimal"
                    value={multiplierInput}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      // Allow empty string, numbers, and decimal point
                      if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                        setMultiplierInput(inputValue);
                        // Update multiplier if valid number
                        const numValue = parseFloat(inputValue);
                        if (!isNaN(numValue) && numValue > 0) {
                          const clampedValue = Math.max(0.1, Math.min(100, numValue));
                          setMultiplier(clampedValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // Validate and clamp on blur
                      const numValue = parseFloat(e.target.value);
                      if (isNaN(numValue) || numValue <= 0) {
                        setMultiplierInput('1');
                        setMultiplier(1);
                      } else {
                        const clampedValue = Math.max(0.1, Math.min(100, numValue));
                        setMultiplierInput(clampedValue.toString());
                        setMultiplier(clampedValue);
                      }
                    }}
                    className="w-28 bg-[rgb(var(--background-primary))] dark:bg-neutral-900 border-2 border-pink-500 dark:border-pink-500 rounded-lg px-3 py-2 text-lg font-bold text-[rgb(var(--text-primary))] dark:text-white focus:border-pink-400 dark:focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-500/40 dark:focus:ring-pink-500/40"
                  />
                  <span className="text-base font-bold text-pink-500 dark:text-pink-400">
                    ×{multiplier.toFixed(1)}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`${getCategoryTemplate(sop.category)}?edit=${sop.id}`)}
                  className="gap-2"
                >
                  <Edit size={16} />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="gap-2"
                >
                  <Printer size={16} />
                  Print / PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Use Print Template */}
      <div className="max-w-5xl mx-auto px-6 py-8 print:px-0 print:py-4">
        {printData ? (
          <SOPPrintTemplate 
            sop={printData}
            companyName="Checkly"
          />
        ) : (
          <div className="text-center py-12 text-[rgb(var(--text-secondary))] dark:text-neutral-400">
            <p>No SOP data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
