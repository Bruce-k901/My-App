"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import {
  Brain,
  Plus,
  Search,
  Edit2,
  Trash2,
  Save,
  X,
  ChevronDown,
  Tag,
  FileText,
  AlertCircle,
  Check,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
} from "@/components/ui/icons";
import { toast } from "sonner";

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  category: string;
  subcategory: string | null;
  tags: string[];
  source: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "app_help", label: "App Help", description: "How to use Opsly features" },
  { value: "app_feature", label: "App Feature", description: "Feature documentation" },
  { value: "food_safety", label: "Food Safety", description: "Food safety compliance" },
  { value: "fire_safety", label: "Fire Safety", description: "Fire safety regulations" },
  { value: "health_safety", label: "Health & Safety", description: "H&S compliance" },
  { value: "sop_guidance", label: "SOP Guidance", description: "Standard procedures" },
  { value: "ra_guidance", label: "Risk Assessment", description: "Risk assessment help" },
  { value: "troubleshooting", label: "Troubleshooting", description: "Common issues" },
];

export default function AIKnowledgeBasePage() {
  const { profile } = useAppContext();
  const router = useRouter();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showInactive, setShowInactive] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    summary: "",
    category: "app_feature",
    subcategory: "",
    tags: "",
    source: "",
  });

  // Check admin access
  useEffect(() => {
    if (profile && !["Owner", "Admin"].includes(profile.app_role || "")) {
      toast.error("Admin access required");
      router.push("/dashboard");
    }
  }, [profile, router]);

  // Fetch entries
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);
      if (showInactive) params.set("includeInactive", "true");

      const response = await fetch(`/api/knowledge-base?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch entries");
      }

      setEntries(result.data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, showInactive]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      summary: "",
      category: "app_feature",
      subcategory: "",
      tags: "",
      source: "",
    });
    setEditingEntry(null);
    setIsCreating(false);
  };

  // Open edit form
  const openEditForm = (entry: KnowledgeEntry) => {
    setFormData({
      title: entry.title,
      content: entry.content,
      summary: entry.summary || "",
      category: entry.category,
      subcategory: entry.subcategory || "",
      tags: entry.tags.join(", "),
      source: entry.source || "",
    });
    setEditingEntry(entry);
    setIsCreating(false);
  };

  // Open create form
  const openCreateForm = () => {
    resetForm();
    setIsCreating(true);
  };

  // Save entry
  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        summary: formData.summary.trim() || null,
        category: formData.category,
        subcategory: formData.subcategory.trim() || null,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        source: formData.source.trim() || null,
      };

      const url = editingEntry
        ? `/api/knowledge-base/${editingEntry.id}`
        : "/api/knowledge-base";
      const method = editingEntry ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save entry");
      }

      toast.success(editingEntry ? "Entry updated" : "Entry created");
      resetForm();
      fetchEntries();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const toggleActive = async (entry: KnowledgeEntry) => {
    try {
      const response = await fetch(`/api/knowledge-base/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !entry.is_active }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to update entry");
      }

      toast.success(entry.is_active ? "Entry deactivated" : "Entry activated");
      fetchEntries();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Delete entry
  const handleDelete = async (entry: KnowledgeEntry) => {
    if (!confirm(`Are you sure you want to permanently delete "${entry.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/knowledge-base/${entry.id}?hard=true`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete entry");
      }

      toast.success("Entry deleted");
      fetchEntries();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (!profile || !["Owner", "Admin"].includes(profile.app_role || "")) {
    return null;
  }

  return (
    <div className="w-full min-h-screen bg-theme-surface-elevated">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-module-fg" />
            <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary">
              AI Knowledge Base
            </h1>
          </div>
          <p className="text-theme-secondary text-sm sm:text-base">
            Manage the knowledge that powers the Ask AI assistant. Add feature documentation,
            compliance info, and troubleshooting guides.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-theme-surface border border-theme rounded-xl p-4">
            <div className="text-theme-secondary text-sm mb-1">Total Entries</div>
            <div className="text-2xl font-bold text-theme-primary">{entries.length}</div>
          </div>
          <div className="bg-theme-surface border border-theme rounded-xl p-4">
            <div className="text-theme-secondary text-sm mb-1">Active</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {entries.filter((e) => e.is_active).length}
            </div>
          </div>
          <div className="bg-theme-surface border border-theme rounded-xl p-4">
            <div className="text-theme-secondary text-sm mb-1">Categories</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {new Set(entries.map((e) => e.category)).size}
            </div>
          </div>
          <div className="bg-theme-surface border border-theme rounded-xl p-4">
            <div className="text-theme-secondary text-sm mb-1">App Features</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {entries.filter((e) => e.category === "app_feature" || e.category === "app_help").length}
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-theme-surface border border-theme rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
              <input
                type="text"
                placeholder="Search knowledge base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/[0.06] border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-module-fg/[0.50]"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-white/[0.06] border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-module-fg/[0.50]"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Show Inactive Toggle */}
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showInactive
                  ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
                  : "bg-gray-50 dark:bg-white/[0.06] border-theme text-theme-secondary"
              }`}
            >
              {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="text-sm hidden sm:inline">{showInactive ? "Showing All" : "Active Only"}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={fetchEntries}
 className="p-2 rounded-lg bg-theme-surface-elevated border border-theme text-theme-secondary hover:bg-theme-muted transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Add New */}
            <button
              onClick={openCreateForm}
              className="flex items-center gap-2 px-4 py-2 bg-module-fg hover:bg-module-fg/[0.90] text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Add Entry</span>
            </button>
          </div>
        </div>

        {/* Create/Edit Form */}
        {(isCreating || editingEntry) && (
          <div className="bg-theme-surface border border-module-fg/[0.30] rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-theme-primary">
                {editingEntry ? "Edit Entry" : "New Knowledge Entry"}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-theme-tertiary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., How to create a new checklist"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.06] border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-module-fg/[0.50]"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.06] border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-module-fg/[0.50]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label} - {cat.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  Subcategory
                </label>
                <input
                  type="text"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  placeholder="e.g., Checkly, Temperature Logs"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.06] border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-module-fg/[0.50]"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., checklist, tasks, compliance"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.06] border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-module-fg/[0.50]"
                />
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  Source/Reference
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="e.g., Internal docs, FSA guidelines"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.06] border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-module-fg/[0.50]"
                />
              </div>

              {/* Summary */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  Summary (short description for search)
                </label>
                <input
                  type="text"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Brief one-line description"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.06] border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-module-fg/[0.50]"
                />
              </div>

              {/* Content */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  Content * (detailed information the AI will use)
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write detailed information here. This is what the AI will use to answer questions. Include step-by-step instructions, important notes, and any relevant details."
                  rows={8}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.06] border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-module-fg/[0.50] resize-y"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-theme">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-module-fg hover:bg-module-fg/[0.90] text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{editingEntry ? "Update" : "Create"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Entries List */}
        <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
          <div className="p-4 border-b border-theme">
            <h2 className="text-lg font-semibold text-theme-primary">
              Knowledge Entries
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-module-fg animate-spin mx-auto mb-4" />
              <p className="text-theme-secondary">Loading entries...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <Brain className="w-12 h-12 text-theme-tertiary mx-auto mb-4" />
              <p className="text-theme-secondary mb-2">No entries found</p>
              <p className="text-sm text-theme-tertiary">
                {searchQuery || selectedCategory
                  ? "Try adjusting your filters"
                  : "Add your first knowledge entry to help the AI assistant"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-white/[0.06]">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 hover:bg-theme-surface-elevated dark:hover:bg-white/[0.02] transition-colors ${
                    !entry.is_active ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-theme-primary truncate">
                          {entry.title}
                        </h3>
                        {!entry.is_active && (
                          <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-white/10 text-theme-secondary rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 text-xs bg-module-fg/[0.10] text-module-fg rounded">
                          {CATEGORIES.find((c) => c.value === entry.category)?.label || entry.category}
                        </span>
                        {entry.subcategory && (
                          <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded">
                            {entry.subcategory}
                          </span>
                        )}
                        {entry.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-white/[0.06] text-theme-secondary rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {entry.tags.length > 3 && (
                          <span className="text-xs text-theme-tertiary">
                            +{entry.tags.length - 3} more
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-theme-secondary line-clamp-2">
                        {entry.summary || entry.content.substring(0, 150)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(entry)}
                        className={`p-2 rounded-lg transition-colors ${
                          entry.is_active
                            ? "text-green-600 hover:bg-green-100 dark:hover:bg-module-fg/10"
                            : "text-theme-tertiary hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                        }`}
                        title={entry.is_active ? "Deactivate" : "Activate"}
                      >
                        {entry.is_active ? <Check className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEditForm(entry)}
                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-module-fg/10 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors"
                        title="Delete"
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
      </div>
    </div>
  );
}
