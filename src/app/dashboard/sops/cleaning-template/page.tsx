"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, Download, Upload, X, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import SmartSearch from '@/components/SmartSearch';
import BackButton from '@/components/ui/BackButton';

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "as_needed", label: "As Needed" }
];

export default function CleaningSOPTemplatePage() {
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Library data
  const [chemicalsLibrary, setChemicalsLibrary] = useState([]);
  const [ppeLibrary, setPPELibrary] = useState([]);
  const [recentChemicals, setRecentChemicals] = useState([]);
  const [recentPPE, setRecentPPE] = useState([]);

  // Header state
  const [title, setTitle] = useState("");
  const [refCode, setRefCode] = useState("");
  const [version, setVersion] = useState("1.0");
  const [status, setStatus] = useState("Draft");
  const [author, setAuthor] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [riskAssessmentLink, setRiskAssessmentLink] = useState("");

  // Area/Equipment to Clean
  const [cleaningAreas, setCleaningAreas] = useState([
    { id: Date.now(), area: "", equipment: "", photo_url: "" }
  ]);

  // Chemicals Required
  const [chemicals, setChemicals] = useState([
    { id: Date.now(), chemical_id: "", contact_time: "", dilution: "", notes: "" }
  ]);

  // PPE Required
  const [ppe, setPPE] = useState([
    { id: Date.now(), ppe_id: "", required: true, notes: "" }
  ]);

  // Pre-Cleaning Checks
  const [preChecks, setPreChecks] = useState([
    { id: Date.now(), check: "", verified: false }
  ]);

  // Step-by-Step Process
  const [processSteps, setProcessSteps] = useState([
    { id: Date.now(), step: "", method: "", duration: "", photo_url: "" }
  ]);

  // Post-Cleaning Verification
  const [postChecks, setPostChecks] = useState([
    { id: Date.now(), check: "", standard: "", verified: false }
  ]);

  // Photo upload refs
  const photoInputRefs = useRef({});
  const [uploadingPhotos, setUploadingPhotos] = useState({});

  // Load libraries
  useEffect(() => {
    const loadLibraries = async () => {
      if (!companyId) return;
      
      try {
        setLoading(true);
        
        const [chemicalsResult, ppeResult] = await Promise.all([
          supabase.from('chemicals_library').select('*').eq('company_id', companyId).order('product_name'),
          supabase.from('ppe_library').select('*').eq('company_id', companyId).order('item_name')
        ]);
        
        if (chemicalsResult.error) throw chemicalsResult.error;
        if (ppeResult.error) throw ppeResult.error;
        
        setChemicalsLibrary(chemicalsResult.data || []);
        setPPELibrary(ppeResult.data || []);
      } catch (error) {
        console.error('Error loading libraries:', error);
        // Removed showToast to prevent dependency issues
      } finally {
        setLoading(false);
      }
    };
    
    loadLibraries();
  }, [companyId]); // Removed showToast from dependencies

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
      setRefCode(`CLN-${nameBit}-001`);
    }
  }, [title]);

  // Update contact time and hazards when chemical is selected
  const handleChemicalChange = (id, chemicalId) => {
    const chemical = chemicalsLibrary.find(c => c.id === chemicalId);
    setChemicals(chemicals.map(c => 
      c.id === id ? { 
        ...c, 
        chemical_id: chemicalId, 
        contact_time: chemical?.contact_time || "",
        dilution: chemical?.dilution_ratio || ""
      } : c
    ));
  };

  const handleChemicalSelect = (chemical, targetId) => {
    setRecentChemicals(prev => {
      const filtered = prev.filter(item => item.id !== chemical.id);
      return [chemical, ...filtered].slice(0, 5);
    });

    setChemicals(chemicals.map(c => 
      c.id === targetId ? { 
        ...c, 
        chemical_id: chemical.id, 
        contact_time: chemical.contact_time || "",
        dilution: chemical.dilution_ratio || ""
      } : c
    ));
  };

  const handlePPESelect = (ppeItem, targetId) => {
    setRecentPPE(prev => {
      const filtered = prev.filter(item => item.id !== ppeItem.id);
      return [ppeItem, ...filtered].slice(0, 5);
    });

    setPPE(ppe.map(p => 
      p.id === targetId ? { ...p, ppe_id: ppeItem.id } : p
    ));
  };

  // Add handlers
  const addCleaningArea = () => {
    setCleaningAreas([...cleaningAreas, { id: Date.now(), area: "", equipment: "", photo_url: "" }]);
  };

  const addChemical = () => {
    setChemicals([...chemicals, { id: Date.now(), chemical_id: "", contact_time: "", dilution: "", notes: "" }]);
  };

  const addPPE = () => {
    setPPE([...ppe, { id: Date.now(), ppe_id: "", required: true, notes: "" }]);
  };

  const addPreCheck = () => {
    setPreChecks([...preChecks, { id: Date.now(), check: "", verified: false }]);
  };

  const addProcessStep = () => {
    setProcessSteps([...processSteps, { id: Date.now(), step: "", method: "", duration: "", photo_url: "" }]);
  };

  const addPostCheck = () => {
    setPostChecks([...postChecks, { id: Date.now(), check: "", standard: "", verified: false }]);
  };

  // Photo upload helper
  const handlePhotoUpload = async (file, refId, section) => {
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

      // Update the appropriate section
      if (section === 'area') {
        setCleaningAreas(cleaningAreas.map(a => a.id === refId ? { ...a, photo_url: publicUrl } : a));
      } else if (section === 'process') {
        setProcessSteps(processSteps.map(s => s.id === refId ? { ...s, photo_url: publicUrl } : s));
      }
      
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
      header: { title, refCode, version, status, author, estimatedTime, frequency, riskAssessmentLink },
      cleaningAreas,
      chemicals,
      ppe,
      preChecks,
      processSteps,
      postChecks
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
          category: 'Cleaning',
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

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 bg-neutral-900 min-h-screen">
      {/* Back Button */}
      <BackButton href="/dashboard/sops" label="Back to SOPs" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600/20 to-blue-600/20 rounded-2xl p-6 border border-teal-500/30">
        <h1 className="text-2xl font-semibold mb-2">Cleaning SOP Template</h1>
        <p className="text-neutral-300 text-sm">
          Sanitation and hygiene procedures with chemical safety
        </p>
      </div>

      {/* SOP DETAILS SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">SOP Details</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm text-neutral-300 mb-1">SOP Title *</label>
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., Kitchen Work Surfaces Deep Clean"
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
            />
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

          <div>
            <label className="block text-sm text-neutral-300 mb-1">Frequency *</label>
            <select 
              value={frequency} 
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
            >
              {FREQUENCY_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">Estimated Time</label>
            <input 
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., 45 minutes"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-neutral-300 mb-1">Risk Assessment Link</label>
            <input 
              value={riskAssessmentLink}
              onChange={(e) => setRiskAssessmentLink(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="Link to risk assessment document"
            />
          </div>
        </div>
      </section>

      {/* AREA/EQUIPMENT SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Area/Equipment to Clean</h2>
        <p className="text-xs text-neutral-400 mb-4">
          Specify what needs to be cleaned
        </p>

        <div className="space-y-2">
          {cleaningAreas.map((area, index) => (
            <div key={area.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Area</label>}
                <input
                  value={area.area}
                  onChange={(e) => setCleaningAreas(cleaningAreas.map(a => a.id === area.id ? { ...a, area: e.target.value } : a))}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Kitchen"
                />
              </div>
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Equipment</label>}
                <input
                  value={area.equipment}
                  onChange={(e) => setCleaningAreas(cleaningAreas.map(a => a.id === area.id ? { ...a, equipment: e.target.value } : a))}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Work surfaces"
                />
              </div>
              <div className="col-span-3">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Photo</label>}
                <div>
                  {area.photo_url ? (
                    <div className="relative inline-block">
                      <img src={area.photo_url} alt="Area" className="w-20 h-20 object-cover rounded-lg" />
                      <button
                        onClick={() => setCleaningAreas(cleaningAreas.map(a => a.id === area.id ? { ...a, photo_url: "" } : a))}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={el => photoInputRefs.current[area.id] = el}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file, area.id, 'area');
                        }}
                        className="hidden"
                      />
                      <button
                        onClick={() => photoInputRefs.current[area.id]?.click()}
                        className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg p-2 text-white text-sm"
                      >
                        <Upload size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => setCleaningAreas(cleaningAreas.filter(a => a.id !== area.id))}
                  disabled={cleaningAreas.length === 1}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addCleaningArea}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm"
        >
          <Plus size={16} />
          Add Area/Equipment
        </button>
      </section>

      {/* CHEMICALS SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Chemicals Required</h2>
        <p className="text-xs text-neutral-400 mb-4">
          Select chemicals from library (auto-fills contact time and hazards)
        </p>

        <div className="space-y-2">
          {chemicals.map((chem, index) => {
            const selectedChemical = chemicalsLibrary.find(c => c.id === chem.chemical_id);
            return (
              <div key={chem.id} className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-600">
                {/* Hazard warnings */}
                {selectedChemical?.hazard_symbols && selectedChemical.hazard_symbols.length > 0 && (
                  <div className="mb-2 flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
                    <AlertTriangle size={16} className="text-red-400" />
                    <span className="text-xs text-red-400 font-semibold">Hazards:</span>
                    <span className="text-xs text-red-300">{selectedChemical.hazard_symbols.join(', ')}</span>
                  </div>
                )}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Chemical</label>}
                    <SmartSearch
                      libraryTable="chemicals_library"
                      placeholder={chem.chemical_id ? chemicalsLibrary.find(c => c.id === chem.chemical_id)?.product_name : "Search chemical..."}
                      onSelect={(chemical) => handleChemicalSelect(chemical, chem.id)}
                      recentItems={recentChemicals}
                      allowMultiple={false}
                      currentSelected={chem.chemical_id ? [chemicalsLibrary.find(c => c.id === chem.chemical_id)] : []}
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Contact Time</label>}
                    <input
                      value={chem.contact_time}
                      readOnly
                      className="w-full bg-neutral-900/50 border border-neutral-600 rounded-lg px-3 py-2 text-neutral-400 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Dilution</label>}
                    <input
                      value={chem.dilution}
                      onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, dilution: e.target.value } : c))}
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Notes</label>}
                    <input
                      value={chem.notes}
                      onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, notes: e.target.value } : c))}
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      onClick={() => setChemicals(chemicals.filter(c => c.id !== chem.id))}
                      disabled={chemicals.length === 1}
                      className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {selectedChemical && selectedChemical.hazard_symbols && selectedChemical.hazard_symbols.length > 0 && (
                  <div className="mt-2 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-red-400 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      {selectedChemical.hazard_symbols.map((hazard, idx) => (
                        <span key={idx} className="px-2 py-1 bg-red-500/20 border border-red-500/40 rounded-full text-xs text-red-400">
                          {hazard}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={addChemical}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm"
        >
          <Plus size={16} />
          Add Chemical
        </button>
      </section>

      {/* PPE SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">PPE Required</h2>
        <p className="text-xs text-neutral-400 mb-4">
          Personal protective equipment needed for this cleaning task
        </p>

        <div className="space-y-2">
          {ppe.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">PPE Item</label>}
                <SmartSearch
                  libraryTable="ppe_library"
                  placeholder={item.ppe_id ? ppeLibrary.find(p => p.id === item.ppe_id)?.item_name : "Search PPE..."}
                  onSelect={(ppeItem) => handlePPESelect(ppeItem, item.id)}
                  recentItems={recentPPE}
                  allowMultiple={false}
                  currentSelected={item.ppe_id ? [ppeLibrary.find(p => p.id === item.ppe_id)] : []}
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Required</label>}
                <select
                  value={item.required ? 'yes' : 'no'}
                  onChange={(e) => setPPE(ppe.map(p => p.id === item.id ? { ...p, required: e.target.value === 'yes' } : p))}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Notes</label>}
                <input
                  value={item.notes}
                  onChange={(e) => setPPE(ppe.map(p => p.id === item.id ? { ...p, notes: e.target.value } : p))}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Optional"
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => setPPE(ppe.filter(p => p.id !== item.id))}
                  disabled={ppe.length === 1}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addPPE}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm"
        >
          <Plus size={16} />
          Add PPE Item
        </button>
      </section>

      {/* PRE-CLEANING CHECKS SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Pre-Cleaning Checks</h2>
        <p className="text-xs text-neutral-400 mb-4">
          Safety checks before starting cleaning
        </p>

        <div className="space-y-2">
          {preChecks.map((check, index) => (
            <div key={check.id} className="flex items-center gap-3 p-3 bg-neutral-900/50 rounded-lg border border-neutral-600">
              <input
                type="checkbox"
                checked={check.verified}
                onChange={(e) => setPreChecks(preChecks.map(c => c.id === check.id ? { ...c, verified: e.target.checked } : c))}
                className="w-5 h-5 rounded border-neutral-600 bg-neutral-900"
              />
              <input
                value={check.check}
                onChange={(e) => setPreChecks(preChecks.map(c => c.id === check.id ? { ...c, check: e.target.value } : c))}
                className="flex-1 bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="e.g., Equipment powered off"
              />
              <button
                onClick={() => setPreChecks(preChecks.filter(c => c.id !== check.id))}
                disabled={preChecks.length === 1}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addPreCheck}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm"
        >
          <Plus size={16} />
          Add Pre-Cleaning Check
        </button>
      </section>

      {/* PROCESS STEPS SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Step-by-Step Process</h2>
        <p className="text-xs text-neutral-400 mb-4">
          Detailed cleaning procedure
        </p>

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

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Step Description</label>
                  <input
                    value={step.step}
                    onChange={(e) => setProcessSteps(processSteps.map(s => s.id === step.id ? { ...s, step: e.target.value } : s))}
                    className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="e.g., Apply degreaser to surface"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Method</label>
                    <input
                      value={step.method}
                      onChange={(e) => setProcessSteps(processSteps.map(s => s.id === step.id ? { ...s, method: e.target.value } : s))}
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="e.g., Spray and scrub"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Duration</label>
                    <input
                      value={step.duration}
                      onChange={(e) => setProcessSteps(processSteps.map(s => s.id === step.id ? { ...s, duration: e.target.value } : s))}
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="e.g., 10 minutes"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Photo</label>
                  <div>
                    {step.photo_url ? (
                      <div className="relative inline-block">
                        <img src={step.photo_url} alt="Step" className="w-32 h-32 object-cover rounded-lg" />
                        <button
                          onClick={() => setProcessSteps(processSteps.map(s => s.id === step.id ? { ...s, photo_url: "" } : s))}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          ref={el => photoInputRefs.current[step.id] = el}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(file, step.id, 'process');
                          }}
                          className="hidden"
                        />
                        <button
                          onClick={() => photoInputRefs.current[step.id]?.click()}
                          className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg p-2 text-white text-sm flex items-center gap-2"
                        >
                          <Upload size={16} />
                          Upload Photo
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addProcessStep}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm"
        >
          <Plus size={16} />
          Add Process Step
        </button>
      </section>

      {/* POST-CLEANING VERIFICATION SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Post-Cleaning Verification</h2>
        <p className="text-xs text-neutral-400 mb-4">
          Final checks to confirm cleaning is complete
        </p>

        <div className="space-y-2">
          {postChecks.map((check, index) => (
            <div key={check.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Check</label>}
                <input
                  value={check.check}
                  onChange={(e) => setPostChecks(postChecks.map(c => c.id === check.id ? { ...c, check: e.target.value } : c))}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Surface is dry"
                />
              </div>
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Standard</label>}
                <input
                  value={check.standard}
                  onChange={(e) => setPostChecks(postChecks.map(c => c.id === check.id ? { ...c, standard: e.target.value } : c))}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Visually clean, no residue"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Verified</label>}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={check.verified}
                    onChange={(e) => setPostChecks(postChecks.map(c => c.id === check.id ? { ...c, verified: e.target.checked } : c))}
                    className="w-5 h-5 rounded border-neutral-600 bg-neutral-900"
                  />
                  <span className="text-xs text-neutral-400">Yes</span>
                </div>
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => setPostChecks(postChecks.filter(c => c.id !== check.id))}
                  disabled={postChecks.length === 1}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addPostCheck}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm"
        >
          <Plus size={16} />
          Add Verification Check
        </button>
      </section>

      {/* SAVE ACTIONS */}
      <div className="flex gap-4 sticky bottom-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-transparent text-magenta-400 border border-magenta-500 rounded-lg font-medium transition-all duration-150 hover:bg-magenta-500/10 hover:shadow-[0_0_16px_rgba(236,72,153,0.4)] focus:outline-none focus:ring-2 focus:ring-magenta-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save SOP'}
        </button>
        <button
          onClick={() => showToast({ title: 'Export', description: 'PDF export coming soon', type: 'info' })}
          className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white font-medium flex items-center gap-2"
        >
          <Download size={20} />
          Export PDF
        </button>
      </div>
    </div>
  );
}

