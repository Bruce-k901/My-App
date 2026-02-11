'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Edit2, Trash2, ChevronDown, ChevronUp, ArrowUpRight } from '@/components/ui/icons';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import { getTemplateFeatures } from '@/lib/template-features';
import { enrichTemplateWithDefinition } from '@/lib/templates/enrich-template';
import {
  TemperatureLoggingFeature,
  PassFailFeature,
  ChecklistFeature,
  YesNoChecklistFeature,
  PhotoEvidenceFeature,
  AssetSelectionFeature,
  DocumentUploadFeature
} from './features';
import TimePicker from '@/components/ui/TimePicker';

/**
 * Upsert equipment positions when saving checklist
 * Updates nicknames if they change, creates new positions if needed
 */
async function upsertEquipmentPositions(
  siteId: string,
  companyId: string,
  equipmentConfig: Array<{
    assetId: string;
    nickname?: string | null;
    equipment?: string;
    asset_name?: string;
  }>
) {
  if (!equipmentConfig || equipmentConfig.length === 0) {
    console.log('⏭️ [POSITIONS] No equipment to upsert');
    return;
  }

  console.log('🔧 [POSITIONS] Upserting equipment positions:', equipmentConfig);

  for (const equipment of equipmentConfig) {
    const assetId = equipment.assetId;
    const nickname = equipment.nickname || equipment.equipment || equipment.asset_name || null;

    if (!assetId) {
      console.warn('⚠️ [POSITIONS] Skipping equipment without assetId:', equipment);
      continue;
    }

    try {
      // Check if position exists for this asset at this site
      const { data: existingPosition } = await supabase
        .from('site_equipment_positions')
        .select('id, nickname')
        .eq('site_id', siteId)
        .eq('current_asset_id', assetId)
        .maybeSingle();

      if (existingPosition) {
        // UPDATE: Asset exists at this site, update nickname if changed
        if (existingPosition.nickname !== nickname) {
          await supabase
            .from('site_equipment_positions')
            .update({
              nickname: nickname,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPosition.id);

          console.log(`✅ [POSITIONS] Updated nickname: ${existingPosition.nickname} → ${nickname}`);
        } else {
          console.log(`⏭️ [POSITIONS] Nickname unchanged for ${nickname}`);
        }
      } else {
        // INSERT: New position for this asset at this site
        const { error: insertError } = await supabase
          .from('site_equipment_positions')
          .insert({
            site_id: siteId,
            company_id: companyId,
            current_asset_id: assetId,
            nickname: nickname,
            position_type: 'temperature_monitored'
          });

        if (insertError) {
          console.error('❌ [POSITIONS] Insert error:', insertError);
        } else {
          console.log(`✅ [POSITIONS] Created position ${nickname} (${assetId})`);
        }
      }
    } catch (err) {
      console.error('❌ [POSITIONS] Error upserting position:', err);
    }
  }
}

interface TaskFromTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  templateId: string;
  template?: any; // Template data if already loaded
  existingTask?: any; // Existing task data for editing (legacy)
  existingSiteChecklist?: any; // Existing site_checklist configuration for editing
  sourcePage?: 'compliance' | 'templates'; // Track where the user came from for redirect
}

