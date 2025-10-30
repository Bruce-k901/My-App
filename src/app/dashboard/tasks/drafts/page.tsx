"use client";

import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Play, Clock, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

export default function DraftsPage() {
  const { companyId, loading: authLoading } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState([]);

  const loadDrafts = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("task_templates")
        .select(`
          id,
          name,
          description,
          category,
          frequency,
          created_at,
          instructions
        `)
        .eq("company_id", companyId)
        .eq("is_template_library", false) // Only draft templates
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error('Error loading drafts:', error);
      showToast({ title: 'Error loading drafts', description: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, [companyId]);

  // Show loading only while auth is initializing
  if (authLoading) {
    return (
      <div className="p-8">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // If no company after auth loads, show setup message
  if (!companyId) {
    return (
      <div className="p-8">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">
            Company Setup Required
          </h2>
          <p className="text-white/80 mb-4">
            Please complete your company setup before accessing this page.
          </p>
          <a 
            href="/dashboard/business" 
            className="inline-block px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors"
          >
            Go to Business Details
          </a>
        </div>
      </div>
    );
  }

  const handleDeploy = async (draftId) => {
    try {
      // Update the template to be in the library (deploy it)
      const { error } = await supabase
        .from("task_templates")
        .update({ is_template_library: true })
        .eq("id", draftId);
      
      if (error) throw error;
      
      showToast({ title: 'Draft deployed', description: 'Template is now available in Templates page', type: 'success' });
      loadDrafts(); // Reload to remove from drafts
    } catch (error) {
      console.error('Error deploying draft:', error);
      showToast({ title: 'Error deploying draft', description: error.message, type: 'error' });
    }
  };

  const handleDelete = async (draftId) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    
    try {
      const { error } = await supabase
        .from("task_templates")
        .delete()
        .eq("id", draftId);
      
      if (error) throw error;
      
      showToast({ title: 'Draft deleted', description: 'Draft template deleted successfully', type: 'success' });
      loadDrafts();
    } catch (error) {
      console.error('Error deleting draft:', error);
      showToast({ title: 'Error deleting draft', description: error.message, type: 'error' });
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'food_safety': 'bg-green-500/10 text-green-400 border-green-500/20',
      'h_and_s': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'fire': 'bg-red-500/10 text-red-400 border-red-500/20',
      'cleaning': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'compliance': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    };
    return colors[category] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const getFrequencyIcon = (frequency) => {
    switch (frequency) {
      case 'daily': return '📅';
      case 'weekly': return '📆';
      case 'monthly': return '🗓️';
      case 'triggered': return '⚡';
      case 'once': return '🎯';
      default: return '📋';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Drafts</h1>
        <p className="text-white/60">Saved task templates that haven't been deployed yet</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4">
            <Clock className="w-8 h-8 text-pink-400 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Loading drafts...</h3>
        </div>
      ) : drafts.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4">
              <FileText className="w-8 h-8 text-pink-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No drafts found</h2>
            <p className="text-white/60 max-w-md mx-auto">
              Create a task template from the Compliance Templates page to see it here as a draft.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drafts.map((draft) => (
            <div key={draft.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.06] transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">{draft.name}</h3>
                  <p className="text-white/60 text-sm mb-3">{draft.description}</p>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(draft.category)}`}>
                      {draft.category.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="flex items-center gap-1 text-white/60 text-sm">
                      {getFrequencyIcon(draft.frequency)} {draft.frequency}
                    </span>
                  </div>
                </div>
              </div>
              
              {draft.instructions && (
                <div className="mb-4">
                  <p className="text-white/80 text-sm line-clamp-2">{draft.instructions}</p>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                <span className="text-white/40 text-xs">
                  Created {new Date(draft.created_at).toLocaleDateString()}
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeploy(draft.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-colors text-sm"
                  >
                    <Play className="w-3 h-3" />
                    Deploy
                  </button>
                  
                  <button
                    onClick={() => handleDelete(draft.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/60 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}