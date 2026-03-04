"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, ArrowLeft, AlertTriangle, Download } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { getRAVersioningInfo, createRAVersionPayload } from '@/lib/utils/raVersioning';
import { FIRE_RA_SECTIONS, TIER_INFO, PREMISES_TYPE_LABELS } from '@/lib/fire-ra/constants';
import {
  createEmptyAssessmentData,
  generateFireRARefCode,
  computeHighestRiskLevel,
  computeTotalHazards,
  computeHazardsControlled,
  computeOverallCompletion,
} from '@/lib/fire-ra/utils';
import { exportFireRAPdf } from '@/lib/fire-ra/export-pdf';
import FireRAScreening from '@/components/fire-ra/FireRAScreening';
import FireRASectionNav from '@/components/fire-ra/FireRASectionNav';
import FireRASectionPanel from '@/components/fire-ra/FireRASectionPanel';
import FireRASummary from '@/components/fire-ra/FireRASummary';
import FireRATaskReviewModal from '@/components/fire-ra/FireRATaskReviewModal';
import { useFireRAAI } from '@/hooks/useFireRAAI';
import { previewTasks, generateTasks, applyTaskLinks } from '@/lib/fire-ra/task-generation';
import { extractActionItems, flattenChecklist } from '@/lib/fire-ra/utils';
import type {
  FireRAAssessmentData,
  FireRAScreeningResult,
  FireRASection,
  FireRAGeneralInfo,
  FireRAAIField,
  FireRATaskPreview,
} from '@/types/fire-ra';

function FireRAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();

  // Core state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [screeningComplete, setScreeningComplete] = useState(false);
  const [originalRA, setOriginalRA] = useState<any>(null);
  const [raLoaded, setRALoaded] = useState(false);

  // Header fields
  const [title, setTitle] = useState('Fire Risk Assessment');
  const [refCode, setRefCode] = useState('');
  const [siteId, setSiteId] = useState('');
  const [status, setStatus] = useState('Draft');

  // Assessment data
  const [assessmentData, setAssessmentData] = useState<FireRAAssessmentData | null>(null);

  // Navigation
  const [activeSection, setActiveSection] = useState(1);

  // Reference data
  const [sites, setSites] = useState<any[]>([]);

  // Task generation
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskPreviews, setTaskPreviews] = useState<FireRATaskPreview[]>([]);
  const [taskGenLoading, setTaskGenLoading] = useState(false);
  const [savedRAId, setSavedRAId] = useState<string | null>(null);

  // Auto-save debounce
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load sites
  useEffect(() => {
    if (!companyId) return;
    const loadSites = async () => {
      try {
        const { data, error } = await supabase
          .from('sites')
          .select('id, name, address_line1, address_line2, city, postcode, region')
          .eq('company_id', companyId)
          .order('name');
        if (error) {
          console.error('[Fire RA] Error loading sites:', error);
        }
        setSites(data || []);
      } catch (err) {
        console.error('[Fire RA] Failed to load sites:', err);
      } finally {
        // Only clear loading if we're not also loading an existing RA
        if (!editId) setLoading(false);
      }
    };
    loadSites();
  }, [companyId, editId]);

  // Set assessor from profile (only once when profile loads)
  useEffect(() => {
    if (profile?.full_name) {
      setAssessmentData(prev => {
        if (!prev || prev.generalInfo.assessorName) return prev;
        return {
          ...prev,
          generalInfo: { ...prev.generalInfo, assessorName: profile.full_name },
          signOff: { ...prev.signOff, assessorName: profile.full_name },
        };
      });
    }
  }, [profile?.full_name]);

  // Load existing RA when editing
  useEffect(() => {
    if (!editId || !companyId || raLoaded) return;

    const loadRA = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('risk_assessments')
          .select('*')
          .eq('id', editId)
          .eq('company_id', companyId)
          .single();

        if (error) throw error;
        if (!data || data.template_type !== 'fire') {
          showToast({ title: 'Not found', description: 'Fire RA not found', type: 'error' });
          router.push('/dashboard/risk-assessments');
          return;
        }

        setOriginalRA(data);
        setTitle(data.title || 'Fire Risk Assessment');
        setRefCode(data.ref_code || '');
        setSiteId(data.site_id || '');
        setStatus(data.status || 'Draft');
        setAssessmentData(data.assessment_data as FireRAAssessmentData);
        setScreeningComplete(true);
        setRALoaded(true);
      } catch (error: any) {
        console.error('Error loading Fire RA:', error);
        showToast({ title: 'Error', description: error.message, type: 'error' });
        router.push('/dashboard/risk-assessments');
      } finally {
        setLoading(false);
      }
    };

    loadRA();
  }, [editId, companyId, raLoaded, router, showToast]);

  // Auto-generate ref code for new RAs
  useEffect(() => {
    if (!editId && title) {
      setRefCode(generateFireRARefCode(title));
    }
  }, [title, editId]);

  // Auto-set review date 12 months from assessment date
  const assessmentDate = assessmentData?.generalInfo.assessmentDate;
  useEffect(() => {
    if (!assessmentDate) return;
    setAssessmentData(prev => {
      if (!prev || prev.generalInfo.reviewDate) return prev;
      const d = new Date(assessmentDate);
      d.setFullYear(d.getFullYear() + 1);
      return { ...prev, generalInfo: { ...prev.generalInfo, reviewDate: d.toISOString().split('T')[0] } };
    });
  }, [assessmentDate]);

  // Screening complete handler
  const handleScreeningComplete = useCallback((result: FireRAScreeningResult) => {
    const data = createEmptyAssessmentData(result);
    // Set today's date
    data.generalInfo.assessmentDate = new Date().toISOString().split('T')[0];
    // Auto-populate from selected site
    if (siteId) {
      const site = sites.find(s => s.id === siteId);
      if (site) {
        data.generalInfo.premisesName = site.name;
        const addr = [site.address_line1, site.address_line2, site.city, site.region, site.postcode].filter(Boolean).join(', ');
        if (addr) data.generalInfo.premisesAddress = addr;
      }
    }
    // Set premises description from screening
    const premLabel = PREMISES_TYPE_LABELS[result.answers.premisesType] || result.answers.premisesTypeOther || '';
    data.generalInfo.premisesDescription = premLabel;

    if (profile?.full_name) {
      data.generalInfo.assessorName = profile.full_name;
      data.signOff.assessorName = profile.full_name;
    }

    setAssessmentData(data);
    setScreeningComplete(true);
    setActiveSection(1);
  }, [siteId, sites, profile]);

  // Site change handler — syncs siteId + generalInfo premises fields
  const handleSiteChange = useCallback((newSiteId: string) => {
    setSiteId(newSiteId);
    if (!newSiteId) return;
    const site = sites.find(s => s.id === newSiteId);
    if (site && assessmentData) {
      const addr = [site.address_line1, site.address_line2, site.city, site.region, site.postcode].filter(Boolean).join(', ');
      setAssessmentData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          generalInfo: {
            ...prev.generalInfo,
            premisesName: site.name,
            premisesAddress: addr || prev.generalInfo.premisesAddress,
          },
        };
      });
    }
  }, [sites, assessmentData]);

  // Update helpers
  const updateGeneralInfo = (partial: Partial<FireRAGeneralInfo>) => {
    setAssessmentData(prev => {
      if (!prev) return prev;
      return { ...prev, generalInfo: { ...prev.generalInfo, ...partial } };
    });
  };

  const updateSection = (sectionNumber: number, updated: FireRASection) => {
    setAssessmentData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(s =>
          s.sectionNumber === sectionNumber ? updated : s
        ),
      };
    });
  };

  // AI assist
  const premisesContext = assessmentData ? {
    premisesType: PREMISES_TYPE_LABELS[assessmentData.screening.answers.premisesType] || assessmentData.screening.answers.premisesTypeOther || 'commercial premises',
    premisesAddress: assessmentData.generalInfo.premisesAddress,
    tier: assessmentData.screening.tier,
    floorCount: assessmentData.screening.answers.floorCount,
    occupancy: assessmentData.screening.answers.occupancy,
    sleepingOnPremises: assessmentData.screening.answers.sleepingOnPremises,
    flammableMaterials: assessmentData.screening.answers.flammableMaterials,
  } : {
    premisesType: 'commercial premises',
    premisesAddress: '',
    tier: 'standard' as const,
    floorCount: 'single',
    occupancy: 'under_25',
    sleepingOnPremises: false,
    flammableMaterials: 'none',
  };

  const { assist: aiAssist, loading: aiLoading } = useFireRAAI(premisesContext);

  const handleAIAssist = async (sectionNumber: number, itemNumber: string, field: FireRAAIField) => {
    if (!assessmentData) return;

    const section = assessmentData.sections.find(s => s.sectionNumber === sectionNumber);
    if (!section) return;
    const item = section.items.find(i => i.itemNumber === itemNumber);
    if (!item) return;

    const existingText = field === 'finding' ? item.finding
      : field === 'existing_controls' ? item.existingControls
      : item.actionRequired;

    const result = await aiAssist({
      sectionNumber,
      itemNumber,
      field,
      existingText,
    });

    if (result?.suggestedChecklist && result.suggestedChecklist.length > 0) {
      // Merge AI checklist suggestions into item's checklist
      const checklistFieldMap: Record<FireRAAIField, 'findingChecklist' | 'existingControlsChecklist' | 'actionRequiredChecklist'> = {
        finding: 'findingChecklist',
        existing_controls: 'existingControlsChecklist',
        action_required: 'actionRequiredChecklist',
      };
      const checklistKey = checklistFieldMap[field];
      const existing = item[checklistKey];
      if (existing) {
        const newSuggestions = result.suggestedChecklist.filter(
          ai => !existing.checklist.some(e => e.label.toLowerCase() === ai.label.toLowerCase())
        );
        const merged = { ...existing, checklist: [...existing.checklist, ...newSuggestions] };
        const flat = flattenChecklist(merged);
        const textKey = field === 'finding' ? 'finding' : field === 'existing_controls' ? 'existingControls' : 'actionRequired';
        const updatedItem = { ...item, [checklistKey]: merged, [textKey]: flat, [`${textKey}AiGenerated`]: true };
        const updatedSection = { ...section, items: section.items.map(i => i.id === item.id ? updatedItem : i) };
        updateSection(sectionNumber, updatedSection);
      }
    } else if (result?.suggestion) {
      // Fallback: add AI text suggestion as a custom checked item in checklist
      const checklistFieldMap: Record<FireRAAIField, 'findingChecklist' | 'existingControlsChecklist' | 'actionRequiredChecklist'> = {
        finding: 'findingChecklist',
        existing_controls: 'existingControlsChecklist',
        action_required: 'actionRequiredChecklist',
      };
      const checklistKey = checklistFieldMap[field];
      const existing = item[checklistKey];
      if (existing) {
        // Split suggestion into lines and add as individual checklist items
        const lines = result.suggestion.split('\n').map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
        const newItems = lines
          .filter(line => !existing.checklist.some(e => e.label.toLowerCase() === line.toLowerCase()))
          .map((line, idx) => ({
            id: `ai_${Date.now()}_${idx}`,
            label: line,
            checked: false,
            isCustom: false,
            aiSuggested: true,
          }));
        const merged = { ...existing, checklist: [...existing.checklist, ...newItems] };
        const updatedItem = { ...item, [checklistKey]: merged };
        const updatedSection = { ...section, items: section.items.map(i => i.id === item.id ? updatedItem : i) };
        updateSection(sectionNumber, updatedSection);
      }
    }
  };

  // Save handler
  const handleSave = async () => {
    if (!title || !companyId || !assessmentData) {
      showToast({ title: 'Missing data', description: 'Please complete the assessment', type: 'error' });
      return;
    }

    try {
      setSaving(true);

      const highestRisk = computeHighestRiskLevel(assessmentData);
      const totalHazards = computeTotalHazards(assessmentData);
      const hazardsControlled = computeHazardsControlled(assessmentData);

      const baseData = {
        company_id: companyId,
        template_type: 'fire',
        title,
        ref_code: refCode,
        site_id: siteId || null,
        assessor_name: assessmentData.generalInfo.assessorName,
        assessment_date: assessmentData.generalInfo.assessmentDate || new Date().toISOString().split('T')[0],
        review_date: assessmentData.generalInfo.reviewDate || null,
        next_review_date: assessmentData.generalInfo.reviewDate || null,
        status,
        assessment_data: assessmentData,
        linked_sops: [],
        linked_ppe: [],
        highest_risk_level: highestRisk,
        total_hazards: totalHazards,
        hazards_controlled: hazardsControlled,
        created_by: profile?.auth_user_id || null,
      };

      let result;
      if (editId && originalRA) {
        const versioningInfo = await getRAVersioningInfo(originalRA.ref_code, companyId, originalRA);
        const insertData = createRAVersionPayload(baseData, versioningInfo, profile, false);
        const { data, error } = await supabase
          .from('risk_assessments')
          .insert(insertData)
          .select()
          .single();
        if (error) throw error;
        result = data;

        showToast({
          title: 'New version created',
          description: `Version ${result.version_number || '2.0'} saved as ${result.ref_code}`,
          type: 'success',
        });
      } else {
        const insertData = createRAVersionPayload(
          baseData,
          { newVersion: '1.0', versionNumber: 1, parentId: null, newRefCode: refCode },
          profile,
          true
        );
        const { data, error } = await supabase
          .from('risk_assessments')
          .insert(insertData)
          .select()
          .single();
        if (error) throw error;
        result = data;

        showToast({
          title: 'Fire Risk Assessment saved',
          description: `Saved as ${refCode}`,
          type: 'success',
        });
      }

      // Check if there are action items to generate tasks for
      const actionItems = extractActionItems(assessmentData);
      if (actionItems.length > 0 && (status === 'Published' || status === 'Under Review')) {
        // Show task review modal
        setSavedRAId(result.id);
        const previews = await previewTasks(assessmentData, companyId);
        setTaskPreviews(previews);
        setShowTaskModal(true);
        setSaving(false);
        return; // Don't navigate yet — wait for task modal
      }

      router.push('/dashboard/risk-assessments');
    } catch (error: any) {
      console.error('Error saving Fire RA:', error);
      showToast({ title: 'Error saving', description: error.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Handle task generation confirmation
  const handleTaskConfirm = async (confirmedPreviews: FireRATaskPreview[]) => {
    if (!savedRAId || !companyId || !assessmentData) return;

    setTaskGenLoading(true);
    try {
      const result = await generateTasks(confirmedPreviews, savedRAId, companyId, siteId || null);

      // Update the saved RA's assessment_data with task links
      if (Object.keys(result.taskLinks).length > 0) {
        const updatedData = applyTaskLinks(assessmentData, result.taskLinks);
        await supabase
          .from('risk_assessments')
          .update({ assessment_data: updatedData })
          .eq('id', savedRAId);
      }

      showToast({
        title: 'Tasks Generated',
        description: `${result.created} task${result.created !== 1 ? 's' : ''} created, ${result.linked} linked`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Task generation error:', err);
      showToast({ title: 'Task error', description: err.message, type: 'error' });
    } finally {
      setTaskGenLoading(false);
      setShowTaskModal(false);
      router.push('/dashboard/risk-assessments');
    }
  };

  if (loading) {
    return <div className="text-gray-600 dark:text-theme-tertiary text-center py-8">Loading...</div>;
  }

  // Pre-screening: show site selector then screening wizard
  if (!screeningComplete) {
    return (
      <div className="max-w-3xl mx-auto p-6 min-h-screen">
        {/* Back button */}
        <button
          onClick={() => router.push('/dashboard/risk-assessments')}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-neutral-400 hover:text-theme-primary mb-6"
        >
          <ArrowLeft size={16} />
          Back to Risk Assessments
        </button>

        {/* Optional: select site before screening */}
        <div className="mb-6 bg-theme-surface/50 rounded-xl p-5 border border-theme">
          <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-2">
            Select Site/Location (optional)
          </label>
          <select
            value={siteId}
            onChange={(e) => handleSiteChange(e.target.value)}
            className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary"
          >
            <option value="">All sites / not specified</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <FireRAScreening onComplete={handleScreeningComplete} />
      </div>
    );
  }

  if (!assessmentData) return null;

  const tier = assessmentData.screening.tier;
  const tierInfo = TIER_INFO[tier];
  const completion = computeOverallCompletion(assessmentData.sections);

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/risk-assessments')}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-neutral-400 hover:text-theme-primary"
      >
        <ArrowLeft size={16} />
        Back to Risk Assessments
      </button>

      {/* Header Banner */}
      <div className="bg-red-50 dark:bg-gradient-to-r dark:from-red-600/20 dark:to-orange-600/20 rounded-2xl p-6 border border-red-200 dark:border-red-500/30">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-theme-primary mb-1">Fire Risk Assessment</h1>
            <p className="text-gray-700 dark:text-neutral-300 text-sm">
              Regulatory Reform (Fire Safety) Order 2005
            </p>
          </div>
          <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${tierInfo.color}`}>
            {tierInfo.label}
          </span>
        </div>
      </div>

      {/* Specialist Warning Banner */}
      {tier === 'specialist' && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">
            Professional fire risk assessment is recommended for your premises. This self-assessment should be reviewed by a competent professional.
          </p>
        </div>
      )}

      {/* Assessment Details Header */}
      <section className="bg-theme-surface/50 rounded-xl p-6 border border-theme">
        <h2 className="text-lg font-semibold text-theme-primary mb-4">Assessment Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Reference (Auto)</label>
            <input
              value={refCode}
              readOnly
              className="w-full bg-gray-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-gray-600 dark:text-theme-tertiary"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary"
            >
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Under Review">Under Review</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Site/Location</label>
            <select
              value={siteId}
              onChange={(e) => handleSiteChange(e.target.value)}
              className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary"
            >
              <option value="">Select site...</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Assessor</label>
            <input
              value={assessmentData.generalInfo.assessorName}
              onChange={(e) => updateGeneralInfo({ assessorName: e.target.value })}
              className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Assessment Date</label>
            <input
              type="date"
              value={assessmentData.generalInfo.assessmentDate}
              onChange={(e) => updateGeneralInfo({ assessmentDate: e.target.value })}
              className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Review Date</label>
            <input
              type="date"
              value={assessmentData.generalInfo.reviewDate}
              onChange={(e) => updateGeneralInfo({ reviewDate: e.target.value })}
              className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary"
            />
          </div>
        </div>
      </section>

      {/* Mobile Section Selector */}
      <div className="lg:hidden">
        <select
          value={activeSection}
          onChange={(e) => setActiveSection(parseInt(e.target.value))}
          className="w-full mb-4 bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
        >
          {FIRE_RA_SECTIONS.map(def => {
            const section = assessmentData.sections.find(s => s.sectionNumber === def.number);
            const applicable = section?.isApplicable ?? true;
            return (
              <option key={def.number} value={def.number} disabled={!applicable}>
                {def.number}. {def.name} {!applicable ? '(N/A)' : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* Main Content: Section Nav + Section Panel side by side */}
      <div className="flex gap-6">
        {/* Section Navigation (desktop sidebar, sticky) */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24">
            <FireRASectionNav
              sections={assessmentData.sections}
              activeSection={activeSection}
              tier={tier}
              onSectionChange={setActiveSection}
            />
          </div>
        </div>

        {/* Active Section Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 1 && (
            <section className="bg-theme-surface/50 rounded-xl p-6 border border-theme space-y-4">
              <h2 className="text-lg font-semibold text-theme-primary">
                Section 1: General Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Premises Name</label>
                  <input
                    value={assessmentData.generalInfo.premisesName}
                    onChange={(e) => updateGeneralInfo({ premisesName: e.target.value })}
                    className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Premises Description</label>
                  <input
                    value={assessmentData.generalInfo.premisesDescription}
                    onChange={(e) => updateGeneralInfo({ premisesDescription: e.target.value })}
                    className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Premises Address</label>
                  <input
                    value={assessmentData.generalInfo.premisesAddress}
                    onChange={(e) => updateGeneralInfo({ premisesAddress: e.target.value })}
                    className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Responsible Person Name</label>
                  <input
                    value={assessmentData.generalInfo.responsiblePersonName}
                    onChange={(e) => updateGeneralInfo({ responsiblePersonName: e.target.value })}
                    className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Responsible Person Role</label>
                  <input
                    value={assessmentData.generalInfo.responsiblePersonRole}
                    onChange={(e) => updateGeneralInfo({ responsiblePersonRole: e.target.value })}
                    className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Assessor Qualifications</label>
                  <input
                    value={assessmentData.generalInfo.assessorQualifications}
                    onChange={(e) => updateGeneralInfo({ assessorQualifications: e.target.value })}
                    className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Previous Assessment Date</label>
                  <input
                    type="date"
                    value={assessmentData.generalInfo.previousAssessmentDate}
                    onChange={(e) => updateGeneralInfo({ previousAssessmentDate: e.target.value })}
                    className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Previous Assessment Reference</label>
                  <input
                    value={assessmentData.generalInfo.previousAssessmentRef}
                    onChange={(e) => updateGeneralInfo({ previousAssessmentRef: e.target.value })}
                    className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
                  />
                </div>
              </div>
            </section>
          )}

          {activeSection >= 2 && activeSection <= 11 && (
            <FireRASectionPanel
              section={assessmentData.sections.find(s => s.sectionNumber === activeSection)!}
              tier={tier}
              premisesType={assessmentData.screening.answers.premisesType}
              onSectionChange={(updated) => updateSection(activeSection, updated)}
              onAIAssist={handleAIAssist}
              aiLoading={aiLoading}
            />
          )}

          {activeSection === 12 && (
            <FireRASummary
              assessmentData={assessmentData}
              signOff={assessmentData.signOff}
              onSignOffChange={(updated) =>
                setAssessmentData(prev => prev ? { ...prev, signOff: updated } : prev)
              }
            />
          )}
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="sticky bottom-0 bg-[rgb(var(--background))] dark:bg-neutral-900 border-t border-theme py-4 px-6 -mx-6 flex items-center justify-between z-10">
        <div className="text-sm text-gray-500 dark:text-neutral-400">
          {completion.completed}/{completion.total} items assessed ({completion.percent}%)
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportFireRAPdf({ title, refCode, assessmentData })}
            className="flex items-center gap-2 px-4 py-2.5 border border-theme text-theme-primary hover:bg-theme-hover rounded-xl text-sm transition-colors"
          >
            <Download size={16} />
            Export PDF
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-module-fg hover:bg-module-fg/90 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : editId ? 'Save New Version' : 'Save Assessment'}
          </button>
        </div>
      </div>

      {/* Task Review Modal */}
      <FireRATaskReviewModal
        open={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          router.push('/dashboard/risk-assessments');
        }}
        previews={taskPreviews}
        onConfirm={handleTaskConfirm}
        loading={taskGenLoading}
      />
    </div>
  );
}

export default function FireRAPage() {
  return (
    <Suspense fallback={<div className="text-gray-600 dark:text-theme-tertiary text-center py-8">Loading...</div>}>
      <FireRAContent />
    </Suspense>
  );
}
