"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Save, Download, Upload, X, Loader2, Coffee } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import BackButton from '@/components/ui/BackButton';
import { useRouter } from 'next/navigation';

export default function HotDrinksSOPTemplatePage() {
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Library data
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

  // Equipment setup
  const [equipment, setEquipment] = useState([
    { id: Date.now(), item: "", settings: "", notes: "" }
  ]);

  // Ingredients
  const [ingredients, setIngredients] = useState([
    { id: Date.now(), item_id: "", item_name: "", quantity: "", unit: "", allergens: [], cost: "" }
  ]);

  // Recipe steps
  const [recipeSteps, setRecipeSteps] = useState([
    { id: Date.now(), step: "", temperature: "", timing: "", texture_notes: "", photo_url: "" }
  ]);

  // Quality checks
  const [qualityChecks, setQualityChecks] = useState([
    { id: Date.now(), check: "", standard: "" }
  ]);

  // Common faults
  const [faults, setFaults] = useState([
    { id: Date.now(), fault: "", cause: "", fix: "" }
  ]);

  // Presentation
  const [presentation, setPresentation] = useState({
    glassware_id: "",
    garnish: "",
    serving_temp: "",
    photo_url: ""
  });

  // Photo upload refs
  const photoInputRefs = useRef({});
  const [uploadingPhotos, setUploadingPhotos] = useState({});

  // Load libraries
  const loadLibraries = useCallback(async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      const [drinksResult, glasswareResult, disposablesResult] = await Promise.all([
        supabase.from('drinks_library').select('*').eq('company_id', companyId).order('item_name'),
        supabase.from('glassware_library').select('*').eq('company_id', companyId).eq('category', 'Hot Beverages').order('item_name'),
        supabase.from('disposables_library').select('*').eq('company_id', companyId).order('item_name')
      ]);
      
      if (drinksResult.error) throw drinksResult.error;
      if (glasswareResult.error) throw glasswareResult.error;
      if (disposablesResult.error) throw disposablesResult.error;
      
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
      setRefCode(`HOT-${nameBit}-001`);
    }
  }, [title]);

  const addEquipment = () => {
    setEquipment([...equipment, { id: Date.now(), item: "", settings: "", notes: "" }]);
  };

  const removeEquipment = (id) => {
    setEquipment(equipment.filter(eq => eq.id !== id));
  };

  const updateEquipment = (id, field, value) => {
    setEquipment(equipment.map(eq => eq.id === id ? { ...eq, [field]: value } : eq));
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { id: Date.now(), item_id: "", item_name: "", quantity: "", unit: "", allergens: [], cost: "" }]);
  };

  const removeIngredient = (id) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const updateIngredient = (id, field, value) => {
    setIngredients(ingredients.map(ing => ing.id === id ? { ...ing, [field]: value } : ing));
  };

  const addRecipeStep = () => {
    setRecipeSteps([...recipeSteps, { id: Date.now(), step: "", temperature: "", timing: "", texture_notes: "", photo_url: "" }]);
  };

  const removeRecipeStep = (id) => {
    setRecipeSteps(recipeSteps.filter(step => step.id !== id));
  };

  const updateRecipeStep = (id, field, value) => {
    setRecipeSteps(recipeSteps.map(step => step.id === id ? { ...step, [field]: value } : step));
  };

  const addQualityCheck = () => {
    setQualityChecks([...qualityChecks, { id: Date.now(), check: "", standard: "" }]);
  };

  const removeQualityCheck = (id) => {
    setQualityChecks(qualityChecks.filter(qc => qc.id !== id));
  };

  const updateQualityCheck = (id, field, value) => {
    setQualityChecks(qualityChecks.map(qc => qc.id === id ? { ...qc, [field]: value } : qc));
  };

  const addFault = () => {
    setFaults([...faults, { id: Date.now(), fault: "", cause: "", fix: "" }]);
  };

  const removeFault = (id) => {
    setFaults(faults.filter(f => f.id !== id));
  };

  const updateFault = (id, field, value) => {
    setFaults(faults.map(f => f.id === id ? { ...f, [field]: value } : f));
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
      qualityChecks,
      faults,
      presentation
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
          category: 'Hot Beverages',
          sop_data: sopData,
          created_by: profile?.id,
          updated_by: profile?.id
        })
        .select()
        .single();

      if (error) throw error;

      showToast({ title: 'SOP saved successfully', description: `Saved as ${refCode}`, type: 'success' });
      
      // Redirect to MY SOPs page after successful save
      router.push('/dashboard/sops/list');
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
      <BackButton href="/dashboard/sops" label="Back to SOPs" />

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-2xl p-6 border border-orange-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
          <div>
            <h1 className="text-lg font-semibold text-white">Hot Drinks SOP Template</h1>
            <p className="text-sm text-neutral-400">Coffee & Tea preparation procedures</p>
          </div>
        </div>
      </div>

      {/* SOP Details */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-orange-400 mb-4">SOP Details</h2>
        
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
              placeholder="e.g., Cappuccino"
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
              placeholder="e.g., 2 minutes"
            />
          </div>
        </div>
      </section>

      {/* Equipment Setup */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-orange-400">Equipment Setup</h2>
          <button onClick={addEquipment} className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 rounded-lg text-orange-400 text-sm flex items-center gap-2">
            <Plus size={16} /> Add Equipment
          </button>
        </div>

        <div className="space-y-3">
          {equipment.map((eq, index) => (
            <div key={eq.id} className="grid grid-cols-12 gap-2 items-start bg-neutral-900/50 p-3 rounded-lg">
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Equipment</label>}
                <input
                  value={eq.item}
                  onChange={(e) => updateEquipment(eq.id, 'item', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Espresso machine"
                />
              </div>
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Settings</label>}
                <input
                  value={eq.settings}
                  onChange={(e) => updateEquipment(eq.id, 'settings', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Setting 4 - 18 seconds"
                />
              </div>
              <div className="col-span-3">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Notes</label>}
                <input
                  value={eq.notes}
                  onChange={(e) => updateEquipment(eq.id, 'notes', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Maintenance notes"
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeEquipment(eq.id)}
                  disabled={equipment.length === 1}
                  className="w-full mt-6 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ingredients */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-orange-400">Ingredients</h2>
          <button onClick={addIngredient} className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 rounded-lg text-orange-400 text-sm flex items-center gap-2">
            <Plus size={16} /> Add Ingredient
          </button>
        </div>

        <div className="space-y-3">
          {ingredients.map((ing, index) => (
            <div key={ing.id} className="grid grid-cols-12 gap-2 items-start bg-neutral-900/50 p-3 rounded-lg">
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Ingredient</label>}
                <select
                  value={ing.item_id}
                  onChange={(e) => {
                    const selected = drinksLibrary.find(d => d.id === e.target.value);
                    updateIngredient(ing.id, 'item_id', e.target.value);
                    updateIngredient(ing.id, 'item_name', selected?.item_name || '');
                    updateIngredient(ing.id, 'allergens', selected?.allergens || []);
                  }}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">Select...</option>
                  {drinksLibrary.map(drink => (
                    <option key={drink.id} value={drink.id}>{drink.item_name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Quantity</label>}
                <input
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(ing.id, 'quantity', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., 18g"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Unit</label>}
                <input
                  value={ing.unit}
                  onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="g, ml, etc."
                />
              </div>
              <div className="col-span-3">
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
          <h2 className="text-xl font-semibold text-orange-400">Recipe Steps</h2>
          <button onClick={addRecipeStep} className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 rounded-lg text-orange-400 text-sm flex items-center gap-2">
            <Plus size={16} /> Add Step
          </button>
        </div>

        <div className="space-y-4">
          {recipeSteps.map((step, index) => (
            <div key={step.id} className="bg-neutral-900/50 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Texture/Consistency Notes</label>
                  <textarea
                    value={step.texture_notes}
                    onChange={(e) => updateRecipeStep(step.id, 'texture_notes', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                    rows={2}
                    placeholder="e.g., Microfoam texture - no large bubbles"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Temperature</label>
                  <input
                    value={step.temperature}
                    onChange={(e) => updateRecipeStep(step.id, 'temperature', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="e.g., 93°C"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Timing</label>
                  <input
                    value={step.timing}
                    onChange={(e) => updateRecipeStep(step.id, 'timing', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="e.g., 18-22 seconds"
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

      {/* Quality Checks */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-orange-400">Quality Checks</h2>
          <button onClick={addQualityCheck} className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 rounded-lg text-orange-400 text-sm flex items-center gap-2">
            <Plus size={16} /> Add Check
          </button>
        </div>

        <div className="space-y-3">
          {qualityChecks.map((qc, index) => (
            <div key={qc.id} className="grid grid-cols-12 gap-2 items-start bg-neutral-900/50 p-3 rounded-lg">
              <div className="col-span-5">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Check</label>}
                <input
                  value={qc.check}
                  onChange={(e) => updateQualityCheck(qc.id, 'check', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Crema colour and thickness"
                />
              </div>
              <div className="col-span-6">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Standard</label>}
                <input
                  value={qc.standard}
                  onChange={(e) => updateQualityCheck(qc.id, 'standard', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Golden, creamy layer 5mm thick"
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeQualityCheck(qc.id)}
                  disabled={qualityChecks.length === 1}
                  className="w-full mt-6 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Common Faults */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-orange-400">Common Faults & Fixes</h2>
          <button onClick={addFault} className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 rounded-lg text-orange-400 text-sm flex items-center gap-2">
            <Plus size={16} /> Add Fault
          </button>
        </div>

        <div className="space-y-3">
          {faults.map((fault, index) => (
            <div key={fault.id} className="grid grid-cols-12 gap-2 items-start bg-neutral-900/50 p-3 rounded-lg">
              <div className="col-span-3">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Fault</label>}
                <input
                  value={fault.fault}
                  onChange={(e) => updateFault(fault.id, 'fault', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Bitter taste"
                />
              </div>
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Cause</label>}
                <input
                  value={fault.cause}
                  onChange={(e) => updateFault(fault.id, 'cause', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Over-extraction"
                />
              </div>
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Fix</label>}
                <input
                  value={fault.fix}
                  onChange={(e) => updateFault(fault.id, 'fix', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Reduce grind time"
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeFault(fault.id)}
                  disabled={faults.length === 1}
                  className="w-full mt-6 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Presentation Standards */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-orange-400 mb-4">Presentation Standards</h2>
        
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
            <input
              value={presentation.garnish}
              onChange={(e) => setPresentation({ ...presentation, garnish: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., Cocoa dust, Cinnamon"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-neutral-300 mb-1">Serving Temperature Range</label>
            <input
              value={presentation.serving_temp}
              onChange={(e) => setPresentation({ ...presentation, serving_temp: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., 65-70°C"
            />
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex gap-4 sticky bottom-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-transparent text-magenta-400 border border-magenta-500 rounded-lg font-medium transition-all duration-150 hover:bg-magenta-500/10 hover:shadow-[0_0_16px_rgba(211, 126, 145,0.4)] focus:outline-none focus:ring-2 focus:ring-magenta-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {saving ? 'Saving...' : 'Save SOP'}
        </button>
      </div>
    </div>
  );
}
