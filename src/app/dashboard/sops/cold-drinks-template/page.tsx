"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Save, Download, Upload, X, Loader2, Droplet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

export default function ColdDrinksSOPTemplatePage() {
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Library data
  const [ingredientsLibrary, setIngredientsLibrary] = useState([]);
  const [drinksLibrary, setDrinksLibrary] = useState([]);
  const [glasswareLibrary, setGlasswareLibrary] = useState([]);
  const [disposablesLibrary, setDisposablesLibrary] = useState([]);

  // Header state
  const [title, setTitle] = useState("");
  const [refCode, setRefCode] = useState("");
  const [version, setVersion] = useState("1.0");
  const [status, setStatus] = useState("Draft");
  const [author, setAuthor] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");

  // Equipment
  const [equipment, setEquipment] = useState({
    blender_type: "",
    speed_setting: "",
    other_equipment: ""
  });

  // Ingredients
  const [ingredients, setIngredients] = useState([
    { id: Date.now(), item_id: "", item_name: "", quantity: "", unit: "", allergens: [], prep_notes: "", cost: "" }
  ]);

  // Recipe steps
  const [recipeSteps, setRecipeSteps] = useState([
    { id: Date.now(), step: "", blending_time: "", order: "", photo_url: "" }
  ]);

  // Consistency checks
  const [consistencyChecks, setConsistencyChecks] = useState([
    { id: Date.now(), check: "", standard: "" }
  ]);

  // Presentation
  const [presentation, setPresentation] = useState({
    glassware_id: "",
    garnish_id: "",
    straw_id: "",
    serving_temp: "",
    photo_url: ""
  });

  // Storage info
  const [storage, setStorage] = useState({
    can_premake: false,
    prep_advance: "",
    storage_method: "",
    shelf_life: ""
  });

  // Photo upload refs
  const photoInputRefs = useRef({});
  const [uploadingPhotos, setUploadingPhotos] = useState({});

  // Load libraries
  const loadLibraries = useCallback(async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      const [ingredientsResult, drinksResult, glasswareResult, disposablesResult] = await Promise.all([
        supabase.from('ingredients_library').select('*').eq('company_id', companyId).order('ingredient_name'),
        supabase.from('drinks_library').select('*').eq('company_id', companyId).order('item_name'),
        supabase.from('glassware_library').select('*').eq('company_id', companyId).eq('category', 'Soft Drinks').order('item_name'),
        supabase.from('disposables_library').select('*').eq('company_id', companyId).order('item_name')
      ]);
      
      if (ingredientsResult.error) throw ingredientsResult.error;
      if (drinksResult.error) throw drinksResult.error;
      if (glasswareResult.error) throw glasswareResult.error;
      if (disposablesResult.error) throw disposablesResult.error;
      
      setIngredientsLibrary(ingredientsResult.data || []);
      setDrinksLibrary(drinksResult.data || []);
      setGlasswareLibrary(glasswareResult.data || []);
      setDisposablesLibrary(disposablesResult.data || []);
    } catch (error) {
      console.error('Error loading libraries:', error);
      showToast({ title: 'Error loading libraries', description: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [companyId, showToast]);

  useEffect(() => {
    loadLibraries();
  }, [loadLibraries]);

  // Set default author
  useEffect(() => {
    if (profile?.full_name) {
      setAuthor(profile.full_name);
    }
  }, [profile]);

  // Auto-generate reference code
  useEffect(() => {
    if (title) {
      const nameBit = title.replace(/\s+/g, '').slice(0, 4).toUpperCase();
      setRefCode(`COLD-${nameBit}-001`);
    }
  }, [title]);

  const addIngredient = () => {
    setIngredients([...ingredients, { id: Date.now(), item_id: "", item_name: "", quantity: "", unit: "", allergens: [], prep_notes: "", cost: "" }]);
  };

  const removeIngredient = (id) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const updateIngredient = (id, field, value) => {
    setIngredients(ingredients.map(ing => ing.id === id ? { ...ing, [field]: value } : ing));
  };

  const addRecipeStep = () => {
    setRecipeSteps([...recipeSteps, { id: Date.now(), step: "", blending_time: "", order: "", photo_url: "" }]);
  };

  const removeRecipeStep = (id) => {
    setRecipeSteps(recipeSteps.filter(step => step.id !== id));
  };

  const updateRecipeStep = (id, field, value) => {
    setRecipeSteps(recipeSteps.map(step => step.id === id ? { ...step, [field]: value } : step));
  };

  const addConsistencyCheck = () => {
    setConsistencyChecks([...consistencyChecks, { id: Date.now(), check: "", standard: "" }]);
  };

  const removeConsistencyCheck = (id) => {
    setConsistencyChecks(consistencyChecks.filter(cc => cc.id !== id));
  };

  const updateConsistencyCheck = (id, field, value) => {
    setConsistencyChecks(consistencyChecks.map(cc => cc.id === id ? { ...cc, [field]: value } : cc));
  };

  const handleSave = async () => {
    if (!title || !author || !companyId) {
      showToast({ title: 'Missing required fields', description: 'Please fill in title and author', type: 'error' });
      return;
    }

    const sopData = {
      header: { title, refCode, version, status, author, estimatedTime },
      equipment,
      ingredients,
      recipeSteps,
      consistencyChecks,
      presentation,
      storage
    };

    try {
      setSaving(true);
      
      const { data, error } = await supabase
        .from('sop_entries')
        .insert({
          company_id: companyId,
          title,
          ref_code: refCode,
          version,
          status,
          author,
          category: 'Cold Beverages',
          sop_data: sopData,
          created_by: profile?.id,
          updated_by: profile?.id
        })
        .select()
        .single();

      if (error) throw error;

      showToast({ title: 'SOP saved successfully', description: `Saved as ${refCode}`, type: 'success' });
    } catch (error) {
      console.error('Error saving SOP:', error);
      showToast({ title: 'Error saving SOP', description: error.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900">
        <div className="text-neutral-400">Loading libraries...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 bg-neutral-900 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl p-6 border border-blue-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
          <div>
            <h1 className="text-lg font-semibold text-white">Cold Drinks SOP Template</h1>
            <p className="text-sm text-neutral-400">Smoothies, Shakes & Juices</p>
          </div>
        </div>
      </div>

      {/* SOP Details */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-blue-400 mb-4">SOP Details</h2>
        
        <div className="grid grid-cols-2 gap-4">
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
            <label className="block text-sm text-neutral-300 mb-1">Beverage Name *</label>
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., Berry Smoothie"
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

          <div>
            <label className="block text-sm text-neutral-300 mb-1">Estimated Time</label>
            <input 
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., 3 minutes"
            />
          </div>
        </div>
      </section>

      {/* Equipment */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-blue-400 mb-4">Equipment</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Blender Type/Model</label>
            <input
              value={equipment.blender_type}
              onChange={(e) => setEquipment({ ...equipment, blender_type: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., Vitamix 5200"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">Speed Setting</label>
            <input
              value={equipment.speed_setting}
              onChange={(e) => setEquipment({ ...equipment, speed_setting: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., High - 30 seconds"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-neutral-300 mb-1">Other Equipment</label>
            <input
              value={equipment.other_equipment}
              onChange={(e) => setEquipment({ ...equipment, other_equipment: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., Juicer, Ice crusher"
            />
          </div>
        </div>
      </section>

      {/* Ingredients */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-blue-400">Ingredients</h2>
          <button onClick={addIngredient} className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-lg text-blue-400 text-sm flex items-center gap-2">
            <Plus size={16} /> Add Ingredient
          </button>
        </div>

        <div className="space-y-3">
          {ingredients.map((ing, index) => (
            <div key={ing.id} className="grid grid-cols-12 gap-2 items-start bg-neutral-900/50 p-3 rounded-lg">
              <div className="col-span-3">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Ingredient</label>}
                <select
                  value={ing.item_id}
                  onChange={(e) => {
                    const selected = [...ingredientsLibrary, ...drinksLibrary].find(item => item.id === e.target.value);
                    updateIngredient(ing.id, 'item_id', e.target.value);
                    updateIngredient(ing.id, 'item_name', selected?.ingredient_name || selected?.item_name || '');
                    updateIngredient(ing.id, 'allergens', selected?.allergens || []);
                  }}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">Select...</option>
                  {ingredientsLibrary.map(item => (
                    <option key={item.id} value={item.id}>{item.ingredient_name}</option>
                  ))}
                  {drinksLibrary.map(item => (
                    <option key={item.id} value={item.id}>{item.item_name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Quantity</label>}
                <input
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(ing.id, 'quantity', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., 100"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Unit</label>}
                <input
                  value={ing.unit}
                  onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="g, ml"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Prep Notes</label>}
                <input
                  value={ing.prep_notes}
                  onChange={(e) => updateIngredient(ing.id, 'prep_notes', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Frozen, Peeled"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Cost</label>}
                <input
                  value={ing.cost}
                  onChange={(e) => updateIngredient(ing.id, 'cost', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="£0.00"
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeIngredient(ing.id)}
                  disabled={ingredients.length === 1}
                  className="w-full mt-6 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recipe Steps */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-blue-400">Recipe Steps</h2>
          <button onClick={addRecipeStep} className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-lg text-blue-400 text-sm flex items-center gap-2">
            <Plus size={16} /> Add Step
          </button>
        </div>

        <div className="space-y-4">
          {recipeSteps.map((step, index) => (
            <div key={step.id} className="bg-neutral-900/50 p-4 rounded-lg space-y-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Step Description</label>
                <textarea
                  value={step.step}
                  onChange={(e) => updateRecipeStep(step.id, 'step', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  rows={2}
                  placeholder="Describe the step..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Blending Time/Speed</label>
                  <input
                    value={step.blending_time}
                    onChange={(e) => updateRecipeStep(step.id, 'blending_time', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="e.g., High 30 seconds"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Order</label>
                  <input
                    value={step.order}
                    onChange={(e) => updateRecipeStep(step.id, 'order', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="e.g., Add liquid first"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-400">Step {index + 1}</span>
                <button
                  onClick={() => removeRecipeStep(step.id)}
                  disabled={recipeSteps.length === 1}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-400 text-sm disabled:opacity-30"
                >
                  <Trash2 size={16} className="inline mr-1" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Consistency Checks */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-blue-400">Consistency Checks</h2>
          <button onClick={addConsistencyCheck} className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-lg text-blue-400 text-sm flex items-center gap-2">
            <Plus size={16} /> Add Check
          </button>
        </div>

        <div className="space-y-3">
          {consistencyChecks.map((cc, index) => (
            <div key={cc.id} className="grid grid-cols-12 gap-2 items-start bg-neutral-900/50 p-3 rounded-lg">
              <div className="col-span-5">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Check</label>}
                <input
                  value={cc.check}
                  onChange={(e) => updateConsistencyCheck(cc.id, 'check', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Texture"
                />
              </div>
              <div className="col-span-6">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Standard</label>}
                <input
                  value={cc.standard}
                  onChange={(e) => updateConsistencyCheck(cc.id, 'standard', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Smooth, no lumps"
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeConsistencyCheck(cc.id)}
                  disabled={consistencyChecks.length === 1}
                  className="w-full mt-6 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Presentation */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-blue-400 mb-4">Presentation</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Glassware</label>
            <select
              value={presentation.glassware_id}
              onChange={(e) => setPresentation({ ...presentation, glassware_id: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="">Select glassware...</option>
              {glasswareLibrary.map(glass => (
                <option key={glass.id} value={glass.id}>{glass.item_name} ({glass.capacity_ml}ml)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">Garnish</label>
            <select
              value={presentation.garnish_id}
              onChange={(e) => setPresentation({ ...presentation, garnish_id: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="">Select garnish...</option>
              {drinksLibrary.filter(d => d.category === 'Garnish').map(garnish => (
                <option key={garnish.id} value={garnish.id}>{garnish.item_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">Straw</label>
            <select
              value={presentation.straw_id}
              onChange={(e) => setPresentation({ ...presentation, straw_id: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="">Select straw...</option>
              {disposablesLibrary.filter(d => d.category === 'Straws').map(straw => (
                <option key={straw.id} value={straw.id}>{straw.item_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">Serving Temperature</label>
            <input
              value={presentation.serving_temp}
              onChange={(e) => setPresentation({ ...presentation, serving_temp: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., Chilled 4°C"
            />
          </div>
        </div>
      </section>

      {/* Storage Info */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-blue-400 mb-4">Storage Information</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-sm text-neutral-300 mb-1">
              <input
                type="checkbox"
                checked={storage.can_premake}
                onChange={(e) => setStorage({ ...storage, can_premake: e.target.checked })}
                className="w-4 h-4"
              />
              Can be pre-made?
            </label>
          </div>

          {storage.can_premake && (
            <>
              <div>
                <label className="block text-sm text-neutral-300 mb-1">Advance Prep Time</label>
                <input
                  value={storage.prep_advance}
                  onChange={(e) => setStorage({ ...storage, prep_advance: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                  placeholder="e.g., 2 hours"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300 mb-1">Storage Method</label>
                <input
                  value={storage.storage_method}
                  onChange={(e) => setStorage({ ...storage, storage_method: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                  placeholder="e.g., Chilled, Ice bath"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-neutral-300 mb-1">Shelf Life</label>
                <input
                  value={storage.shelf_life}
                  onChange={(e) => setStorage({ ...storage, shelf_life: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
                  placeholder="e.g., 24 hours refrigerated"
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Save Button */}
      <div className="flex gap-4 sticky bottom-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {saving ? 'Saving...' : 'Save SOP'}
        </button>
      </div>
    </div>
  );
}
