"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Plus, Trash2, AlertTriangle, Save, Download, Upload, X, Loader2, FileText, GripVertical } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import SmartSearch from '@/components/SmartSearch';
import BackButton from '@/components/ui/BackButton';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getVersioningInfo, createVersionPayload } from '@/lib/utils/sopVersioning';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const COLOUR_CODES = [
  "Red – Raw Meat",
  "Blue – Raw Fish", 
  "Green – Salad/Fruit",
  "Yellow – Cooked Food",
  "Brown – Vegetables",
  "Brown – Bakery",
  "White – Bakery/Dairy"
];

const STORAGE_TYPES = [
  { value: "ambient", label: "Ambient (15-25°C)" },
  { value: "chilled", label: "Chilled (0-5°C)" },
  { value: "frozen", label: "Frozen (-18°C or below)" },
  { value: "hot_hold", label: "Hot Hold (63°C+)" }
];

const UNIT_OPTIONS = [
  "g", "kg",
  "ml", "L", "cup",
  "tsp", "tbsp", "pcs"
];

// Sortable Process Step Component
function SortableStepItem({ 
  step, 
  index, 
  processSteps, 
  updateProcessStep, 
  removeProcessStep, 
  photoInputRefs, 
  uploadingPhotos, 
  handlePhotoUpload, 
  handleRemovePhoto 
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 bg-[rgb(var(--surface-elevated))] dark:bg-neutral-900/50 rounded-lg border ${
        isDragging 
          ? 'border-magenta-500/60 shadow-lg' 
          : 'border-[rgb(var(--border))] dark:border-neutral-600'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        {/* Drag Handle - More Visible */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 rounded hover:bg-magenta-500/20 dark:hover:bg-magenta-500/20 transition-colors touch-none"
          title="Drag to reorder"
        >
          <GripVertical 
            size={22} 
            className="text-magenta-400 dark:text-magenta-400 opacity-80 hover:opacity-100" 
            strokeWidth={2.5}
          />
        </div>

        {/* Editable Step Title */}
        <input
          type="text"
          value={step.title || ''}
          onChange={(e) => updateProcessStep(step.id, 'title', e.target.value)}
          placeholder={`Step ${index + 1}`}
          className="flex-1 bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-1.5 text-sm font-semibold text-magenta-400 focus:outline-none focus:ring-2 focus:ring-magenta-500/40 placeholder:text-magenta-400/60"
        />

        {/* Delete Button */}
        <button
          onClick={() => removeProcessStep(step.id)}
          disabled={processSteps.length === 1}
          className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Remove step"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <textarea
          value={step.description}
          onChange={(e) => updateProcessStep(step.id, 'description', e.target.value)}
 className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] text-sm placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary"
          placeholder="Describe this step in detail..."
          rows={2}
        />

        <div className="grid grid-cols-3 gap-3">
          <div>
 <label className="block text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-1">Temperature (°C)</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="-?[0-9]*\.?[0-9]*"
              value={step.temperature}
              onChange={(e) => {
                const value = e.target.value;
                // Allow negative numbers, decimals, and empty string
                if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
                  updateProcessStep(step.id, 'temperature', value);
                }
              }}
 className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] text-sm placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary"
              placeholder="Optional"
            />
          </div>
          <div>
 <label className="block text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-1">Duration</label>
            <input
              value={step.duration}
              onChange={(e) => updateProcessStep(step.id, 'duration', e.target.value)}
 className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] text-sm placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary"
              placeholder="e.g., 15 min"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))] dark:text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={step.is_ccp}
                onChange={(e) => updateProcessStep(step.id, 'is_ccp', e.target.checked)}
                className="w-4 h-4 rounded border-[rgb(var(--border))] dark:border-neutral-600 bg-[rgb(var(--surface))] dark:bg-neutral-900"
              />
              Critical Control Point
            </label>
          </div>
        </div>

        <input
          value={step.haccp_note}
          onChange={(e) => updateProcessStep(step.id, 'haccp_note', e.target.value)}
 className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] text-sm placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary"
          placeholder="HACCP notes (optional)"
        />

        {/* Photo Upload Section */}
        <div className="mt-3 pt-3 border-t border-[rgb(var(--border))] dark:border-theme">
 <label className="block text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-2">Process Photo</label>
          {step.photo_url ? (
            <div className="relative inline-block">
              <img 
                src={step.photo_url} 
                alt="Process step photo" 
                className="w-32 h-32 object-cover rounded-lg border border-[rgb(var(--border))] dark:border-neutral-600"
              />
              <button
                onClick={() => handleRemovePhoto(step.id, step.photo_url)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-[rgb(var(--text-primary))] dark:text-white"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                ref={el => photoInputRefs.current[step.id] = el}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file, step.id);
                }}
                className="hidden"
              />
              <button
                onClick={() => photoInputRefs.current[step.id]?.click()}
                disabled={uploadingPhotos[step.id]}
                className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--surface-elevated))] hover:bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-lg text-[rgb(var(--text-primary))] text-sm transition-colors disabled:opacity-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-600 dark:text-white"
              >
                {uploadingPhotos[step.id] ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload Photo
                  </>
                )}
              </button>
 <span className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">Max 5MB, JPEG/PNG/WebP</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FoodSOPTemplatePageContent() {
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  
  // Loading state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ingredientsLibrary, setIngredientsLibrary] = useState([]);
  const [equipmentLibrary, setEquipmentLibrary] = useState([]);
  const [recentIngredients, setRecentIngredients] = useState([]);
  const [recentEquipment, setRecentEquipment] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false); // Prevent duplicate loads
  const [sopLoaded, setSopLoaded] = useState(false); // Track if SOP data has been loaded

  // Header state
  const [title, setTitle] = useState("");
  const [refCode, setRefCode] = useState("");
  const [version, setVersion] = useState("1.0");
  const [status, setStatus] = useState("Draft");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("Food Prep");
  const [isSubRecipe, setIsSubRecipe] = useState(false);
  const [headerAllergens, setHeaderAllergens] = useState<string[]>([]); // Allergens in header section
  const [linkedRecipeId, setLinkedRecipeId] = useState<string | null>(null); // Linked recipe ID
  const [checkingRecipeLink, setCheckingRecipeLink] = useState(false); // Track if we're checking for recipe link

  // Ingredients state
  const [ingredients, setIngredients] = useState([
    { id: Date.now(), ingredient_id: "", quantity: "", unit: "", allergens: [], colour_code: "" }
  ]);

  // Equipment state
  const [equipment, setEquipment] = useState([
    { id: Date.now(), item: "", colour_code: "", sanitation_notes: "" }
  ]);

  // Process steps state
  const [processSteps, setProcessSteps] = useState([
    { id: Date.now(), title: "", description: "", temperature: "", duration: "", haccp_note: "", is_ccp: false, photo_url: "" }
  ]);

  // Photo upload refs and state
  const photoInputRefs = useRef({});
  const [uploadingPhotos, setUploadingPhotos] = useState({});

  // Storage state
  const [storageType, setStorageType] = useState("chilled");
  const [shelfLife, setShelfLife] = useState("");
  const [containerType, setContainerType] = useState("");

  // Calculated values
  const [totalCost, setTotalCost] = useState(0);
  const [totalYield, setTotalYield] = useState(0);
  const [allergensList, setAllergensList] = useState([]);
  const [toolColours, setToolColours] = useState([]);

  // Unit conversion function - converts all units to grams
  const convertToGrams = React.useCallback((quantity, unit) => {
    const qty = parseFloat(quantity) || 0;
    if (!unit) return qty;
    
    const conversions = {
      'g': 1,
      'kg': 1000,
      'ml': 1, // Assuming 1ml = 1g for water-based ingredients
      'L': 1000,
      'cup': 240, // Approximate for most ingredients
      'tsp': 5, // Approximate
      'tbsp': 15, // Approximate
      'pcs': 100, // Estimate average piece weight
      'each': 100, // Estimate average
      'bunch': 50, // Estimate average bunch weight
      'pack': 200, // Estimate average pack weight
      'tin': 400, // Estimate average tin weight
      'jar': 300, // Estimate average jar weight
      'bottle': 750, // Estimate average bottle weight
      'loaf': 500, // Estimate average loaf weight
      'bag': 500, // Estimate average bag weight
    };
    
    return qty * (conversions[unit] || 1);
  }, []);

  // Unit conversion function - converts quantity to target unit
  const convertToUnit = React.useCallback((quantity, fromUnit, toUnit) => {
    if (!fromUnit || !toUnit || fromUnit === toUnit) return parseFloat(quantity) || 0;
    
    // First convert to grams using local conversion
    const qty = parseFloat(quantity) || 0;
    const toGramsConversions = {
      'g': 1,
      'kg': 1000,
      'ml': 1,
      'L': 1000,
      'cup': 240,
      'tsp': 5,
      'tbsp': 15,
      'pcs': 100,
      'each': 100,
      'bunch': 50,
      'pack': 200,
      'tin': 400,
      'jar': 300,
      'bottle': 750,
      'loaf': 500,
      'bag': 500,
    };
    const inGrams = qty * (toGramsConversions[fromUnit] || 1);
    
    // Then convert from grams to target unit
    const fromGramsConversions = {
      'g': 1,
      'kg': 0.001,
      'ml': 1,
      'L': 0.001,
      'cup': 1/240,
      'tsp': 1/5,
      'tbsp': 1/15,
      'pcs': 1/100,
      'each': 1/100,
      'bunch': 1/50,
      'pack': 1/200,
      'tin': 1/400,
      'jar': 1/300,
      'bottle': 1/750,
      'loaf': 1/500,
      'bag': 1/500,
    };
    
    return inGrams * (fromGramsConversions[toUnit] || 1);
  }, []);

  // Load ingredients library from Supabase
  useEffect(() => {
    if (dataLoaded) return; // Prevent duplicate loads
    
    const loadIngredients = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('ingredients_library')
          .select('id, ingredient_name, unit, unit_cost, pack_cost, pack_size, yield_percent, allergens, default_colour_code, category, supplier, linked_sop_id')
          .order('ingredient_name');
        
        if (error) {
          console.error('Supabase error:', error);
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          
          showToast({ 
            title: 'Error loading ingredients', 
            description: error.message || 'Failed to fetch ingredients', 
            type: 'error' 
          });
          
          setIngredientsLibrary([]);
          return;
        }
        
        console.log('Loaded ingredients:', data?.length || 0);
        setIngredientsLibrary(data || []);
        
        if (!data || data.length === 0) {
          console.warn('No ingredients found in ingredients_library table');
          showToast({ 
            title: 'No ingredients found', 
            description: 'The ingredients library is empty', 
            type: 'info' 
          });
        }
      } catch (error) {
        console.error('Unexpected error loading ingredients:', error);
        showToast({ 
          title: 'Error loading ingredients', 
          description: error.message || 'An unexpected error occurred', 
          type: 'error' 
        });
        setIngredientsLibrary([]);
      } finally {
        setLoading(false);
        setDataLoaded(true); // Mark as loaded to prevent re-fetching
      }
    };

    loadIngredients();
     
  }, [dataLoaded]); // Only run once when dataLoaded is false

  // Load equipment library from Supabase
  useEffect(() => {
    const loadEquipment = async () => {
      try {
        const { data, error } = await supabase
          .from('equipment_library')
          .select('id, equipment_name, category, sub_category, colour_code, location')
          .order('equipment_name');
        
        if (error) {
          console.error('Error loading equipment:', error);
          return;
        }
        
        setEquipmentLibrary(data || []);
      } catch (error) {
        console.error('Unexpected error loading equipment:', error);
      }
    };
    
    loadEquipment();
  }, []);

  // Store original SOP data for versioning
  const [originalSOP, setOriginalSOP] = useState<any>(null);

  // Load existing SOP data when editing
  useEffect(() => {
    if (!editId || !companyId || sopLoaded) return;

    const loadSOP = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('sop_entries')
          .select('*, linked_recipe_id')
          .eq('id', editId)
          .eq('company_id', companyId)
          .single();

        if (error) throw error;
        if (!data) {
          showToast({ 
            title: 'SOP not found', 
            description: 'The requested SOP could not be found', 
            type: 'error' 
          });
          router.push('/dashboard/sops/list');
          return;
        }

        // Store original SOP for versioning
        setOriginalSOP(data);

        // Store linked recipe ID - check both directions
        let recipeId = data.linked_recipe_id || null;
        console.log('SOP data - linked_recipe_id from DB:', recipeId);
        
        // If not found in SOP, check if recipe has this SOP linked
        // Note: linked_sop_id is in stockly.recipes, but the 'recipes' view might not expose it
        // or RLS might block it. We'll try the query but handle 400 errors gracefully.
        // The browser will still log the network error, but we handle it in code.
        if (!recipeId) {
          // Use AbortController to potentially cancel if needed, but we'll let it complete
          // and handle the error response instead
          try {
            const { data: recipeData, error: recipeError } = await supabase
              .from('recipes')
              .select('id')
              .eq('linked_sop_id', editId)
              .limit(1)
              .maybeSingle();
            
            if (recipeError) {
              // 400 Bad Request typically means column doesn't exist in view or RLS blocks it
              // This is expected in some setups, so we silently handle it
              // Note: Browser will still log the network error, but functionality continues
              const isExpectedError = 
                recipeError.code === 'PGRST116' || 
                recipeError.code === '42703' || 
                recipeError.code === '42P01' || 
                recipeError.code === 'PGRST301' ||
                (recipeError as any).status === 400 ||
                recipeError.message?.includes('column') || 
                recipeError.message?.includes('does not exist') ||
                recipeError.message?.includes('undefined column') ||
                recipeError.message?.includes('permission denied');
              
              // Only log if it's an unexpected error type
              if (!isExpectedError) {
                console.warn('Unexpected error checking recipe link:', recipeError);
              }
            } else if (recipeData) {
              recipeId = recipeData.id;
              console.log('Found recipe ID from recipes table:', recipeId);
            }
          } catch (e: any) {
            // Catch any unexpected errors
            const isExpectedError = 
              e?.code === 'PGRST116' || 
              e?.code === '42703' || 
              e?.code === '42P01' ||
              e?.code === 'PGRST301' ||
              e?.status === 400;
            
            if (!isExpectedError) {
              console.warn('Unexpected error checking recipe link:', e);
            }
          }
        }
        
        setLinkedRecipeId(recipeId);
        console.log('Final linkedRecipeId state set to:', recipeId);

        // Populate header fields
        setTitle(data.title || '');
        setRefCode(data.ref_code || '');
        setVersion(data.version || '1.0');
        setStatus(data.status || 'Draft');
        setAuthor(data.author || '');
        setCategory(data.category || 'Food Prep');

        // Populate SOP data
        const sopData = data.sop_data || {};
        
        // Check if this is TipTap format (has content array) or simple format
        const isTipTapFormat = sopData.content && Array.isArray(sopData.content);
        
        if (isTipTapFormat) {
          // TipTap format: Extract from content nodes
          const headerNode = sopData.content.find((n: any) => n.type === 'prepHeader');
          const ingredientTableNode = sopData.content.find((n: any) => n.type === 'ingredientTable');
          const equipmentListNode = sopData.content.find((n: any) => n.type === 'equipmentList');
          const processStepsNode = sopData.content.find((n: any) => n.type === 'processSteps');
          const storageInfoNode = sopData.content.find((n: any) => n.type === 'storageInfo');
          
          // Populate header from TipTap format
          if (headerNode?.attrs) {
            if (headerNode.attrs.title) setTitle(headerNode.attrs.title);
            if (headerNode.attrs.ref_code) setRefCode(headerNode.attrs.ref_code);
            if (headerNode.attrs.version) setVersion(headerNode.attrs.version);
            if (headerNode.attrs.status) setStatus(headerNode.attrs.status);
            if (headerNode.attrs.author) setAuthor(headerNode.attrs.author);
            // Extract allergens from header attrs or safetyNotes
            if (headerNode.attrs.allergens && Array.isArray(headerNode.attrs.allergens)) {
              setHeaderAllergens(headerNode.attrs.allergens);
            } else if (headerNode.attrs.safetyNotes) {
              const allergenMatch = headerNode.attrs.safetyNotes.match(/This recipe contains: ([^\n]+)/);
              if (allergenMatch) {
                const allergens = allergenMatch[1].split(',').map((a: string) => a.trim()).filter(Boolean);
                setHeaderAllergens(allergens);
              }
            }
            // Category might not be in TipTap format, keep from DB
          }
          
          // Populate ingredients from TipTap ingredientTable
          if (ingredientTableNode?.attrs?.rows && Array.isArray(ingredientTableNode.attrs.rows)) {
            const tipTapIngredients = ingredientTableNode.attrs.rows.map((row: any, idx: number) => {
              // Try to find ingredient_id by matching name in ingredients library
              const ingredientName = row.ingredient || '';
              const matchedIngredient = ingredientsLibrary.find(
                (lib: any) => lib.ingredient_name?.toLowerCase() === ingredientName.toLowerCase()
              );
              
              return {
                id: Date.now() + idx,
                ingredient_id: matchedIngredient?.id || '', // Look up by name
                ingredient_name: ingredientName,
                quantity: parseFloat(row.quantity) || '',
                unit: row.unit || '',
                allergens: Array.isArray(row.allergen) ? row.allergen : (row.allergen ? [row.allergen] : []),
                colour_code: row.colour_code || matchedIngredient?.default_colour_code || '',
                supplier: row.supplier || matchedIngredient?.supplier || '',
                prepState: row.prepState || '',
                useByDate: row.useByDate || '',
                costPerUnit: row.costPerUnit || ''
              };
            });
            setIngredients(tipTapIngredients);
            console.log('✅ Loaded', tipTapIngredients.length, 'ingredients from TipTap format');
          } else {
            console.log('⚠️ No ingredientTable node found in TipTap format');
          }
          
          // Populate equipment from TipTap format
          if (equipmentListNode?.attrs?.rows && Array.isArray(equipmentListNode.attrs.rows)) {
            setEquipment(equipmentListNode.attrs.rows.map((eq: any, idx: number) => ({
              ...eq,
              id: eq.id || Date.now() + idx
            })));
          }
          
          // Populate process steps from TipTap format
          if (processStepsNode?.attrs?.steps && Array.isArray(processStepsNode.attrs.steps)) {
            setProcessSteps(processStepsNode.attrs.steps.map((step: any, idx: number) => ({
              ...step,
              id: step.id || Date.now() + idx
            })));
          }
          
          // Populate storage from TipTap format
          if (storageInfoNode?.attrs) {
            setStorageType(storageInfoNode.attrs.type || 'chilled');
            setShelfLife(storageInfoNode.attrs.durationDays?.toString() || '');
            setContainerType(storageInfoNode.attrs.storageNotes || '');
          }
        } else {
          // Simple format: Direct properties
          const header = sopData.header || {};
          
          // Update header fields if they exist in sop_data
          if (header.title) setTitle(header.title);
          if (header.refCode) setRefCode(header.refCode);
          if (header.version) setVersion(header.version);
          if (header.status) setStatus(header.status);
          if (header.author) setAuthor(header.author);
          if (header.category) setCategory(header.category);
          if (header.isSubRecipe !== undefined) setIsSubRecipe(header.isSubRecipe);

          // Populate ingredients from simple format
          if (sopData.ingredients && Array.isArray(sopData.ingredients)) {
            setIngredients(sopData.ingredients.map((ing: any) => ({
              ...ing,
              id: ing.id || Date.now() + Math.random()
            })));
          }
          
          // Populate equipment from simple format
          if (sopData.equipment && Array.isArray(sopData.equipment)) {
            setEquipment(sopData.equipment.map((eq: any) => ({
              ...eq,
              id: eq.id || Date.now() + Math.random()
            })));
          }

          // Populate process steps from simple format
          if (sopData.processSteps && Array.isArray(sopData.processSteps)) {
            setProcessSteps(sopData.processSteps.map((step: any) => ({
              ...step,
              id: step.id || Date.now() + Math.random()
            })));
          }

          // Populate storage from simple format
          if (sopData.storage) {
            setStorageType(sopData.storage.storageType || 'chilled');
            setShelfLife(sopData.storage.shelfLife || '');
            setContainerType(sopData.storage.containerType || '');
          }
        }

        // Populate equipment
        if (sopData.equipment && Array.isArray(sopData.equipment)) {
          setEquipment(sopData.equipment.map((eq: any) => ({
            ...eq,
            id: eq.id || Date.now() + Math.random()
          })));
        }

        // Populate process steps
        if (sopData.processSteps && Array.isArray(sopData.processSteps)) {
          setProcessSteps(sopData.processSteps.map((step: any) => ({
            ...step,
            id: step.id || Date.now() + Math.random()
          })));
        }

        // Populate storage
        if (sopData.storage) {
          setStorageType(sopData.storage.storageType || 'chilled');
          setShelfLife(sopData.storage.shelfLife || '');
          setContainerType(sopData.storage.containerType || '');
        }

        // Populate calculated values
        if (sopData.calculated) {
          setTotalCost(sopData.calculated.totalCost || 0);
          setTotalYield(sopData.calculated.totalYield || 0);
          setAllergensList(sopData.calculated.allergensList || []);
          setToolColours(sopData.calculated.toolColours || []);
        }

        setSopLoaded(true);
      } catch (error) {
        console.error('Error loading SOP:', error);
        showToast({ 
          title: 'Error loading SOP', 
          description: error.message || 'Failed to load SOP data', 
          type: 'error' 
        });
        router.push('/dashboard/sops/list');
      } finally {
        setLoading(false);
      }
    };

    // Only load SOP after ingredients library is loaded (for name matching)
    if (dataLoaded && ingredientsLibrary.length > 0) {
      loadSOP();
    } else if (dataLoaded) {
      // If data is loaded but no ingredients, still load SOP (might not need matching)
      loadSOP();
    }
  }, [editId, companyId, sopLoaded, router, showToast, dataLoaded, ingredientsLibrary]);

  // Set default author from profile (only if not editing)
  useEffect(() => {
    if (!editId && profile?.full_name) {
      setAuthor(profile.full_name);
    }
  }, [profile, editId]);

  // Auto-generate reference code (only for new SOPs, not when editing)
  useEffect(() => {
    if (!editId && title && category && !refCode) {
      const prefixMap = {
        'Food Prep': 'PREP',
        'Service (FOH)': 'FOH',
        'Drinks': 'DRINK',
        'Hot Beverages': 'HOT',
        'Cold Beverages': 'COLD',
        'Cleaning': 'CLEAN',
        'Opening': 'OPEN',
        'Closing': 'CLOSE'
      };
      const prefix = prefixMap[category] || 'SOP';
      const nameBit = title.replace(/\s+/g, '').slice(0, 4).toUpperCase();
      setRefCode(`${prefix}-${nameBit}-001`);
    }
  }, [title, category, editId, refCode]);

  // Calculate totals and allergens from ingredients
  useEffect(() => {
    let cost = 0;
    let yieldVal = 0;
    const allergensSet = new Set();
    const coloursSet = new Set();

    ingredients.forEach(ing => {
      const libItem = ingredientsLibrary.find(i => i.id === ing.ingredient_id);
      if (libItem && ing.quantity) {
        // Convert quantity to match the ingredient library's unit
        const qtyInLibraryUnit = convertToUnit(ing.quantity, ing.unit, libItem.unit);
        
        // Calculate unit cost - use unit_cost if available, otherwise calculate from pack_cost/pack_size
        let unitCost = libItem.unit_cost || 0;
        if (!unitCost || unitCost === 0) {
          const packCost = parseFloat(libItem.pack_cost || 0);
          const packSize = parseFloat(libItem.pack_size || 0);
          if (packCost > 0 && packSize > 0) {
            unitCost = packCost / packSize;
          }
        }
        
        // Calculate cost with yield_percent adjustment (same logic as recipe system)
        // Formula: (unit_cost * quantity) / (yield_percent / 100)
        const yieldPercent = parseFloat(libItem.yield_percent || 100);
        let lineCost = 0;
        if (yieldPercent > 0) {
          lineCost = (unitCost * qtyInLibraryUnit) / (yieldPercent / 100);
        } else {
          lineCost = unitCost * qtyInLibraryUnit;
        }
        
        cost += lineCost;
        
        // Convert all units to grams for consistent yield calculation
        const qtyInGrams = convertToGrams(ing.quantity, ing.unit);
        yieldVal += qtyInGrams;
        
        (libItem.allergens || []).forEach(a => allergensSet.add(a));
        if (libItem.default_colour_code) coloursSet.add(libItem.default_colour_code);
      }
    });

    setTotalCost(cost);
    // Convert total yield back to kg for display
    setTotalYield(yieldVal / 1000);
    setAllergensList(Array.from(allergensSet));
    setToolColours(Array.from(coloursSet));
  }, [ingredients, ingredientsLibrary, convertToGrams, convertToUnit]);

  // Ingredient handlers
  const addIngredient = () => {
    if (linkedRecipeId) {
      showToast({
        title: 'Cannot add ingredients',
        description: 'This SOP is linked to a recipe. Please edit ingredients in the recipe, then update the SOP.',
        type: 'warning'
      });
      return;
    }
    setIngredients([...ingredients, { 
      id: Date.now(), 
      ingredient_id: "", 
      quantity: "", 
      unit: "", 
      allergens: [], 
      colour_code: "" 
    }]);
  };

  const handleIngredientSelect = (ingredient, targetIngredientId = null) => {
    // Add to recent ingredients
    setRecentIngredients(prev => {
      const filtered = prev.filter(item => item.id !== ingredient.id);
      return [ingredient, ...filtered].slice(0, 5);
    });

    if (targetIngredientId) {
      // Update existing ingredient row
      updateIngredient(targetIngredientId, 'ingredient_id', ingredient.id);
    } else {
      // Add new ingredient row with selected data
      setIngredients([...ingredients, {
        id: Date.now(),
        ingredient_id: ingredient.id,
        quantity: "",
        unit: ingredient.unit || "",
        allergens: ingredient.allergens || [],
        colour_code: ingredient.default_colour_code || ""
      }]);
    }
  };

  const removeIngredient = (id) => {
    if (linkedRecipeId) {
      showToast({
        title: 'Cannot remove ingredients',
        description: 'This SOP is linked to a recipe. Please edit ingredients in the recipe, then update the SOP.',
        type: 'warning'
      });
      return;
    }
    if (ingredients.length === 1) {
      showToast({ 
        title: 'Cannot remove', 
        description: 'At least one ingredient is required', 
        type: 'error' 
      });
      return;
    }
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const updateIngredient = (id, field, value) => {
    setIngredients(ingredients.map(ing => {
      if (ing.id === id) {
        if (field === 'ingredient_id') {
          const libItem = ingredientsLibrary.find(i => i.id === value);
          return {
            ...ing,
            ingredient_id: value,
            unit: libItem?.unit || "",
            allergens: libItem?.allergens || [],
            colour_code: libItem?.default_colour_code || ""
          };
        }
        return { ...ing, [field]: value };
      }
      return ing;
    }));
  };

  // Equipment handlers
  const addEquipment = () => {
    setEquipment([...equipment, { id: Date.now(), item: "", colour_code: "", sanitation_notes: "" }]);
  };

  const removeEquipment = (id) => {
    setEquipment(equipment.filter(eq => eq.id !== id));
  };

  const updateEquipment = (id, field, value) => {
    setEquipment(equipment.map(eq => eq.id === id ? { ...eq, [field]: value } : eq));
  };

  const handleEquipmentSelect = (equip, targetId) => {
    setRecentEquipment(prev => {
      const filtered = prev.filter(item => item.id !== equip.id);
      return [equip, ...filtered].slice(0, 5);
    });

    // Handle items from either equipment_library or assets table
    const equipmentName = equip.equipment_name || equip.name || '';
    const colourCode = equip.colour_code || '';

    setEquipment(equipment.map(eq =>
      eq.id === targetId
        ? {
            ...eq,
            item: equipmentName,
            colour_code: colourCode || eq.colour_code
          }
        : eq
    ));
  };

  // Process step handlers
  const addProcessStep = () => {
    setProcessSteps([...processSteps, { 
      id: Date.now(), 
      title: "", 
      description: "", 
      temperature: "", 
      duration: "", 
      haccp_note: "",
      is_ccp: false,
      photo_url: ""
    }]);
  };

  const removeProcessStep = (id) => {
    setProcessSteps(processSteps.filter(step => step.id !== id));
  };

  const updateProcessStep = (id, field, value) => {
    setProcessSteps(processSteps.map(step => step.id === id ? { ...step, [field]: value } : step));
  };

  // Drag and drop handlers for process steps
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setProcessSteps((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Photo upload helpers
  const handlePhotoUpload = async (file, stepId) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast({ 
        title: 'Invalid file type', 
        description: 'Please upload an image file (JPEG, PNG, or WebP)', 
        type: 'error' 
      });
      return;
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showToast({ 
        title: 'File too large', 
        description: 'Maximum file size is 5MB', 
        type: 'error' 
      });
      return;
    }

    try {
      setUploadingPhotos(prev => ({ ...prev, [stepId]: true }));
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${stepId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('sop-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('sop-photos')
        .getPublicUrl(filePath);

      // Update process step with photo URL
      updateProcessStep(stepId, 'photo_url', publicUrl);
      
      showToast({ 
        title: 'Photo uploaded', 
        description: 'Photo added to process step', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      showToast({ 
        title: 'Upload failed', 
        description: error.message || 'Failed to upload photo', 
        type: 'error' 
      });
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [stepId]: false }));
    }
  };

  const handleRemovePhoto = async (stepId, photoUrl) => {
    try {
      // Extract filename from URL
      const fileName = photoUrl.split('/').pop();
      
      // Delete from storage
      const { error } = await supabase.storage
        .from('sop-photos')
        .remove([fileName]);

      if (error) throw error;

      // Update process step to remove photo URL
      updateProcessStep(stepId, 'photo_url', '');
      
      showToast({ 
        title: 'Photo removed', 
        description: 'Photo deleted from process step', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Error removing photo:', error);
      showToast({ 
        title: 'Remove failed', 
        description: error.message || 'Failed to remove photo', 
        type: 'error' 
      });
    }
  };

  // Save handler
  const handleSave = async () => {
    if (!title || !author || !companyId) {
      showToast({ 
        title: 'Missing required fields', 
        description: 'Please fill in title and author', 
        type: 'error' 
      });
      return;
    }

    const sopData = {
      header: {
        title,
        refCode,
        version,
        status,
        author,
        category,
        allergens: headerAllergens // Save allergens in header
      },
      ingredients,
      equipment,
      processSteps,
      storage: { storageType, shelfLife, containerType },
      calculated: { totalCost, totalYield, allergensList, toolColours }
    };

    // Build metadata for print template (keeps equipment/method in sync)
    // Embedded inside sop_data since sop_entries has no separate metadata column
    const sopMetadata = {
      recipe: {
        name: title,
        code: refCode,
        version_number: parseFloat(version) || 1.0,
        allergens: allergensList,
        total_cost: totalCost,
        yield_qty: totalYield * 1000, // Convert back to grams
        yield_unit: 'g',
        shelf_life_days: shelfLife ? parseInt(shelfLife) || null : null,
        storage_requirements: STORAGE_TYPES.find(s => s.value === storageType)?.label || storageType
      },
      ingredients: ingredients.map((ing: any) => {
        const libItem = ingredientsLibrary.find((i: any) => i.id === ing.ingredient_id);
        return {
          ingredient_name: libItem?.ingredient_name || ing.ingredient_name || '',
          quantity: parseFloat(ing.quantity) || 0,
          unit: ing.unit || '',
          supplier: libItem?.supplier || '',
          allergens: ing.allergens || []
        };
      }),
      equipment: equipment.map((eq: any) => eq.item || eq.name || '').filter(Boolean),
      method_steps: processSteps.map((step: any) => step.description || step.text || '').filter(Boolean)
    };

    // Embed metadata inside sop_data JSONB
    sopData.metadata = sopMetadata;

    try {
      setSaving(true);
      
      console.log('Attempting to save SOP with data:', {
        company_id: companyId,
        title,
        ref_code: refCode,
        version,
        status,
        author,
        category
      });
      
      let result;
      if (editId && originalSOP) {
        // Create new version instead of updating
        const versioningInfo = await getVersioningInfo(
          originalSOP.ref_code,
          companyId,
          originalSOP
        );
        
        const baseData = {
          company_id: companyId,
          title,
          ref_code: originalSOP.ref_code, // Will be replaced with incremented ref_code in createVersionPayload
          status,
          author,
          category,
          sop_data: sopData, // metadata is already embedded inside sop_data
          linked_recipe_id: linkedRecipeId || originalSOP.linked_recipe_id || null, // Preserve linked recipe
          created_by: profile?.id,
          updated_by: profile?.id
        };
        
        const insertData = createVersionPayload(baseData, versioningInfo, profile, false);
        
        const { data, error } = await supabase
          .from('sop_entries')
          .insert(insertData)
          .select()
          .single();
        
        if (error) throw error;
        result = { data, error };
      } else {
        // Insert new SOP (first version)
        const baseData = {
          company_id: companyId,
          title,
          linked_recipe_id: linkedRecipeId || null, // Include linked recipe if exists
          ref_code: refCode,
          status,
          author,
          category,
          sop_data: sopData, // metadata is already embedded inside sop_data
          created_by: profile?.id,
          updated_by: profile?.id
        };
        
        const insertData = createVersionPayload(baseData, { newVersion: '1.0', versionNumber: 1, parentId: null }, profile, true);
        
        const { data, error } = await supabase
          .from('sop_entries')
          .insert(insertData)
          .select()
          .single();
        
        if (error) throw error;
        result = { data, error };
      }
      
      const { data, error } = result;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // If marked as sub-recipe, add to ingredients library
      if (isSubRecipe && data) {
        try {
          // Calculate cost per unit (total cost / total yield)
          const costPerUnit = totalYield > 0 ? totalCost / totalYield : 0;
          
          // Determine unit from storage (use shelfLife unit or default to 'each')
          const unit = shelfLife ? shelfLife.split(' ')[1] || 'each' : 'each';
          
          // Add to ingredients library
          const { error: libraryError } = await supabase
            .from('ingredients_library')
            .insert({
              company_id: companyId,
              ingredient_name: title,
              category: 'Sub-Recipes',
              unit: unit,
              unit_cost: costPerUnit,
              pack_size: `${totalYield} ${unit}`,
              supplier: 'Internal',
              allergens: allergensList,
              default_colour_code: 'Yellow',
              food_group: 'Prepared Item',
              notes: `Sub-recipe SOP: ${refCode}. Version: ${version}. Linked SOP ID: ${data.id}`,
              linked_sop_id: data.id // Add reference to the SOP
            });

          if (libraryError) {
            console.error('Error adding to ingredients library:', libraryError);
            showToast({
              title: 'SOP saved, but failed to add to ingredients library',
              description: libraryError.message,
              type: 'warning'
            });
          } else {
            showToast({ 
              title: 'SOP saved and added to ingredients library', 
              description: `Saved as ${refCode} and added as ingredient`, 
              type: 'success' 
            });
          }
        } catch (libError) {
          console.error('Error adding to ingredients library:', libError);
          showToast({
            title: 'SOP saved, but failed to add to ingredients library',
            description: 'Sub-recipe was saved but could not be added to ingredients library',
            type: 'warning'
          });
        }
      } else {
        if (editId && originalSOP) {
          showToast({ 
            title: 'New version created', 
            description: `Version ${data.version} saved as ${data.ref_code} (was ${originalSOP.ref_code})`, 
            type: 'success' 
          });
        } else {
          showToast({ 
            title: 'SOP saved successfully', 
            description: `Saved as ${refCode}`, 
            type: 'success' 
          });
        }
      }

      console.log('SOP saved:', data);
      
      // Redirect to MY SOPs page after successful save
      router.push('/dashboard/sops/list');
    } catch (error) {
      console.error('Error saving SOP:', error);
      const errorMessage = error?.message || error?.error_description || JSON.stringify(error) || 'Unknown error occurred';
      showToast({ 
        title: 'Error saving SOP', 
        description: errorMessage, 
        type: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[rgb(var(--background-primary))] dark:bg-neutral-900">
 <div className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Loading ingredients library...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 bg-[rgb(var(--background-primary))] dark:bg-neutral-900 min-h-screen">
      {/* Back Button */}
      <BackButton href="/dashboard/sops" label="Back to SOPs" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-magenta-600/20 to-blue-600/20 rounded-2xl p-6 border border-magenta-500/30">
        <h1 className="text-2xl font-semibold mb-2 text-[rgb(var(--text-primary))] dark:text-white">Food SOP Template</h1>
        <p className="text-[rgb(var(--text-secondary))] dark:text-neutral-300 text-sm">
          Form-based approach with auto-calculations and UK H&S compliance
        </p>
      </div>

      {/* SOP DETAILS SECTION */}
      <section className="bg-[rgb(var(--surface-elevated))] dark:bg-neutral-800/50 rounded-xl p-6 border border-[rgb(var(--border))] dark:border-theme">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">SOP Details</h2>
 <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-4">
          All SOPs must include title, reference code, version, and author per UK Health & Safety requirements
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[rgb(var(--text-secondary))] dark:text-neutral-300 mb-1">Category *</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] dark:text-white"
            >
              <option value="Food Prep">Food Prep</option>
              <option value="Service (FOH)">Service (FOH)</option>
              <option value="Drinks">Drinks</option>
              <option value="Hot Beverages">Hot Beverages</option>
              <option value="Cold Beverages">Cold Beverages</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Opening">Opening</option>
              <option value="Closing">Closing</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-[rgb(var(--text-secondary))] dark:text-neutral-300 mb-1">Status *</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] dark:text-white"
            >
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-[rgb(var(--text-secondary))] dark:text-neutral-300 mb-1">SOP Title *</label>
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
 className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary"
              placeholder="e.g., Chocolate Brownie Production"
            />
          </div>

          <div>
            <label className="block text-sm text-[rgb(var(--text-secondary))] dark:text-neutral-300 mb-1">Reference Code (Auto)</label>
            <input 
              value={refCode}
              readOnly
 className="w-full bg-[rgb(var(--surface-elevated))] dark:bg-neutral-900/50 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary"
            />
          </div>

          <div>
            <label className="block text-sm text-[rgb(var(--text-secondary))] dark:text-neutral-300 mb-1">Version *</label>
            <input 
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-[rgb(var(--text-secondary))] dark:text-neutral-300 mb-1">Author *</label>
            <input 
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
 className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary"
              placeholder="Your name"
            />
          </div>

          {/* Sub-Recipe Toggle */}
          <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isSubRecipe}
                onChange={(e) => setIsSubRecipe(e.target.checked)}
                className="w-4 h-4 rounded border-[rgb(var(--border))] dark:border-neutral-600 bg-[rgb(var(--surface))] dark:bg-neutral-900 text-magenta-500 focus:ring-magenta-500"
              />
              <span className="text-sm text-[rgb(var(--text-secondary))] dark:text-neutral-300">
                Mark as Sub-Recipe (will be added to ingredients library on save)
              </span>
            </label>
            {isSubRecipe && (
              <p className="text-xs text-yellow-400 mt-2 ml-6">
                ✓ This SOP will be saved as an ingredient in the ingredients library when you click Save
              </p>
            )}
          </div>
        </div>

        {/* Auto-calculated Summary */}
        <div className="mt-4 p-4 bg-magenta-500/10 border border-magenta-500/30 rounded-lg">
          <h3 className="text-sm font-semibold text-magenta-400 mb-2">Auto-Calculated Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
 <span className="text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">Yield:</span>
              <span className="ml-2 text-[rgb(var(--text-primary))] dark:text-white font-medium">{totalYield.toFixed(2)} kg</span>
            </div>
            <div>
 <span className="text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">Cost:</span>
              <span className="ml-2 text-[rgb(var(--text-primary))] dark:text-white font-medium">£{totalCost.toFixed(2)}</span>
            </div>
            <div>
 <span className="text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">Tool Colours:</span>
              <span className="ml-2 text-[rgb(var(--text-primary))] dark:text-white font-medium">{toolColours.length}</span>
            </div>
          </div>
          {allergensList.length > 0 && (
            <div className="mt-2 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-400 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {allergensList.map((allergen, idx) => (
                  <span key={idx} className="px-2 py-1 bg-red-500/20 border border-red-500/40 rounded-full text-xs text-red-400">
                    {allergen}
                  </span>
                ))}
              </div>
            </div>
          )}
          {toolColours.length > 0 && (
            <div className="mt-2">
 <span className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">Tool colours used: </span>
              <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-neutral-300">{toolColours.join(', ')}</span>
            </div>
          )}
        </div>
      </section>

      {/* INGREDIENTS SECTION */}
      <section className="bg-[rgb(var(--surface-elevated))] dark:bg-neutral-800/50 rounded-xl p-6 border border-[rgb(var(--border))] dark:border-theme">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Ingredients</h2>
 <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-4">
          List all ingredients with quantities. Allergens are auto-flagged per UK Food Information Regulations 2014
        </p>

        <div className="space-y-2">
          {ingredients.map((ing, index) => (
            <div key={ing.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
 {index === 0 && <label className="block text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-1">Ingredient</label>}
                <SmartSearch
                  libraryTable="ingredients_library"
                  placeholder={ing.ingredient_id ? ingredientsLibrary.find(i => i.id === ing.ingredient_id)?.ingredient_name : "Search ingredient..."}
                  categoryFilters={["Dry", "Wet", "Herb", "Spice", "Meat", "Fish", "Vegetable", "Fruit", "Dairy", "Condiment"]}
                  onSelect={(ingredient) => handleIngredientSelect(ingredient, ing.id)}
                  recentItems={recentIngredients}
                  allowMultiple={false}
                  currentSelected={ing.ingredient_id ? [ingredientsLibrary.find(i => i.id === ing.ingredient_id)] : []}
                />
              </div>
              <div className="col-span-2">
 {index === 0 && <label className="block text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-1">Quantity</label>}
                <input
                  type="number"
                  step="0.01"
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(ing.id, 'quantity', e.target.value)}
                  className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] dark:text-white text-sm"
                />
              </div>
              <div className="col-span-2">
 {index === 0 && <label className="block text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-1">Unit</label>}
                <select
                  value={ing.unit}
                  onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                  className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] dark:text-white text-sm"
                >
                  <option value="">Select unit...</option>
                  {UNIT_OPTIONS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
 {index === 0 && <label className="block text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-1">Tool Colour</label>}
                <input
                  value={ing.colour_code}
                  readOnly
 className="w-full bg-[rgb(var(--surface-elevated))] dark:bg-neutral-900/50 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary text-sm truncate"
                  title={ing.colour_code}
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeIngredient(ing.id)}
                  disabled={ingredients.length === 1 || !!linkedRecipeId}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  title={linkedRecipeId ? 'Cannot remove ingredients from linked SOP. Edit in recipe instead.' : ''}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* For Food Prep SOPs, always show View Linked Recipe button instead of Add Ingredient */}
        {category === 'Food Prep' ? (
          <Link
            href={linkedRecipeId ? `/dashboard/stockly/recipes?recipe=${linkedRecipeId}` : '/dashboard/stockly/recipes'}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm transition-colors"
          >
            <FileText size={16} />
            {linkedRecipeId ? 'View Linked Recipe' : 'View Recipes'}
          </Link>
        ) : (
          <button
            onClick={addIngredient}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm transition-colors"
          >
            <Plus size={16} />
            Add Ingredient Row
          </button>
        )}
      </section>

      {/* EQUIPMENT SECTION */}
      <section className="bg-[rgb(var(--surface-elevated))] rounded-xl p-6 border border-[rgb(var(--border))]">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Equipment & Tools</h2>
 <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-4">
          List all equipment with colour codes per Food Standards Agency guidance
        </p>

        <div className="space-y-2">
          {equipment.map((eq, index) => (
            <div key={eq.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
 {index === 0 && <label className="block text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-1">Equipment Item</label>}
                <SmartSearch
                  libraryTable="equipment_library"
                  additionalTables={["assets"]}
                  placeholder={eq.item ? eq.item : "Search equipment or assets..."}
                  onSelect={(equip) => handleEquipmentSelect(equip, eq.id)}
                  recentItems={recentEquipment}
                  allowMultiple={false}
                  currentSelected={eq.item ? [equipmentLibrary.find(e => e.equipment_name === eq.item)] : []}
                />
              </div>
              <div className="col-span-3">
 {index === 0 && <label className="block text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-1">Colour Code</label>}
                {eq.item ? (
                  <input
                    value={eq.colour_code}
                    readOnly
 className="w-full bg-[rgb(var(--surface-elevated))] dark:bg-neutral-900/50 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary text-sm"
                    title="Colour code set from equipment selection"
                  />
                ) : (
                  <select
                    value={eq.colour_code}
                    onChange={(e) => updateEquipment(eq.id, 'colour_code', e.target.value)}
                    className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] dark:text-white text-sm"
                  >
                    <option value="">Select...</option>
                    {COLOUR_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div className="col-span-3">
 {index === 0 && <label className="block text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-1">Sanitation Notes</label>}
                <input
                  value={eq.sanitation_notes}
                  onChange={(e) => updateEquipment(eq.id, 'sanitation_notes', e.target.value)}
 className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] text-sm placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary"
                  placeholder="Cleaning method"
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeEquipment(eq.id)}
                  disabled={equipment.length === 1}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-500/20"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addEquipment}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm transition-colors"
        >
          <Plus size={16} />
          Add Equipment Row
        </button>
      </section>

      {/* PROCESS STEPS SECTION */}
      <section className="bg-[rgb(var(--surface-elevated))] dark:bg-neutral-800/50 rounded-xl p-6 border border-[rgb(var(--border))] dark:border-theme">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Process Steps</h2>
 <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-4">
          Break down the process into clear, numbered steps. Include HACCP critical control points where applicable. 
          <span className="block mt-1 text-magenta-400/80">💡 Drag steps to reorder • Click step title to rename</span>
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={processSteps.map(step => step.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {processSteps.map((step, index) => (
                <SortableStepItem
                  key={step.id}
                  step={step}
                  index={index}
                  processSteps={processSteps}
                  updateProcessStep={updateProcessStep}
                  removeProcessStep={removeProcessStep}
                  photoInputRefs={photoInputRefs}
                  uploadingPhotos={uploadingPhotos}
                  handlePhotoUpload={handlePhotoUpload}
                  handleRemovePhoto={handleRemovePhoto}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <button
          onClick={addProcessStep}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm transition-colors"
        >
          <Plus size={16} />
          Add Process Step
        </button>
      </section>

      {/* STORAGE SECTION */}
      <section className="bg-[rgb(var(--surface-elevated))] dark:bg-neutral-800/50 rounded-xl p-6 border border-[rgb(var(--border))] dark:border-theme">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Storage Information</h2>
 <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-4">
          Specify storage conditions per Food Safety Act 1990 requirements
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[rgb(var(--text-secondary))] dark:text-neutral-300 mb-1">Storage Type *</label>
            <select 
              value={storageType}
              onChange={(e) => setStorageType(e.target.value)}
              className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] dark:text-white"
            >
              {STORAGE_TYPES.map(st => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[rgb(var(--text-secondary))] dark:text-neutral-300 mb-1">Shelf Life</label>
            <input
              value={shelfLife}
              onChange={(e) => setShelfLife(e.target.value)}
 className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary"
              placeholder="e.g., 3 days"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-[rgb(var(--text-secondary))] dark:text-neutral-300 mb-1">Container Type</label>
            <input
              value={containerType}
              onChange={(e) => setContainerType(e.target.value)}
 className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-900 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-3 py-2 text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-theme-tertiary"
              placeholder="e.g., Food-grade plastic container with lid"
            />
          </div>
        </div>
      </section>

      {/* SAVE ACTIONS */}
      <div className="flex gap-4 sticky bottom-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-transparent text-magenta-400 border border-magenta-500 rounded-lg font-medium transition-all duration-150 hover:bg-magenta-500/10 hover:shadow-module-glow focus:outline-none focus:ring-2 focus:ring-magenta-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save SOP'}
        </button>
        <button
          onClick={() => window.print()}
          className="px-6 py-3 bg-[rgb(var(--surface-elevated))] dark:bg-neutral-700 hover:bg-[rgb(var(--surface))] dark:hover:bg-neutral-600 rounded-lg text-[rgb(var(--text-primary))] dark:text-white font-medium flex items-center gap-2 transition-colors shadow-lg"
        >
          <Download size={20} />
          Export PDF / Print
        </button>
      </div>
    </div>
  );
}

export default function FoodSOPTemplatePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[rgb(var(--background-primary))] dark:bg-neutral-900">
 <div className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Loading food SOP template...</div>
      </div>
    }>
      <FoodSOPTemplatePageContent />
    </Suspense>
  );
}

