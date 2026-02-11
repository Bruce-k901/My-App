"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, Loader2, Download } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import BackButton from '@/components/ui/BackButton';
import { useRouter } from 'next/navigation';

export default function ServiceSOPTemplatePage() {
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  const router = useRouter();
  
  const [_loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Header state
  const [title, setTitle] = useState("");
  const [refCode, setRefCode] = useState("");
  const [version, setVersion] = useState("1.0");
  const [status, setStatus] = useState("Draft");
  const [author, setAuthor] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");

  // Service Standards
  const [serviceStandards, setServiceStandards] = useState([
    { id: Date.now(), standard: "", description: "" }
  ]);

  // Guest Interaction Guidelines
  const [guestGuidelines, setGuestGuidelines] = useState([
    { id: Date.now(), situation: "", response: "", example: "" }
  ]);

  // Table Setup Checklist
  const [tableSetup, setTableSetup] = useState([
    { id: Date.now(), item: "", checked: false, photo_url: "" }
  ]);

  // Service Sequence Steps
  const [serviceSteps, setServiceSteps] = useState([
    { id: Date.now(), step: "", timing: "", photo_url: "" }
  ]);

  // Upselling Prompts
  const [upsellingPrompts, setUpsellingPrompts] = useState([
    { id: Date.now(), prompt: "", context: "" }
  ]);

  // Common Issues & Solutions
  const [commonIssues, setCommonIssues] = useState([
    { id: Date.now(), issue: "", solution: "", escalation: "" }
  ]);

  // Photo upload refs
  const _photoInputRefs = useRef({});
  const [_uploadingPhotos, _setUploadingPhotos] = useState({});

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
      setRefCode(`SRV-${nameBit}-001`);
    }
  }, [title]);

  // Handlers
  const addServiceStandard = () => {
    setServiceStandards([...serviceStandards, { id: Date.now(), standard: "", description: "" }]);
  };

  const _addGuestGuideline = () => {
    setGuestGuidelines([...guestGuidelines, { id: Date.now(), situation: "", response: "", example: "" }]);
  };

  const _addTableSetupItem = () => {
    setTableSetup([...tableSetup, { id: Date.now(), item: "", checked: false, photo_url: "" }]);
  };

  const _addServiceStep = () => {
    setServiceSteps([...serviceSteps, { id: Date.now(), step: "", timing: "", photo_url: "" }]);
  };

  const _addUpsellingPrompt = () => {
    setUpsellingPrompts([...upsellingPrompts, { id: Date.now(), prompt: "", context: "" }]);
  };

  const _addCommonIssue = () => {
    setCommonIssues([...commonIssues, { id: Date.now(), issue: "", solution: "", escalation: "" }]);
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
      serviceStandards,
      guestGuidelines,
      tableSetup,
      serviceSteps,
      upsellingPrompts,
      commonIssues
    };

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('sop_entries')
        .insert({
          company_id: companyId,
          title,
          ref_code: refCode,
          version,
          status,
          author,
          category: 'Service (FOH)',
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

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 bg-neutral-900 min-h-screen">
      <BackButton href="/dashboard/sops" label="Back to SOPs" />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl p-6 border border-blue-500/30">
        <h1 className="text-3xl font-bold text-white mb-2">Service (FOH) SOP Template</h1>
        <p className="text-neutral-300 text-sm">
          Front of house service standards and guest interaction procedures
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
              placeholder="e.g., Lunch Service Standard"
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
            <label className="block text-sm text-neutral-300 mb-1">Estimated Time</label>
            <input 
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., 30 minutes"
            />
          </div>
        </div>
      </section>

      {/* SERVICE STANDARDS SECTION */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Service Standards</h2>
        <p className="text-xs text-neutral-400 mb-4">
          Define core service principles and expected behaviors
        </p>

        <div className="space-y-2">
          {serviceStandards.map((std, index) => (
            <div key={std.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Standard</label>}
                <input
                  value={std.standard}
                  onChange={(e) => setServiceStandards(serviceStandards.map(s => s.id === std.id ? { ...s, standard: e.target.value } : s))}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g., Greeting"
                />
              </div>
              <div className="col-span-7">
                {index === 0 && <label className="block text-xs text-neutral-400 mb-1">Description</label>}
                <input
                  value={std.description}
                  onChange={(e) => setServiceStandards(serviceStandards.map(s => s.id === std.id ? { ...s, description: e.target.value } : s))}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Expected behavior..."
                />
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => setServiceStandards(serviceStandards.filter(s => s.id !== std.id))}
                  disabled={serviceStandards.length === 1}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg p-2 text-red-400 disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addServiceStandard}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm"
        >
          <Plus size={16} />
          Add Standard
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

