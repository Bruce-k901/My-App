"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Save, Download, Upload, X, Loader2, AlertTriangle } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import SmartSearch from '@/components/SmartSearch';
import BackButton from '@/components/ui/BackButton';
import { useRouter } from 'next/navigation';

export default function DrinksSOPTemplatePage() {
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Library data
  const [drinksLibrary, setDrinksLibrary] = useState([]);
  const [disposablesLibrary, setDisposablesLibrary] = useState([]);
  const [recentSpirits, setRecentSpirits] = useState([]);
  const [recentMixers, setRecentMixers] = useState([]);
  const [recentGarnishes, setRecentGarnishes] = useState([]);
  const [recentDisposables, setRecentDisposables] = useState([]);

  // Header state
  const [title, setTitle] = useState("");
  const [refCode, setRefCode] = useState("");
  const [version, setVersion] = useState("1.0");
  const [status, setStatus] = useState("Draft");
  const [author, setAuthor] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");

  // Drink structure
  const [spirits, setSpirits] = useState([
    { id: Date.now(), drink_id: "", quantity: "", abv: "", allergens: [] }
  ]);
  
  const [mixers, setMixers] = useState([
    { id: Date.now(), drink_id: "", quantity: "", allergens: [] }
  ]);
  
  const [garnishes, setGarnishes] = useState([
    { id: Date.now(), drink_id: "", quantity: "", prep_notes: "" }
  ]);
  
  const [disposables, setDisposables] = useState([
    { id: Date.now(), disposable_id: "", quantity: "" }
  ]);

  // Process steps
  const [processSteps, setProcessSteps] = useState([
    { id: Date.now(), step: "", timing: "", photo_url: "" }
  ]);

  // Photo upload refs
  const photoInputRefs = useRef({});
  const [uploadingPhotos, setUploadingPhotos] = useState({});

  // Load libraries
  const loadLibraries = useCallback(async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      const [drinksResult, disposablesResult] = await Promise.all([
        supabase.from('drinks_library').select('*').eq('company_id', companyId).order('item_name'),
        supabase.from('disposables_library').select('*').eq('company_id', companyId).order('item_name')
      ]);
      
      if (drinksResult.error) throw drinksResult.error;
      if (disposablesResult.error) throw disposablesResult.error;
      
      setDrinksLibrary(drinksResult.data || []);
      setDisposablesLibrary(disposablesResult.data || []);
    } catch (error) {
      console.error('Error loading libraries:', error);
      // Don't show toast here to avoid dependency issues - will show on render if needed
    } finally {
      setLoading(false);
    }
  }, [companyId]); // Removed showToast from dependencies

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
      setRefCode(`DRK-${nameBit}-001`);
    }
  }, [title]);

  // Auto-populate ABV and allergens when spirit is selected
  const handleSpiritChange = (drink, targetId) => {
    setRecentSpirits(prev => {
      const filtered = prev.filter(item => item.id !== drink.id);
      return [drink, ...filtered].slice(0, 5);
    });
    
    setSpirits(spirits.map(s => 
      s.id === targetId ? { 
        ...s, 
        drink_id: drink.id, 
        abv: drink?.abv || "",
        allergens: drink?.allergens || []
      } : s
    ));
  };

  // Auto-populate allergens when mixer is selected
  const handleMixerChange = (drink, targetId) => {
    setRecentMixers(prev => {
      const filtered = prev.filter(item => item.id !== drink.id);
      return [drink, ...filtered].slice(0, 5);
    });
    
    setMixers(mixers.map(m => 
      m.id === targetId ? { 
        ...m, 
        drink_id: drink.id, 
        allergens: drink?.allergens || []
      } : m
    ));
  };

  // Handle garnish selection
  const handleGarnishChange = (drink, targetId) => {
    setRecentGarnishes(prev => {
      const filtered = prev.filter(item => item.id !== drink.id);
      return [drink, ...filtered].slice(0, 5);
    });
    
    setGarnishes(garnishes.map(g => 
      g.id === targetId ? { 
        ...g, 
        drink_id: drink.id
      } : g
    ));
  };

  // Handle disposable selection
  const handleDisposableChange = (disposable, targetId) => {
    setRecentDisposables(prev => {
      const filtered = prev.filter(item => item.id !== disposable.id);
      return [disposable, ...filtered].slice(0, 5);
    });
    
    setDisposables(disposables.map(d => 
      d.id === targetId ? { 
        ...d, 
        disposable_id: disposable.id
      } : d
    ));
  };

  // Photo upload helper
  const handlePhotoUpload = async (file, refId) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      showToast({ 
        title: 'Invalid file type', 
        description: 'Please upload an image file', 
        type: 'error' 
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showToast({ 
        title: 'File too large', 
        description: 'Maximum file size is 5MB', 
        type: 'error' 
      });
      return;
    }

    try {
      setUploadingPhotos(prev => ({ ...prev, [refId]: true }));
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${refId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('sop-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('sop-photos')
        .getPublicUrl(fileName);

      setProcessSteps(processSteps.map(s => s.id === refId ? { ...s, photo_url: publicUrl } : s));
      
      showToast({ 
        title: 'Photo uploaded', 
        description: 'Photo added successfully', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      showToast({ 
        title: 'Upload failed', 
        description: error.message, 
        type: 'error' 
      });
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [refId]: false }));
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
      header: { title, refCode, version, status, author, estimatedTime },
      spirits,
      mixers,
      garnishes,
      disposables,
      processSteps
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
          category: 'Drinks',
          sop_data: sopData,
          created_by: profile?.id,
          updated_by: profile?.id
        })
        .select()
        .single();

      if (error) throw error;

      showToast({ 
        title: 'SOP saved successfully', 
        description: `Saved as ${refCode}`, 
        type: 'success' 
      });
      
      // Redirect to MY SOPs page after successful save
      router.push('/dashboard/sops/list');
    } catch (error) {
      console.error('Error saving SOP:', error);
      showToast({ 
        title: 'Error saving SOP', 
        description: error.message, 
        type: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6 bg-neutral-900 min-h-screen">
        <div className="text-neutral-400 text-center py-8">Loading libraries...</div>
      </div>
    );
  }

  // Filter library by category
  const spiritsOnly = drinksLibrary.filter(d => d.category === 'Spirit' || d.category === 'Liqueur');
  const mixersOnly = drinksLibrary.filter(d => d.category === 'Mixer');
  const garnishesOnly = drinksLibrary.filter(d => d.category === 'Garnish');

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 bg-neutral-900 min-h-screen">
      {/* Back Button */}
      <BackButton href="/dashboard/sops" label="Back to SOPs" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-[#D37E91]/25 rounded-2xl p-6 border border-purple-500/30">
        <h1 className="text-2xl font-semibold mb-2">Drinks SOP Template</h1>
        <p className="text-neutral-300 text-sm">
          Bar recipes and drink preparation procedures
        </p>
      </div>

      {/* SOP DETAILS SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">SOP Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm text-neutral-300 mb-1">Drink Name *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., Classic Mojito"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Reference Code (Auto)</label>
            <input value={refCode} readOnly className="w-full bg-neutral-900/50 border border-neutral-600 rounded-lg px-3 py-2 text-neutral-400" />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Version *</label>
            <input value={version} onChange={(e) => setVersion(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Status *</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white">
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Author *</label>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Estimated Time</label>
            <input value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" placeholder="e.g., 2 minutes" />
          </div>
        </div>
      </section>

      {/* SPIRITS SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Spirits & Liqueurs</h2>
        <div className="space-y-2">
          {spirits.map((spirit, index) => {
            const selectedDrink = drinksLibrary.find(d => d.id === spirit.drink_id);
            return (
              <div key={spirit.id} className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-600">
                {selectedDrink?.allergens && selectedDrink.allergens.length > 0 && (
                  <div className="mb-2 flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded">
                    <AlertTriangle size={16} className="text-orange-400" />
                    <span className="text-xs text-orange-400 font-semibold">Allergens:</span>
                    <span className="text-xs text-orange-300">{selectedDrink.allergens.join(', ')}</span>
                  </div>
                )}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Spirit/Liqueur</label>}
                    <SmartSearch
                      libraryTable="drinks_library"
                      placeholder={spirit.drink_id ? drinksLibrary.find(d => d.id === spirit.drink_id)?.item_name : "Search spirits..."}
                      onSelect={(drink) => handleSpiritChange(drink, spirit.id)}
                      recentItems={recentSpirits}
                      allowMultiple={false}
                      currentSelected={spirit.drink_id ? [drinksLibrary.find(d => d.id === spirit.drink_id)] : []}
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Quantity</label>}
                    <input
                      value={spirit.quantity}
                      onChange={(e) => setSpirits(spirits.map(s => s.id === spirit.id ? { ...s, quantity: e.target.value } : s))}
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="e.g., 50ml"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <label className="block text-xs text-neutral-400 mb-1">ABV</label>}
                    <input
                      value={spirit.abv}
                      readOnly
                      className="w-full bg-neutral-900/50 border border-neutral-600 rounded-lg px-3 py-2 text-neutral-400 text-sm"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      onClick={() => setSpirits(spirits.filter(s => s.id !== spirit.id))}
                      disabled={spirits.length === 1}
                      className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => setSpirits([...spirits, { id: Date.now(), drink_id: "", quantity: "", abv: "", allergens: [] }])} className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm">
          <Plus size={16} /> Add Spirit
        </button>
      </section>

      {/* MIXERS SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Mixers</h2>
        <div className="space-y-2">
          {mixers.map((mixer, index) => {
            const selectedDrink = drinksLibrary.find(d => d.id === mixer.drink_id);
            return (
              <div key={mixer.id} className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-600">
                {selectedDrink?.allergens && selectedDrink.allergens.length > 0 && (
                  <div className="mb-2 flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded">
                    <AlertTriangle size={16} className="text-orange-400" />
                    <span className="text-xs text-orange-400 font-semibold">Allergens:</span>
                    <span className="text-xs text-orange-300">{selectedDrink.allergens.join(', ')}</span>
                  </div>
                )}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Mixer</label>}
                    <SmartSearch
                      libraryTable="drinks_library"
                      placeholder={mixer.drink_id ? drinksLibrary.find(d => d.id === mixer.drink_id)?.item_name : "Search mixers..."}
                      onSelect={(drink) => handleMixerChange(drink, mixer.id)}
                      recentItems={recentMixers}
                      allowMultiple={false}
                      currentSelected={mixer.drink_id ? [drinksLibrary.find(d => d.id === mixer.drink_id)] : []}
                    />
                  </div>
                  <div className="col-span-3">
                    {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Quantity</label>}
                    <input
                      value={mixer.quantity}
                      onChange={(e) => setMixers(mixers.map(m => m.id === mixer.id ? { ...m, quantity: e.target.value } : m))}
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="e.g., 100ml"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      onClick={() => setMixers(mixers.filter(m => m.id !== mixer.id))}
                      disabled={mixers.length === 1}
                      className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => setMixers([...mixers, { id: Date.now(), drink_id: "", quantity: "", allergens: [] }])} className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm">
          <Plus size={16} /> Add Mixer
        </button>
      </section>

      {/* GARNISHES SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Garnishes</h2>
        <div className="space-y-2">
          {garnishes.map((garnish, index) => {
            const selectedDrink = drinksLibrary.find(d => d.id === garnish.drink_id);
            return (
              <div key={garnish.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Garnish</label>}
                  <SmartSearch
                    libraryTable="drinks_library"
                    placeholder={garnish.drink_id ? drinksLibrary.find(d => d.id === garnish.drink_id)?.item_name : "Search garnishes..."}
                    onSelect={(drink) => handleGarnishChange(drink, garnish.id)}
                    recentItems={recentGarnishes}
                    allowMultiple={false}
                    currentSelected={garnish.drink_id ? [drinksLibrary.find(d => d.id === garnish.drink_id)] : []}
                  />
                </div>
                <div className="col-span-3">
                  {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Quantity</label>}
                  <input
                    value={garnish.quantity}
                    onChange={(e) => setGarnishes(garnishes.map(g => g.id === garnish.id ? { ...g, quantity: e.target.value } : g))}
                    className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="e.g., 3 leaves"
                  />
                </div>
                <div className="col-span-1">
                  <button
                    onClick={() => setGarnishes(garnishes.filter(g => g.id !== garnish.id))}
                    disabled={garnishes.length === 1}
                    className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => setGarnishes([...garnishes, { id: Date.now(), drink_id: "", quantity: "", prep_notes: "" }])} className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm">
          <Plus size={16} /> Add Garnish
        </button>
      </section>

      {/* DISPOSABLES SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Disposables Required</h2>
        <div className="space-y-2">
          {disposables.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Disposable Item</label>}
                <SmartSearch
                  libraryTable="disposables_library"
                  placeholder={item.disposable_id ? disposablesLibrary.find(d => d.id === item.disposable_id)?.item_name : "Search disposables..."}
                  onSelect={(disposable) => handleDisposableChange(disposable, item.id)}
                  recentItems={recentDisposables}
                  allowMultiple={false}
                  currentSelected={item.disposable_id ? [disposablesLibrary.find(d => d.id === item.disposable_id)] : []}
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Quantity</label>}
                <input
                  value={item.quantity}
                  onChange={(e) => setDisposables(disposables.map(d => d.id === item.id ? { ...d, quantity: e.target.value } : d))}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => setDisposables(disposables.filter(d => d.id !== item.id))}
                  disabled={disposables.length === 1}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setDisposables([...disposables, { id: Date.now(), disposable_id: "", quantity: "" }])} className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm">
          <Plus size={16} /> Add Disposable
        </button>
      </section>

      {/* PROCESS STEPS SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Preparation Steps</h2>
        <div className="space-y-3">
          {processSteps.map((step, index) => (
            <div key={step.id} className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-600">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-magenta-400">Step {index + 1}</span>
                <button
                  onClick={() => setProcessSteps(processSteps.filter(s => s.id !== step.id))}
                  disabled={processSteps.length === 1}
                  className="text-red-400 hover:text-red-300 disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <textarea
                value={step.step}
                onChange={(e) => setProcessSteps(processSteps.map(s => s.id === step.id ? { ...s, step: e.target.value } : s))}
                className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm mb-2"
                placeholder="Describe this step..."
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  value={step.timing}
                  onChange={(e) => setProcessSteps(processSteps.map(s => s.id === step.id ? { ...s, timing: e.target.value } : s))}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Timing (e.g., Muddle 10 seconds)"
                />
              </div>
              {/* Photo upload */}
              <div className="mt-2">
                {step.photo_url ? (
                  <div className="relative inline-block">
                    <img src={step.photo_url} alt="Step photo" className="w-32 h-32 object-cover rounded-lg border border-neutral-600" />
                    <button
                      onClick={() => setProcessSteps(processSteps.map(s => s.id === step.id ? { ...s, photo_url: "" } : s))}
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
                      className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm disabled:opacity-50"
                    >
                      {uploadingPhotos[step.id] ? (
                        <> <Loader2 size={16} className="animate-spin" /> Uploading... </>
                      ) : (
                        <> <Upload size={16} /> Upload Photo </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setProcessSteps([...processSteps, { id: Date.now(), step: "", timing: "", photo_url: "" }])} className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm">
          <Plus size={16} /> Add Step
        </button>
      </section>

      {/* SAVE ACTIONS */}
      <div className="flex gap-4 sticky bottom-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-transparent text-magenta-400 border border-magenta-500 rounded-lg font-medium transition-all duration-150 hover:bg-magenta-500/10 hover:shadow-[0_0_16px_rgba(211, 126, 145,0.4)] focus:outline-none focus:ring-2 focus:ring-magenta-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save SOP'}
        </button>
        <button className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white font-medium flex items-center gap-2">
          <Download size={20} />
          Export PDF
        </button>
      </div>
    </div>
  );
}

