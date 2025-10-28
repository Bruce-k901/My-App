"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, AlertTriangle, Save, Download, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import SmartSearch from '@/components/SmartSearch';
import BackButton from '@/components/ui/BackButton';

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

export default function FoodSOPTemplatePage() {
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  
  // Loading state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ingredientsLibrary, setIngredientsLibrary] = useState([]);
  const [equipmentLibrary, setEquipmentLibrary] = useState([]);
  const [recentIngredients, setRecentIngredients] = useState([]);
  const [recentEquipment, setRecentEquipment] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false); // Prevent duplicate loads

  // Header state
  const [title, setTitle] = useState("");
  const [refCode, setRefCode] = useState("");
  const [version, setVersion] = useState("1.0");
  const [status, setStatus] = useState("Draft");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("Food Prep");
  const [isSubRecipe, setIsSubRecipe] = useState(false);

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
    { id: Date.now(), description: "", temperature: "", duration: "", haccp_note: "", is_ccp: false, photo_url: "" }
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
          .select('id, ingredient_name, unit, unit_cost, allergens, default_colour_code, category, supplier, linked_sop_id')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Set default author from profile
  useEffect(() => {
    if (profile?.full_name) {
      setAuthor(profile.full_name);
    }
  }, [profile]);

  // Auto-generate reference code
  useEffect(() => {
    if (title && category) {
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
  }, [title, category]);

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
        cost += (libItem.unit_cost || 0) * qtyInLibraryUnit;
        
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
  }, [ingredients, ingredientsLibrary]);

  // Ingredient handlers
  const addIngredient = () => {
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

    setEquipment(equipment.map(eq => 
      eq.id === targetId 
        ? { 
            ...eq, 
            item: equip.equipment_name,
            colour_code: equip.colour_code || eq.colour_code
          }
        : eq
    ));
  };

  // Process step handlers
  const addProcessStep = () => {
    setProcessSteps([...processSteps, { 
      id: Date.now(), 
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
      const { data: uploadData, error: uploadError } = await supabase.storage
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
      header: { title, refCode, version, status, author, category },
      ingredients,
      equipment,
      processSteps,
      storage: { storageType, shelfLife, containerType },
      calculated: { totalCost, totalYield, allergensList, toolColours }
    };

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
      
      const { data, error } = await supabase
        .from('sop_entries')
        .insert({
          company_id: companyId,
          title,
          ref_code: refCode,
          version,
          status,
          author,
          category,
          sop_data: sopData,
          created_by: profile?.id,
          updated_by: profile?.id
        })
        .select()
        .single();

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
        showToast({ 
          title: 'SOP saved successfully', 
          description: `Saved as ${refCode}`, 
          type: 'success' 
        });
      }

      console.log('SOP saved:', data);
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
      <div className="flex items-center justify-center min-h-screen bg-neutral-900">
        <div className="text-neutral-400">Loading ingredients library...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 bg-neutral-900 min-h-screen">
      {/* Back Button */}
      <BackButton href="/dashboard/sops" label="Back to SOPs" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-magenta-600/20 to-blue-600/20 rounded-2xl p-6 border border-magenta-500/30">
        <h1 className="text-2xl font-semibold mb-2">Food SOP Template</h1>
        <p className="text-neutral-300 text-sm">
          Form-based approach with auto-calculations and UK H&S compliance
        </p>
      </div>

      {/* SOP DETAILS SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">SOP Details</h2>
        <p className="text-xs text-neutral-400 mb-4">
          All SOPs must include title, reference code, version, and author per UK Health & Safety requirements
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Category *</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
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
            <label className="block text-sm text-neutral-300 mb-1">Status *</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-neutral-300 mb-1">SOP Title *</label>
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., Chocolate Brownie Production"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">Reference Code (Auto)</label>
            <input 
              value={refCode}
              readOnly
              className="w-full bg-neutral-900/50 border border-neutral-600 rounded-lg px-3 py-2 text-neutral-400"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">Version *</label>
            <input 
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">Author *</label>
            <input 
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
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
                className="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-magenta-500 focus:ring-magenta-500"
              />
              <span className="text-sm text-neutral-300">
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
              <span className="text-neutral-400">Yield:</span>
              <span className="ml-2 text-white font-medium">{totalYield.toFixed(2)} kg</span>
            </div>
            <div>
              <span className="text-neutral-400">Cost:</span>
              <span className="ml-2 text-white font-medium">£{totalCost.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-neutral-400">Tool Colours:</span>
              <span className="ml-2 text-white font-medium">{toolColours.length}</span>
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
              <span className="text-xs text-neutral-400">Tool colours used: </span>
              <span className="text-xs text-neutral-300">{toolColours.join(', ')}</span>
            </div>
          )}
        </div>
      </section>

      {/* INGREDIENTS SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Ingredients</h2>
        <p className="text-xs text-neutral-400 mb-4">
          List all ingredients with quantities. Allergens are auto-flagged per UK Food Information Regulations 2014
        </p>

        <div className="space-y-2">
          {ingredients.map((ing, index) => (
            <div key={ing.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Ingredient</label>}
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
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Quantity</label>}
                <input
                  type="number"
                  step="0.01"
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(ing.id, 'quantity', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Unit</label>}
                <select
                  value={ing.unit}
                  onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">Select unit...</option>
                  {UNIT_OPTIONS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Tool Colour</label>}
                <input
                  value={ing.colour_code}
                  readOnly
                  className="w-full bg-neutral-900/50 border border-neutral-600 rounded-lg px-3 py-2 text-neutral-400 text-sm truncate"
                  title={ing.colour_code}
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeIngredient(ing.id)}
                  disabled={ingredients.length === 1}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addIngredient}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm transition-colors"
        >
          <Plus size={16} />
          Add Ingredient Row
        </button>
      </section>

      {/* EQUIPMENT SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Equipment & Tools</h2>
        <p className="text-xs text-neutral-400 mb-4">
          List all equipment with colour codes per Food Standards Agency guidance
        </p>

        <div className="space-y-2">
          {equipment.map((eq, index) => (
            <div key={eq.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Equipment Item</label>}
                <SmartSearch
                  libraryTable="equipment_library"
                  placeholder={eq.item ? eq.item : "Search equipment..."}
                  onSelect={(equip) => handleEquipmentSelect(equip, eq.id)}
                  recentItems={recentEquipment}
                  allowMultiple={false}
                  currentSelected={eq.item ? [equipmentLibrary.find(e => e.equipment_name === eq.item)] : []}
                />
              </div>
              <div className="col-span-3">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Colour Code</label>}
                {eq.item ? (
                  <input
                    value={eq.colour_code}
                    readOnly
                    className="w-full bg-neutral-900/50 border border-neutral-600 rounded-lg px-3 py-2 text-neutral-400 text-sm"
                    title="Colour code set from equipment selection"
                  />
                ) : (
                  <select
                    value={eq.colour_code}
                    onChange={(e) => updateEquipment(eq.id, 'colour_code', e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="">Select...</option>
                    {COLOUR_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div className="col-span-3">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Sanitation Notes</label>}
                <input
                  value={eq.sanitation_notes}
                  onChange={(e) => updateEquipment(eq.id, 'sanitation_notes', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Cleaning method"
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeEquipment(eq.id)}
                  disabled={equipment.length === 1}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
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
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Process Steps</h2>
        <p className="text-xs text-neutral-400 mb-4">
          Break down the process into clear, numbered steps. Include HACCP critical control points where applicable
        </p>

        <div className="space-y-3">
          {processSteps.map((step, index) => (
            <div key={step.id} className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-600">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-magenta-400">Step {index + 1}</span>
                <button
                  onClick={() => removeProcessStep(step.id)}
                  disabled={processSteps.length === 1}
                  className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <textarea
                  value={step.description}
                  onChange={(e) => updateProcessStep(step.id, 'description', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Describe this step in detail..."
                  rows={2}
                />

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Temperature (°C)</label>
                    <input
                      type="number"
                      value={step.temperature}
                      onChange={(e) => updateProcessStep(step.id, 'temperature', e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Duration</label>
                    <input
                      value={step.duration}
                      onChange={(e) => updateProcessStep(step.id, 'duration', e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="e.g., 15 min"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={step.is_ccp}
                        onChange={(e) => updateProcessStep(step.id, 'is_ccp', e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-600 bg-neutral-900"
                      />
                      Critical Control Point
                    </label>
                  </div>
                </div>

                <input
                  value={step.haccp_note}
                  onChange={(e) => updateProcessStep(step.id, 'haccp_note', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="HACCP notes (optional)"
                />

                {/* Photo Upload Section */}
                <div className="mt-3 pt-3 border-t border-neutral-700">
                  <label className="block text-xs text-neutral-400 mb-2">Process Photo</label>
                  {step.photo_url ? (
                    <div className="relative inline-block">
                      <img 
                        src={step.photo_url} 
                        alt="Process step photo" 
                        className="w-32 h-32 object-cover rounded-lg border border-neutral-600"
                      />
                      <button
                        onClick={() => handleRemovePhoto(step.id, step.photo_url)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white"
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
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm transition-colors disabled:opacity-50"
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
                      <span className="text-xs text-neutral-500">Max 5MB, JPEG/PNG/WebP</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addProcessStep}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm transition-colors"
        >
          <Plus size={16} />
          Add Process Step
        </button>
      </section>

      {/* STORAGE SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Storage Information</h2>
        <p className="text-xs text-neutral-400 mb-4">
          Specify storage conditions per Food Safety Act 1990 requirements
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Storage Type *</label>
            <select 
              value={storageType}
              onChange={(e) => setStorageType(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
            >
              {STORAGE_TYPES.map(st => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">Shelf Life</label>
            <input
              value={shelfLife}
              onChange={(e) => setShelfLife(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., 3 days"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-neutral-300 mb-1">Container Type</label>
            <input
              value={containerType}
              onChange={(e) => setContainerType(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
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
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-magenta-600 to-blue-600 hover:from-magenta-500 hover:to-blue-500 rounded-lg text-white font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save SOP'}
        </button>
        <button
          onClick={() => showToast({ title: 'Export', description: 'PDF export coming soon', type: 'info' })}
          className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white font-medium flex items-center gap-2 transition-colors shadow-lg"
        >
          <Download size={20} />
          Export PDF
        </button>
      </div>
    </div>
  );
}

