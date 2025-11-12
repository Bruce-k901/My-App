"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Save, Download, Upload, X, Loader2, Moon, Clock, Lock, Shield, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import BackButton from '@/components/ui/BackButton';
import { useRouter } from 'next/navigation';

export default function ClosingProcedureTemplatePage() {
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Library data
  const [equipmentLibrary, setEquipmentLibrary] = useState([]);
  const [chemicalsLibrary, setChemicalsLibrary] = useState([]);
  const [sites, setSites] = useState([]);

  // Header state
  const [title, setTitle] = useState("");
  const [refCode, setRefCode] = useState("");
  const [version, setVersion] = useState("1.0");
  const [status, setStatus] = useState("Draft");
  const [author, setAuthor] = useState("");
  const [siteLocation, setSiteLocation] = useState("");

  // Time-based checklist
  const [timeSlots, setTimeSlots] = useState([
    { id: Date.now(), time: "22:00", tasks: [{ id: Date.now(), task: "", completed: false }] }
  ]);

  // Equipment shutdown sequence
  const [equipmentShutdown, setEquipmentShutdown] = useState([
    { id: Date.now(), equipment_id: "", shutdown_status: "", notes: "", verified: false }
  ]);

  // Cleaning checklist by area
  const [cleaningAreas, setCleaningAreas] = useState([
    { id: Date.now(), area: "", cleaning_tasks: [{ id: Date.now(), task: "", chemical_id: "", completed: false }], notes: "" }
  ]);

  // Security checks
  const [securityChecks, setSecurityChecks] = useState([
    { id: Date.now(), check_item: "", status: "Pending", verified_by: "", notes: "" }
  ]);

  // Stock & waste
  const [stockWaste, setStockWaste] = useState([
    { id: Date.now(), item: "", action: "Store", quantity: "", notes: "" }
  ]);

  // Cash handling
  const [cashHandling, setCashHandling] = useState({
    total_cash: "",
    petty_cash: "",
    reconciled_by: "",
    discrepancies: "",
    safe_secured: false,
    notes: ""
  });

  // Next day prep
  const [nextDayPrep, setNextDayPrep] = useState([
    { id: Date.now(), prep_item: "", location: "", completed: false, notes: "" }
  ]);

  // Final walkthrough & sign-off
  const [finalWalkthrough, setFinalWalkthrough] = useState({
    walkthrough_by: "",
    walkthrough_date: "",
    all_complete: false,
    notes: "",
    manager_signature: ""
  });

  // Photo upload refs
  const photoInputRefs = useRef({});
  const [uploadingPhotos, setUploadingPhotos] = useState({});

  // Load libraries
  const loadLibraries = useCallback(async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      const [equipmentResult, chemicalsResult, sitesResult] = await Promise.all([
        supabase.from('equipment_library').select('id, equipment_name, category').eq('company_id', companyId).order('equipment_name'),
        supabase.from('chemicals_library').select('id, product_name').eq('company_id', companyId).order('product_name'),
        supabase.from('sites').select('id, name').eq('company_id', companyId).order('name')
      ]);
      
      if (equipmentResult.error) throw equipmentResult.error;
      if (chemicalsResult.error) throw chemicalsResult.error;
      if (sitesResult.error) throw sitesResult.error;
      
      setEquipmentLibrary(equipmentResult.data || []);
      setChemicalsLibrary(chemicalsResult.data || []);
      setSites(sitesResult.data || []);
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
      setRefCode(`CLOSE-${nameBit}-001`);
    }
  }, [title]);

  // Time slot handlers
  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { id: Date.now(), time: "", tasks: [{ id: Date.now(), task: "", completed: false }] }]);
  };

  const removeTimeSlot = (id) => {
    setTimeSlots(timeSlots.filter(ts => ts.id !== id));
  };

  const addTaskToSlot = (slotId) => {
    setTimeSlots(timeSlots.map(ts => 
      ts.id === slotId 
        ? { ...ts, tasks: [...ts.tasks, { id: Date.now(), task: "", completed: false }] }
        : ts
    ));
  };

  const removeTaskFromSlot = (slotId, taskId) => {
    setTimeSlots(timeSlots.map(ts => 
      ts.id === slotId 
        ? { ...ts, tasks: ts.tasks.filter(t => t.id !== taskId) }
        : ts
    ));
  };

  const updateTask = (slotId, taskId, field, value) => {
    setTimeSlots(timeSlots.map(ts => 
      ts.id === slotId 
        ? { ...ts, tasks: ts.tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t) }
        : ts
    ));
  };

  // Equipment shutdown handlers
  const addEquipmentShutdown = () => {
    setEquipmentShutdown([...equipmentShutdown, { id: Date.now(), equipment_id: "", shutdown_status: "", notes: "", verified: false }]);
  };

  const removeEquipmentShutdown = (id) => {
    setEquipmentShutdown(equipmentShutdown.filter(eq => eq.id !== id));
  };

  const updateEquipmentShutdown = (id, field, value) => {
    setEquipmentShutdown(equipmentShutdown.map(eq => eq.id === id ? { ...eq, [field]: value } : eq));
  };

  // Cleaning area handlers
  const addCleaningArea = () => {
    setCleaningAreas([...cleaningAreas, { id: Date.now(), area: "", cleaning_tasks: [{ id: Date.now(), task: "", chemical_id: "", completed: false }], notes: "" }]);
  };

  const removeCleaningArea = (id) => {
    setCleaningAreas(cleaningAreas.filter(ca => ca.id !== id));
  };

  const addCleaningTask = (areaId) => {
    setCleaningAreas(cleaningAreas.map(ca => 
      ca.id === areaId 
        ? { ...ca, cleaning_tasks: [...ca.cleaning_tasks, { id: Date.now(), task: "", chemical_id: "", completed: false }] }
        : ca
    ));
  };

  const removeCleaningTask = (areaId, taskId) => {
    setCleaningAreas(cleaningAreas.map(ca => 
      ca.id === areaId 
        ? { ...ca, cleaning_tasks: ca.cleaning_tasks.filter(t => t.id !== taskId) }
        : ca
    ));
  };

  const updateCleaningTask = (areaId, taskId, field, value) => {
    setCleaningAreas(cleaningAreas.map(ca => 
      ca.id === areaId 
        ? { ...ca, cleaning_tasks: ca.cleaning_tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t) }
        : ca
    ));
  };

  const updateCleaningArea = (id, field, value) => {
    setCleaningAreas(cleaningAreas.map(ca => ca.id === id ? { ...ca, [field]: value } : ca));
  };

  // Security checks handlers
  const addSecurityCheck = () => {
    setSecurityChecks([...securityChecks, { id: Date.now(), check_item: "", status: "Pending", verified_by: "", notes: "" }]);
  };

  const removeSecurityCheck = (id) => {
    setSecurityChecks(securityChecks.filter(sc => sc.id !== id));
  };

  const updateSecurityCheck = (id, field, value) => {
    setSecurityChecks(securityChecks.map(sc => sc.id === id ? { ...sc, [field]: value } : sc));
  };

  // Stock & waste handlers
  const addStockWaste = () => {
    setStockWaste([...stockWaste, { id: Date.now(), item: "", action: "Store", quantity: "", notes: "" }]);
  };

  const removeStockWaste = (id) => {
    setStockWaste(stockWaste.filter(sw => sw.id !== id));
  };

  const updateStockWaste = (id, field, value) => {
    setStockWaste(stockWaste.map(sw => sw.id === id ? { ...sw, [field]: value } : sw));
  };

  // Next day prep handlers
  const addNextDayPrep = () => {
    setNextDayPrep([...nextDayPrep, { id: Date.now(), prep_item: "", location: "", completed: false, notes: "" }]);
  };

  const removeNextDayPrep = (id) => {
    setNextDayPrep(nextDayPrep.filter(ndp => ndp.id !== id));
  };

  const updateNextDayPrep = (id, field, value) => {
    setNextDayPrep(nextDayPrep.map(ndp => ndp.id === id ? { ...ndp, [field]: value } : ndp));
  };

  // Save handler
  const handleSave = async () => {
    if (!title || !companyId) {
      showToast({ title: 'Missing required fields', description: 'Please fill in all required fields', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const sopData = {
        company_id: companyId,
        category: 'Closing Procedures',
        title,
        ref_code: refCode,
        version,
        status,
        author,
        site_location: siteLocation,
        estimated_time: "",
        sop_data: {
          time_slots: timeSlots,
          equipment_shutdown: equipmentShutdown,
          cleaning_areas: cleaningAreas,
          security_checks: securityChecks,
          stock_waste: stockWaste,
          cash_handling: cashHandling,
          next_day_prep: nextDayPrep,
          final_walkthrough: finalWalkthrough
        }
      };

      const { error } = await supabase.from('sop_entries').insert(sopData);
      
      if (error) throw error;
      
      showToast({ title: 'Success', description: 'Closing procedure saved successfully', type: 'success' });
      router.push('/dashboard/sops');
    } catch (error) {
      console.error('Error saving SOP:', error);
      showToast({ title: 'Error saving', description: error.message, type: 'error' });
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
    <div className="max-w-5xl mx-auto p-6 space-y-6 bg-neutral-900 min-h-screen">
      <BackButton href="/dashboard/sops" label="Back to SOPs" />

      <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-2xl p-6 border border-purple-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
          <div>
            <h1 className="text-lg font-semibold text-white">Closing Procedures Template</h1>
            <p className="text-sm text-neutral-400">Manage daily closing checklists and procedures</p>
          </div>
        </div>
      </div>

      {/* SOP Details */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-purple-400 mb-4">Procedure Details</h2>
        
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
            <label className="block text-sm text-neutral-300 mb-1">Procedure Name *</label>
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., Daily Closing Checklist"
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
            <label className="block text-sm text-neutral-300 mb-1">Site/Location</label>
            <select
              value={siteLocation}
              onChange={(e) => setSiteLocation(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="">Select site...</option>
              {sites.map(site => (
                <option key={site.id} value={site.name}>{site.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Time-Based Checklist */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-purple-400 flex items-center gap-2">
            <Clock size={20} />
            Time-Based Checklist
          </h2>
          <button
            onClick={addTimeSlot}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm text-white transition-colors"
          >
            <Plus size={16} />
            Add Time Slot
          </button>
        </div>

        <div className="space-y-4">
          {timeSlots.map((slot, index) => (
            <div key={slot.id} className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-600">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="time"
                  value={slot.time}
                  onChange={(e) => setTimeSlots(timeSlots.map(ts => ts.id === slot.id ? { ...ts, time: e.target.value } : ts))}
                  className="bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-1.5 text-white text-sm"
                />
                <button
                  onClick={() => removeTimeSlot(slot.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-2">
                {slot.tasks.map((task, taskIndex) => (
                  <div key={task.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={(e) => updateTask(slot.id, task.id, 'completed', e.target.checked)}
                      className="rounded border-neutral-600"
                    />
                    <input
                      type="text"
                      value={task.task}
                      onChange={(e) => updateTask(slot.id, task.id, 'task', e.target.value)}
                      placeholder="Enter task..."
                      className="flex-1 bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-1.5 text-white text-sm"
                    />
                    {slot.tasks.length > 1 && (
                      <button
                        onClick={() => removeTaskFromSlot(slot.id, task.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addTaskToSlot(slot.id)}
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-300"
                >
                  <Plus size={12} />
                  Add Task
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Equipment Shutdown Sequence */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-purple-400 flex items-center gap-2">
            <Lock size={20} />
            Equipment Shutdown Sequence
          </h2>
          <button
            onClick={addEquipmentShutdown}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm text-white transition-colors"
          >
            <Plus size={16} />
            Add Equipment
          </button>
        </div>

        <div className="space-y-2">
          {equipmentShutdown.map((eq, index) => (
            <div key={eq.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Equipment</label>}
                <select
                  value={eq.equipment_id}
                  onChange={(e) => updateEquipmentShutdown(eq.id, 'equipment_id', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">Select equipment...</option>
                  {equipmentLibrary.map(equip => (
                    <option key={equip.id} value={equip.id}>{equip.equipment_name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Status</label>}
                <select
                  value={eq.shutdown_status}
                  onChange={(e) => updateEquipmentShutdown(eq.id, 'shutdown_status', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">Status...</option>
                  <option value="Shut Down">Shut Down</option>
                  <option value="Standby">Standby</option>
                  <option value="Issue">Issue</option>
                </select>
              </div>
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Notes</label>}
                <input
                  value={eq.notes}
                  onChange={(e) => updateEquipmentShutdown(eq.id, 'notes', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Optional notes..."
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeEquipmentShutdown(eq.id)}
                  className="w-full flex items-center justify-center h-10 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cleaning Checklist by Area */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-purple-400">Cleaning Checklist by Area</h2>
          <button
            onClick={addCleaningArea}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm text-white transition-colors"
          >
            <Plus size={16} />
            Add Area
          </button>
        </div>

        <div className="space-y-4">
          {cleaningAreas.map((area, index) => (
            <div key={area.id} className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-600">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="text"
                  value={area.area}
                  onChange={(e) => updateCleaningArea(area.id, 'area', e.target.value)}
                  placeholder="Area name..."
                  className="flex-1 bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-1.5 text-white text-sm"
                />
                <button
                  onClick={() => removeCleaningArea(area.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-2">
                {area.cleaning_tasks.map((task, taskIndex) => (
                  <div key={task.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={(e) => updateCleaningTask(area.id, task.id, 'completed', e.target.checked)}
                      className="rounded border-neutral-600"
                    />
                    <input
                      type="text"
                      value={task.task}
                      onChange={(e) => updateCleaningTask(area.id, task.id, 'task', e.target.value)}
                      placeholder="Cleaning task..."
                      className="flex-1 bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-1.5 text-white text-sm"
                    />
                    <select
                      value={task.chemical_id}
                      onChange={(e) => updateCleaningTask(area.id, task.id, 'chemical_id', e.target.value)}
                      className="w-48 bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-1.5 text-white text-sm"
                    >
                      <option value="">Select chemical...</option>
                      {chemicalsLibrary.map(chem => (
                        <option key={chem.id} value={chem.id}>{chem.product_name}</option>
                      ))}
                    </select>
                    {area.cleaning_tasks.length > 1 && (
                      <button
                        onClick={() => removeCleaningTask(area.id, task.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addCleaningTask(area.id)}
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-300"
                >
                  <Plus size={12} />
                  Add Task
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Checks */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-purple-400 flex items-center gap-2">
            <Shield size={20} />
            Security Checks
          </h2>
          <button
            onClick={addSecurityCheck}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm text-white transition-colors"
          >
            <Plus size={16} />
            Add Check
          </button>
        </div>

        <div className="space-y-2">
          {securityChecks.map((check, index) => (
            <div key={check.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Check Item</label>}
                <input
                  value={check.check_item}
                  onChange={(e) => updateSecurityCheck(check.id, 'check_item', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., All doors locked"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Status</label>}
                <select
                  value={check.status}
                  onChange={(e) => updateSecurityCheck(check.id, 'status', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="Pending">Pending</option>
                  <option value="Complete">Complete</option>
                  <option value="Issue">Issue</option>
                </select>
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Verified By</label>}
                <input
                  value={check.verified_by}
                  onChange={(e) => updateSecurityCheck(check.id, 'verified_by', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Notes</label>}
                <input
                  value={check.notes}
                  onChange={(e) => updateSecurityCheck(check.id, 'notes', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeSecurityCheck(check.id)}
                  className="w-full flex items-center justify-center h-10 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stock & Waste */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-purple-400">Stock & Waste</h2>
          <button
            onClick={addStockWaste}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm text-white transition-colors"
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>

        <div className="space-y-2">
          {stockWaste.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Item</label>}
                <input
                  value={item.item}
                  onChange={(e) => updateStockWaste(item.id, 'item', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Item name"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Action</label>}
                <select
                  value={item.action}
                  onChange={(e) => updateStockWaste(item.id, 'action', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="Store">Store</option>
                  <option value="Dispose">Dispose</option>
                  <option value="Return">Return</option>
                </select>
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Quantity</label>}
                <input
                  value={item.quantity}
                  onChange={(e) => updateStockWaste(item.id, 'quantity', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Qty"
                />
              </div>
              <div className="col-span-3">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Notes</label>}
                <input
                  value={item.notes}
                  onChange={(e) => updateStockWaste(item.id, 'notes', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeStockWaste(item.id)}
                  className="w-full flex items-center justify-center h-10 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cash Handling */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-purple-400 flex items-center gap-2 mb-4">
          <DollarSign size={20} />
          Cash Handling
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Total Cash (£)</label>
            <input
              value={cashHandling.total_cash}
              onChange={(e) => setCashHandling({ ...cashHandling, total_cash: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Petty Cash (£)</label>
            <input
              value={cashHandling.petty_cash}
              onChange={(e) => setCashHandling({ ...cashHandling, petty_cash: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="0.00"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-neutral-300 mb-1">Reconciled By</label>
            <input
              value={cashHandling.reconciled_by}
              onChange={(e) => setCashHandling({ ...cashHandling, reconciled_by: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="Name"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-neutral-300 mb-1">Discrepancies</label>
            <input
              value={cashHandling.discrepancies}
              onChange={(e) => setCashHandling({ ...cashHandling, discrepancies: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="Any discrepancies..."
            />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={cashHandling.safe_secured}
              onChange={(e) => setCashHandling({ ...cashHandling, safe_secured: e.target.checked })}
              className="rounded border-neutral-600"
            />
            <span className="text-sm text-neutral-300">Safe secured and locked</span>
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-neutral-300 mb-1">Notes</label>
            <textarea
              value={cashHandling.notes}
              onChange={(e) => setCashHandling({ ...cashHandling, notes: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>
        </div>
      </section>

      {/* Next Day Prep */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-purple-400">Next Day Prep</h2>
          <button
            onClick={addNextDayPrep}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm text-white transition-colors"
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>

        <div className="space-y-2">
          {nextDayPrep.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={(e) => updateNextDayPrep(item.id, 'completed', e.target.checked)}
                className="rounded border-neutral-600"
              />
              <input
                type="text"
                value={item.prep_item}
                onChange={(e) => updateNextDayPrep(item.id, 'prep_item', e.target.value)}
                placeholder="Prep item..."
                className="flex-1 bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                type="text"
                value={item.location}
                onChange={(e) => updateNextDayPrep(item.id, 'location', e.target.value)}
                placeholder="Location..."
                className="w-48 bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                type="text"
                value={item.notes}
                onChange={(e) => updateNextDayPrep(item.id, 'notes', e.target.value)}
                placeholder="Notes..."
                className="w-48 bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
              />
              <button
                onClick={() => removeNextDayPrep(item.id)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Final Walkthrough & Sign-Off */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-purple-400 mb-4">Final Walkthrough & Sign-Off</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Walkthrough By</label>
            <input
              value={finalWalkthrough.walkthrough_by}
              onChange={(e) => setFinalWalkthrough({ ...finalWalkthrough, walkthrough_by: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="Name"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Walkthrough Date</label>
            <input
              type="date"
              value={finalWalkthrough.walkthrough_date}
              onChange={(e) => setFinalWalkthrough({ ...finalWalkthrough, walkthrough_date: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={finalWalkthrough.all_complete}
              onChange={(e) => setFinalWalkthrough({ ...finalWalkthrough, all_complete: e.target.checked })}
              className="rounded border-neutral-600"
            />
            <span className="text-sm text-neutral-300">All closing tasks completed</span>
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-neutral-300 mb-1">Manager Signature</label>
            <input
              value={finalWalkthrough.manager_signature}
              onChange={(e) => setFinalWalkthrough({ ...finalWalkthrough, manager_signature: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="Manager name"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-neutral-300 mb-1">Notes</label>
            <textarea
              value={finalWalkthrough.notes}
              onChange={(e) => setFinalWalkthrough({ ...finalWalkthrough, notes: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex gap-4 sticky bottom-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-transparent text-magenta-400 border border-magenta-500 rounded-lg font-medium transition-all duration-150 hover:bg-magenta-500/10 hover:shadow-[0_0_16px_rgba(236,72,153,0.4)] focus:outline-none focus:ring-2 focus:ring-magenta-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {saving ? 'Saving...' : 'Save Procedure'}
        </button>
      </div>
    </div>
  );
}
