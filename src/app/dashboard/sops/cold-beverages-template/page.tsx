"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Save, Download, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

export default function ColdBeveragesSOPTemplatePage() {
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Library data
  const [drinksLibrary, setDrinksLibrary] = useState([]);
  const [disposablesLibrary, setDisposablesLibrary] = useState([]);

  // Header state
  const [title, setTitle] = useState("");
  const [refCode, setRefCode] = useState("");
  const [version, setVersion] = useState("1.0");
  const [status, setStatus] = useState("Draft");
  const [author, setAuthor] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");

  // Drink structure
  const [beverages, setBeverages] = useState([
    { id: Date.now(), drink_id: "", quantity: "", temperature: "", allergens: [] }
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
        supabase.from('drinks_library').select('*').eq('company_id', companyId).eq('category', 'Cold Beverages').order('item_name'),
        supabase.from('disposables_library').select('*').eq('company_id', companyId).order('item_name')
      ]);
      
      if (drinksResult.error) throw drinksResult.error;
      if (disposablesResult.error) throw disposablesResult.error;
      
      setDrinksLibrary(drinksResult.data || []);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900">
        <div className="text-neutral-400">Loading libraries...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 bg-neutral-900 min-h-screen">
      <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl p-6 border border-blue-500/30">
        <h1 className="text-2xl font-semibold mb-2">Cold Beverages SOP Template</h1>
        <p className="text-neutral-300 text-sm">Manage cold beverage preparation procedures</p>
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
              placeholder="e.g., Iced Coffee"
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

      {/* Save Button */}
      <div className="flex gap-4 sticky bottom-6">
        <button
          onClick={() => showToast({ title: 'Coming soon', description: 'Save functionality will be implemented soon', type: 'info' })}
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

