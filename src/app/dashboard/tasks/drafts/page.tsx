"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { FileText, Calendar, User, Building, Edit, Trash2, Eye } from "lucide-react";

interface DraftTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  frequency: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_template_library: boolean;
  assigned_to_role: string | null;
  site_id: string | null;
  asset_type: string | null;
  instructions: string | null;
}

export default function DraftTasksPage() {
  const { profile, companyId } = useAppContext();
  const [drafts, setDrafts] = useState<DraftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadDraftTemplates();
    }
  }, [companyId]);

  const loadDraftTemplates = async () => {
    if (!companyId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from("task_templates")
        .select(`
          id,
          name,
          description,
          category,
          frequency,
          created_at,
          updated_at,
          is_active,
          is_template_library,
          assigned_to_role,
          site_id,
          asset_type,
          instructions
        `)
        .eq("company_id", companyId)
        .eq("is_template_library", false) // Only show company-specific drafts, not library templates
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      setDrafts(data || []);
    } catch (err: any) {
      console.error("Error loading draft templates:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm("Are you sure you want to delete this draft template?")) return;
    
    try {
      const { error } = await supabase
        .from("task_templates")
        .delete()
        .eq("id", draftId);
      
      if (error) throw error;
      
      // Reload the list
      await loadDraftTemplates();
    } catch (err: any) {
      console.error("Error deleting draft:", err);
      alert("Failed to delete draft template");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      food_safety: "bg-green-500/20 text-green-400 border-green-500/30",
      h_and_s: "bg-blue-500/20 text-blue-400 border-blue-500/30", 
      fire: "bg-red-500/20 text-red-400 border-red-500/30",
      cleaning: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      compliance: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    };
    return colors[category as keyof typeof colors] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case "daily": return "📅";
      case "weekly": return "📆";
      case "monthly": return "🗓️";
      case "triggered": return "⚡";
      case "once": return "🎯";
      default: return "📋";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-white/60">Loading draft templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">❌ Error loading drafts</div>
        <p className="text-white/60 mb-4">{error}</p>
        <button 
          onClick={loadDraftTemplates}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-magenta-600/20 to-blue-600/20 rounded-2xl p-6 border border-magenta-500/30">
        <h1 className="text-2xl font-semibold mb-2">Draft Tasks</h1>
        <p className="text-neutral-300 text-sm">
          View and manage your saved task templates before deployment
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-3 transition-all duration-150 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]">
          <div className="text-neutral-400 text-sm">Total Drafts</div>
          <div className="text-2xl font-bold text-white mt-1">{drafts.length}</div>
        </div>
        <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-3 transition-all duration-150 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]">
          <div className="text-neutral-400 text-sm">Active Drafts</div>
          <div className="text-2xl font-bold text-white mt-1">
            {drafts.filter(d => d.is_active).length}
          </div>
        </div>
        <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-3 transition-all duration-150 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]">
          <div className="text-neutral-400 text-sm">Categories</div>
          <div className="text-2xl font-bold text-white mt-1">
            {new Set(drafts.map(d => d.category)).size}
          </div>
        </div>
      </div>

      {/* Draft Templates List */}
      {drafts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-neutral-400 mb-4 text-4xl">📝</div>
          <p className="text-neutral-400 font-medium mb-2">No draft templates found</p>
          <p className="text-neutral-500 text-sm mb-4">
            Save templates from the compliance page to see them here
          </p>
          <a 
            href="/compliance"
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors inline-block"
          >
            Go to Compliance
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div 
              key={draft.id}
              className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-4 transition-all duration-150 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {draft.name}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(draft.category)}`}>
                      {draft.category.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-neutral-400">
                      {getFrequencyIcon(draft.frequency)} {draft.frequency}
                    </span>
                    {draft.is_active ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                        Inactive
                      </span>
                    )}
                  </div>
                  
                  {draft.description && (
                    <p className="text-neutral-300 text-sm mb-3 line-clamp-2">
                      {draft.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-neutral-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created: {formatDate(draft.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Updated: {formatDate(draft.updated_at)}
                    </div>
                    {draft.assigned_to_role && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {draft.assigned_to_role}
                      </div>
                    )}
                    {draft.asset_type && (
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {draft.asset_type}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => {/* TODO: View details */}}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-white/[0.1] rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {/* TODO: Edit template */}}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-white/[0.1] rounded-lg transition-colors"
                    title="Edit Template"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDraft(draft.id)}
                    className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete Draft"
                  >
                    <Trash2 className="h-4 w-4" />
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