export function TaskFromTemplateModal({ 
  isOpen, 
  onClose, 
  onSave,
  templateId,
  template: providedTemplate,
  existingTask,
  existingSiteChecklist,
  sourcePage
}: TaskFromTemplateModalProps) {
  const router = useRouter();
  const { companyId, siteId, selectedSiteId, profile, user, loading: contextLoading } = useAppContext();
  const [template, setTemplate] = useState<any>(providedTemplate || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateFields, setTemplateFields] = useState<any[]>([]);
  
  // Site selection state for task creation
  const [taskSiteId, setTaskSiteId] = useState<string>('');
  const [availableSites, setAvailableSites] = useState<Array<{id: string, name: string}>>([]);
  const [loadingSites, setLoadingSites] = useState(false);

  // Task form data - only fields for enabled features
  const [formData, setFormData] = useState({
    custom_name: '',
    custom_instructions: '',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '',
    daypart: '',
    dayparts: [] as Array<{ daypart: string; due_time: string }>, // Multiple dayparts with times
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    // Feature-specific data
    checklistItems: [] as string[],
    yesNoChecklistItems: [] as Array<{ text: string; answer: 'yes' | 'no' | null }>,
    temperatures: [] as Array<{ assetId?: string; equipment?: string; nickname?: string; temp?: number; temp_min?: number; temp_max?: number }>,
    photos: [] as Array<{ url: string; fileName: string }>,
    passFailStatus: '' as '' | 'pass' | 'fail',
    notes: '',
    // Upload and selection features
    sopUploads: [] as Array<{ url: string; fileName: string; fileType: string; fileSize: number }>,
    raUploads: [] as Array<{ url: string; fileName: string; fileType: string; fileSize: number }>,
    documentUploads: [] as Array<{ url: string; fileName: string; fileType: string; fileSize: number }>, // General document uploads
    selectedLibraries: {
      ppe: [] as string[],
      chemicals: [] as string[],
      equipment: [] as string[],
      ingredients: [] as string[],
      drinks: [] as string[],
      disposables: [] as string[],
    },
    selectedAssets: [] as string[],
  });
  
  // Loading states for uploads
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  
  // Library and asset data for dropdowns
  const [libraryData, setLibraryData] = useState<{
    ppe: any[];
    chemicals: any[];
    equipment: any[];
    ingredients: any[];
    drinks: any[];
    disposables: any[];
  }>({
    ppe: [],
    chemicals: [],
    equipment: [],
    ingredients: [],
    drinks: [],
    disposables: [],
  });
  const [assets, setAssets] = useState<any[]>([]);
  const [allAssets, setAllAssets] = useState<any[]>([]); // Store all loaded assets
  const [sites, setSites] = useState<any[]>([]); // Available sites for filtering
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>(''); // Selected site filter (empty = all sites)
  
  // Library selection state
  const [selectedLibraryType, setSelectedLibraryType] = useState<string>(''); // Current library being selected from
  const [tempLibrarySelection, setTempLibrarySelection] = useState<string[]>([]); // Temporary selection before saving
  
  // Asset selection state
  const [tempAssetSelection, setTempAssetSelection] = useState<string[]>([]); // Temporary asset selection before saving
  const [isAssetSelectionExpanded, setIsAssetSelectionExpanded] = useState<boolean>(true); // Collapsible state
  
  // Call point management state
  const [callPoints, setCallPoints] = useState<Array<{ id: string; label: string; location?: string }>>([]);
  const [isCallPointManagementExpanded, setIsCallPointManagementExpanded] = useState<boolean>(false);
  const [newCallPoint, setNewCallPoint] = useState({ name: '', location: '' });
  const [hasCallPointField, setHasCallPointField] = useState<boolean>(false);
  
  // Instructions expandable state
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  
  // Available dayparts (including additional options)
  const availableDayparts = [
    'before_open',
    'pre_service',
    'during_service',
    'post_service',
    'after_close',
    'morning',
    'afternoon',
    'evening',
    'night'
  ];

  // Filter assets based on selected site
  useEffect(() => {
    if (selectedSiteFilter) {
      const filtered = allAssets.filter((asset) => asset.site_id === selectedSiteFilter);
      setAssets(filtered);
    } else {
      setAssets(allAssets); // Show all assets if no filter
    }
  }, [selectedSiteFilter, allAssets]);

  useEffect(() => {
    if (isOpen && templateId) {
      // Reset form when modal opens
      setSelectedSiteFilter(''); // Reset site filter when modal opens
      // Reset site selection state when modal opens
      setTaskSiteId('');
      setAvailableSites([]);
      // Keep loadingSites true so UI shows "Loading..." not "No sites" while sites load
      setLoadingSites(true);

      console.log('🔄 Modal opened, resetting site state. existingTask:', !!existingTask, 'existingSiteChecklist:', !!existingSiteChecklist);

      if (existingTask) {
        // For editing, we'll initialize after template loads
        fetchTemplate();
      } else {
        // For creating, fetch template normally
        fetchTemplate();
      }
      // Load library and asset data if needed - ALWAYS reload when modal opens to get latest data
      if (companyId) {
        loadLibraryData();
        loadAssets();
      }
    }
    // Note: profile is NOT in deps - profile changes should not reset the modal state.
    // The site-loading useEffect below handles profile dependency separately.
  }, [isOpen, templateId, companyId, selectedSiteId, siteId]);
  
  // Reload assets when selectedSiteId changes (from header site selector)
  useEffect(() => {
    if (isOpen && companyId) {
      loadAssets();
    }
  }, [selectedSiteId]);
  
  // Load sites based on user role for task creation
  useEffect(() => {
    const loadSites = async () => {
      if (!isOpen || !companyId) {
        console.log('🚫 Site loading skipped:', { isOpen, companyId });
        setLoadingSites(false);
        return;
      }
      
      setLoadingSites(true);
      
      // Wait for profile to load if not available yet, but retry after a short delay
      if (!profile) {
        console.log('⏳ Waiting for profile to load...');
        // Retry after profile loads
        const checkProfile = setInterval(() => {
          if (profile) {
            clearInterval(checkProfile);
            loadSites();
          }
        }, 100);
        
        // Clear interval after 5 seconds to avoid infinite loop
        setTimeout(() => {
          clearInterval(checkProfile);
          setLoadingSites(false);
        }, 5000);
        return;
      }
      
      try {
        // Determine user role
        const userRole = profile.app_role?.toLowerCase() || 'staff';
        const isStaff = userRole === 'staff';
        
        console.log('🏢 Loading sites for role:', userRole, 'isStaff:', isStaff, 'profile:', profile);
        
        if (isStaff) {
          // Staff: only their home site
          const homeSiteId = profile.home_site || profile.site_id;
          if (homeSiteId) {
            const { data: site, error } = await supabase
              .from('sites')
              .select('id, name')
              .eq('id', homeSiteId)
              .single();
            
            if (site && !error) {
              console.log('✅ Loaded staff home site:', site);
              setAvailableSites([site]);
              setTaskSiteId(site.id);
            } else {
              console.error('❌ Error loading staff site:', error);
            }
          } else {
            console.warn('⚠️ Staff member has no home_site assigned');
          }
        } else {
          // Managers, Admins, Owners: all sites in company
          const { data: sites, error } = await supabase
            .from('sites')
            .select('id, name')
            .eq('company_id', companyId)
            .order('name');
          
          if (sites && !error) {
            console.log(`✅ Loaded ${sites.length} sites for manager/admin:`, sites.map(s => s.name));
            setAvailableSites(sites);
            // Default to home site or first site or selectedSiteId from header
            const defaultSiteId = profile.home_site || selectedSiteId || sites[0]?.id || '';
            setTaskSiteId(defaultSiteId);
          } else {
            console.error('❌ Error loading sites:', error);
          }
        }
      } catch (error) {
        console.error('❌ Exception loading sites:', error);
      } finally {
        setLoadingSites(false);
      }
    };
    
    loadSites();
  }, [isOpen, companyId, profile?.id, profile?.app_role, profile?.home_site, selectedSiteId]);
  
  // Load library data for dropdowns
  async function loadLibraryData() {
    if (!companyId) {
      console.warn('⚠️ Cannot load library data: companyId is missing');
      return;
    }
    
    console.log('📚 Loading library data for company:', companyId);
    
    // Helper function to safely load library data
    const loadLibrary = async (table: string, selectFields: string, orderBy: string) => {
      try {
        console.log(`  Loading ${table}...`);
        const { data, error } = await supabase
          .from(table)
          .select(selectFields)
          .eq('company_id', companyId)
          .order(orderBy);
        
        if (error) {
          // Table might not exist, return empty array
          console.warn(`  ⚠️ Could not load ${table}:`, error.message);
          return [];
        }
        console.log(`  ✅ Loaded ${data?.length || 0} items from ${table}`);
        return data || [];
      } catch (error) {
        console.warn(`  ⚠️ Error loading ${table}:`, error);
        return [];
      }
    };
    
    try {
      // Load all libraries in parallel
      console.log('🔄 Fetching all libraries in parallel...');
      const [ppeData, chemicalsData, equipmentData, ingredientsData, drinksData, disposablesData] = await Promise.all([
        loadLibrary('ppe_library', 'id, item_name, category', 'item_name'),
        loadLibrary('chemicals_library', 'id, product_name, manufacturer', 'product_name'),
        loadLibrary('equipment_library', 'id, equipment_name, category', 'equipment_name'),
        loadLibrary('ingredients_library', 'id, ingredient_name, category', 'ingredient_name'),
        loadLibrary('drinks_library', 'id, item_name, category', 'item_name'),
        loadLibrary('disposables_library', 'id, item_name, category', 'item_name'),
      ]);
      
      console.log('📦 Setting library data:', {
        ppe: ppeData.length,
        chemicals: chemicalsData.length,
        equipment: equipmentData.length,
        ingredients: ingredientsData.length,
        drinks: drinksData.length,
        disposables: disposablesData.length,
      });
      
      setLibraryData({
        ppe: ppeData,
        chemicals: chemicalsData,
        equipment: equipmentData,
        ingredients: ingredientsData,
        drinks: drinksData,
        disposables: disposablesData,
      });
      
      // Debug logging for equipment specifically
      console.log('🔧 Equipment Library Details:', {
        count: equipmentData.length,
        items: equipmentData.map((e: any) => ({
          id: e.id,
          name: e.equipment_name,
          category: e.category
        })),
        companyId
      });
    } catch (error) {
      console.error('❌ Error loading library data:', error);
      // Set empty arrays on error
      setLibraryData({
        ppe: [],
        chemicals: [],
        equipment: [],
        ingredients: [],
        drinks: [],
        disposables: [],
      });
    }
  }
  
  // Load assets for dropdown - filter by selected site from header unless user is admin/owner
  async function loadAssets() {
    if (!companyId) {
      console.log('🚫 Asset loading skipped: no companyId');
      return;
    }
    
    console.log('📦 Loading assets...', { companyId, selectedSiteId, siteId, profileRole: profile?.app_role });
    
    try {
      // Check if user is admin or owner - they can see all assets or filter by selected site
      const userRole = profile?.app_role?.toLowerCase() || '';
      const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';
      
      // Use selectedSiteId from header if available, otherwise fall back to siteId
      const effectiveSiteId = selectedSiteId || siteId;
      
      let query = supabase
        .from('assets')
        .select('id, name, category, site_id, sites(id, name)')
        .eq('company_id', companyId)
        .eq('archived', false);
      
      // Filter by selected site from header (admins/owners can still filter, but see all if no site selected)
      if (effectiveSiteId && effectiveSiteId !== 'all') {
        query = query.eq('site_id', effectiveSiteId);
        console.log('🔍 Filtering assets by site:', effectiveSiteId);
      } else {
        console.log('🔍 Loading all assets (no site filter)');
      }
      
      const { data, error } = await query.order('name');
      
      if (error) {
        console.error('❌ Error loading assets with join:', error);
        throw error;
      }
      
      console.log(`✅ Loaded ${data?.length || 0} assets`);
      
      // Transform data to include site name
      const assetsWithSite = (data || []).map((asset: any) => ({
        ...asset,
        site_name: asset.sites?.name || 'No site assigned'
      }));
      setAllAssets(assetsWithSite);
      setAssets(assetsWithSite); // Initially show all assets
      
      // Load unique sites from assets for filter dropdown
      const uniqueSiteIds = [...new Set(assetsWithSite.map((a: any) => a.site_id).filter(Boolean))];
      if (uniqueSiteIds.length > 0) {
        const { data: sitesData } = await supabase
          .from('sites')
          .select('id, name')
          .in('id', uniqueSiteIds)
          .eq('company_id', companyId);
        
        if (sitesData) {
          console.log(`✅ Loaded ${sitesData.length} sites from assets`);
          setSites(sitesData);
        }
      } else {
        console.log('⚠️ No sites found from assets');
        setSites([]);
      }
    } catch (error) {
      console.error('❌ Error loading assets:', error);
      // Fallback: try without inner join if sites relationship fails
      try {
        const userRole = profile?.app_role?.toLowerCase() || '';
        const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';
        
        // Use selectedSiteId from header if available, otherwise fall back to siteId
        const effectiveSiteId = selectedSiteId || siteId;
        
        let query = supabase
          .from('assets')
          .select('id, name, category, site_id')
          .eq('company_id', companyId)
          .eq('archived', false);
        
        // Filter by site if specified (for all users, not just non-admins)
        if (effectiveSiteId && effectiveSiteId !== 'all') {
          query = query.eq('site_id', effectiveSiteId);
        }
        
        const { data, error } = await query.order('name');
        
        if (error) {
          console.error('❌ Error in fallback asset loading:', error);
          throw error;
        }
        
        console.log(`✅ Fallback: Loaded ${data?.length || 0} assets`);
        
        // If we have site_ids, fetch site names separately
        const siteIds = [...new Set((data || []).map((a: any) => a.site_id).filter(Boolean))];
        let sitesMap: Record<string, string> = {};
        
        if (siteIds.length > 0) {
          const { data: sites } = await supabase
            .from('sites')
            .select('id, name')
            .in('id', siteIds);
          
          if (sites) {
            sitesMap = sites.reduce((acc: Record<string, string>, site: any) => {
              acc[site.id] = site.name;
              return acc;
            }, {});
          }
        }
        
        const assetsWithSite = (data || []).map((asset: any) => ({
          ...asset,
          site_name: asset.site_id ? (sitesMap[asset.site_id] || 'Unknown site') : 'No site assigned'
        }));
        setAllAssets(assetsWithSite);
        setAssets(assetsWithSite); // Initially show all assets
        
        // Load unique sites from assets for filter dropdown
        const uniqueSiteIds = [...new Set(assetsWithSite.map((a: any) => a.site_id).filter(Boolean))];
        if (uniqueSiteIds.length > 0) {
          const { data: sitesData } = await supabase
            .from('sites')
            .select('id, name')
            .in('id', uniqueSiteIds)
            .eq('company_id', companyId);
          
          if (sitesData) {
            setSites(sitesData);
          }
        } else {
          setSites([]);
        }
      } catch (fallbackError) {
        console.error('❌ Error in fallback asset loading:', fallbackError);
        setAssets([]);
        setAllAssets([]);
        setSites([]);
      }
    }
  }

  async function loadTemplateFields(templateId: string) {
    try {
      if (!templateId) {
        setTemplateFields([]);
        return;
      }

      const { data, error } = await supabase
        .from('template_fields')
        .select('*')
        .eq('template_id', templateId)
        .order('field_order');

      if (error) {
        // Log the error for debugging (but don't break the component)
        console.error('Error loading template fields:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          templateId
        });
        setTemplateFields([]);
        return;
      }
      
      // Successfully loaded fields
      if (data && data.length > 0) {
        console.log(`✅ Loaded ${data.length} template field(s) for template:`, templateId);
      }
      setTemplateFields(data || []);
    } catch (error: any) {
      // Gracefully handle any errors - don't break the component
      console.error('Exception loading template fields:', {
        message: error?.message,
        templateId
      });
      setTemplateFields([]);
    }
  }

  // Load call points from template_repeatable_labels
  async function loadCallPoints(templateId: string) {
    try {
      // Check if template has fire_alarm_call_point field
      const { data: fields } = await supabase
        .from('template_fields')
        .select('field_name')
        .eq('template_id', templateId)
        .eq('field_name', 'fire_alarm_call_point');
      
      if (!fields || fields.length === 0) {
        // No fire_alarm_call_point field, don't load call points
        return;
      }
      
      // Load call points from template_repeatable_labels
      const { data: labels, error } = await supabase
        .from('template_repeatable_labels')
        .select('id, label, label_value')
        .eq('template_id', templateId)
        .order('display_order');
      
      if (error) {
        console.error('Error loading call points:', error);
        return;
      }
      
      if (labels && labels.length > 0) {
        setCallPoints(labels.map(label => ({
          id: label.id,
          label: label.label,
          location: label.label_value || ''
        })));
      }
    } catch (error) {
      console.error('Error loading call points:', error);
    }
  }

  async function fetchTemplate() {
    console.log('🚀 fetchTemplate called', { hasProvidedTemplate: !!providedTemplate, templateId });
    
    // UUID regex for checking if template ID is a database UUID or a slug
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (providedTemplate) {
      // CRITICAL: Ensure recurrence_pattern is a proper object
      let templateData = { ...providedTemplate };
      if (templateData.recurrence_pattern && typeof templateData.recurrence_pattern === 'string') {
        try {
          templateData.recurrence_pattern = JSON.parse(templateData.recurrence_pattern);
        } catch (e) {
          console.error('Failed to parse providedTemplate recurrence_pattern:', e);
        }
      }
      
      console.log('🎯 Using providedTemplate:', {
        id: templateData.id,
        name: templateData.name,
        has_recurrence_pattern: !!templateData.recurrence_pattern,
        recurrence_pattern: templateData.recurrence_pattern,
        default_checklist_items: templateData.recurrence_pattern?.default_checklist_items,
        repeatable_field_name: templateData.repeatable_field_name
      });
      
      const enrichedTemplate = enrichTemplateWithDefinition(templateData);
      
      // For code-defined templates (slug-based IDs), try to load fields from database first
      // If that fails, the template should still work with evidence_types-based features
      const isUuid = uuidRegex.test(enrichedTemplate.id as string);
      
      if (isUuid) {
        // Database template - load fields normally
        await loadTemplateFields(enrichedTemplate.id as string);
      } else {
        // Code-defined template - fields might not exist in DB yet
        // Features will still work based on evidence_types
        console.log('Code-defined template detected, skipping field load:', enrichedTemplate.slug);
        setTemplateFields([]);
      }
      
      setTemplate(enrichedTemplate as any);
      setLoading(false);
      initializeFormData(enrichedTemplate as any);
      return;
    }

    setLoading(true);
    try {
      // Check if templateId is a valid UUID (database ID) or a slug
      const isUuid = uuidRegex.test(templateId);
      
      // Use maybeSingle() to gracefully handle missing templates (returns null instead of error)
      let query = supabase
        .from('task_templates')
        .select('*, recurrence_pattern'); // Explicitly include recurrence_pattern
      
      // If it's a UUID, query by id; otherwise query by slug
      if (isUuid) {
        query = query.eq('id', templateId);
      } else {
        query = query.eq('slug', templateId);
      }
      
      const { data, error } = await query.maybeSingle(); // Returns null if no rows, doesn't throw error
      
      // Handle any errors (including PGRST116 - template not found)
      if (error) {
        console.error('Error fetching template:', error);
        console.error('Template ID:', templateId);
        console.error('Error code:', error.code);
        
        // Handle 406/PGRST116 errors (template not found)
        if (error.code === 'PGRST116' || error.message?.includes('0 rows') || error.message?.includes('Cannot coerce')) {
          console.warn('Template not found (likely deleted):', templateId);
          if (existingTask) {
            toast.error(`Template not found. Task may reference a deleted template.`);
            setLoading(false);
            return;
          }
          toast.error('Template not found');
          onClose();
          return;
        }
        
        // Other errors
        if (existingTask) {
          toast.error(`Failed to load template: ${error.message || 'Unknown error'}`);
          setLoading(false);
          return;
        }
        
        toast.error('Failed to load template');
        onClose();
        return;
      }

      // Handle case where template doesn't exist (maybeSingle returns null for 0 rows)
      if (!data) {
        console.warn('Template not found (maybeSingle returned null):', templateId);
        
        if (existingTask) {
          toast.error(`Template not found. Task may reference a deleted template.`);
          setLoading(false);
          return;
        }
        
        toast.error('Template not found');
        onClose();
        return;
      }

      // CRITICAL: Ensure recurrence_pattern is a proper object, not a string
      let templateData = { ...data };
      if (templateData.recurrence_pattern && typeof templateData.recurrence_pattern === 'string') {
        try {
          templateData.recurrence_pattern = JSON.parse(templateData.recurrence_pattern);
        } catch (e) {
          console.error('Failed to parse recurrence_pattern:', e);
        }
      }
      
      const enrichedTemplate = enrichTemplateWithDefinition(templateData);
      
      // Load template fields - only if template has a valid UUID (exists in database)
      const isUuidForTemplate = uuidRegex.test(enrichedTemplate.id as string);
      
      if (isUuidForTemplate) {
        await loadTemplateFields(enrichedTemplate.id as string);
        // Load call points if template has fire_alarm_call_point field
        await loadCallPoints(templateData.id);
      } else {
        // Code-defined template - fields might not exist in DB yet
        console.log('Code-defined template detected, skipping field load:', enrichedTemplate.slug);
        setTemplateFields([]);
      }
      
      setTemplate(enrichedTemplate as any);
      
      // Debug: Check if recurrence_pattern is loaded
      console.log('📦 Template loaded:', {
        id: templateData.id,
        name: templateData.name,
        slug: enrichedTemplate.slug,
        has_recurrence_pattern: !!templateData.recurrence_pattern,
        recurrence_pattern: templateData.recurrence_pattern,
        repeatable_field_name: templateData.repeatable_field_name,
        asset_type: templateData.asset_type,
        evidence_types: templateData.evidence_types,
        default_checklist_items: templateData.recurrence_pattern?.default_checklist_items
      });
      
      initializeFormData(enrichedTemplate as any);
    } catch (error: any) {
      console.error('Exception fetching template:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      
      if (existingTask) {
        toast.error('Failed to load template. You can still view the task data.');
        setLoading(false);
        return;
      }
      
      toast.error('Failed to load template');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  // Initialize form with existing task data when editing (even if template not found)
  useEffect(() => {
    if ((existingTask || existingSiteChecklist) && isOpen && !loading) {
      if (template) {
        // Template found - initialize with both template and task/site_checklist data
        initializeFormData(template);
      } else if (existingTask) {
        // Template not found - initialize with just task data so user can still edit
        setFormData({
          custom_name: existingTask.custom_name || '',
          custom_instructions: existingTask.custom_instructions || '',
          due_date: existingTask.due_date || new Date().toISOString().split('T')[0],
          due_time: existingTask.due_time || '',
          daypart: existingTask.daypart || '',
          priority: existingTask.priority || 'medium',
          checklistItems: [],
          temperatures: [],
          photos: [],
          passFailStatus: '',
          notes: '',
        });
      } else if (existingSiteChecklist) {
        // For site_checklist, we need the template to initialize properly
        // This case should be rare - template should always be available
        console.warn('⚠️ Editing site_checklist but template not loaded yet');
      }
    }
  }, [template, existingTask, existingSiteChecklist, isOpen, loading]);

  function initializeFormData(templateData: any) {
    console.log('🔄 initializeFormData called:', {
      hasExistingTask: !!existingTask,
      hasExistingSiteChecklist: !!existingSiteChecklist,
      templateId: templateData?.id,
      templateName: templateData?.name,
      hasRecurrencePattern: !!templateData?.recurrence_pattern
    });
    
    // Initialize form with existing site_checklist data if editing configuration
    if (existingSiteChecklist) {
      const dayparts = templateData.dayparts || [];
      
      // Build dayparts array from daypart_times
      let daypartsArray: Array<{ daypart: string; due_time: string }> = [];
      if (existingSiteChecklist.daypart_times && typeof existingSiteChecklist.daypart_times === 'object') {
        for (const [daypart, timeValue] of Object.entries(existingSiteChecklist.daypart_times)) {
          if (Array.isArray(timeValue)) {
            timeValue.forEach(time => {
              daypartsArray.push({ daypart, due_time: time });
            });
          } else {
            daypartsArray.push({ daypart, due_time: timeValue as string });
          }
        }
      } else if (dayparts.length > 0) {
        // Use template dayparts if no daypart_times configured
        const daypartTimes = templateData.recurrence_pattern?.daypart_times || {};
        daypartsArray = dayparts.map((dp: string) => ({
          daypart: dp,
          due_time: daypartTimes[dp] || ''
        }));
      }
      
      // Extract equipment/assets from equipment_config
      // equipment_config is an array of objects: [{assetId, equipment, nickname, temp_min, temp_max}, ...]
      const equipmentConfig = existingSiteChecklist.equipment_config || [];
      
      // Extract asset IDs for selectedAssets (array of strings)
      const selectedAssets = Array.isArray(equipmentConfig)
        ? equipmentConfig.map((eq: any) => eq.assetId || eq).filter(Boolean)
        : [];

      // CRITICAL FIX: Load checklist items from template's recurrence_pattern
      // Parse recurrence_pattern if it's a string
      let recurrencePattern = templateData.recurrence_pattern;
      if (typeof recurrencePattern === 'string') {
        try {
          recurrencePattern = JSON.parse(recurrencePattern);
        } catch (e) {
          console.error('Failed to parse recurrence_pattern:', e);
          recurrencePattern = null;
        }
      }

      const defaultChecklistItems = (recurrencePattern as any)?.default_checklist_items || [];
      const hasYesNoChecklist = templateData.evidence_types?.includes('yes_no_checklist');

      // Convert to yes/no format if yes_no_checklist is enabled
      const loadedYesNoChecklistItems = hasYesNoChecklist && Array.isArray(defaultChecklistItems)
        ? defaultChecklistItems.map((item: any) => ({
            text: typeof item === 'string' ? item : (item.text || item.label || ''),
            answer: null as 'yes' | 'no' | null
          })).filter((item: { text: string; answer: null }) => item.text && item.text.trim().length > 0)
        : [];

      // Regular checklist items (only if yes_no_checklist is NOT enabled)
      const loadedChecklistItems = !hasYesNoChecklist && Array.isArray(defaultChecklistItems)
        ? defaultChecklistItems.map((item: any) =>
            typeof item === 'string' ? item : (item.text || item.label || '')
          ).filter((item: string) => item && item.trim().length > 0)
        : [];

      console.log('📋 Loading checklist items for site_checklist edit:', {
        templateId: templateData.id,
        hasRecurrencePattern: !!recurrencePattern,
        defaultChecklistItemsCount: defaultChecklistItems.length,
        hasYesNoChecklist,
        checklistItemsCount: loadedChecklistItems.length,
        yesNoChecklistItemsCount: loadedYesNoChecklistItems.length
      });

      // Build temperatures array from equipment_config (includes nicknames and temp ranges)
      const temperatures = Array.isArray(equipmentConfig)
        ? equipmentConfig
            .filter((eq: any) => eq.assetId) // Only include items with assetId
            .map((eq: any) => ({
              assetId: eq.assetId,
              equipment: eq.equipment || '',
              nickname: eq.nickname || '',
              temp: undefined,
              temp_min: eq.temp_min !== undefined && eq.temp_min !== null ? eq.temp_min : undefined,
              temp_max: eq.temp_max !== undefined && eq.temp_max !== null ? eq.temp_max : undefined
            }))
        : [];
      
      console.log('📥 Loading existing site_checklist:', {
        equipmentConfig,
        selectedAssets,
        temperatures
      });
      
      setFormData({
        custom_name: existingSiteChecklist.name || templateData.name || '',
        custom_instructions: templateData.instructions || '',
        due_date: new Date().toISOString().split('T')[0], // Not used for configurations
        due_time: '', // Not used for configurations
        daypart: daypartsArray[0]?.daypart || dayparts[0] || '',
        dayparts: daypartsArray,
        priority: 'medium', // Not used for configurations
        checklistItems: loadedChecklistItems, // Load from template's recurrence_pattern
        yesNoChecklistItems: loadedYesNoChecklistItems, // Load from template's recurrence_pattern
        temperatures: temperatures, // Load temperatures with nicknames and temp ranges
        photos: [],
        passFailStatus: '',
        notes: '',
        sopUploads: [],
        raUploads: [],
        documentUploads: [],
        selectedLibraries: {
          ppe: [],
          chemicals: [],
          equipment: [],
          ingredients: [],
          drinks: [],
          disposables: [],
        },
        selectedAssets: selectedAssets, // Array of asset IDs
        days_of_week: existingSiteChecklist.days_of_week || [],
        date_of_month: existingSiteChecklist.date_of_month || undefined,
        anniversary_date: existingSiteChecklist.anniversary_date || undefined,
      });
    }
    // Initialize form with existing task data if editing, otherwise use template defaults
    else if (existingTask) {
      const dayparts = templateData.dayparts || [];
      
      // Load task_data if it exists
      let taskData: Record<string, any> = {};
      if (existingTask.task_data && typeof existingTask.task_data === 'object') {
        taskData = existingTask.task_data;
      }
      
      // Extract checklist items from task_data
      const checklistItems = taskData.checklistItems 
        ? taskData.checklistItems.map((item: any) => typeof item === 'string' ? item : (item.text || item.label || ''))
        : [];
      
      // Extract yes/no checklist items
      const yesNoChecklistItems = taskData.yesNoChecklistItems || [];
      
      // Extract dayparts - support both single daypart and multiple dayparts
      let daypartsArray: Array<{ daypart: string; due_time: string }> = [];
      if (taskData.dayparts && Array.isArray(taskData.dayparts)) {
        daypartsArray = taskData.dayparts;
      } else if (existingTask.daypart) {
        // Single daypart - convert to array format
        daypartsArray = [{
          daypart: existingTask.daypart,
          due_time: existingTask.due_time || ''
        }];
      } else if (dayparts.length > 0) {
        // Use template dayparts
        const daypartTimes = templateData.recurrence_pattern?.daypart_times || {};
        daypartsArray = dayparts.map((dp: string) => ({
          daypart: dp,
          due_time: daypartTimes[dp] || ''
        }));
      }
      
      setFormData({
        custom_name: existingTask.custom_name || templateData.name || '',
        custom_instructions: existingTask.custom_instructions || templateData.instructions || '',
        due_date: existingTask.due_date || new Date().toISOString().split('T')[0],
        due_time: existingTask.due_time || '',
        daypart: existingTask.daypart || dayparts[0] || '',
        dayparts: daypartsArray, // Always an array
        priority: existingTask.priority || 'medium',
        checklistItems: checklistItems,
        yesNoChecklistItems: yesNoChecklistItems,
        temperatures: taskData.temperatures || [],
        photos: taskData.photos || [],
        passFailStatus: taskData.passFailStatus || '',
        notes: '',
        sopUploads: taskData.sopUploads || [],
        raUploads: taskData.raUploads || [],
        documentUploads: taskData.documentUploads || [],
        selectedLibraries: taskData.selectedLibraries || {
          ppe: [],
          chemicals: [],
          equipment: [],
          ingredients: [],
          drinks: [],
          disposables: [],
        },
        selectedAssets: taskData.selectedAssets || [],
      });
    } else {
      // Initialize form with template defaults
      // Don't pre-fill custom_name - user must provide a unique name
      const dayparts = templateData.dayparts || [];
      const daypartTimes = templateData.recurrence_pattern?.daypart_times || {};
      
      // Initialize all dayparts with their times
      const daypartsArray = dayparts.map((dp: string) => ({
        daypart: dp,
        due_time: daypartTimes[dp] || ''
      }));
      
      // Load default checklist items from template's recurrence_pattern if available
      // CRITICAL: Handle both object and string formats
      let recurrencePattern = templateData.recurrence_pattern;
      if (typeof recurrencePattern === 'string') {
        try {
          recurrencePattern = JSON.parse(recurrencePattern);
        } catch (e) {
          console.error('Failed to parse recurrence_pattern string:', e);
          recurrencePattern = null;
        }
      }
      
      const defaultChecklistItems = (recurrencePattern as any)?.default_checklist_items || [];
      
      // Initialize yes/no checklist items if feature is enabled
      // Convert default_checklist_items to yes/no checklist format
      const hasYesNoChecklist = templateData.evidence_types?.includes('yes_no_checklist');
      const yesNoChecklistItems = hasYesNoChecklist && Array.isArray(defaultChecklistItems)
        ? defaultChecklistItems.map((item: any) => ({
            text: typeof item === 'string' ? item : (item.text || item.label || ''),
            answer: null as 'yes' | 'no' | null
          })).filter((item: { text: string; answer: null }) => item.text && item.text.trim().length > 0)
        : [];
      
      // Regular checklist items (only if yes_no_checklist is NOT enabled)
      const checklistItems = !hasYesNoChecklist && Array.isArray(defaultChecklistItems)
        ? defaultChecklistItems.map((item: any) => 
            typeof item === 'string' ? item : (item.text || item.label || '')
          ).filter((item: string) => item && item.trim().length > 0)
        : [];
      
      // Debug logging for checklist items
      console.log('📋 Loading checklist items from template:', {
        templateId: templateData.id,
        templateName: templateData.name,
        recurrence_pattern_type: typeof templateData.recurrence_pattern,
        recurrence_pattern: recurrencePattern,
        default_checklist_items: defaultChecklistItems,
        default_checklist_items_type: Array.isArray(defaultChecklistItems),
        hasYesNoChecklist: hasYesNoChecklist,
        yesNoChecklistItems: yesNoChecklistItems,
        yesNoChecklistItemsCount: yesNoChecklistItems.length,
        parsed_checklist_items: checklistItems,
        parsed_count: checklistItems.length,
        evidence_types: templateData.evidence_types
      });
      
      // For compliance templates, auto-populate task name from template name (remove "template" word)
      const templateName = templateData.name || '';
      const autoTaskName = templateData.is_template_library 
        ? templateName.replace(/\s*template\s*/gi, '').trim()
        : '';
      
      console.log('✅ Setting formData with checklist items:', {
        checklistItems: checklistItems,
        checklistItemsCount: checklistItems.length,
        yesNoChecklistItems: yesNoChecklistItems,
        yesNoChecklistItemsCount: yesNoChecklistItems.length,
        dayparts: daypartsArray,
        autoTaskName: autoTaskName
      });
      
      setFormData(prev => ({
        ...prev,
        custom_name: autoTaskName, // Auto-populate for compliance templates
        custom_instructions: templateData.instructions || '',
        daypart: dayparts[0] || '', // Keep for backward compatibility
        dayparts: daypartsArray.length > 0 ? daypartsArray : [], // Ensure always an array
        due_time: daypartTimes[dayparts[0]] || '',
        checklistItems: checklistItems, // Auto-populate from template
        yesNoChecklistItems: yesNoChecklistItems || [], // Ensure always an array
      }));
      
      // Verify formData was set correctly
      setTimeout(() => {
        console.log('🔍 FormData after setting (checking state):', {
          checklistItemsCount: checklistItems.length,
          note: 'FormData state may not be immediately available in console'
        });
      }, 100);
    }
  }

  // Determine which features are enabled - use shared utility for consistency
  const enabledFeatures = getTemplateFeatures(template);
  
  const matrixField = useMemo(() => {
    if (!templateFields || templateFields.length === 0) return undefined;
    return templateFields.find((field) => field.field_name === 'matrix_link');
  }, [templateFields]);

  const matrixUrl = useMemo(() => {
    if (matrixField?.placeholder && typeof matrixField.placeholder === 'string' && matrixField.placeholder.trim().length > 0) {
      return matrixField.placeholder.trim();
    }
    return '/dashboard/training';
  }, [matrixField]);

  const matrixHref = useMemo(() => {
    if (!matrixUrl) return undefined;
    const hasSiteParam = /[?&]site=/.test(matrixUrl);
    if (!siteId || hasSiteParam) {
      return matrixUrl;
    }
    const separator = matrixUrl.includes('?') ? '&' : '?';
    return `${matrixUrl}${separator}site=home`;
  }, [matrixUrl, siteId]);

  const matrixDisplayUrl = matrixHref || matrixUrl;

  const handleOpenMatrix = useCallback(() => {
    const target = matrixHref || matrixUrl;
    if (!target) return;
    if (typeof window === 'undefined') return;

    const url = target.startsWith('http')
      ? target
      : `${window.location.origin}${target.startsWith('/') ? target : `/${target}`}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  }, [matrixHref, matrixUrl]);

  // Debug logging for feature detection - only log when template changes, not on every render
  useEffect(() => {
    if (template && isOpen) {
      const features = getTemplateFeatures(template);
      console.log('🔍 Template feature detection:', {
        templateName: template.name,
        templateSlug: template.slug,
        repeatable_field_name: template.repeatable_field_name,
        evidence_types: template.evidence_types,
        triggers_contractor_on_failure: template.triggers_contractor_on_failure,
        contractor_type: template.contractor_type,
        enabledFeatures: features,
        willShowAssetUI: allAssets.length > 0 && features.assetSelection,
        willShowLibrary: features.libraryDropdown,
        willShowDocument: features.documentUpload,
        // Debug: Log template configuration
        templateRepeatableField: template?.repeatable_field_name,
        templateRequiresSOP: template?.requires_sop,
        templateRequiresRA: template?.requires_risk_assessment,
        willShowChecklist: features.checklist,
        hasDefaultChecklistItems: !!template.recurrence_pattern?.default_checklist_items
      });
    }
    // Only run when template or modal state changes, not on every render
     
  }, [template?.id, isOpen, allAssets.length]);

  // Debug logging and ensure formData is initialized when template loads
  // IMPORTANT: Only update checklist items, NOT times or dates - user may have already changed those
  useEffect(() => {
    if (template && isOpen && !existingTask) {
      console.log('🔍 Template useEffect triggered:', {
        templateId: template.id,
        templateName: template.name,
        hasRecurrencePattern: !!template.recurrence_pattern,
        recurrencePatternType: typeof template.recurrence_pattern,
        recurrencePattern: template.recurrence_pattern,
        currentChecklistItemsCount: formData.checklistItems?.length || 0
      });
      
      console.log('Template evidence_types:', template.evidence_types);
      console.log('Enabled features:', enabledFeatures);
      console.log('Yes/No Checklist enabled?', enabledFeatures.yesNoChecklist);
      
      // CRITICAL FIX: If formData.checklistItems is empty but template has checklist items, initialize them
      // NOTE: Do NOT reset times, dates, or dayparts - user may have already changed those
      const recurrencePattern = template.recurrence_pattern;
      if (recurrencePattern) {
        // Handle both object and string formats
        let parsedPattern = recurrencePattern;
        if (typeof recurrencePattern === 'string') {
          try {
            parsedPattern = JSON.parse(recurrencePattern);
          } catch (e) {
            console.error('Failed to parse recurrence_pattern:', e);
            parsedPattern = null;
          }
        }
        
        if (parsedPattern && typeof parsedPattern === 'object') {
          const defaultChecklistItems = parsedPattern.default_checklist_items || [];
          console.log('📋 Found default_checklist_items:', {
            isArray: Array.isArray(defaultChecklistItems),
            count: defaultChecklistItems.length,
            items: defaultChecklistItems
          });
          
          if (Array.isArray(defaultChecklistItems) && defaultChecklistItems.length > 0) {
            const currentChecklistItems = formData.checklistItems || [];
            console.log('📊 Current formData.checklistItems:', {
              count: currentChecklistItems.length,
              items: currentChecklistItems
            });
            
            if (currentChecklistItems.length === 0) {
              console.log('🔧 FIXING: Loading checklist items from template (formData was empty)', {
                defaultChecklistItems,
                count: defaultChecklistItems.length
              });
              
              const checklistItems = defaultChecklistItems.map((item: any) => 
                typeof item === 'string' ? item : (item.text || item.label || '')
              ).filter((item: string) => item && item.trim().length > 0);
              
              console.log('✅ Setting checklistItems:', checklistItems);
              
              setFormData(prev => ({
                ...prev,
                checklistItems: checklistItems
              }));
            } else {
              console.log('ℹ️ Checklist items already exist, not overwriting');
            }
          }
        }
      } else {
        console.log('⚠️ No recurrence_pattern found in template');
      }
    }
  }, [template, isOpen, existingTask]);

  // Upload handlers
  async function handleFileUpload(
    file: File,
    bucket: string,
    type: 'sop' | 'ra' | 'photo'
  ): Promise<{ url: string; fileName: string; fileType: string; fileSize: number } | null> {
    if (!companyId) {
      toast.error('Missing company context');
      return null;
    }

    const uploadKey = `${type}-${Date.now()}`;
    setUploading(prev => ({ ...prev, [uploadKey]: true }));

    try {
      // Validate file size (10MB max for documents, 5MB for photos)
      const maxSize = type === 'photo' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`File size must be less than ${type === 'photo' ? '5MB' : '10MB'}`);
        return null;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${type}_${timestamp}.${fileExtension}`;
      const filePath = type === 'photo' 
        ? `tasks/${companyId}/${fileName}`
        : `${companyId}/${type === 'sop' ? 'sops' : 'risk_assessments'}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const uploadData = {
        url: urlData.publicUrl,
        fileName: sanitizedFileName,
        fileType: file.type,
        fileSize: file.size,
      };

      toast.success(`${type.toUpperCase()} uploaded successfully`);
      return uploadData;
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Failed to upload ${type}: ${error.message || 'Unknown error'}`);
      return null;
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  }

  async function handleSOPUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadData = await handleFileUpload(file, 'sop_uploads', 'sop');
    if (uploadData) {
      setFormData(prev => ({
        ...prev,
        sopUploads: [...prev.sopUploads, uploadData],
      }));
    }
    // Reset input
    e.target.value = '';
  }

  async function handleRAUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use global_docs bucket for risk assessments
    const uploadData = await handleFileUpload(file, 'global_docs', 'ra');
    if (uploadData) {
      setFormData(prev => ({
        ...prev,
        raUploads: [...prev.raUploads, uploadData],
      }));
    }
    // Reset input
    e.target.value = '';
  }

  async function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use global_docs bucket for general documents
    const uploadData = await handleFileUpload(file, 'global_docs', 'ra'); // Reuse 'ra' type for general docs
    if (uploadData) {
      setFormData(prev => ({
        ...prev,
        documentUploads: [...prev.documentUploads, uploadData],
      }));
    }
    // Reset input
    e.target.value = '';
  }

  async function handlePhotoUpload(file: File) {
    // Validate image type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const uploadData = await handleFileUpload(file, 'sop-photos', 'photo');
    if (uploadData) {
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, { url: uploadData.url, fileName: uploadData.fileName }],
      }));
    }
  }

  // Monitor/Callout handler - triggered by Pass/Fail, Temperature, Yes/No features
  const handleMonitorCallout = async (
    monitor: boolean,
    callout: boolean,
    notes?: string,
    assetId?: string,
    temp?: number,
    tempRange?: { min?: number; max?: number }
  ) => {
    // Store monitor/callout data - this will be saved in task_data when task is created/updated
    console.log('Monitor/Callout triggered:', { monitor, callout, notes, assetId, temp, tempRange });
    
    // You can extend this to:
    // - Create contractor callout records
    // - Store monitoring flags
    // - Send notifications
    // For now, this data can be stored in task_data.monitorCallout array
    
    if (callout && template?.contractor_type) {
      toast.success(`Contractor callout requested: ${template.contractor_type.replace('_', ' ')}`);
    }
    
    if (monitor) {
      toast.info('Issue flagged for monitoring');
    }
  };

  // Get temperature thresholds from template fields if available
  const getTemperatureThresholds = () => {
    if (!template?.template_fields) return { warnThreshold: undefined, failThreshold: undefined };
    
    const tempField = template.template_fields.find((f: any) => 
      f.field_type === 'temperature' || f.field_name?.toLowerCase().includes('temp')
    );
    
    return {
      warnThreshold: tempField?.warn_threshold,
      failThreshold: tempField?.fail_threshold
    };
  };

  function removeUpload(type: 'sop' | 'ra' | 'photo' | 'document', index: number) {
    if (type === 'sop') {
      setFormData(prev => ({
        ...prev,
        sopUploads: prev.sopUploads.filter((_, i) => i !== index),
      }));
    } else if (type === 'ra') {
      setFormData(prev => ({
        ...prev,
        raUploads: prev.raUploads.filter((_, i) => i !== index),
      }));
    } else if (type === 'document') {
      setFormData(prev => ({
        ...prev,
        documentUploads: prev.documentUploads.filter((_, i) => i !== index),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        photos: prev.photos.filter((_, i) => i !== index),
      }));
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Wait for context to finish loading
    if (contextLoading) {
      toast.error('Please wait while we load your information...');
      return;
    }

    if (!companyId) {
      toast.error('Company information is missing. Please refresh the page and try again.');
      console.error('❌ Missing companyId:', { companyId, siteId, profile });
      return;
    }

    // siteId is required by the database schema
    // The database trigger will try to set it from the user's profile if missing,
    // but if the profile doesn't have a site_id, we need to show an error
    if (!siteId) {
      toast.error('Site information is required to create tasks. Please ensure you are assigned to a site or contact your administrator.');
      console.error('❌ Missing siteId:', { companyId, siteId, profile });
      return;
    }

    // For editing, we need existingTask.id, not templateId
    if (existingTask && !existingTask.id) {
      toast.error('Task ID missing');
      return;
    }

    // For creating, we need templateId
    if (!existingTask && !templateId) {
      toast.error('Template ID missing');
      return;
    }

    // For creating new tasks, custom_name is required
    if (!existingTask && (!formData.custom_name || formData.custom_name.trim() === '')) {
      toast.error('Please enter a task name. This helps identify the task in your Active Tasks list.');
      return;
    }

    setSaving(true);

    try {
      // Build custom instructions if user modified them
      const templateInstructions = template?.instructions || '';
      const instructions = formData.custom_instructions && formData.custom_instructions !== templateInstructions
        ? formData.custom_instructions
        : null;

      if (existingTask) {
        // Update existing task
        const templateName = template?.name || '';
        
        // Build task data to store checklist items and other feature data
        const taskData: Record<string, any> = {};
        
        // Store checklist items if they exist (filter out empty strings)
        if (formData.checklistItems && formData.checklistItems.length > 0) {
          const validItems = formData.checklistItems.filter((item: string) => item && item.trim().length > 0);
          if (validItems.length > 0) {
            taskData.checklistItems = validItems.map((item: string) => ({
              text: item.trim(),
              completed: false
            }));
          }
        }
        
        // Store yes/no checklist items if they exist
        if (formData.yesNoChecklistItems && formData.yesNoChecklistItems.length > 0) {
          const validItems = formData.yesNoChecklistItems.filter((item: any) => item && item.text && item.text.trim().length > 0);
          if (validItems.length > 0) {
            taskData.yesNoChecklistItems = validItems;
          }
        }
        
        // Store dayparts if they exist
        if (formData.dayparts && formData.dayparts.length > 0) {
          taskData.dayparts = formData.dayparts;
        }
        
        // Store temperature logs if they exist
        if (formData.temperatures && formData.temperatures.length > 0) {
          taskData.temperatures = formData.temperatures;
        }
        
        // Store pass/fail status if it exists
        if (formData.passFailStatus) {
          taskData.passFailStatus = formData.passFailStatus;
        }
        
        // Store uploaded files
        if (formData.sopUploads && formData.sopUploads.length > 0) {
          taskData.sopUploads = formData.sopUploads;
        }
        if (formData.raUploads && formData.raUploads.length > 0) {
          taskData.raUploads = formData.raUploads;
        }
        if (formData.documentUploads && formData.documentUploads.length > 0) {
          taskData.documentUploads = formData.documentUploads;
        }
        if (formData.photos && formData.photos.length > 0) {
          taskData.photos = formData.photos;
        }
        
        // Store library selections
        if (formData.selectedLibraries && Object.keys(formData.selectedLibraries).some(key => formData.selectedLibraries[key as keyof typeof formData.selectedLibraries].length > 0)) {
          taskData.selectedLibraries = formData.selectedLibraries;
        }
        
        // Store asset selections
        if (formData.selectedAssets && formData.selectedAssets.length > 0) {
          taskData.selectedAssets = formData.selectedAssets;
        }
        
        // Use first daypart for backward compatibility (single daypart field)
        const primaryDaypart = formData.dayparts && formData.dayparts.length > 0 
          ? formData.dayparts[0].daypart 
          : formData.daypart || null;
        const primaryDueTime = formData.dayparts && formData.dayparts.length > 0 
          ? formData.dayparts[0].due_time 
          : formData.due_time || null;
        
        // Ensure dayparts are stored in task_data for daily tasks
        if (template?.frequency === 'daily' && formData.dayparts && formData.dayparts.length > 0) {
          taskData.dayparts = formData.dayparts;
          // Also store daypart_times mapping for reference
          const daypartTimes: Record<string, string> = {};
          formData.dayparts.forEach((dp: { daypart: string; due_time: string }) => {
            if (dp.due_time) {
              daypartTimes[dp.daypart] = dp.due_time;
            }
          });
          if (Object.keys(daypartTimes).length > 0) {
            taskData.daypart_times = daypartTimes;
          }
        }
        
        const { data, error } = await supabase
          .from('checklist_tasks')
          .update({
            due_date: formData.due_date,
            due_time: primaryDueTime,
            daypart: primaryDaypart,
            priority: formData.priority,
            custom_name: formData.custom_name && formData.custom_name !== templateName
              ? formData.custom_name 
              : null,
            custom_instructions: instructions,
            // Update task_data with feature data including dayparts
            task_data: Object.keys(taskData).length > 0 ? taskData : {},
          })
          .eq('id', existingTask.id)
          .select()
          .single();

        if (error) throw error;

        toast.success('Task updated successfully!');
        if (onSave) onSave();
        onClose();
      } else {
        // Build task data to store checklist items and other feature data
        const taskData: Record<string, any> = {};
        
        // Store checklist items if they exist (filter out empty strings)
        if (formData.checklistItems && formData.checklistItems.length > 0) {
          const validItems = formData.checklistItems.filter((item: string) => item && item.trim().length > 0);
          if (validItems.length > 0) {
            taskData.checklistItems = validItems.map((item: string) => ({
              text: item.trim(),
              completed: false
            }));
          }
        }
        
        // Store yes/no checklist items if they exist
        if (formData.yesNoChecklistItems && formData.yesNoChecklistItems.length > 0) {
          const validItems = formData.yesNoChecklistItems.filter((item: any) => item && item.text && item.text.trim().length > 0);
          if (validItems.length > 0) {
            taskData.yesNoChecklistItems = validItems;
          }
        }
        
        // Build daypart_times object for site_checklists
        const daypartTimes: Record<string, string | string[]> = {};
        if (formData.dayparts && formData.dayparts.length > 0) {
          for (const dp of formData.dayparts) {
            if (dp.daypart && dp.due_time) {
              if (daypartTimes[dp.daypart]) {
                // If daypart already exists, convert to array
                const existing = daypartTimes[dp.daypart];
                daypartTimes[dp.daypart] = Array.isArray(existing) 
                  ? [...existing, dp.due_time]
                  : [existing, dp.due_time];
              } else {
                daypartTimes[dp.daypart] = dp.due_time;
              }
            }
          }
        }
        
        // Build equipment_config from temperatures (preferred) or selectedAssets
        // Always prioritize temperatures array as it contains full data (nicknames, temp ranges)
        let equipmentConfig = null;
        if (formData.temperatures && formData.temperatures.length > 0) {
          // Extract equipment from temperature logs, including temp ranges and nicknames
          equipmentConfig = formData.temperatures
            .filter((temp: any) => temp.assetId) // Only include items with assetId
            .map((temp: any) => ({
              assetId: temp.assetId,
              equipment: temp.equipment || '', // Asset name
              nickname: temp.nickname || '', // User-defined nickname
              temp_min: temp.temp_min !== undefined && temp.temp_min !== null ? temp.temp_min : undefined,
              temp_max: temp.temp_max !== undefined && temp.temp_max !== null ? temp.temp_max : undefined
            }));
        } else if (formData.selectedAssets && formData.selectedAssets.length > 0) {
          // Fallback: if no temperatures, use selectedAssets and look up asset names
          equipmentConfig = formData.selectedAssets.map((assetId: string) => {
            const asset = assets.find(a => a.id === assetId);
            return {
              assetId: assetId,
              equipment: asset?.name || '',
              nickname: '',
              temp_min: undefined,
              temp_max: undefined
            };
          });
        }
        
        // Determine frequency from template
        const frequency = template?.frequency || 'daily';
        
        // Build site_checklist configuration
        // Use taskSiteId for new tasks, or existing site_id for editing
        const effectiveSiteId = existingSiteChecklist 
          ? existingSiteChecklist.site_id 
          : (existingTask 
            ? existingTask.site_id 
            : taskSiteId || siteId);
        
        const siteChecklistData: any = {
          template_id: templateId,
          company_id: companyId,
          site_id: effectiveSiteId,
          name: formData.custom_name.trim() || template?.name || 'Task Configuration',
          frequency: frequency,
          active: true
        };
        
        // Add daypart_times if we have multiple times
        if (Object.keys(daypartTimes).length > 0) {
          siteChecklistData.daypart_times = daypartTimes;
        }
        
        // Add equipment_config if we have equipment
        if (equipmentConfig && equipmentConfig.length > 0) {
          siteChecklistData.equipment_config = equipmentConfig;
          console.log('💾 Saving equipment_config:', JSON.stringify(equipmentConfig, null, 2));

          // Upsert positions before saving checklist
          await upsertEquipmentPositions(effectiveSiteId, companyId, equipmentConfig);
        }

        // Add scheduling for weekly/monthly/annual
        if (frequency === 'weekly' && formData.days_of_week) {
          siteChecklistData.days_of_week = formData.days_of_week;
        } else if (frequency === 'monthly' && formData.date_of_month) {
          siteChecklistData.date_of_month = formData.date_of_month;
        } else if (frequency === 'annually' && formData.anniversary_date) {
          siteChecklistData.anniversary_date = formData.anniversary_date;
        }
        
        // Check if editing existing site_checklist (passed as prop)
        if (existingSiteChecklist) {
          // Update existing configuration
          const { error } = await supabase
            .from('site_checklists')
            .update(siteChecklistData)
            .eq('id', existingSiteChecklist.id);
          
          if (error) throw error;
          toast.success('Configuration updated successfully!');
          
          // Call onSave callback and close modal (don't redirect when editing)
          if (onSave) onSave();
          onClose();
          return;
        } else {
          // Check if a site_checklist already exists for this site_id and template_id combination
          const { data: existingChecklist, error: checkError } = await supabase
            .from('site_checklists')
            .select('id')
            .eq('site_id', effectiveSiteId)
            .eq('template_id', templateId)
            .maybeSingle();
          
          if (checkError) {
            console.error('Error checking for existing site_checklist:', checkError);
            throw checkError;
          }
          
          // Fetch site name for toast message
          let siteName = 'the selected site';
          if (effectiveSiteId) {
            const { data: siteData } = await supabase
              .from('sites')
              .select('name')
              .eq('id', effectiveSiteId)
              .single();
            if (siteData?.name) {
              siteName = siteData.name;
            }
          }
          
          if (existingChecklist) {
            // Update existing configuration instead of creating duplicate
            console.log('🔄 Found existing site_checklist, updating instead of creating:', existingChecklist.id);
            const { error: updateError } = await supabase
              .from('site_checklists')
              .update(siteChecklistData)
              .eq('id', existingChecklist.id);
            
            if (updateError) throw updateError;
            toast.success(`Task configuration updated successfully for ${siteName}!`);
          } else {
            // Create new configuration
            const { data, error } = await supabase
              .from('site_checklists')
              .insert(siteChecklistData)
              .select()
              .single();

            if (error) throw error;
            toast.success(`Task configuration created successfully for ${siteName}!`);
          }

          // ====================================================================
          // CRITICAL: Save checklist items back to template's recurrence_pattern
          // This ensures the cron function can populate items for future tasks
          // ====================================================================
          if (templateId && (formData.checklistItems?.length > 0 || formData.yesNoChecklistItems?.length > 0)) {
            try {
              // First, get the current template's recurrence_pattern
              const { data: currentTemplate, error: fetchError } = await supabase
                .from('task_templates')
                .select('recurrence_pattern')
                .eq('id', templateId)
                .single();

              if (!fetchError && currentTemplate) {
                // Parse existing recurrence_pattern or create new one
                let existingPattern = currentTemplate.recurrence_pattern || {};
                if (typeof existingPattern === 'string') {
                  try {
                    existingPattern = JSON.parse(existingPattern);
                  } catch (e) {
                    existingPattern = {};
                  }
                }

                // Prepare checklist items to save
                let defaultChecklistItems: string[] = [];

                if (formData.yesNoChecklistItems && formData.yesNoChecklistItems.length > 0) {
                  // For yes/no checklists, save the text values
                  defaultChecklistItems = formData.yesNoChecklistItems
                    .filter((item: any) => item && item.text && item.text.trim().length > 0)
                    .map((item: any) => item.text.trim());
                } else if (formData.checklistItems && formData.checklistItems.length > 0) {
                  // For regular checklists, save the items directly
                  defaultChecklistItems = formData.checklistItems
                    .filter((item: string) => item && item.trim().length > 0)
                    .map((item: string) => item.trim());
                }

                // Update recurrence_pattern with default_checklist_items
                if (defaultChecklistItems.length > 0) {
                  const updatedPattern = {
                    ...existingPattern,
                    default_checklist_items: defaultChecklistItems
                  };

                  const { error: updateError } = await supabase
                    .from('task_templates')
                    .update({ recurrence_pattern: updatedPattern })
                    .eq('id', templateId);

                  if (updateError) {
                    console.error('Error saving checklist items to template:', updateError);
                    // Don't fail the whole operation - the site_checklist was created
                  } else {
                    console.log('✅ Saved default_checklist_items to template:', defaultChecklistItems);
                  }
                }
              }
            } catch (templateUpdateError) {
              console.error('Error updating template with checklist items:', templateUpdateError);
              // Don't fail the whole operation - the site_checklist was created
            }
          }

          // ====================================================================
          // CRITICAL: Activate template so the daily cron picks it up
          // Templates are created with is_active=false by the builder.
          // Once a task config (site_checklist) exists, the template should be active.
          // ====================================================================
          if (templateId) {
            try {
              const { error: activateError } = await supabase
                .from('task_templates')
                .update({ is_active: true })
                .eq('id', templateId);

              if (activateError) {
                console.error('Error activating template:', activateError);
              } else {
                console.log('✅ Template activated (is_active=true) for cron pickup');
              }
            } catch (activateErr) {
              console.error('Error activating template:', activateErr);
            }
          }

          // ====================================================================
          // CRITICAL: Create seed checklist_task(s) for today so the task
          // appears immediately in Today's Tasks AND so the cron can
          // pattern-match from this seed to generate future daily tasks.
          // ====================================================================
          try {
            const today = new Date().toISOString().split('T')[0];

            // Build the task_data payload (same structure as existing task updates)
            const seedTaskData: Record<string, any> = {};

            if (formData.checklistItems && formData.checklistItems.length > 0) {
              const validItems = formData.checklistItems.filter((item: string) => item && item.trim().length > 0);
              if (validItems.length > 0) {
                seedTaskData.checklistItems = validItems.map((item: string) => ({
                  text: item.trim(),
                  completed: false
                }));
              }
            }

            if (formData.yesNoChecklistItems && formData.yesNoChecklistItems.length > 0) {
              const validItems = formData.yesNoChecklistItems.filter((item: any) => item && item.text && item.text.trim().length > 0);
              if (validItems.length > 0) {
                seedTaskData.yesNoChecklistItems = validItems;
              }
            }

            if (formData.temperatures && formData.temperatures.length > 0) {
              seedTaskData.temperatures = formData.temperatures;
            }

            if (formData.selectedAssets && formData.selectedAssets.length > 0) {
              seedTaskData.selectedAssets = formData.selectedAssets;
            }

            // Determine daypart/time pairs to create tasks for
            const daypartPairs = formData.dayparts && formData.dayparts.length > 0
              ? formData.dayparts.filter((dp: { daypart: string; due_time: string }) => dp.daypart)
              : [{ daypart: formData.daypart || 'anytime', due_time: formData.due_time || '09:00' }];

            for (const dp of daypartPairs) {
              // Check if a seed task already exists for today (avoid duplicates)
              const { data: existingSeed } = await supabase
                .from('checklist_tasks')
                .select('id')
                .eq('template_id', templateId)
                .eq('site_id', effectiveSiteId)
                .eq('due_date', today)
                .eq('daypart', dp.daypart)
                .maybeSingle();

              if (!existingSeed) {
                const { error: seedError } = await supabase
                  .from('checklist_tasks')
                  .insert({
                    template_id: templateId,
                    company_id: companyId,
                    site_id: effectiveSiteId,
                    custom_name: formData.custom_name.trim() || template?.name || null,
                    due_date: today,
                    due_time: dp.due_time || '09:00',
                    daypart: dp.daypart,
                    priority: formData.priority || 'medium',
                    status: 'pending',
                    task_data: Object.keys(seedTaskData).length > 0 ? seedTaskData : {},
                  });

                if (seedError) {
                  console.error('Error creating seed checklist_task:', seedError);
                } else {
                  console.log(`✅ Seed checklist_task created for daypart: ${dp.daypart}`);
                }
              } else {
                console.log(`⏭️ Seed task already exists for daypart: ${dp.daypart}`);
              }
            }
          } catch (seedErr) {
            console.error('Error creating seed tasks:', seedErr);
            // Don't fail the whole operation - the site_checklist was created
          }

          // Close the modal and notify parent
          if (onSave) onSave();
          onClose();
        }
      }
    } catch (error: any) {
      console.error('Error creating checklist:', error);
      toast.error(`Failed to create checklist: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-[#14161c] rounded-xl p-8 border border-gray-200 dark:border-white/[0.1] shadow-2xl">
          <p className="text-gray-900 dark:text-white">Loading template...</p>
        </div>
      </div>
    );
  }

  if (!template && !existingTask) {
    // Can't create without template
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-[#14161c] rounded-xl p-8 border border-gray-200 dark:border-white/[0.1] shadow-2xl">
          <p className="text-gray-900 dark:text-white mb-4">Template not found</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-transparent border border-[#D37E91] text-[#D37E91] hover:shadow-[0_0_12px_rgba(211,126,145,0.7)] rounded transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Get dayparts - use template dayparts if available, otherwise use existing task daypart if editing
  // Also include any dayparts from formData that aren't in template dayparts (user-added)
  const templateDaypartsRaw = Array.isArray(template?.dayparts)
    ? template.dayparts
    : (existingTask?.daypart ? [existingTask.daypart] : []);

  const templateDayparts = templateDaypartsRaw.filter(
    (dp): dp is string => typeof dp === 'string' && dp.trim().length > 0
  );

  const userAddedDayparts = formData.dayparts
    .map((dp) => dp.daypart)
    .filter((dp): dp is string => typeof dp === 'string' && dp.trim().length > 0)
    .filter((dp) => !templateDayparts.includes(dp));

  const dayparts = [...new Set([...templateDayparts, ...userAddedDayparts])]; // Combine and deduplicate

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#14161c] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-white/[0.1] shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-white/[0.1]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {existingTask || existingSiteChecklist ? (existingSiteChecklist ? 'Edit Configuration' : 'Edit Task') : 'Create Task'}: {template?.name || existingTask?.custom_name || existingSiteChecklist?.name || 'Task'}
              </h1>
              <p className="text-gray-600 dark:text-white/60">
                {existingTask || existingSiteChecklist
                  ? (existingSiteChecklist ? 'Update the task configuration' : (template ? 'Update the task details' : 'Template not found. You can still edit the task details.'))
                  : 'Fill in the details for this task instance'}
              </p>
            </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.1] text-gray-600 dark:text-white/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] bg-white dark:bg-[#14161c]">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Task Details</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Task Name {!existingTask && <span className="text-red-500">*</span>}
                  {existingTask && <span className="text-gray-500 dark:text-gray-400">(optional)</span>}
                </label>
                <input
                  type="text"
                  value={formData.custom_name}
                  onChange={(e) => setFormData({ ...formData, custom_name: e.target.value })}
                  placeholder={existingTask ? (existingTask.custom_name || template?.name || 'Task name') : 'Enter a unique name for this task (e.g., "Front counter setup checklist")'}
                  required={!existingTask}
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                />
                {!existingTask && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This name will identify this task in your Active Tasks list. Make it specific and unique.
                  </p>
                )}
                {existingTask && existingTask.custom_name && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Current: {existingTask.custom_name}</p>
                )}
              </div>

              {/* Site Selector - Only show when creating new task (not editing) */}
              {(() => {
                const shouldShow = !existingTask && !existingSiteChecklist;
                console.log('🔍 Site selector render check:', { 
                  shouldShow, 
                  existingTask: !!existingTask, 
                  existingSiteChecklist: !!existingSiteChecklist,
                  availableSitesCount: availableSites.length,
                  loadingSites,
                  taskSiteId
                });
                
                if (!shouldShow) return null;
                
                return (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Site <span className="text-red-500">*</span>
                    </label>
                    {loadingSites ? (
                      <div className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-500 dark:text-gray-400">
                        Loading sites...
                      </div>
                    ) : availableSites.length === 0 ? (
                      <div className="w-full px-4 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-300 dark:border-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-sm">
                        No sites available. Please ensure you have sites configured for your company.
                      </div>
                    ) : (
                      <>
                        <select
                          value={taskSiteId}
                          onChange={(e) => setTaskSiteId(e.target.value)}
                          required
                          className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                        >
                          <option value="">Select a site</option>
                          {availableSites.map(site => (
                            <option key={site.id} value={site.id}>
                              {site.name}
                            </option>
                          ))}
                        </select>
                        {taskSiteId && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            This task will be visible to all {availableSites.find(s => s.id === taskSiteId)?.name || ''} staff in My Tasks
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Instructions - Expandable Section */}
              <div className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setInstructionsExpanded(!instructionsExpanded)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Instructions</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">(optional - defaults to template instructions)</span>
                  </div>
                  {instructionsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-600 dark:text-white/60" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-600 dark:text-white/60" />
                  )}
                </button>
                {instructionsExpanded && (
                  <div className="p-4 border-t border-gray-200 dark:border-white/10">
                    <textarea
                      value={formData.custom_instructions}
                      onChange={(e) => setFormData({ ...formData, custom_instructions: e.target.value })}
                      placeholder={template?.instructions || 'Instructions will come from template...'}
                      rows={8}
                      className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91] resize-y"
                    />
                  </div>
                )}
              </div>

              {template?.slug === 'training_compliance_management' && (
                <div className="border border-[#D37E91]/30 bg-[#D37E91]/10 rounded-xl p-4 space-y-3 shadow-[0_0_18px_rgba(211,126,145,0.15)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-white/90">
                      <p className="font-semibold text-white">Training Matrix Shortcut</p>
                      <p className="text-xs text-white/70 mt-1">
                        {matrixField?.help_text || 'Open the live Training Matrix in a new tab, review compliance status, then return to complete this task.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenMatrix}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-[#D37E91] text-[#D37E91] font-medium rounded-lg transition-all duration-150 hover:bg-[#D37E91]/20 hover:text-white shadow-[0_0_12px_rgba(211,126,145,0.35)]"
                    >
                      <span>Open Matrix</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                  {matrixDisplayUrl && (
                    <p className="text-[10px] text-white/50 break-all">
                      {matrixDisplayUrl}
                    </p>
                  )}
                </div>
              )}

              {/* Scheduling Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Due Date *</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                  />
                </div>

                {/* Dayparts & Times for Daily Tasks - More Intuitive Layout */}
                {template?.frequency === 'daily' ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        Schedule Times <span className="text-gray-500 dark:text-gray-400 text-xs font-normal">(select dayparts and set times)</span>
                      </label>
                      <select
                        value=""
                        onChange={(e) => {
                          const selectedDaypart = e.target.value;
                          if (selectedDaypart && !formData.dayparts.some(dp => dp.daypart === selectedDaypart)) {
                            setFormData({
                              ...formData,
                              dayparts: [...formData.dayparts, { daypart: selectedDaypart, due_time: '' }]
                            });
                            e.target.value = ''; // Reset dropdown
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                      >
                        <option value="">+ Add Daypart</option>
                        {availableDayparts
                          .filter(dp => !formData.dayparts.some(fdp => fdp.daypart === dp))
                          .map((daypart) => {
                            const label = daypart.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                            return (
                              <option key={daypart} value={daypart}>
                                {label}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                    <div className="space-y-2">
                      {dayparts.length > 0 ? (
                        dayparts.map((daypart) => {
                          const daypartEntry = formData.dayparts.find((dp) => dp.daypart === daypart);
                          const isSelected = !!daypartEntry;
                          const daypartLabel = daypart.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                          
                          return (
                            <div
                              key={daypart}
                              className={`border rounded-lg p-3 transition-all ${
                                isSelected
                                  ? 'border-[#D37E91]/50 bg-[#D37E91]/10'
                                  : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      // Add daypart with time
                                      setFormData({
                                        ...formData,
                                        dayparts: [
                                          ...formData.dayparts,
                                          { daypart, due_time: '' }
                                        ]
                                      });
                                    } else {
                                      // Remove daypart
                                      setFormData({
                                        ...formData,
                                        dayparts: formData.dayparts.filter((dp) => dp.daypart !== daypart)
                                      });
                                    }
                                  }}
                                  className="w-5 h-5 accent-[#D37E91] cursor-pointer"
                                />
                                <label className="text-sm font-medium text-gray-900 dark:text-white capitalize flex-1 cursor-pointer" onClick={() => {
                                  if (!isSelected) {
                                    setFormData({
                                      ...formData,
                                      dayparts: [...formData.dayparts, { daypart, due_time: '' }]
                                    });
                                  }
                                }}>
                                  {daypartLabel}
                                </label>
                                {isSelected && (
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-600 dark:text-white/60">Time:</label>
                                    <TimePicker
                                      value={daypartEntry?.due_time || ''}
                                      onChange={(value) => {
                                        // Find and update the correct daypart entry
                                        const newDayparts = formData.dayparts.map((dp) => 
                                          dp.daypart === daypart 
                                            ? { ...dp, due_time: value }
                                            : dp
                                        );
                                        setFormData({ ...formData, dayparts: newDayparts });
                                      }}
                                      className=""
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-white/60 text-center py-4">
                          No dayparts added yet. Use the dropdown above to add dayparts.
                        </p>
                      )}
                    </div>
                    {formData.dayparts.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        ✓ {formData.dayparts.length} daypart{formData.dayparts.length !== 1 ? 's' : ''} scheduled
                      </p>
                    )}
                  </div>
                ) : (
                  /* Single Due Time for non-daily tasks */
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Due Time</label>
                    <TimePicker
                      value={formData.due_time}
                      onChange={(value) => setFormData({ ...formData, due_time: value })}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Asset Selection - Only show if template has asset selection feature enabled */}
            {enabledFeatures.assetSelection && (
              <>
                {allAssets.length > 0 ? (
                  <AssetSelectionFeature
                    selectedAssets={formData.selectedAssets}
                    assets={assets}
                    sites={sites}
                    onChange={(selected) => {
                      setFormData({ ...formData, selectedAssets: selected });
                      // Also update tempAssetSelection to match
                      setTempAssetSelection(selected);
                    }}
                    isExpanded={isAssetSelectionExpanded}
                    onExpandedChange={setIsAssetSelectionExpanded}
                  />
                ) : (
                  <div className="border-t border-gray-200 dark:border-white/10 pt-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Asset Selection</h2>
                    <div className="p-4 rounded-lg border border-gray-200 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.03]">
                      <p className="text-sm text-gray-600 dark:text-white/60">
                        {loading ? 'Loading assets...' : 'No assets found. Please ensure assets are configured for your company.'}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Call Point Management - Only show if template has fire_alarm_call_point field */}
            {hasCallPointField && (
              <div className="border-t border-gray-200 dark:border-white/10 pt-6">
                {/* Collapsible Header */}
                <button
                  type="button"
                  onClick={() => setIsCallPointManagementExpanded(!isCallPointManagementExpanded)}
                  className="w-full flex items-center justify-between mb-4 text-left hover:opacity-80 transition-opacity"
                >
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Fire Alarm Call Points
                    {callPoints.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-[#D37E91] dark:text-[#D37E91]">
                        ({callPoints.length} configured)
                      </span>
                    )}
                  </h2>
                  {isCallPointManagementExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-600 dark:text-white/60" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600 dark:text-white/60" />
                  )}
                </button>
                
                {/* Collapsible Content */}
                {isCallPointManagementExpanded && (
                  <div className="space-y-4">
                    {/* Existing Call Points */}
                    {callPoints.length > 0 && (
                      <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
                        <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Existing Call Points</h3>
                        <div className="space-y-2">
                          {callPoints.map((cp) => (
                            <div key={cp.id} className="flex items-center justify-between bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-lg p-3">
                              <div>
                                <span className="text-gray-900 dark:text-white text-sm font-medium">{cp.label}</span>
                                {cp.location && cp.location !== cp.label && (
                                  <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">({cp.location})</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('template_repeatable_labels')
                                      .delete()
                                      .eq('id', cp.id);
                                    
                                    if (error) throw error;
                                    
                                    setCallPoints(callPoints.filter(c => c.id !== cp.id));
                                    toast.success('Call point removed');
                                  } catch (error: any) {
                                    console.error('Error removing call point:', error);
                                    toast.error('Failed to remove call point');
                                  }
                                }}
                                className="text-red-400 hover:text-red-500 p-1 rounded hover:bg-red-500/10 transition-colors"
                                title="Remove call point"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Add New Call Point */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                      <h3 className="text-md font-semibold text-white mb-3">Add New Call Point</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Call Point Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={newCallPoint.name}
                            onChange={(e) => setNewCallPoint({ ...newCallPoint, name: e.target.value })}
                            placeholder="e.g., Call Point 1 - Front Entrance"
                            className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Location (Optional)
                          </label>
                          <input
                            type="text"
                            value={newCallPoint.location}
                            onChange={(e) => setNewCallPoint({ ...newCallPoint, location: e.target.value })}
                            placeholder="e.g., Front Entrance, Kitchen, Bar Area"
                            className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!newCallPoint.name.trim()) {
                              toast.error('Please enter a call point name');
                              return;
                            }
                            
                            try {
                              const label = newCallPoint.location 
                                ? `${newCallPoint.name} - ${newCallPoint.location}`
                                : newCallPoint.name;
                              
                              const { data, error } = await supabase
                                .from('template_repeatable_labels')
                                .insert({
                                  template_id: template.id,
                                  label: label,
                                  label_value: newCallPoint.location || label,
                                  is_default: false,
                                  display_order: callPoints.length + 1
                                })
                                .select()
                                .single();
                              
                              if (error) throw error;
                              
                              setCallPoints([...callPoints, {
                                id: data.id,
                                label: data.label,
                                location: data.label_value || ''
                              }]);
                              
                              setNewCallPoint({ name: '', location: '' });
                              toast.success('Call point added successfully');
                            } catch (error: any) {
                              console.error('Error adding call point:', error);
                              toast.error(error.message || 'Failed to add call point');
                            }
                          }}
                          disabled={!newCallPoint.name.trim()}
                          className="px-4 py-2 bg-transparent border border-[#D37E91] text-[#D37E91] hover:shadow-[0_0_12px_rgba(211,126,145,0.7)] rounded transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/40"
                        >
                          Add Call Point
                        </button>
                        <p className="text-xs text-gray-400">
                          Add all fire alarm call points for this venue. These will appear in the dropdown when creating tasks from this template.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Feature-specific input fields - ONLY show if feature is enabled */}
            {enabledFeatures.checklist && (
              <ChecklistFeature
                items={formData.checklistItems}
                defaultItems={template?.recurrence_pattern?.default_checklist_items || []}
                onChange={(items) => setFormData({ ...formData, checklistItems: items })}
              />
            )}

            {enabledFeatures.yesNoChecklist && (
              <YesNoChecklistFeature
                items={formData.yesNoChecklistItems}
                onChange={(items) => setFormData({ ...formData, yesNoChecklistItems: items })}
                onMonitorCallout={handleMonitorCallout}
                contractorType={template?.contractor_type}
              />
            )}

            {enabledFeatures.tempLogs && (() => {
              const thresholds = getTemperatureThresholds();
              return (
                <TemperatureLoggingFeature
                  temperatures={formData.temperatures}
                  selectedAssets={formData.selectedAssets}
                  assets={assets}
                  onChange={(temps) => setFormData({ ...formData, temperatures: temps })}
                  onMonitorCallout={handleMonitorCallout}
                  contractorType={template?.contractor_type}
                  warnThreshold={thresholds.warnThreshold}
                  failThreshold={thresholds.failThreshold}
                  isTemplateMode={true}
                />
              );
            })()}

            {enabledFeatures.passFail && (
              <PassFailFeature
                status={formData.passFailStatus}
                onChange={(status) => setFormData({ ...formData, passFailStatus: status })}
                onMonitorCallout={handleMonitorCallout}
                contractorType={template?.contractor_type}
              />
            )}

            {enabledFeatures.photoEvidence && (
              <PhotoEvidenceFeature
                photos={formData.photos}
                onUpload={handlePhotoUpload}
                onRemove={(index) => {
                  const newPhotos = formData.photos.filter((_, i) => i !== index);
                  setFormData({ ...formData, photos: newPhotos });
                }}
              />
            )}

            {enabledFeatures.requiresSOP && (
              <div className="border-t border-gray-200 dark:border-white/10 pt-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">SOP Upload</h2>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleSOPUpload}
                      className="hidden"
                      id="sop-upload"
                    />
                    <span className="inline-block px-4 py-2 bg-[#D37E91]/10 dark:bg-transparent border border-[#D37E91] dark:border-[#D37E91] text-[#D37E91] dark:text-[#D37E91] hover:bg-[#D37E91]/10 dark:hover:shadow-[0_0_12px_rgba(211,126,145,0.7)] rounded-lg transition-all duration-200 cursor-pointer font-medium">
                      Upload SOP Document
                    </span>
                  </label>
                  {formData.sopUploads.length > 0 && (
                    <div className="space-y-2">
                      {formData.sopUploads.map((sop, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-gray-900 dark:text-white text-sm">{sop.fileName}</span>
                            <span className="text-gray-500 dark:text-gray-400 text-xs">({formatFileSize(sop.fileSize)})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={sop.url} target="_blank" rel="noopener noreferrer" className="text-[#D37E91] dark:text-[#D37E91] hover:text-[#D37E91] dark:hover:text-[#D37E91] text-sm font-medium">
                              View
                            </a>
                            <button
                              type="button"
                              onClick={() => removeUpload('sop', index)}
                              className="px-3 py-1 text-red-400 hover:bg-red-500/10 rounded"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {enabledFeatures.requiresRiskAssessment && (
              <div className="border-t border-gray-200 dark:border-white/10 pt-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Risk Assessment Upload</h2>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleRAUpload}
                      className="hidden"
                      id="ra-upload"
                    />
                    <span className="inline-block px-4 py-2 bg-white dark:bg-transparent border border-[#D37E91] dark:border-[#D37E91] text-[#D37E91] dark:text-[#D37E91] hover:bg-[#D37E91]/10 dark:hover:shadow-[0_0_12px_rgba(211,126,145,0.7)] rounded transition-all duration-200 cursor-pointer font-medium">
                      Upload Risk Assessment
                    </span>
                  </label>
                  {formData.raUploads.length > 0 && (
                    <div className="space-y-2">
                      {formData.raUploads.map((ra, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-gray-900 dark:text-white text-sm">{ra.fileName}</span>
                            <span className="text-gray-500 dark:text-gray-400 text-xs">({formatFileSize(ra.fileSize)})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={ra.url} target="_blank" rel="noopener noreferrer" className="text-[#D37E91] dark:text-[#D37E91] hover:text-[#D37E91] dark:hover:text-[#D37E91] text-sm font-medium">
                              View
                            </a>
                            <button
                              type="button"
                              onClick={() => removeUpload('ra', index)}
                              className="px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Document Upload Feature - Only show if enabled in template features */}
            {enabledFeatures.documentUpload && (
              <div className="border-t border-gray-200 dark:border-white/10 pt-6">
                <DocumentUploadFeature
                  uploads={formData.documentUploads}
                  onUpload={(uploads) => setFormData({ ...formData, documentUploads: uploads })}
                  onRemove={(index) => {
                    const newUploads = formData.documentUploads.filter((_, i) => i !== index);
                    setFormData({ ...formData, documentUploads: newUploads });
                  }}
                  label="Supporting Documents"
                  helpText={template?.requires_risk_assessment 
                    ? "Upload service certificates, contractor qualifications, or compliance documents"
                    : "Upload any supporting documents for this task (PDF, DOC, XLS, etc.)"}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                  maxFiles={10}
                  maxFileSize={10 * 1024 * 1024}
                />
              </div>
            )}

            {/* Library Selections - Only show if enabled in template features */}
            {enabledFeatures.libraryDropdown && (
            <div className="border-t border-white/10 pt-6">
              <h2 className="text-lg font-semibold text-white mb-4">Library Selections</h2>
              
              {/* Step 1: Select a library type */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-sm font-medium text-white">Select a Library</label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (companyId) {
                        try {
                          console.log('🔄 Refreshing library data...');
                          await loadLibraryData();
                          await loadAssets();
                          console.log('✅ Library data refreshed successfully');
                          toast.success('Library data refreshed');
                        } catch (error) {
                          console.error('❌ Error refreshing library data:', error);
                          toast.error('Failed to refresh library data');
                        }
                      } else {
                        toast.error('Company ID not available');
                      }
                    }}
                    className="px-3 py-1 text-xs text-[#D37E91] hover:text-[#D37E91] border border-[#D37E91]/30 rounded hover:bg-[#D37E91]/15 transition-colors"
                    title="Refresh library data from database"
                  >
                    Refresh
                  </button>
                </div>
                <select
                  value={selectedLibraryType}
                  onChange={(e) => {
                    setSelectedLibraryType(e.target.value);
                    setTempLibrarySelection([]); // Reset temp selection when changing library
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                >
                  <option value="">-- Select a library --</option>
                  {libraryData.ppe.length > 0 && <option value="ppe">PPE Library</option>}
                  {libraryData.chemicals.length > 0 && <option value="chemicals">Chemicals Library</option>}
                  {libraryData.equipment.length > 0 && <option value="equipment">Equipment Library ({libraryData.equipment.length} items)</option>}
                  {libraryData.ingredients.length > 0 && <option value="ingredients">Ingredients Library</option>}
                  {libraryData.drinks.length > 0 && <option value="drinks">Drinks Library</option>}
                  {libraryData.disposables.length > 0 && <option value="disposables">Disposables Library</option>}
                </select>

              {/* Step 2: Select items from the chosen library */}
              {selectedLibraryType && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                  <h3 className="text-md font-semibold text-white mb-3 capitalize">
                    Select Items from {selectedLibraryType.replace('_', ' ')} Library
                  </h3>
                  
                  {(() => {
                    const libraryItems = 
                      selectedLibraryType === 'ppe' ? libraryData.ppe :
                      selectedLibraryType === 'chemicals' ? libraryData.chemicals :
                      selectedLibraryType === 'equipment' ? libraryData.equipment :
                      selectedLibraryType === 'ingredients' ? libraryData.ingredients :
                      selectedLibraryType === 'drinks' ? libraryData.drinks :
                      selectedLibraryType === 'disposables' ? libraryData.disposables : [];
                    
                    const getItemName = (item: any) => {
                      if (selectedLibraryType === 'ppe') return item.item_name;
                      if (selectedLibraryType === 'chemicals') return item.product_name;
                      if (selectedLibraryType === 'equipment') return item.equipment_name;
                      if (selectedLibraryType === 'ingredients') return item.ingredient_name;
                      if (selectedLibraryType === 'drinks') return item.item_name;
                      if (selectedLibraryType === 'disposables') return item.item_name;
                      return '';
                    };

                    return (
                      <>
                        <div className="max-h-[300px] overflow-y-auto border border-gray-200 dark:border-white/[0.1] rounded-lg bg-gray-50 dark:bg-white/[0.05] p-3">
                          <div className="space-y-2">
                            {libraryItems.map((item) => {
                              const itemId = item.id;
                              const isSelected = tempLibrarySelection.includes(itemId);
                              return (
                                <label
                                  key={itemId}
                                  className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setTempLibrarySelection([...tempLibrarySelection, itemId]);
                                      } else {
                                        setTempLibrarySelection(tempLibrarySelection.filter(id => id !== itemId));
                                      }
                                    }}
                                    className="w-4 h-4 accent-[#D37E91] cursor-pointer"
                                  />
                                  <span className="text-white text-sm flex-1">{getItemName(item)}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        {libraryItems.length === 0 && (
                          <p className="text-xs text-gray-400 mt-1 mb-3">No items available in this library</p>
                        )}
                        {libraryItems.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1 mb-3">
                            {tempLibrarySelection.length} item(s) selected
                          </p>
                        )}
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              // Save selected items to formData
                              setFormData(prev => ({
                                ...prev,
                                selectedLibraries: {
                                  ...prev.selectedLibraries,
                                  [selectedLibraryType]: tempLibrarySelection
                                }
                              }));
                              // Reset selection UI
                              setSelectedLibraryType('');
                              setTempLibrarySelection([]);
                              toast.success(`Added ${tempLibrarySelection.length} item(s) from ${selectedLibraryType.replace('_', ' ')} library`);
                            }}
                            disabled={tempLibrarySelection.length === 0}
                            className="px-4 py-2 bg-transparent border border-[#D37E91] text-[#D37E91] hover:shadow-[0_0_12px_rgba(211,126,145,0.7)] rounded transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/40"
                          >
                            Add to Task
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLibraryType('');
                              setTempLibrarySelection([]);
                            }}
                            className="px-4 py-2 border border-white/10 rounded text-gray-300 hover:bg-white/10 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Step 3: Show selected items summary */}
              {(formData.selectedLibraries.ppe.length > 0 || 
                  formData.selectedLibraries.chemicals.length > 0 || 
                  formData.selectedLibraries.equipment.length > 0 ||
                  formData.selectedLibraries.ingredients.length > 0 ||
                  formData.selectedLibraries.drinks.length > 0 ||
                  formData.selectedLibraries.disposables.length > 0) && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                  <h3 className="text-md font-semibold text-white mb-3">Selected Library Items</h3>
                  <div className="space-y-3">
                    {formData.selectedLibraries.ppe.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-white">PPE Library ({formData.selectedLibraries.ppe.length} items)</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLibraryType('ppe');
                              setTempLibrarySelection(formData.selectedLibraries.ppe); // Pre-populate with current selections
                            }}
                            className="text-[#D37E91] hover:text-[#D37E91] p-1 rounded hover:bg-white/5"
                            title="Edit PPE Library selection"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          {formData.selectedLibraries.ppe.map((itemId) => {
                            const item = libraryData.ppe.find(i => i.id === itemId);
                            if (!item) return null;
                            return (
                              <div key={itemId} className="flex items-center justify-between bg-white/[0.03] rounded p-2">
                                <span className="text-white text-sm">{item.item_name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      selectedLibraries: {
                                        ...prev.selectedLibraries,
                                        ppe: prev.selectedLibraries.ppe.filter(id => id !== itemId)
                                      }
                                    }));
                                  }}
                                  className="text-red-400 hover:text-red-500 p-1 rounded hover:bg-red-500/10 transition-colors"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                      
                    {formData.selectedLibraries.chemicals.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-white">Chemicals Library ({formData.selectedLibraries.chemicals.length} items)</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLibraryType('chemicals');
                              setTempLibrarySelection(formData.selectedLibraries.chemicals); // Pre-populate with current selections
                            }}
                            className="text-[#D37E91] hover:text-[#D37E91] p-1 rounded hover:bg-white/5"
                            title="Edit Chemicals Library selection"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          {formData.selectedLibraries.chemicals.map((itemId) => {
                            const item = libraryData.chemicals.find(i => i.id === itemId);
                            if (!item) return null;
                            return (
                              <div key={itemId} className="flex items-center justify-between bg-white/[0.03] rounded p-2">
                                <span className="text-white text-sm">{item.product_name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      selectedLibraries: {
                                        ...prev.selectedLibraries,
                                        chemicals: prev.selectedLibraries.chemicals.filter(id => id !== itemId)
                                      }
                                    }));
                                  }}
                                  className="text-red-400 hover:text-red-500 p-1 rounded hover:bg-red-500/10 transition-colors"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                      
                    {formData.selectedLibraries.equipment.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-white">Equipment Library ({formData.selectedLibraries.equipment.length} items)</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLibraryType('equipment');
                              setTempLibrarySelection(formData.selectedLibraries.equipment); // Pre-populate with current selections
                            }}
                            className="text-[#D37E91] hover:text-[#D37E91] p-1 rounded hover:bg-white/5"
                            title="Edit Equipment Library selection"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          {formData.selectedLibraries.equipment.map((itemId) => {
                            const item = libraryData.equipment.find(i => i.id === itemId);
                            if (!item) return null;
                            return (
                              <div key={itemId} className="flex items-center justify-between bg-white/[0.03] rounded p-2">
                                <span className="text-white text-sm">{item.equipment_name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      selectedLibraries: {
                                        ...prev.selectedLibraries,
                                        equipment: prev.selectedLibraries.equipment.filter(id => id !== itemId)
                                      }
                                    }));
                                  }}
                                  className="text-red-400 hover:text-red-300 text-xs"
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                      
                    {formData.selectedLibraries.ingredients.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-white">Ingredients Library ({formData.selectedLibraries.ingredients.length} items)</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLibraryType('ingredients');
                              setTempLibrarySelection(formData.selectedLibraries.ingredients); // Pre-populate with current selections
                            }}
                            className="text-[#D37E91] hover:text-[#D37E91] p-1 rounded hover:bg-white/5"
                            title="Edit Ingredients Library selection"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          {formData.selectedLibraries.ingredients.map((itemId) => {
                            const item = libraryData.ingredients.find(i => i.id === itemId);
                            if (!item) return null;
                            return (
                              <div key={itemId} className="flex items-center justify-between bg-white/[0.03] rounded p-2">
                                <span className="text-white text-sm">{item.ingredient_name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      selectedLibraries: {
                                        ...prev.selectedLibraries,
                                        ingredients: prev.selectedLibraries.ingredients.filter(id => id !== itemId)
                                      }
                                    }));
                                  }}
                                  className="text-red-400 hover:text-red-300 text-xs"
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                      
                    {formData.selectedLibraries.drinks.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-white">Drinks Library ({formData.selectedLibraries.drinks.length} items)</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLibraryType('drinks');
                              setTempLibrarySelection(formData.selectedLibraries.drinks); // Pre-populate with current selections
                            }}
                            className="text-[#D37E91] hover:text-[#D37E91] p-1 rounded hover:bg-white/5"
                            title="Edit Drinks Library selection"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          {formData.selectedLibraries.drinks.map((itemId) => {
                            const item = libraryData.drinks.find(i => i.id === itemId);
                            if (!item) return null;
                            return (
                              <div key={itemId} className="flex items-center justify-between bg-white/[0.03] rounded p-2">
                                <span className="text-white text-sm">{item.item_name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      selectedLibraries: {
                                        ...prev.selectedLibraries,
                                        drinks: prev.selectedLibraries.drinks.filter(id => id !== itemId)
                                      }
                                    }));
                                  }}
                                  className="text-red-400 hover:text-red-300 text-xs"
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                      
                    {formData.selectedLibraries.disposables.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-white">Disposables Library ({formData.selectedLibraries.disposables.length} items)</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLibraryType('disposables');
                              setTempLibrarySelection(formData.selectedLibraries.disposables); // Pre-populate with current selections
                            }}
                            className="text-[#D37E91] hover:text-[#D37E91] p-1 rounded hover:bg-white/5"
                            title="Edit Disposables Library selection"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          {formData.selectedLibraries.disposables.map((itemId) => {
                            const item = libraryData.disposables.find(i => i.id === itemId);
                            if (!item) return null;
                            return (
                              <div key={itemId} className="flex items-center justify-between bg-white/[0.03] rounded p-2">
                                <span className="text-white text-sm">{item.item_name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      selectedLibraries: {
                                        ...prev.selectedLibraries,
                                        disposables: prev.selectedLibraries.disposables.filter(id => id !== itemId)
                                      }
                                    }));
                                  }}
                                  className="text-red-400 hover:text-red-300 text-xs"
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* General Notes */}
            <div className="border-t border-white/10 pt-6">
              <label className="block text-sm font-medium text-white mb-2">Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes for this task..."
                rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#D37E91] hover:bg-[#D37E91] text-white rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {saving 
                ? (existingTask || existingSiteChecklist ? 'Saving...' : 'Creating...') 
                : (existingTask || existingSiteChecklist ? (existingSiteChecklist ? 'Save Configuration' : 'Update Task') : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

