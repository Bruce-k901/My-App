'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { useSiteFilter } from '@/hooks/useSiteFilter';
import {
  Wrench,
  Sparkles,
  RefreshCw,
  Trash,
  Plus,
  X,
  Pencil,
  GripVertical,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
} from '@/components/ui/icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Asset = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: string;
  site_id: string | null;
  site_name?: string | null;
};

type Guide = {
  id: string;
  asset_id: string;
  ai_questions: string[];
  custom_questions: string[];
  sources: Array<{ url: string; title: string }>;
  generated_at: string | null;
  updated_at: string;
};

type GeneratingState = {
  assetId: string;
  status: 'generating' | 'preview' | 'saving';
};

type EquipmentResult = {
  brand: string;
  model: string;
  name: string;
  category?: string;
  url?: string;
};

type SimilarAsset = Asset & { selected: boolean };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TroubleshootSetupPage() {
  const { companyId, loading: authLoading, session, profile } = useAppContext();
  const { applySiteFilter, selectedSiteId, isAllSites } = useSiteFilter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<GeneratingState | null>(null);

  // Preview state for AI generation results
  const [previewQuestions, setPreviewQuestions] = useState<string[]>([]);
  const [previewSources, setPreviewSources] = useState<Array<{ url: string; title: string }>>([]);

  // Editing state
  const [editingAi, setEditingAi] = useState<string[]>([]);
  const [editingCustom, setEditingCustom] = useState<string[]>([]);
  const [newCustomQuestion, setNewCustomQuestion] = useState('');
  const [editingIndex, setEditingIndex] = useState<{ section: 'ai' | 'custom'; index: number } | null>(null);
  const [editingText, setEditingText] = useState('');

  // Similar assets state (cross-site copy)
  const [similarAssets, setSimilarAssets] = useState<SimilarAsset[]>([]);
  const [showSimilarPanel, setShowSimilarPanel] = useState(false);
  const [copyingGuide, setCopyingGuide] = useState(false);
  const [savedGuideAsset, setSavedGuideAsset] = useState<Asset | null>(null);

  // Equipment search state
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [equipmentResults, setEquipmentResults] = useState<EquipmentResult[]>([]);
  const [searchingEquipment, setSearchingEquipment] = useState(false);
  const [showEquipmentSearch, setShowEquipmentSearch] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  // Site-filtered assets for display
  const fetchAssets = useCallback(async () => {
    if (!companyId) return [];
    const { data, error } = await applySiteFilter(
      supabase
        .from('assets')
        .select('id, name, brand, model, category, site_id')
        .eq('company_id', companyId)
        .eq('archived', false)
    ).order('name');
    if (error) throw error;
    return (data || []) as Asset[];
  }, [companyId, selectedSiteId]);

  // ALL company assets (no site filter) for cross-site matching
  const fetchAllAssets = useCallback(async () => {
    if (!companyId) return [];

    const { data: assetsData, error: assetsError } = await supabase
      .from('assets')
      .select('id, name, brand, model, category, site_id')
      .eq('company_id', companyId)
      .eq('archived', false)
      .order('name');
    if (assetsError) throw assetsError;
    if (!assetsData || assetsData.length === 0) return [];

    // Fetch site names for display
    const siteIds = [...new Set(assetsData.map((a: any) => a.site_id).filter(Boolean))];
    let sitesMap = new Map<string, string>();
    if (siteIds.length > 0) {
      const { data: sites } = await supabase
        .from('sites')
        .select('id, name')
        .in('id', siteIds);
      sitesMap = new Map((sites || []).map((s: any) => [s.id, s.name]));
    }

    return assetsData.map((a: any) => ({
      ...a,
      site_name: a.site_id ? sitesMap.get(a.site_id) || null : null,
    })) as Asset[];
  }, [companyId]);

  const fetchGuides = useCallback(async () => {
    if (!companyId) return [];
    const { data, error } = await supabase
      .from('asset_troubleshooting_guides')
      .select('id, asset_id, ai_questions, custom_questions, sources, generated_at, updated_at')
      .eq('company_id', companyId)
      .eq('is_active', true);
    if (error) {
      if (error.code === '42P01') return [];
      throw error;
    }
    return (data || []) as Guide[];
  }, [companyId]);

  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['troubleshoot-assets', companyId, selectedSiteId],
    queryFn: fetchAssets,
    staleTime: 1000 * 60 * 5,
    enabled: !authLoading && !!companyId,
  });

  const { data: allCompanyAssets = [] } = useQuery({
    queryKey: ['troubleshoot-all-assets', companyId],
    queryFn: fetchAllAssets,
    staleTime: 1000 * 60 * 5,
    enabled: !authLoading && !!companyId,
  });

  const { data: guides = [], isLoading: loadingGuides } = useQuery({
    queryKey: ['troubleshoot-guides', companyId],
    queryFn: fetchGuides,
    staleTime: 1000 * 60 * 2,
    enabled: !authLoading && !!companyId,
  });

  const guideMap = new Map(guides.map((g) => [g.asset_id, g]));

  // ---------------------------------------------------------------------------
  // Filter assets
  // ---------------------------------------------------------------------------

  const q = (query || '').toLowerCase().trim();
  const filteredAssets = q
    ? assets.filter(
        (a) =>
          (a.name || '').toLowerCase().includes(q) ||
          (a.brand || '').toLowerCase().includes(q) ||
          (a.model || '').toLowerCase().includes(q) ||
          (a.category || '').toLowerCase().includes(q)
      )
    : assets;

  // ---------------------------------------------------------------------------
  // Find similar assets across all sites
  // ---------------------------------------------------------------------------

  const findSimilarAssets = (sourceAsset: Asset): SimilarAsset[] => {
    const sourceBrand = (sourceAsset.brand || '').toLowerCase().trim();
    const sourceModel = (sourceAsset.model || '').toLowerCase().trim();
    const sourceName = (sourceAsset.name || '').toLowerCase().trim();

    return allCompanyAssets
      .filter((a) => {
        if (a.id === sourceAsset.id) return false;
        if (guideMap.has(a.id)) return false; // already has a guide

        const brand = (a.brand || '').toLowerCase().trim();
        const model = (a.model || '').toLowerCase().trim();
        const name = (a.name || '').toLowerCase().trim();

        // Match: same brand+model (both non-empty)
        if (sourceBrand && sourceModel && brand === sourceBrand && model === sourceModel) return true;
        // Match: same name exactly
        if (sourceName && name === sourceName) return true;
        // Match: same brand + same category (looser)
        if (sourceBrand && brand === sourceBrand && a.category === sourceAsset.category) return true;

        return false;
      })
      .map((a) => ({ ...a, selected: true }));
  };

  // ---------------------------------------------------------------------------
  // AI generation
  // ---------------------------------------------------------------------------

  const handleGenerate = async (asset: Asset) => {
    setGenerating({ assetId: asset.id, status: 'generating' });
    setExpandedAssetId(asset.id);
    setShowSimilarPanel(false);
    setShowEquipmentSearch(false);

    try {
      const res = await fetch('/api/assistant/generate-troubleshooting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_name: asset.name,
          brand: asset.brand,
          model: asset.model,
          category: asset.category,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate');
      }

      const data = await res.json();
      setPreviewQuestions(data.questions);
      setPreviewSources(data.sources || []);

      const existing = guideMap.get(asset.id);
      setEditingAi(data.questions);
      setEditingCustom(existing?.custom_questions || []);

      setGenerating({ assetId: asset.id, status: 'preview' });
    } catch (err: any) {
      console.error('Generate error:', err);
      showToast({
        title: 'Generation failed',
        description: err.message || 'Could not generate troubleshooting guide',
        type: 'error',
      });
      setGenerating(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Open existing guide for editing
  // ---------------------------------------------------------------------------

  const handleEdit = (asset: Asset) => {
    const guide = guideMap.get(asset.id);
    if (!guide) return;
    setEditingAi([...guide.ai_questions]);
    setEditingCustom([...guide.custom_questions]);
    setPreviewSources(guide.sources || []);
    setExpandedAssetId(asset.id);
    setShowSimilarPanel(false);
    setShowEquipmentSearch(false);
    setGenerating({ assetId: asset.id, status: 'preview' });
  };

  const handleAddCustomOnly = (asset: Asset) => {
    const guide = guideMap.get(asset.id);
    setEditingAi(guide?.ai_questions || []);
    setEditingCustom(guide?.custom_questions || []);
    setPreviewSources(guide?.sources || []);
    setExpandedAssetId(asset.id);
    setShowSimilarPanel(false);
    setShowEquipmentSearch(false);
    setGenerating({ assetId: asset.id, status: 'preview' });
  };

  // ---------------------------------------------------------------------------
  // Save guide + check for similar assets
  // ---------------------------------------------------------------------------

  const handleSave = async (asset: Asset) => {
    if (!companyId || !profile?.id) return;
    setGenerating({ assetId: asset.id, status: 'saving' });

    try {
      const existing = guideMap.get(asset.id);
      const guideData = {
        company_id: companyId,
        asset_id: asset.id,
        ai_questions: editingAi,
        custom_questions: editingCustom,
        sources: previewSources,
        updated_at: new Date().toISOString(),
        created_by: profile.id,
        is_active: true,
        ...(editingAi.length > 0 && !existing?.generated_at
          ? { generated_at: new Date().toISOString() }
          : {}),
      };

      if (existing) {
        const { error } = await supabase
          .from('asset_troubleshooting_guides')
          .update(guideData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('asset_troubleshooting_guides')
          .insert({
            ...guideData,
            generated_at: editingAi.length > 0 ? new Date().toISOString() : null,
          });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['troubleshoot-guides'] });
      showToast({
        title: 'Guide saved',
        description: `Troubleshooting guide saved for ${asset.name}`,
        type: 'success',
      });

      // Check for similar assets across all sites
      const similar = findSimilarAssets(asset);
      if (similar.length > 0) {
        setSimilarAssets(similar);
        setSavedGuideAsset(asset);
        setShowSimilarPanel(true);
        setGenerating(null);
        // Keep panel expanded to show similar assets
      } else {
        setGenerating(null);
        setExpandedAssetId(null);
      }
    } catch (err: any) {
      console.error('Save error:', err);
      showToast({
        title: 'Save failed',
        description: err.message || 'Could not save guide',
        type: 'error',
      });
      setGenerating({ assetId: asset.id, status: 'preview' });
    }
  };

  // ---------------------------------------------------------------------------
  // Copy guide to similar assets
  // ---------------------------------------------------------------------------

  const handleCopyToSimilar = async () => {
    if (!companyId || !profile?.id || !savedGuideAsset) return;
    const selected = similarAssets.filter((a) => a.selected);
    if (selected.length === 0) return;

    setCopyingGuide(true);
    try {
      // Get the guide we just saved (re-fetch to be sure)
      const { data: sourceGuide } = await supabase
        .from('asset_troubleshooting_guides')
        .select('ai_questions, custom_questions, sources, ai_model')
        .eq('asset_id', savedGuideAsset.id)
        .eq('is_active', true)
        .single();

      if (!sourceGuide) throw new Error('Source guide not found');

      // Build insert rows, only AI questions copy (custom questions are site-specific)
      const rows = selected.map((a) => ({
        company_id: companyId,
        asset_id: a.id,
        ai_questions: sourceGuide.ai_questions,
        custom_questions: [] as string[], // custom questions are site-specific, don't copy
        sources: sourceGuide.sources,
        ai_model: sourceGuide.ai_model,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: profile!.id,
        is_active: true,
      }));

      const { error } = await supabase
        .from('asset_troubleshooting_guides')
        .upsert(rows, { onConflict: 'asset_id' });
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['troubleshoot-guides'] });
      showToast({
        title: 'Guides copied',
        description: `Guide copied to ${selected.length} similar asset${selected.length > 1 ? 's' : ''}`,
        type: 'success',
      });
      setShowSimilarPanel(false);
      setSimilarAssets([]);
      setExpandedAssetId(null);
    } catch (err: any) {
      console.error('Copy error:', err);
      showToast({
        title: 'Copy failed',
        description: err.message || 'Could not copy guides',
        type: 'error',
      });
    } finally {
      setCopyingGuide(false);
    }
  };

  const toggleSimilarAsset = (assetId: string) => {
    setSimilarAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, selected: !a.selected } : a))
    );
  };

  // ---------------------------------------------------------------------------
  // Equipment search
  // ---------------------------------------------------------------------------

  const handleEquipmentSearch = async () => {
    if (!equipmentSearch.trim()) return;
    setSearchingEquipment(true);
    setEquipmentResults([]);

    try {
      const res = await fetch('/api/assistant/search-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_query: equipmentSearch,
          category: expandedAssetId
            ? assets.find((a) => a.id === expandedAssetId)?.category
            : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Search failed');
      }

      const data = await res.json();
      setEquipmentResults(data.results || []);
    } catch (err: any) {
      showToast({
        title: 'Search failed',
        description: err.message || 'Could not search equipment',
        type: 'error',
      });
    } finally {
      setSearchingEquipment(false);
    }
  };

  const handleUseEquipmentResult = (result: EquipmentResult, asset: Asset) => {
    // Generate with the correct brand/model from the search result
    setShowEquipmentSearch(false);
    setEquipmentResults([]);
    setEquipmentSearch('');
    setGenerating({ assetId: asset.id, status: 'generating' });

    // Call generate with corrected info
    fetch('/api/assistant/generate-troubleshooting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_name: result.name || asset.name,
        brand: result.brand || asset.brand,
        model: result.model || asset.model,
        category: result.category || asset.category,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to generate');
        }
        return res.json();
      })
      .then((data) => {
        setPreviewQuestions(data.questions);
        setPreviewSources(data.sources || []);
        const existing = guideMap.get(asset.id);
        setEditingAi(data.questions);
        setEditingCustom(existing?.custom_questions || []);
        setGenerating({ assetId: asset.id, status: 'preview' });
      })
      .catch((err: any) => {
        showToast({
          title: 'Generation failed',
          description: err.message || 'Could not generate guide',
          type: 'error',
        });
        setGenerating(null);
      });
  };

  // ---------------------------------------------------------------------------
  // Delete guide
  // ---------------------------------------------------------------------------

  const handleDelete = async (asset: Asset) => {
    const guide = guideMap.get(asset.id);
    if (!guide) return;

    try {
      const { error } = await supabase
        .from('asset_troubleshooting_guides')
        .delete()
        .eq('id', guide.id);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['troubleshoot-guides'] });
      showToast({
        title: 'Guide deleted',
        description: `Troubleshooting guide removed for ${asset.name}`,
        type: 'success',
      });
      setExpandedAssetId(null);
      setGenerating(null);
    } catch (err: any) {
      showToast({
        title: 'Delete failed',
        description: err.message || 'Could not delete guide',
        type: 'error',
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Question editing helpers
  // ---------------------------------------------------------------------------

  const addCustomQuestion = () => {
    const trimmed = newCustomQuestion.trim();
    if (!trimmed) return;
    const question = trimmed.endsWith('?') ? trimmed : trimmed + '?';
    setEditingCustom((prev) => [...prev, question]);
    setNewCustomQuestion('');
  };

  const removeQuestion = (section: 'ai' | 'custom', index: number) => {
    if (section === 'ai') {
      setEditingAi((prev) => prev.filter((_, i) => i !== index));
    } else {
      setEditingCustom((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const startEditing = (section: 'ai' | 'custom', index: number) => {
    const list = section === 'ai' ? editingAi : editingCustom;
    setEditingIndex({ section, index });
    setEditingText(list[index]);
  };

  const saveEditing = () => {
    if (!editingIndex) return;
    const { section, index } = editingIndex;
    const trimmed = editingText.trim();
    if (!trimmed) return;
    const question = trimmed.endsWith('?') ? trimmed : trimmed + '?';
    if (section === 'ai') {
      setEditingAi((prev) => prev.map((q, i) => (i === index ? question : q)));
    } else {
      setEditingCustom((prev) => prev.map((q, i) => (i === index ? question : q)));
    }
    setEditingIndex(null);
    setEditingText('');
  };

  const moveQuestion = (section: 'ai' | 'custom', index: number, direction: 'up' | 'down') => {
    const setter = section === 'ai' ? setEditingAi : setEditingCustom;
    setter((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Auth guard
  // ---------------------------------------------------------------------------

  if (authLoading) return <div className="p-8 text-theme-primary">Loading...</div>;

  if (!companyId) {
    return (
      <div className="p-8">
        <div className="bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
            Company Setup Required
          </h2>
          <p className="text-theme-secondary mb-4">
            Please complete your company setup to access this page.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isLoading = loadingAssets || loadingGuides;

  return (
    <div className="mt-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-7 h-7 text-assetly-dark dark:text-assetly" />
            <h1 className="text-3xl font-bold text-theme-primary">Troubleshoot Setup</h1>
          </div>
          {isAllSites && (
            <span className="text-sm text-theme-tertiary">(Viewing all sites)</span>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets..."
              className="h-11 w-64 pl-10 pr-4 rounded-lg border border-theme bg-theme-surface text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-module-fg/[0.25] focus:border-module-fg/[0.50]"
            />
          </div>
        </div>
        <div className="text-sm text-theme-tertiary">
          {guides.length} / {assets.length} assets have guides
        </div>
      </div>

      {/* Description */}
      <div className="bg-assetly-dark/5 dark:bg-assetly/5 border border-assetly-dark/10 dark:border-assetly/10 rounded-xl px-5 py-4">
        <p className="text-sm text-theme-secondary">
          Generate AI-powered troubleshooting guides for your assets. The AI searches manufacturer websites to find common faults and creates yes/no diagnostic questions. You can also add your own site-specific questions for things like tripped Ansul systems or local isolator switches. Guides are automatically offered to copy across similar assets on other sites.
        </p>
      </div>

      {/* Asset List */}
      {isLoading ? (
        <div className="text-theme-tertiary">Loading assets...</div>
      ) : filteredAssets.length === 0 ? (
        <p className="text-theme-tertiary p-6">No assets found.</p>
      ) : (
        <div className="space-y-2">
          {filteredAssets.map((asset) => {
            const guide = guideMap.get(asset.id);
            const isExpanded = expandedAssetId === asset.id;
            const isGenerating =
              generating?.assetId === asset.id && generating.status === 'generating';
            const isPreview =
              generating?.assetId === asset.id &&
              (generating.status === 'preview' || generating.status === 'saving');
            const isSaving =
              generating?.assetId === asset.id && generating.status === 'saving';

            return (
              <div
                key={asset.id}
                className="border border-theme rounded-xl bg-theme-surface overflow-hidden"
              >
                {/* Asset Row */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-theme-hover transition-colors"
                  onClick={() => {
                    if (isExpanded && !isPreview && !showSimilarPanel) {
                      setExpandedAssetId(null);
                    } else if (!isPreview && !showSimilarPanel) {
                      setExpandedAssetId(asset.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-theme-primary truncate">
                          {asset.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-theme-tertiary capitalize">
                          {asset.category}
                        </span>
                      </div>
                      <div className="text-sm text-theme-tertiary mt-0.5">
                        {[asset.brand, asset.model].filter(Boolean).join(' · ') ||
                          'No brand/model'}
                      </div>
                    </div>

                    {/* Guide Status Badge */}
                    {guide ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        {guide.ai_questions.length > 0 && guide.custom_questions.length > 0
                          ? `${guide.ai_questions.length} AI + ${guide.custom_questions.length} custom`
                          : guide.ai_questions.length > 0
                            ? `${guide.ai_questions.length} AI questions`
                            : `${guide.custom_questions.length} custom questions`}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-theme-tertiary text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600" />
                        No guide
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                    {!isPreview && !(showSimilarPanel && expandedAssetId === asset.id) && (
                      <>
                        <button
                          onClick={() => handleGenerate(asset)}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-assetly-dark/30 dark:border-assetly/30 text-assetly-dark dark:text-assetly hover:bg-assetly-dark/5 dark:hover:bg-assetly/5 transition-colors disabled:opacity-50"
                          title={guide ? 'Regenerate AI questions' : 'Generate with AI'}
                        >
                          {isGenerating ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          {isGenerating ? 'Generating...' : guide ? 'Regenerate' : 'Generate'}
                        </button>
                        {guide ? (
                          <button
                            onClick={() => handleEdit(asset)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-theme text-theme-secondary hover:bg-theme-hover transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddCustomOnly(asset)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-theme text-theme-secondary hover:bg-theme-hover transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Custom
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Edit Panel */}
                {isExpanded && isPreview && (
                  <div className="border-t border-theme px-5 py-5 space-y-5 bg-black/[0.02] dark:bg-white/[0.02]">
                    {/* Equipment Search Section */}
                    <div>
                      <button
                        onClick={() => setShowEquipmentSearch((v) => !v)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-theme-secondary hover:text-theme-primary transition-colors mb-2"
                      >
                        <Search className="w-3.5 h-3.5" />
                        {showEquipmentSearch ? 'Hide' : 'Search'} supplier equipment
                        <span className="text-theme-tertiary font-normal">
                          (verify model names)
                        </span>
                      </button>

                      {showEquipmentSearch && (
                        <div className="mb-4 p-4 rounded-lg border border-theme bg-theme-surface space-y-3">
                          <div className="flex items-center gap-2">
                            <input
                              value={equipmentSearch}
                              onChange={(e) => setEquipmentSearch(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEquipmentSearch();
                              }}
                              placeholder='e.g. "Williams single door fridge" or "Foster EPRO 1/2H"'
                              className="flex-1 h-9 px-3 rounded-lg border border-theme bg-theme-surface text-sm text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-module-fg/[0.25]"
                            />
                            <button
                              onClick={handleEquipmentSearch}
                              disabled={searchingEquipment || !equipmentSearch.trim()}
                              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium bg-assetly-dark/10 dark:bg-assetly/10 text-assetly-dark dark:text-assetly border border-assetly-dark/20 dark:border-assetly/20 hover:bg-assetly-dark/20 dark:hover:bg-assetly/20 transition-colors disabled:opacity-40"
                            >
                              {searchingEquipment ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Search className="w-3.5 h-3.5" />
                              )}
                              {searchingEquipment ? 'Searching...' : 'Search'}
                            </button>
                          </div>

                          {/* Equipment Results */}
                          {equipmentResults.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs text-theme-tertiary">
                                Found {equipmentResults.length} match{equipmentResults.length !== 1 ? 'es' : ''}. Click "Use" to generate a guide with the correct details.
                              </p>
                              {equipmentResults.map((result, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-theme bg-black/[0.02] dark:bg-white/[0.02]"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-theme-primary">
                                      {result.brand} {result.model}
                                    </div>
                                    <div className="text-xs text-theme-tertiary">
                                      {result.name}
                                      {result.category && (
                                        <span className="ml-2 capitalize">
                                          · {result.category}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-3">
                                    {result.url && (
                                      <a
                                        href={result.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded text-theme-tertiary hover:text-theme-primary"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                    <button
                                      onClick={() => handleUseEquipmentResult(result, asset)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-assetly-dark dark:bg-assetly text-white dark:text-black hover:opacity-90 transition-opacity"
                                    >
                                      <Sparkles className="w-3 h-3" />
                                      Use
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {!searchingEquipment && equipmentResults.length === 0 && equipmentSearch.trim() && (
                            <p className="text-xs text-theme-tertiary italic">
                              No results yet. Press Search to look up equipment from suppliers.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Custom Questions Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-theme-primary mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Site-Specific Questions
                        <span className="text-xs font-normal text-theme-tertiary">
                          (shown first in callout modal)
                        </span>
                      </h3>

                      {editingCustom.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {editingCustom.map((question, idx) => (
                            <div
                              key={`custom-${idx}`}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10"
                            >
                              <GripVertical className="w-4 h-4 text-theme-tertiary flex-shrink-0" />
                              {editingIndex?.section === 'custom' &&
                              editingIndex.index === idx ? (
                                <input
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  onBlur={saveEditing}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditing();
                                    if (e.key === 'Escape') {
                                      setEditingIndex(null);
                                      setEditingText('');
                                    }
                                  }}
                                  className="flex-1 text-sm bg-transparent border-b border-blue-500/30 text-theme-primary focus:outline-none"
                                  autoFocus
                                />
                              ) : (
                                <span className="flex-1 text-sm text-theme-primary">
                                  {question}
                                </span>
                              )}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => moveQuestion('custom', idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 rounded text-theme-tertiary hover:text-theme-primary disabled:opacity-30"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => moveQuestion('custom', idx, 'down')}
                                  disabled={idx === editingCustom.length - 1}
                                  className="p-1 rounded text-theme-tertiary hover:text-theme-primary disabled:opacity-30"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => startEditing('custom', idx)}
                                  className="p-1 rounded text-theme-tertiary hover:text-blue-500"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => removeQuestion('custom', idx)}
                                  className="p-1 rounded text-theme-tertiary hover:text-red-500"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          value={newCustomQuestion}
                          onChange={(e) => setNewCustomQuestion(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addCustomQuestion();
                          }}
                          placeholder='e.g. "Has the Ansul system been triggered?"'
                          className="flex-1 h-9 px-3 rounded-lg border border-theme bg-theme-surface text-sm text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                        />
                        <button
                          onClick={addCustomQuestion}
                          disabled={!newCustomQuestion.trim()}
                          className="inline-flex items-center gap-1 px-3 h-9 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add
                        </button>
                      </div>
                    </div>

                    {/* AI Questions Section */}
                    {editingAi.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-theme-primary mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-assetly-dark dark:bg-assetly" />
                          AI-Generated Questions
                          <span className="text-xs font-normal text-theme-tertiary">
                            (from manufacturer docs)
                          </span>
                        </h3>

                        <div className="space-y-1.5">
                          {editingAi.map((question, idx) => (
                            <div
                              key={`ai-${idx}`}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-assetly-dark/5 dark:bg-assetly/5 border border-assetly-dark/10 dark:border-assetly/10"
                            >
                              <GripVertical className="w-4 h-4 text-theme-tertiary flex-shrink-0" />
                              {editingIndex?.section === 'ai' &&
                              editingIndex.index === idx ? (
                                <input
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  onBlur={saveEditing}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditing();
                                    if (e.key === 'Escape') {
                                      setEditingIndex(null);
                                      setEditingText('');
                                    }
                                  }}
                                  className="flex-1 text-sm bg-transparent border-b border-assetly-dark/30 dark:border-assetly/30 text-theme-primary focus:outline-none"
                                  autoFocus
                                />
                              ) : (
                                <span className="flex-1 text-sm text-theme-primary">
                                  {question}
                                </span>
                              )}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => moveQuestion('ai', idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 rounded text-theme-tertiary hover:text-theme-primary disabled:opacity-30"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => moveQuestion('ai', idx, 'down')}
                                  disabled={idx === editingAi.length - 1}
                                  className="p-1 rounded text-theme-tertiary hover:text-theme-primary disabled:opacity-30"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => startEditing('ai', idx)}
                                  className="p-1 rounded text-theme-tertiary hover:text-assetly-dark dark:hover:text-assetly"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => removeQuestion('ai', idx)}
                                  className="p-1 rounded text-theme-tertiary hover:text-red-500"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sources */}
                    {previewSources.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-theme-tertiary uppercase tracking-wider mb-2">
                          Sources
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {previewSources.map((source, idx) => (
                            <a
                              key={idx}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 text-xs text-theme-secondary hover:text-theme-primary transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {source.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preview summary + actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-theme">
                      <div className="text-sm text-theme-tertiary">
                        Total: {editingCustom.length + editingAi.length} questions
                        {editingCustom.length > 0 && editingAi.length > 0 && (
                          <span>
                            {' '}
                            ({editingCustom.length} custom + {editingAi.length} AI)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {guide && (
                          <button
                            onClick={() => handleDelete(asset)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash className="w-3.5 h-3.5" />
                            Delete Guide
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setGenerating(null);
                            setExpandedAssetId(null);
                            setShowEquipmentSearch(false);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-theme text-theme-secondary hover:bg-theme-hover transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSave(asset)}
                          disabled={
                            isSaving ||
                            (editingAi.length === 0 && editingCustom.length === 0)
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-assetly-dark dark:bg-assetly text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40"
                        >
                          {isSaving ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : null}
                          {isSaving ? 'Saving...' : 'Save Guide'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Similar Assets Panel (shown after save) */}
                {isExpanded && showSimilarPanel && savedGuideAsset?.id === asset.id && (
                  <div className="border-t border-theme px-5 py-5 bg-blue-500/[0.02] dark:bg-blue-500/[0.02]">
                    <div className="flex items-center gap-2 mb-3">
                      <Copy className="w-4 h-4 text-blue-500" />
                      <h3 className="text-sm font-semibold text-theme-primary">
                        Similar assets found across sites
                      </h3>
                      <span className="text-xs text-theme-tertiary">
                        (same brand/model or name, no guide yet)
                      </span>
                    </div>
                    <p className="text-xs text-theme-secondary mb-3">
                      Copy the AI-generated questions to these similar assets? Custom questions are site-specific and won't be copied.
                    </p>

                    <div className="space-y-1.5 mb-4">
                      {similarAssets.map((sa) => (
                        <label
                          key={sa.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-theme hover:bg-theme-hover cursor-pointer transition-colors"
                        >
                          <button
                            onClick={() => toggleSimilarAsset(sa.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                              sa.selected
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {sa.selected && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-theme-primary truncate">
                              {sa.name}
                            </div>
                            <div className="text-xs text-theme-tertiary">
                              {[sa.brand, sa.model].filter(Boolean).join(' · ')}
                              {sa.site_name && (
                                <span className="ml-1.5 text-blue-500">
                                  @ {sa.site_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-theme-tertiary capitalize flex-shrink-0">
                            {sa.category}
                          </span>
                        </label>
                      ))}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowSimilarPanel(false);
                          setSimilarAssets([]);
                          setExpandedAssetId(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-theme text-theme-secondary hover:bg-theme-hover transition-colors"
                      >
                        Skip
                      </button>
                      <button
                        onClick={handleCopyToSimilar}
                        disabled={copyingGuide || similarAssets.filter((a) => a.selected).length === 0}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-40"
                      >
                        {copyingGuide ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copyingGuide
                          ? 'Copying...'
                          : `Copy to ${similarAssets.filter((a) => a.selected).length} asset${
                              similarAssets.filter((a) => a.selected).length !== 1 ? 's' : ''
                            }`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
