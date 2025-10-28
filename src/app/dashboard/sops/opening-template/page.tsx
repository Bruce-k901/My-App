"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Save, Download, Upload, X, Loader2, Sun, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { useRouter } from 'next/navigation';

export default function OpeningProcedureTemplatePage() {
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Library data
  const [equipmentLibrary, setEquipmentLibrary] = useState([]);
  const [disposablesLibrary, setDisposablesLibrary] = useState([]);
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
    { id: Date.now(), time: "06:00", tasks: [{ id: Date.now(), task: "", completed: false }] }
  ]);

  // Equipment startup sequence
  const [equipmentStartup, setEquipmentStartup] = useState([
    { id: Date.now(), equipment_id: "", startup_status: "", notes: "", check_status: "Pending" }
  ]);

  // Safety checks
  const [safetyChecks, setSafetyChecks] = useState([
    { id: Date.now(), check_item: "", status: "Pending", checked_by: "", notes: "" }
  ]);

  // Stock checks
  const [stockChecks, setStockChecks] = useState([
    { id: Date.now(), item_name: "", quantity_on_hand: "", expiry_check: false, notes: "" }
  ]);

  // Final walkthrough checklist
  const [walkthroughChecklist, setWalkthroughChecklist] = useState([
    { id: Date.now(), item: "", verified: false, notes: "" }
  ]);

  // Manager sign-off
  const [managerSignOff, setManagerSignOff] = useState({
    verified_by: "",
    verification_date: "",
    notes: ""
  });

  // Photo upload refs
  const photoInputRefs = useRef({});
  const [uploadingPhotos, setUploadingPhotos] = useState({});

  // Load libraries
  const loadLibraries = useCallback(async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      const [equipmentResult, disposablesResult, sitesResult] = await Promise.all([
        supabase.from('equipment_library').select('id, equipment_name, category').eq('company_id', companyId).order('equipment_name'),
        supabase.from('disposables_library').select('id, item_name').eq('company_id', companyId).order('item_name'),
        supabase.from('sites').select('id, name').eq('company_id', companyId).order('name')
      ]);
      
      if (equipmentResult.error) throw equipmentResult.error;
      if (disposablesResult.error) throw disposablesResult.error;
      if (sitesResult.error) throw sitesResult.error;
      
      setEquipmentLibrary(equipmentResult.data || []);
      setDisposablesLibrary(disposablesResult.data || []);
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
      setRefCode(`OPEN-${nameBit}-001`);
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

  // Equipment startup handlers
  const addEquipmentStartup = () => {
    setEquipmentStartup([...equipmentStartup, { id: Date.now(), equipment_id: "", startup_status: "", notes: "", check_status: "Pending" }]);
  };

  const removeEquipmentStartup = (id) => {
    setEquipmentStartup(equipmentStartup.filter(eq => eq.id !== id));
  };

  const updateEquipmentStartup = (id, field, value) => {
    setEquipmentStartup(equipmentStartup.map(eq => eq.id === id ? { ...eq, [field]: value } : eq));
  };

  // Safety checks handlers
  const addSafetyCheck = () => {
    setSafetyChecks([...safetyChecks, { id: Date.now(), check_item: "", status: "Pending", checked_by: "", notes: "" }]);
  };

  const removeSafetyCheck = (id) => {
    setSafetyChecks(safetyChecks.filter(sc => sc.id !== id));
  };

  const updateSafetyCheck = (id, field, value) => {
    setSafetyChecks(safetyChecks.map(sc => sc.id === id ? { ...sc, [field]: value } : sc));
  };

  // Stock checks handlers
  const addStockCheck = () => {
    setStockChecks([...stockChecks, { id: Date.now(), item_name: "", quantity_on_hand: "", expiry_check: false, notes: "" }]);
  };

  const removeStockCheck = (id) => {
    setStockChecks(stockChecks.filter(sc => sc.id !== id));
  };

  const updateStockCheck = (id, field, value) => {
    setStockChecks(stockChecks.map(sc => sc.id === id ? { ...sc, [field]: value } : sc));
  };

  // Walkthrough handlers
  const addWalkthroughItem = () => {
    setWalkthroughChecklist([...walkthroughChecklist, { id: Date.now(), item: "", verified: false, notes: "" }]);
  };

  const removeWalkthroughItem = (id) => {
    setWalkthroughChecklist(walkthroughChecklist.filter(w => w.id !== id));
  };

  const updateWalkthroughItem = (id, field, value) => {
    setWalkthroughChecklist(walkthroughChecklist.map(w => w.id === id ? { ...w, [field]: value } : w));
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
        category: 'Opening Procedures',
        title,
        ref_code: refCode,
        version,
        status,
        author,
        site_location: siteLocation,
        estimated_time: "",
        sop_data: {
          time_slots: timeSlots,
          equipment_startup: equipmentStartup,
          safety_checks: safetyChecks,
          stock_checks: stockChecks,
          walkthrough_checklist: walkthroughChecklist,
          manager_sign_off: managerSignOff
        }
      };

      const { error } = await supabase.from('sop_entries').insert(sopData);
      
      if (error) throw error;
      
      showToast({ title: 'Success', description: 'Opening procedure saved successfully', type: 'success' });
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
      {/* Back Button */}
      <button
        onClick={() => router.push('/dashboard/sops')}
        className="flex items-center gap-2 px-4 py-2 text-magenta-400 border border-magenta-500/30 rounded-lg hover:bg-magenta-500/10 hover:border-magenta-400 transition-all"
      >
        ← Back to SOPs
      </button>

      <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-2xl p-6 border border-yellow-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-8 bg-yellow-500 rounded-full"></div>
          <div>
            <h1 className="text-lg font-semibold text-white">Opening Procedures Template</h1>
            <p className="text-sm text-neutral-400">Manage daily opening checklists and procedures</p>
          </div>
        </div>
      </div>

      {/* SOP Details */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-yellow-400 mb-4">Procedure Details</h2>
        
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
              placeholder="e.g., Daily Opening Checklist"
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
          <h2 className="text-xl font-semibold text-yellow-400 flex items-center gap-2">
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

      {/* Equipment Startup Sequence */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-yellow-400 flex items-center gap-2">
            <CheckCircle2 size={20} />
            Equipment Startup Sequence
          </h2>
          <button
            onClick={addEquipmentStartup}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm text-white transition-colors"
          >
            <Plus size={16} />
            Add Equipment
          </button>
        </div>

        <div className="space-y-2">
          {equipmentStartup.map((eq, index) => (
            <div key={eq.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Equipment</label>}
                <select
                  value={eq.equipment_id}
                  onChange={(e) => updateEquipmentStartup(eq.id, 'equipment_id', e.target.value)}
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
                  value={eq.startup_status}
                  onChange={(e) => updateEquipmentStartup(eq.id, 'startup_status', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">Status...</option>
                  <option value="Operational">Operational</option>
                  <option value="Needs Maintenance">Needs Maintenance</option>
                  <option value="Out of Order">Out of Order</option>
                </select>
              </div>
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Notes</label>}
                <input
                  value={eq.notes}
                  onChange={(e) => updateEquipmentStartup(eq.id, 'notes', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Optional notes..."
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeEquipmentStartup(eq.id)}
                  className="w-full flex items-center justify-center h-10 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Safety Checks */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-yellow-400">Safety Checks</h2>
          <button
            onClick={addSafetyCheck}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm text-white transition-colors"
          >
            <Plus size={16} />
            Add Check
          </button>
        </div>

        <div className="space-y-2">
          {safetyChecks.map((check, index) => (
            <div key={check.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Check Item</label>}
                <input
                  value={check.check_item}
                  onChange={(e) => updateSafetyCheck(check.id, 'check_item', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Fire exits clear"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Status</label>}
                <select
                  value={check.status}
                  onChange={(e) => updateSafetyCheck(check.id, 'status', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="Pending">Pending</option>
                  <option value="Complete">Complete</option>
                  <option value="Issue">Issue</option>
                </select>
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Checked By</label>}
                <input
                  value={check.checked_by}
                  onChange={(e) => updateSafetyCheck(check.id, 'checked_by', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Notes</label>}
                <input
                  value={check.notes}
                  onChange={(e) => updateSafetyCheck(check.id, 'notes', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeSafetyCheck(check.id)}
                  className="w-full flex items-center justify-center h-10 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stock Checks */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-yellow-400">Stock Checks</h2>
          <button
            onClick={addStockCheck}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm text-white transition-colors"
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>

        <div className="space-y-2">
          {stockChecks.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Item Name</label>}
                <input
                  value={item.item_name}
                  onChange={(e) => updateStockCheck(item.id, 'item_name', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Milk"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Qty on Hand</label>}
                <input
                  value={item.quantity_on_hand}
                  onChange={(e) => updateStockCheck(item.id, 'quantity_on_hand', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Qty"
                />
              </div>
              <div className="col-span-3">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Expiry Check</label>}
                <div className="flex items-center gap-2 h-10">
                  <input
                    type="checkbox"
                    checked={item.expiry_check}
                    onChange={(e) => updateStockCheck(item.id, 'expiry_check', e.target.checked)}
                    className="rounded border-neutral-600"
                  />
                  <span className="text-xs text-neutral-400">Checked</span>
                </div>
              </div>
              <div className="col-span-2">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Notes</label>}
                <input
                  value={item.notes}
                  onChange={(e) => updateStockCheck(item.id, 'notes', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeStockCheck(item.id)}
                  className="w-full flex items-center justify-center h-10 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final Walkthrough Checklist */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-yellow-400">Final Walkthrough Checklist</h2>
          <button
            onClick={addWalkthroughItem}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm text-white transition-colors"
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>

        <div className="space-y-2">
          {walkthroughChecklist.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.verified}
                onChange={(ie) => updateWalkthroughItem(item.id, 'verified', ie.target.checked)}
                className="rounded border-neutral-600"
              />
              <input
                type="text"
                value={item.item}
                onChange={(e) => updateWalkthroughItem(item.id, 'item', e.target.value)}
                placeholder="Walkthrough item..."
                className="flex-1 bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                type="text"
                value={item.notes}
                onChange={(e) => updateWalkthroughItem(item.id, 'notes', e.target.value)}
                placeholder="Notes..."
                className="w-48 bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
              />
              <button
                onClick={() => removeWalkthroughItem(item.id)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Manager Sign-Off */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-yellow-400 mb-4">Manager Sign-Off</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Verified By</label>
            <input
              value={managerSignOff.verified_by}
              onChange={(e) => setManagerSignOff({ ...managerSignOff, verified_by: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="Manager name"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Verification Date</label>
            <input
              type="date"
              value={managerSignOff.verification_date}
              onChange={(e) => setManagerSignOff({ ...managerSignOff, verification_date: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-neutral-300 mb-1">Notes</label>
            <textarea
              value={managerSignOff.notes}
              onChange={(e) => setManagerSignOff({ ...managerSignOff, notes: e.target.value })}
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
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-magenta-600 to-blue-600 hover:from-magenta-500 hover:to-blue-500 rounded-lg text-white font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {saving ? 'Saving...' : 'Save Procedure'}
        </button>
      </div>
    </div>
  );
}
