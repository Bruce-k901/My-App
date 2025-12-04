"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, Loader2, Plus, X, ChevronDown, ChevronUp, Copy, Edit2, Save, Zap, TrendingUp, Award, Sparkles } from "lucide-react";
import { Button, Input } from "@/components/ui";
import GlassCard from "@/components/ui/GlassCard";
import { toast } from "sonner";

interface Addon {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price: number;
  price_type: 'one_time' | 'monthly' | 'per_site_one_time' | 'per_site_monthly';
  category: string;
  features: string[];
  hardware_cost?: number | null;
  monthly_management_cost?: number | null;
}

interface PurchasedAddon {
  id: string;
  addon_id: string;
  addon: Addon;
  quantity: number;
  total_price: number;
  status: 'active' | 'cancelled' | 'expired';
}

interface AddonsSelectionProps {
  companyId: string;
  siteCount: number;
  onAddonChanged?: () => void;
}

// Helper function to get active site count
// Note: archived column may not exist in sites table
async function getActiveSiteCount(companyId: string): Promise<number> {
  const { count } = await supabase
    .from('sites')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);
  
  return count || 0;
}

export default function AddonsSelection({
  companyId,
  siteCount: initialSiteCount,
  onAddonChanged,
}: AddonsSelectionProps) {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [purchasedAddons, setPurchasedAddons] = useState<PurchasedAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [siteCount, setSiteCount] = useState(initialSiteCount);
  
  // Quantity inputs - per-site configuration
  // Format: {addonId: {siteId1: quantity, siteId2: quantity}}
  const [sensorQuantities, setSensorQuantities] = useState<Record<string, Record<string, number>>>({});
  const [tagQuantities, setTagQuantities] = useState<Record<string, Record<string, number>>>({});
  const [sites, setSites] = useState<Array<{id: string; name: string}>>([]);
  // Track which addon's site quantity section is expanded
  const [expandedSites, setExpandedSites] = useState<Record<string, boolean>>({});
  // Track which purchased addon is being edited
  const [editingPurchase, setEditingPurchase] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    
    // Set up real-time subscription to sites table for dynamic site count updates
    const sitesChannel = supabase
      .channel('addons-sites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sites',
          filter: `company_id=eq.${companyId}`,
        },
        async () => {
          // Refresh active site count when sites change
          const activeCount = await getActiveSiteCount(companyId);
          setSiteCount(activeCount);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sitesChannel);
    };
  }, [companyId]);

  // Update site count when prop changes
  useEffect(() => {
    setSiteCount(initialSiteCount);
  }, [initialSiteCount]);

  async function loadData() {
    try {
      // Load sites for per-site quantity configuration
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name');
      
      if (!sitesError && sitesData) {
        setSites(sitesData);
      }
      // Load available addons (including monthly_management_cost and hardware_cost)
      const { data: addonsData, error: addonsError } = await supabase
        .from('subscription_addons')
        .select('*, monthly_management_cost, hardware_cost')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });

      if (addonsError) throw addonsError;

      const addonsWithFeatures = (addonsData || []).map(addon => ({
        ...addon,
        features: Array.isArray(addon.features) ? addon.features : [],
        // Ensure monthly_management_cost and hardware_cost are parsed as numbers
        monthly_management_cost: addon.monthly_management_cost ? parseFloat(addon.monthly_management_cost) : null,
        hardware_cost: addon.hardware_cost ? parseFloat(addon.hardware_cost) : null,
      }));

      setAddons(addonsWithFeatures);

      // Load purchased addons
      const { data: purchasedData, error: purchasedError } = await supabase
        .from('company_addon_purchases')
        .select(`
          *,
          addon:subscription_addons(*)
        `)
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (purchasedError) throw purchasedError;

      const purchasedWithAddons = (purchasedData || []).map((p: any) => ({
        ...p,
        addon: {
          ...p.addon,
          features: Array.isArray(p.addon?.features) ? p.addon.features : [],
        },
      }));

      setPurchasedAddons(purchasedWithAddons || []);
      
      // Load per-site quantities from company_addon_site_quantities
      const purchasedIds = purchasedWithAddons.map((p: any) => p.id);
      let siteQuantitiesMap: Record<string, Record<string, number>> = {};
      
      if (purchasedIds.length > 0) {
        const { data: siteQuantitiesData } = await supabase
          .from('company_addon_site_quantities')
          .select('company_addon_purchase_id, site_id, quantity')
          .in('company_addon_purchase_id', purchasedIds);
        
        // Build map: {purchaseId: {siteId: quantity}}
        siteQuantitiesMap = {};
        purchasedWithAddons.forEach((p: any) => {
          const siteQty: Record<string, number> = {};
          siteQuantitiesData?.filter(sq => sq.company_addon_purchase_id === p.id).forEach(sq => {
            siteQty[sq.site_id] = sq.quantity;
          });
          if (Object.keys(siteQty).length > 0) {
            siteQuantitiesMap[p.id] = siteQty;
          }
        });
      }
      
      // Set quantities from purchased addons
      // Format: {addonId: {siteId: quantity}}
      const sensorQtyMap: Record<string, Record<string, number>> = {};
      const tagQtyMap: Record<string, Record<string, number>> = {};
      
      purchasedWithAddons.forEach((p: any) => {
        const perSiteQty = siteQuantitiesMap[p.id] || {};
        
        if (p.addon?.name?.startsWith('smart_sensor_pack_')) {
          // Hardware packs don't need per-site quantities
        } else if (p.addon?.name?.startsWith('smart_sensor_software_') || (p.addon?.name?.startsWith('smart_sensor_') && !p.addon?.name?.startsWith('smart_sensor_pack_'))) {
          // Software tiers don't need per-site quantities (they're per site automatically)
        } else if (p.addon?.name?.startsWith('maintenance_kit_') || p.addon?.name?.startsWith('asset_tags_pack_')) {
          // If no per-site quantities exist, initialize with quantity_per_site for all sites
          if (Object.keys(perSiteQty).length === 0 && sites.length > 0) {
            const defaultQty = p.quantity_per_site || p.quantity || 1;
            const defaultMap: Record<string, number> = {};
            sites.forEach(site => {
              defaultMap[site.id] = defaultQty;
            });
            tagQtyMap[p.addon_id] = defaultMap;
          } else {
            tagQtyMap[p.addon_id] = perSiteQty;
          }
        }
      });
      
      setSensorQuantities(sensorQtyMap);
      setTagQuantities(tagQtyMap);
    } catch (error: any) {
      console.error('Error loading addons:', error);
      toast.error('Failed to load addons');
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchaseAddon(addonId: string, addonName: string, quantity: number = 1) {
    if (purchasing) return;

    // Get per-site quantities from state if it's a tiered addon
    let perSiteQuantities: Record<string, number> | null = null;
    let averageQuantity = quantity;
    
    if (addonName.startsWith('smart_sensor_pack_')) {
      // Hardware packs are fixed price, no per-site quantities needed
      perSiteQuantities = null;
      averageQuantity = 1;
    } else if (addonName.startsWith('smart_sensor_software_') || (addonName.startsWith('smart_sensor_') && !addonName.startsWith('smart_sensor_pack_'))) {
      // Software tiers are monthly per site, no per-site quantities needed (they're per site automatically)
      perSiteQuantities = null;
      averageQuantity = 1;
    } else if (addonName.startsWith('maintenance_kit_') || addonName.startsWith('asset_tags_pack_')) {
      perSiteQuantities = tagQuantities[addonId] || {};
      // Calculate average quantity for backwards compatibility
      const siteQtyValues = Object.values(perSiteQuantities).filter(q => q > 0);
      if (siteQtyValues.length > 0) {
        averageQuantity = Math.round(siteQtyValues.reduce((a, b) => a + b, 0) / siteQtyValues.length);
      }
      if (averageQuantity < 1) {
        toast.error('Please enter at least 1 tag for at least one site');
        return;
      }
    }
    
    const finalQuantity = averageQuantity;

    setPurchasing(addonId);
    try {
      const response = await fetch('/api/billing/purchase-addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          addon_id: addonId,
          quantity: finalQuantity, // Average quantity for backwards compatibility
          per_site_quantities: perSiteQuantities, // Per-site quantities: {siteId: quantity}
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to purchase addon');
      }

      toast.success('Add-on added to your plan');
      onAddonChanged?.();
      await loadData(); // Reload to show new purchase
    } catch (error: any) {
      console.error('Error purchasing addon:', error);
      toast.error(error.message || 'Failed to purchase addon');
    } finally {
      setPurchasing(null);
    }
  }

  async function handleCancelAddon(purchaseId: string) {
    if (!confirm('Are you sure you want to cancel this add-on?')) return;

    try {
      const response = await fetch('/api/billing/cancel-addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_id: purchaseId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel addon');
      }

      toast.success('Add-on cancelled');
      setEditingPurchase(null);
      onAddonChanged?.();
      await loadData(); // Reload to update list
    } catch (error: any) {
      console.error('Error cancelling addon:', error);
      toast.error(error.message || 'Failed to cancel addon');
    }
  }

  async function handleEditAddon(purchase: PurchasedAddon) {
    // Load existing quantities for this purchase
    const { data: siteQuantities } = await supabase
      .from('company_addon_site_quantities')
      .select('*')
      .eq('company_addon_purchase_id', purchase.id);

    if (purchase.addon.name?.startsWith('smart_sensor_')) {
      // Initialize sensor quantities from existing data
      const quantities: Record<string, number> = {};
      siteQuantities?.forEach(sq => {
        quantities[sq.site_id] = sq.quantity;
      });
      // If no per-site quantities exist, use average quantity per site
      if (Object.keys(quantities).length === 0 && purchase.quantity && sites.length > 0) {
        sites.forEach(site => {
          quantities[site.id] = purchase.quantity;
        });
      }
      setSensorQuantities(prev => ({ ...prev, [purchase.addon_id]: quantities }));
      setExpandedSites(prev => ({ ...prev, [purchase.addon_id]: true }));
    } else if (purchase.addon.name?.startsWith('maintenance_kit_')) {
      // Initialize tag quantities from existing data
      const quantities: Record<string, number> = {};
      siteQuantities?.forEach(sq => {
        quantities[sq.site_id] = sq.quantity;
      });
      // If no per-site quantities exist, use average quantity per site
      if (Object.keys(quantities).length === 0 && purchase.quantity && sites.length > 0) {
        sites.forEach(site => {
          quantities[site.id] = purchase.quantity;
        });
      }
      setTagQuantities(prev => ({ ...prev, [purchase.addon_id]: quantities }));
      setExpandedSites(prev => ({ ...prev, [purchase.addon_id]: true }));
    }

    // Set editing mode and scroll to the addon card
    setEditingPurchase(purchase.addon_id);
    setTimeout(() => {
      const element = document.getElementById(`addon-${purchase.addon_id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  async function handleUpdateAddon(purchaseId: string, addonId: string, addonName: string) {
    if (purchasing) return;

    // Get per-site quantities
    let perSiteQuantities: Record<string, number> | null = null;
    let averageQuantity = 1;
    
    if (addonName.startsWith('smart_sensor_')) {
      perSiteQuantities = sensorQuantities[addonId] || {};
      const siteQtyValues = Object.values(perSiteQuantities).filter(q => q > 0);
      if (siteQtyValues.length > 0) {
        averageQuantity = Math.round(siteQtyValues.reduce((a, b) => a + b, 0) / siteQtyValues.length);
      }
      if (averageQuantity < 1) {
        toast.error('Please enter at least 1 sensor for at least one site');
        return;
      }
    } else if (addonName.startsWith('maintenance_kit_') || addonName.startsWith('asset_tags_pack_')) {
      perSiteQuantities = tagQuantities[addonId] || {};
      const siteQtyValues = Object.values(perSiteQuantities).filter(q => q > 0);
      if (siteQtyValues.length > 0) {
        averageQuantity = Math.round(siteQtyValues.reduce((a, b) => a + b, 0) / siteQtyValues.length);
      }
      if (averageQuantity < 1) {
        toast.error('Please enter at least 1 tag for at least one site');
        return;
      }
    }

    setPurchasing(addonId);
    try {
      // Cancel the old purchase and create a new one with updated quantities
      const cancelResponse = await fetch('/api/billing/cancel-addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase_id: purchaseId }),
      });

      if (!cancelResponse.ok) {
        throw new Error('Failed to cancel existing purchase');
      }

      // Create new purchase with updated quantities
      const response = await fetch('/api/billing/purchase-addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          addon_id: addonId,
          quantity: averageQuantity,
          per_site_quantities: perSiteQuantities,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update addon');
      }

      toast.success('Add-on updated successfully');
      setEditingPurchase(null);
      onAddonChanged?.();
      await loadData();
    } catch (error: any) {
      console.error('Error updating addon:', error);
      toast.error(error.message || 'Failed to update addon');
    } finally {
      setPurchasing(null);
    }
  }

  function getHardwareCost(addon: Addon, perSiteQuantities?: Record<string, number>): number {
    if (!addon.hardware_cost) return 0;
    
    // If per-site quantities provided, sum them up
    if (perSiteQuantities && typeof perSiteQuantities === 'object') {
      const totalQuantity = Object.values(perSiteQuantities).reduce((sum, qty) => sum + (qty || 0), 0);
      return addon.hardware_cost * totalQuantity;
    }
    
    // Fallback: use site count (backwards compatibility)
    return addon.hardware_cost * siteCount;
  }

  function getMonthlyManagementCost(addon: Addon): number {
    if (!addon.monthly_management_cost) return 0;
    // Monthly management cost is per site (not per sensor/tag)
    // Use siteCount if available, otherwise use sites.length, otherwise default to 1 for display
    const activeSiteCount = siteCount > 0 ? siteCount : (sites.length > 0 ? sites.length : 1);
    return parseFloat(addon.monthly_management_cost.toString()) * activeSiteCount;
  }

  function getTotalOneTimeCost(addon: Addon, perSiteQuantities?: Record<string, number>): number {
    // Onboarding is a special case - total price, not per site
    if (addon.name === 'personalized_onboarding') {
      return 1200.00;
    }

    // For Smart Sensors and Maintenance Kits, hardware cost is the one-time cost
    return getHardwareCost(addon, perSiteQuantities);
  }

  function getTotalMonthlyCost(addon: Addon): number {
    // Monthly management cost (only for Smart Sensors)
    return getMonthlyManagementCost(addon);
  }

  function getAddonPrice(addon: Addon, perSiteQuantities?: Record<string, number>): string {
    // Onboarding is a special case - total price
    if (addon.name === 'personalized_onboarding') {
      return `£1200.00`;
    }

    // For Smart Sensors: show both hardware (one-time) and monthly management
    if (addon.name.startsWith('smart_sensor_')) {
      const hardwareCost = getHardwareCost(addon, perSiteQuantities);
      // Calculate monthly cost: monthly_management_cost per site
      // Use siteCount if available, otherwise use sites.length, otherwise default to 1 for display
      const activeSiteCount = siteCount > 0 ? siteCount : (sites.length > 0 ? sites.length : 1);
      const monthlyManagementCost = addon.monthly_management_cost ? parseFloat(addon.monthly_management_cost.toString()) : 0;
      const monthlyCost = monthlyManagementCost > 0 ? monthlyManagementCost * activeSiteCount : 0;
      return `£${hardwareCost.toFixed(2)} + £${monthlyCost.toFixed(2)}/mo`;
    }

    // For Asset Tag Packs: hardware cost only (one-time)
    if (addon.name.startsWith('maintenance_kit_') || addon.name.startsWith('asset_tags_pack_')) {
      const hardwareCost = getHardwareCost(addon, perSiteQuantities);
      return `£${hardwareCost.toFixed(2)}`;
    }

    // For Asset Tags Software Tiers: monthly management cost only
    if (addon.name.startsWith('asset_tags_software_')) {
      const monthlyCost = getMonthlyManagementCost(addon);
      return `£${monthlyCost.toFixed(2)}/mo`;
    }

    // Other addons (white-label reports, etc.)
    if (addon.price_type === 'monthly') {
      return `£${addon.price.toFixed(2)}/month`;
    }
    
    return `£${addon.price.toFixed(2)}`;
  }

  function getAddonPriceDescription(addon: Addon, perSiteQuantities?: Record<string, number>): string {
    // Onboarding is total price
    if (addon.name === 'personalized_onboarding') {
      return 'total (one-time)';
    }

    // Calculate total quantity from per-site quantities
    const totalQuantity = perSiteQuantities && typeof perSiteQuantities === 'object'
      ? Object.values(perSiteQuantities).reduce((sum, qty) => sum + (qty || 0), 0)
      : 0;
    const sitesWithQuantity = perSiteQuantities && typeof perSiteQuantities === 'object'
      ? Object.values(perSiteQuantities).filter(qty => qty > 0).length
      : siteCount;

    // Smart Sensors: breakdown of hardware + monthly management
    if (addon.name.startsWith('smart_sensor_') && addon.hardware_cost && addon.monthly_management_cost) {
      const activeSiteCount = siteCount > 0 ? siteCount : (sites.length > 0 ? sites.length : 1);
      return `Hardware: £${addon.hardware_cost.toFixed(2)}/sensor × ${totalQuantity} total sensors (across ${sitesWithQuantity} sites) = £${getHardwareCost(addon, perSiteQuantities).toFixed(2)} one-time\nManagement: £${addon.monthly_management_cost.toFixed(2)}/site/month × ${activeSiteCount} sites = £${getMonthlyManagementCost(addon).toFixed(2)}/month`;
    }

    // Maintenance Kits / Asset Tag Packs: hardware cost only
    if ((addon.name.startsWith('maintenance_kit_') || addon.name.startsWith('asset_tags_pack_')) && addon.hardware_cost) {
      return `£${addon.hardware_cost.toFixed(2)} one-time`;
    }

    // Asset Tags Software Tiers: monthly per site
    if (addon.name.startsWith('asset_tags_software_') && addon.monthly_management_cost) {
      const activeSiteCount = siteCount > 0 ? siteCount : (sites.length > 0 ? sites.length : 1);
      return `£${addon.monthly_management_cost.toFixed(2)}/site/month × ${activeSiteCount} sites = £${getMonthlyManagementCost(addon).toFixed(2)}/month`;
    }

    // Other addons
    if (addon.price_type === 'one_time') {
      return 'one-time';
    }
    if (addon.price_type === 'monthly') {
      return 'per month';
    }
    return '';
  }

  function getPricePerSite(addon: Addon, perSiteQuantities?: Record<string, number>): string {
    // Onboarding is total, not per site
    if (addon.name === 'personalized_onboarding') {
      return '';
    }

    // Smart Sensors: hardware per site + monthly management per site
    if (addon.name.startsWith('smart_sensor_') && addon.hardware_cost && addon.monthly_management_cost) {
      // Show average hardware per site if quantities vary
      if (perSiteQuantities && typeof perSiteQuantities === 'object') {
        const sitesWithQty = Object.values(perSiteQuantities).filter(qty => qty > 0).length;
        if (sitesWithQty > 0) {
          const totalQty = Object.values(perSiteQuantities).reduce((sum, qty) => sum + (qty || 0), 0);
          const avgQtyPerSite = totalQty / sitesWithQty;
          const avgHardwarePerSite = addon.hardware_cost * avgQtyPerSite;
          return `Avg. £${avgHardwarePerSite.toFixed(2)} hardware/site + £${addon.monthly_management_cost.toFixed(2)}/month per site`;
        }
      }
      return `£${addon.hardware_cost.toFixed(2)}/sensor + £${addon.monthly_management_cost.toFixed(2)}/month per site`;
    }

    // Asset Tag Packs: hardware per site
    if ((addon.name.startsWith('maintenance_kit_') || addon.name.startsWith('asset_tags_pack_')) && addon.hardware_cost) {
      // Show average hardware per site if quantities vary
      if (perSiteQuantities && typeof perSiteQuantities === 'object') {
        const sitesWithQty = Object.values(perSiteQuantities).filter(qty => qty > 0).length;
        if (sitesWithQty > 0) {
          const totalQty = Object.values(perSiteQuantities).reduce((sum, qty) => sum + (qty || 0), 0);
          const avgQtyPerSite = totalQty / sitesWithQty;
          const avgHardwarePerSite = addon.hardware_cost * avgQtyPerSite;
          return `Avg. £${avgHardwarePerSite.toFixed(2)} per site (one-time)`;
        }
      }
      return `£${addon.hardware_cost.toFixed(2)}/tag per site (one-time)`;
    }

    return '';
  }

  function isAddonPurchased(addonId: string): boolean {
    return purchasedAddons.some(p => p.addon_id === addonId && p.status === 'active');
  }

  function isAddonInTierGroup(addon: Addon): boolean {
    return addon.name.startsWith('smart_sensor_pack_') || 
           addon.name.startsWith('smart_sensor_software_') ||
           addon.name.startsWith('smart_sensor_') || // Backward compatibility
           addon.name.startsWith('maintenance_kit_') ||
           addon.name.startsWith('asset_tags_pack_') ||
           addon.name.startsWith('asset_tags_software_');
  }

  function getTierGroup(addon: Addon): string {
    if (addon.name.startsWith('smart_sensor_pack_')) {
      return 'smart_sensor_pack';
    }
    if (addon.name.startsWith('smart_sensor_software_')) {
      return 'smart_sensor_software';
    }
    if (addon.name.startsWith('smart_sensor_')) {
      // Backward compatibility - treat old smart_sensor_ as software tier
      return 'smart_sensor_software';
    }
    if (addon.name.startsWith('maintenance_kit_') || addon.name.startsWith('asset_tags_pack_')) {
      return 'asset_tags_pack';
    }
    if (addon.name.startsWith('asset_tags_software_')) {
      return 'asset_tags_software';
    }
    return '';
  }

  function hasTierPurchased(tierGroup: string): boolean {
    if (!tierGroup) return false;
    return purchasedAddons.some(p => {
      const addonName = p.addon?.name || '';
      return (tierGroup === 'smart_sensor_pack' && addonName.startsWith('smart_sensor_pack_')) ||
             (tierGroup === 'smart_sensor_software' && (addonName.startsWith('smart_sensor_software_') || addonName.startsWith('smart_sensor_'))) ||
             (tierGroup === 'asset_tags_pack' && (addonName.startsWith('maintenance_kit_') || addonName.startsWith('asset_tags_pack_'))) ||
             (tierGroup === 'asset_tags_software' && addonName.startsWith('asset_tags_software_'));
    });
  }

  function getPurchasedTierInGroup(tierGroup: string): string | null {
    if (!tierGroup) return null;
    const purchased = purchasedAddons.find(p => {
      const addonName = p.addon?.name || '';
      return (tierGroup === 'smart_sensor_pack' && addonName.startsWith('smart_sensor_pack_')) ||
             (tierGroup === 'smart_sensor_software' && (addonName.startsWith('smart_sensor_software_') || addonName.startsWith('smart_sensor_'))) ||
             (tierGroup === 'asset_tags_pack' && (addonName.startsWith('maintenance_kit_') || addonName.startsWith('asset_tags_pack_'))) ||
             (tierGroup === 'asset_tags_software' && addonName.startsWith('asset_tags_software_'));
    });
    return purchased?.addon_id || null;
  }

  const categories = ['all', ...new Set(addons.map(a => a.category))];
  const filteredAddons = selectedCategory === 'all' 
    ? addons 
    : addons.filter(a => a.category === selectedCategory);

  // Always get tiered addons regardless of category filter
  // Sort sensor hardware packs: starter, standard, professional
  const smartSensorPackAddons = addons
    .filter(a => a.name.startsWith('smart_sensor_pack_'))
    .sort((a, b) => {
      const tierOrder = { 'starter': 1, 'standard': 2, 'professional': 3 };
      const aTier = a.name.split('_').pop() || '';
      const bTier = b.name.split('_').pop() || '';
      return (tierOrder[aTier as keyof typeof tierOrder] || 99) - (tierOrder[bTier as keyof typeof tierOrder] || 99);
    });

  // Sort sensor software tiers: essential, professional, business
  const smartSensorSoftwareAddons = addons
    .filter(a => a.name.startsWith('smart_sensor_software_') || (a.name.startsWith('smart_sensor_') && !a.name.startsWith('smart_sensor_pack_')))
    .sort((a, b) => {
      const tierOrder = { 'essential': 1, 'professional': 2, 'business': 3, 'basic': 1, 'pro': 2, 'observatory': 3 };
      const aTier = a.name.split('_').pop() || '';
      const bTier = b.name.split('_').pop() || '';
      return (tierOrder[aTier as keyof typeof tierOrder] || 99) - (tierOrder[bTier as keyof typeof tierOrder] || 99);
    });
  
  // Sort asset tag pack tiers: starter, professional, premium (backward compatible with maintenance_kit_)
  const assetTagPackAddons = addons
    .filter(a => a.name.startsWith('maintenance_kit_') || a.name.startsWith('asset_tags_pack_'))
    .sort((a, b) => {
      const tierOrder = { 'basic': 1, 'starter': 1, 'pro': 2, 'professional': 2, 'observatory': 3, 'premium': 3 };
      const aTier = a.name.split('_').pop() || '';
      const bTier = b.name.split('_').pop() || '';
      return (tierOrder[aTier as keyof typeof tierOrder] || 99) - (tierOrder[bTier as keyof typeof tierOrder] || 99);
    });

  // Sort asset tags software tiers: essential, professional, business
  const assetTagsSoftwareAddons = addons
    .filter(a => a.name.startsWith('asset_tags_software_'))
    .sort((a, b) => {
      const tierOrder = { 'essential': 1, 'professional': 2, 'business': 3 };
      const aTier = a.name.split('_').pop() || '';
      const bTier = b.name.split('_').pop() || '';
      return (tierOrder[aTier as keyof typeof tierOrder] || 99) - (tierOrder[bTier as keyof typeof tierOrder] || 99);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#EC4899]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3">Add-ons & Offers</h2>
        <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-3xl">
          Enhance your plan with additional features and services. Choose one tier per category (Smart Sensors and Maintenance Kits).
        </p>
      </div>

      {/* Category Filter - only for non-tiered addons */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-shrink-0 ${
              selectedCategory === category
                ? 'bg-[#EC4899] text-white'
                : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1] border border-white/[0.1]'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Purchased Add-ons */}
      {purchasedAddons.length > 0 && (
        <div className="space-y-4 mb-10">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <h3 className="text-xl font-bold text-white">Your Active Add-ons</h3>
          </div>
          {purchasedAddons.map((purchase) => {
            const qtyPerSite = (purchase as any).quantity_per_site || purchase.quantity || 1;
            const hardwareTotal = (purchase as any).hardware_cost_total;
            // Get monthly recurring cost, or calculate it from monthly_management_cost if not stored
            let monthlyRecurring = (purchase as any).monthly_recurring_cost;
            if (!monthlyRecurring && purchase.addon?.monthly_management_cost && siteCount > 0) {
              monthlyRecurring = parseFloat(purchase.addon.monthly_management_cost) * siteCount;
            }
            
            return (
              <div
                key={purchase.id}
                className="bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-green-500/30 rounded-xl p-5 shadow-[0_0_20px_rgba(34,197,94,0.15)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white">{purchase.addon.display_name}</h4>
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full mt-1 inline-block">
                          Active
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-white/70 mb-4 ml-11">{purchase.addon.description}</p>
                    <div className="space-y-3 text-sm ml-11">
                      {hardwareTotal && (
                        <div className="bg-white/[0.08] rounded-lg p-3 border border-white/10">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-white/70">Hardware Cost (one-time)</span>
                            <span className="text-lg font-bold text-white">£{parseFloat(hardwareTotal.toString()).toFixed(2)}</span>
                          </div>
                          {(purchase.addon.name?.startsWith('smart_sensor_') || purchase.addon.name?.startsWith('maintenance_kit_') || purchase.addon.name?.startsWith('asset_tags_pack_')) && (
                            <p className="text-xs text-white/50 mt-1.5">
                              {qtyPerSite} {purchase.addon.name?.startsWith('smart_sensor_') ? 'sensors' : 'tags'}/site × {siteCount} sites
                            </p>
                          )}
                        </div>
                      )}
                      {monthlyRecurring && (
                        <div className="bg-white/[0.08] rounded-lg p-3 border border-white/10">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-white/70">Monthly Management</span>
                            <span className="text-lg font-bold text-[#EC4899]">£{parseFloat(monthlyRecurring.toString()).toFixed(2)}/month</span>
                          </div>
                          <p className="text-xs text-white/50 mt-1.5">
                            £{purchase.addon.monthly_management_cost?.toFixed(2) || '0.00'}/site/month × {siteCount} sites
                          </p>
                        </div>
                      )}
                      {!hardwareTotal && !monthlyRecurring && (
                        <div className="bg-white/[0.08] rounded-lg p-3 border border-white/10">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-white/70">Price</span>
                            <span className="text-lg font-bold text-white">£{purchase.total_price.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditAddon(purchase)}
                      className="border-[#EC4899]/50 text-[#EC4899] hover:bg-[#EC4899]/10 hover:shadow-[0_0_12px_rgba(236,72,153,0.3)] transition-all"
                    >
                      <Edit2 className="w-4 h-4 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelAddon(purchase.id)}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all"
                    >
                      <X className="w-4 h-4 mr-1.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Available Add-ons */}
      <div className="space-y-6">
        {/* Tiered Addons - Always Show These First */}
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-[#EC4899]/10 to-transparent border-l-4 border-[#EC4899] rounded-r-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-[#EC4899]" />
              <h3 className="text-2xl font-bold text-white">Smart Temperature Sensors</h3>
            </div>
            <p className="text-white/70 text-sm ml-7 mb-4">
              Plug-and-play temperature monitoring for fridges, freezers, and prep areas. Automatic logging, instant breach alerts, and EHO-ready compliance reports. Stop worrying about stock losses.
            </p>
            {/* How It Works - Combined */}
            <div className="ml-7 mt-4">
              <div className="bg-gradient-to-r from-[#EC4899]/10 to-blue-500/10 rounded-xl p-4 border border-[#EC4899]/20">
                <p className="text-sm font-semibold text-white mb-2 text-center">How It Works:</p>
                <p className="text-xs text-gray-300 text-center">
                  Choose <strong className="text-white">one hardware pack</strong> (physical sensors) + <strong className="text-white">one software tier</strong> (monitoring features). The hardware pack is a one-time purchase, and the software tier is billed monthly per site.
                </p>
              </div>
            </div>
          </div>

          {/* Sensor Hardware Packs - One-time purchase */}
          {smartSensorPackAddons.length > 0 && (
            <div className="mb-8">
              <div className="text-center mb-6">
                <h4 className="text-xl sm:text-2xl font-bold text-white mb-2">Step 1: Choose Your Hardware Pack</h4>
                <p className="text-white/60 text-sm">One-time purchase • Free replacement for faulty units within warranty period</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {smartSensorPackAddons.map((addon) => {
                  const isPurchased = addon.id === getPurchasedTierInGroup('smart_sensor_pack');
                  const isPurchasing = purchasing === addon.id;
                  const hasPurchased = hasTierPurchased('smart_sensor_pack');

                  const tierIcons = {
                    'starter': TrendingUp,
                    'standard': Sparkles,
                    'professional': Award,
                  };
                  const TierIcon = tierIcons[addon.name.split('_').pop() as keyof typeof tierIcons] || Zap;
                
                return (
                  <GlassCard
                    id={`addon-${addon.id}`}
                    key={addon.id}
                    className={`flex flex-col relative transition-all duration-300 ${
                      editingPurchase === addon.id
                        ? 'border-2 border-[#EC4899] shadow-[0_0_24px_rgba(236,72,153,0.5)] scale-[1.02]'
                        : isPurchased
                        ? 'border-2 border-green-500/60 shadow-[0_0_20px_rgba(34,197,94,0.4)] bg-gradient-to-br from-green-500/5 to-transparent'
                        : hasPurchased
                        ? 'opacity-60 border-white/20'
                        : 'border border-white/20 hover:border-[#EC4899]/60 hover:shadow-[0_0_20px_rgba(236,72,153,0.25)] hover:scale-[1.01] cursor-pointer'
                    }`}
                  >
                    {isPurchased && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-green-400 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </div>
                    )}
                    {addon.name.includes('standard') && !isPurchased && !hasPurchased && (
                      <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#EC4899] to-pink-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                        Most Popular
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2.5 rounded-xl ${
                          isPurchased ? 'bg-green-500/20' : 'bg-[#EC4899]/20'
                        }`}>
                          <TierIcon className={`w-5 h-5 ${
                            isPurchased ? 'text-green-400' : 'text-[#EC4899]'
                          }`} />
                        </div>
                        <h4 className="text-2xl font-bold text-white">{addon.display_name}</h4>
                      </div>
                      <p className="text-sm text-white/70 mb-4 leading-relaxed">{addon.description}</p>

                      {/* Features List */}
                      {addon.features && addon.features.length > 0 && (
                        <div className="mb-6">
                          <p className="text-sm font-medium text-white mb-3">What's included:</p>
                          <ul className="space-y-2">
                            {addon.features.slice(0, 6).map((feature: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-300">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Pricing - Hardware packs are fixed price */}
                      <div className="mb-6">
                        <div className="bg-gradient-to-br from-[#EC4899]/20 to-[#EC4899]/10 rounded-xl p-6 border-2 border-[#EC4899]/30 text-center">
                          {addon.hardware_cost ? (
                            <>
                              <p className="text-4xl font-bold text-white mb-2">
                                £{addon.hardware_cost.toFixed(0)}
                              </p>
                              <p className="text-sm text-white/70">one-time</p>
                            </>
                          ) : addon.price ? (
                            <>
                              <p className="text-4xl font-bold text-white mb-2">
                                £{addon.price.toFixed(0)}
                              </p>
                              <p className="text-sm text-white/70">one-time</p>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-5 border-t border-white/15">
                      {isPurchased ? (
                        <Button variant="outline" fullWidth disabled className="border-green-500/50 text-green-400">
                          ✓ Active
                        </Button>
                      ) : isPurchasing ? (
                        <Button variant="outline" fullWidth disabled>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {hasPurchased ? 'Switching...' : 'Adding...'}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          fullWidth
                          onClick={() => handlePurchaseAddon(addon.id, addon.name, 1)}
                          disabled={isPurchasing}
                          className="bg-[#EC4899] text-white border-[#EC4899] hover:bg-[#EC4899]/90 hover:shadow-[0_0_16px_rgba(236,72,153,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold py-3"
                        >
                          {hasPurchased ? (
                            <>
                              <Plus className="w-5 h-5 mr-2" />
                              Switch to This Pack
                            </>
                          ) : (
                            <>
                              <Plus className="w-5 h-5 mr-2" />
                              Select This Pack
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </GlassCard>
                );
                })}
              </div>
            </div>
          )}

            {/* Connecting Arrow/Divider */}
            {smartSensorPackAddons.length > 0 && smartSensorSoftwareAddons.length > 0 && (
              <div className="flex items-center justify-center my-8">
                <div className="flex items-center gap-4">
                  <div className="h-px bg-gradient-to-r from-transparent via-[#EC4899]/40 to-[#EC4899]/40 w-16 sm:w-24"></div>
                  <div className="bg-[#EC4899]/20 border border-[#EC4899]/40 rounded-full px-3 py-1.5">
                    <span className="text-xs sm:text-sm font-semibold text-white">+</span>
                  </div>
                  <div className="h-px bg-gradient-to-l from-transparent via-[#EC4899]/40 to-[#EC4899]/40 w-16 sm:w-24"></div>
                </div>
              </div>
            )}

            {/* Monitoring Software Tiers - Monthly per site */}
            {smartSensorSoftwareAddons.length > 0 && (
              <div className="mt-8 pt-8 border-t border-white/10">
                <div className="text-center mb-6">
                  <h4 className="text-xl sm:text-2xl font-bold text-white mb-2">Step 2: Choose Your Software Tier</h4>
                  <p className="text-white/60 text-sm">Monthly per site • Cancel anytime • Works with any hardware pack</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {smartSensorSoftwareAddons.map((addon) => {
                    const isPurchased = addon.id === getPurchasedTierInGroup('smart_sensor_software');
                    const isPurchasing = purchasing === addon.id;
                    const hasPurchased = hasTierPurchased('smart_sensor_software');

                    const tierIcons = {
                      'essential': TrendingUp,
                      'professional': Sparkles,
                      'business': Award,
                      'basic': TrendingUp, // Backward compatibility
                      'pro': Sparkles,
                      'observatory': Award,
                    };
                    const TierIcon = tierIcons[addon.name.split('_').pop() as keyof typeof tierIcons] || Zap;

                    return (
                      <GlassCard
                        key={addon.id}
                        className={`flex flex-col relative transition-all duration-300 ${
                          isPurchased
                            ? 'border-2 border-green-500/60 shadow-[0_0_20px_rgba(34,197,94,0.4)] bg-gradient-to-br from-green-500/5 to-transparent'
                            : hasPurchased
                            ? 'opacity-60 border-white/20'
                            : 'border border-white/20 hover:border-[#EC4899]/60 hover:shadow-[0_0_20px_rgba(236,72,153,0.25)] hover:scale-[1.01] cursor-pointer'
                        }`}
                      >
                        {isPurchased && (
                          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-green-400 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </div>
                        )}
                        {(addon.name.includes('professional') || addon.name.includes('pro')) && !isPurchased && !hasPurchased && (
                          <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#EC4899] to-pink-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                            Most Popular
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2.5 rounded-xl ${
                              isPurchased ? 'bg-green-500/20' : 'bg-[#EC4899]/20'
                            }`}>
                              <TierIcon className={`w-5 h-5 ${
                                isPurchased ? 'text-green-400' : 'text-[#EC4899]'
                              }`} />
                            </div>
                            <h4 className="text-2xl font-bold text-white">{addon.display_name}</h4>
                          </div>
                          <p className="text-sm text-white/70 mb-4 leading-relaxed">{addon.description}</p>

                          {/* Features List */}
                          {addon.features && addon.features.length > 0 && (
                            <div className="mb-6">
                              <p className="text-sm font-medium text-white mb-3">
                                {(addon.name.includes('professional') || addon.name.includes('pro') || addon.name.includes('business') || addon.name.includes('observatory'))
                                  ? addon.name.includes('business') || addon.name.includes('observatory')
                                    ? 'Everything in Professional, plus:'
                                    : 'Everything in Essential, plus:'
                                  : 'Features:'}
                              </p>
                              <ul className="space-y-2">
                                {addon.features.slice(0, 6).map((feature: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-gray-300">{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Pricing - Monthly per site */}
                          <div className="mb-6">
                            <div className="bg-gradient-to-br from-[#EC4899]/20 to-[#EC4899]/10 rounded-xl p-6 border-2 border-[#EC4899]/30 text-center">
                              {addon.monthly_management_cost ? (
                                <>
                                  <p className="text-4xl font-bold text-white mb-2">
                                    £{addon.monthly_management_cost.toFixed(0)}
                                  </p>
                                  <p className="text-sm text-white/70">per site / month</p>
                                </>
                              ) : addon.price ? (
                                <>
                                  <p className="text-4xl font-bold text-white mb-2">
                                    £{addon.price.toFixed(0)}
                                  </p>
                                  <p className="text-sm text-white/70">per site / month</p>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto pt-5 border-t border-white/15">
                          {isPurchased ? (
                            <Button variant="outline" fullWidth disabled className="border-green-500/50 text-green-400">
                              ✓ Active
                            </Button>
                          ) : isPurchasing ? (
                            <Button variant="outline" fullWidth disabled>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {hasPurchased ? 'Switching...' : 'Adding...'}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              fullWidth
                              onClick={() => handlePurchaseAddon(addon.id, addon.name, 1)}
                              disabled={isPurchasing}
                              className="bg-[#EC4899] text-white border-[#EC4899] hover:bg-[#EC4899]/90 hover:shadow-[0_0_16px_rgba(236,72,153,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold py-3"
                            >
                              {hasPurchased ? (
                                <>
                                  <Plus className="w-5 h-5 mr-2" />
                                  Switch to This Tier
                                </>
                              ) : (
                                <>
                                  <Plus className="w-5 h-5 mr-2" />
                                  Select This Tier
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="pt-8 border-t border-white/15 mt-8">
            <div className="bg-gradient-to-r from-blue-500/10 to-transparent border-l-4 border-blue-500 rounded-r-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-blue-400" />
                <h3 className="text-2xl font-bold text-white">Asset Tags</h3>
              </div>
              <p className="text-white/70 text-sm ml-7 mb-4">
                Give your equipment a digital passport. Physical tags that staff and contractors scan to access service history, report faults, and log maintenance visits. No more chasing paperwork or forgotten serial numbers.
              </p>
              {/* How It Works - Combined */}
              <div className="ml-7 mt-4">
                <div className="bg-gradient-to-r from-[#EC4899]/10 to-blue-500/10 rounded-xl p-4 border border-[#EC4899]/20">
                  <p className="text-sm font-semibold text-white mb-2 text-center">How It Works:</p>
                  <p className="text-xs text-gray-300 text-center mb-3">
                    Choose <strong className="text-white">one tag pack</strong> (physical tags) + <strong className="text-white">one software tier</strong> (scanning features). The tag pack is a one-time purchase, and the software tier is billed monthly per site.
                  </p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-left mt-3">
                    <div className="bg-white/8 rounded-lg p-2 border border-white/20">
                      <p className="text-xs font-semibold text-white mb-1">1. Choose</p>
                      <p className="text-xs text-gray-300">Select tag pack & software tier</p>
                    </div>
                    <div className="bg-white/8 rounded-lg p-2 border border-white/20">
                      <p className="text-xs font-semibold text-white mb-1">2. Ship</p>
                      <p className="text-xs text-gray-300">We send tags with setup guide</p>
                    </div>
                    <div className="bg-white/8 rounded-lg p-2 border border-white/20">
                      <p className="text-xs font-semibold text-white mb-1">3. Link</p>
                      <p className="text-xs text-gray-300">Connect tags to assets in Checkly</p>
                    </div>
                    <div className="bg-white/8 rounded-lg p-2 border border-white/20">
                      <p className="text-xs font-semibold text-white mb-1">4. Scan</p>
                      <p className="text-xs text-gray-300">Staff & contractors access everything</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Asset Tag Packs - One-time purchase */}
            {assetTagPackAddons.length > 0 && (
              <div className="mb-8">
                <div className="text-center mb-6">
                  <h4 className="text-xl sm:text-2xl font-bold text-white mb-2">Step 1: Choose Your Tag Pack</h4>
                  <p className="text-white/60 text-sm">One-time purchase • Free replacement tags included</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  {assetTagPackAddons.map((addon) => {
                  const isPurchased = addon.id === getPurchasedTierInGroup('asset_tags_pack');
                  const isPurchasing = purchasing === addon.id;
                  const hasPurchased = hasTierPurchased('asset_tags_pack');

                  const tierIcons = {
                    'basic': TrendingUp,
                    'starter': TrendingUp,
                    'pro': Sparkles,
                    'professional': Sparkles,
                    'observatory': Award,
                    'premium': Award,
                  };
                  const TierIcon = tierIcons[addon.name.split('_').pop() as keyof typeof tierIcons] || Zap;

                  return (
                    <GlassCard
                      key={addon.id}
                      className={`flex flex-col relative transition-all duration-300 ${
                        isPurchased
                          ? 'border-2 border-green-500/60 shadow-[0_0_20px_rgba(34,197,94,0.4)] bg-gradient-to-br from-green-500/5 to-transparent'
                          : hasPurchased
                          ? 'opacity-60 border-white/20'
                          : 'border border-white/20 hover:border-blue-500/60 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:scale-[1.01] cursor-pointer'
                      }`}
                    >
                      {isPurchased && (
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-green-400 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </div>
                      )}
                      {(addon.name.includes('pro') || addon.name.includes('professional')) && !isPurchased && !hasPurchased && (
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                          Most Popular
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2.5 rounded-xl ${
                            isPurchased ? 'bg-green-500/20' : 'bg-blue-500/20'
                          }`}>
                            <TierIcon className={`w-5 h-5 ${
                              isPurchased ? 'text-green-400' : 'text-blue-400'
                            }`} />
                          </div>
                          <h4 className="text-2xl font-bold text-white">{addon.display_name}</h4>
                        </div>
                        <p className="text-sm text-white/70 mb-4 leading-relaxed">{addon.description}</p>

                        {/* Features List - Match pricing page */}
                        {addon.features && addon.features.length > 0 && (
                          <div className="mb-6">
                            <p className="text-sm font-medium text-white mb-3">
                              {(addon.name.includes('pro') || addon.name.includes('professional') || addon.name.includes('observatory') || addon.name.includes('premium'))
                                ? 'Everything in Starter plus:' 
                                : 'What\'s included:'}
                            </p>
                            <ul className="space-y-2">
                              {addon.features.slice(0, 6).map((feature: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-gray-300">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Pricing - Tag packs are fixed price */}
                        <div className="mb-6">
                          <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-xl p-6 border-2 border-blue-500/30 text-center">
                            {addon.hardware_cost ? (
                              <>
                                <p className="text-4xl font-bold text-white mb-2">
                                  £{addon.hardware_cost.toFixed(0)}
                                </p>
                                <p className="text-sm text-white/70">one-time</p>
                              </>
                            ) : addon.price ? (
                              <>
                                <p className="text-4xl font-bold text-white mb-2">
                                  £{addon.price.toFixed(0)}
                                </p>
                                <p className="text-sm text-white/70">one-time</p>
                              </>
                            ) : null}
                          </div>
                        </div>

                      </div>

                      <div className="mt-auto pt-5 border-t border-white/15">
                        {isPurchased ? (
                          <Button variant="outline" fullWidth disabled className="border-green-500/50 text-green-400">
                            ✓ Active
                          </Button>
                        ) : isPurchasing ? (
                          <Button variant="outline" fullWidth disabled>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {hasPurchased ? 'Switching...' : 'Adding...'}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            fullWidth
                            onClick={async () => {
                              // If switching tiers, load existing quantities from the purchased tier
                              if (hasPurchased) {
                                const currentPurchased = purchasedAddons.find(p => 
                                  (p.addon?.name?.startsWith('maintenance_kit_') || p.addon?.name?.startsWith('asset_tags_pack_')) && p.status === 'active'
                                );
                                
                                if (currentPurchased) {
                                  const { data: existingQuantities } = await supabase
                                    .from('company_addon_site_quantities')
                                    .select('site_id, quantity')
                                    .eq('company_addon_purchase_id', currentPurchased.id);
                                  
                                  if (existingQuantities && existingQuantities.length > 0) {
                                    const qtyMap: Record<string, number> = {};
                                    existingQuantities.forEach(sq => {
                                      qtyMap[sq.site_id] = sq.quantity;
                                    });
                                    setTagQuantities(prev => ({ ...prev, [addon.id]: qtyMap }));
                                    setExpandedSites(prev => ({ ...prev, [`tag_${addon.id}`]: true }));
                                  } else if (currentPurchased.quantity_per_site) {
                                    const defaultQty = currentPurchased.quantity_per_site || currentPurchased.quantity || 1;
                                    const defaultMap: Record<string, number> = {};
                                    sites.forEach(site => {
                                      defaultMap[site.id] = defaultQty;
                                    });
                                    setTagQuantities(prev => ({ ...prev, [addon.id]: defaultMap }));
                                  }
                                }
                                // Wait for state update
                                await new Promise(resolve => setTimeout(resolve, 100));
                              }
                              
                              // Proceed with purchase
                              handlePurchaseAddon(addon.id, addon.name, 1);
                            }}
                            disabled={isPurchasing}
                            className="bg-blue-500 text-white border-blue-500 hover:bg-blue-500/90 hover:shadow-[0_0_16px_rgba(59,130,246,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold py-3"
                          >
                            {hasPurchased ? (
                              <>
                                <Plus className="w-5 h-5 mr-2" />
                                Switch to This Tier
                              </>
                            ) : (
                              <>
                                <Plus className="w-5 h-5 mr-2" />
                                Select This Tier
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>
          )}

            {/* Connecting Arrow/Divider */}
            {assetTagPackAddons.length > 0 && assetTagsSoftwareAddons.length > 0 && (
              <div className="flex items-center justify-center my-8">
                <div className="flex items-center gap-4">
                  <div className="h-px bg-gradient-to-r from-transparent via-[#EC4899]/40 to-[#EC4899]/40 w-16 sm:w-24"></div>
                  <div className="bg-[#EC4899]/20 border border-[#EC4899]/40 rounded-full px-3 py-1.5">
                    <span className="text-xs sm:text-sm font-semibold text-white">+</span>
                  </div>
                  <div className="h-px bg-gradient-to-l from-transparent via-[#EC4899]/40 to-[#EC4899]/40 w-16 sm:w-24"></div>
                </div>
              </div>
            )}

            {/* Asset Tags Software Tiers - Monthly per site */}
            {assetTagsSoftwareAddons.length > 0 && (
              <div className="mt-8 pt-8 border-t border-white/10">
                <div className="text-center mb-6">
                  <h4 className="text-xl sm:text-2xl font-bold text-white mb-2">Step 2: Choose Your Software Tier</h4>
                  <p className="text-white/60 text-sm">Monthly per site • Cancel anytime • Works with any tag pack</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {assetTagsSoftwareAddons.map((addon) => {
                    const isPurchased = addon.id === getPurchasedTierInGroup('asset_tags_software');
                    const isPurchasing = purchasing === addon.id;
                    const hasPurchased = hasTierPurchased('asset_tags_software');

                    const tierIcons = {
                      'essential': TrendingUp,
                      'professional': Sparkles,
                      'business': Award,
                    };
                    const TierIcon = tierIcons[addon.name.split('_').pop() as keyof typeof tierIcons] || Zap;

                    return (
                      <GlassCard
                        key={addon.id}
                        className={`flex flex-col relative transition-all duration-300 ${
                          isPurchased
                            ? 'border-2 border-green-500/60 shadow-[0_0_20px_rgba(34,197,94,0.4)] bg-gradient-to-br from-green-500/5 to-transparent'
                            : hasPurchased
                            ? 'opacity-60 border-white/20'
                            : 'border border-white/20 hover:border-blue-500/60 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:scale-[1.01] cursor-pointer'
                        }`}
                      >
                        {isPurchased && (
                          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-green-400 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </div>
                        )}
                        {addon.name.includes('professional') && !isPurchased && !hasPurchased && (
                          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                            Most Popular
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2.5 rounded-xl ${
                              isPurchased ? 'bg-green-500/20' : 'bg-blue-500/20'
                            }`}>
                              <TierIcon className={`w-5 h-5 ${
                                isPurchased ? 'text-green-400' : 'text-blue-400'
                              }`} />
                            </div>
                            <h4 className="text-2xl font-bold text-white">{addon.display_name}</h4>
                          </div>
                          <p className="text-sm text-white/70 mb-4 leading-relaxed">{addon.description}</p>

                          {/* Features List */}
                          {addon.features && addon.features.length > 0 && (
                            <div className="mb-6">
                              <p className="text-sm font-medium text-white mb-3">
                                {addon.name.includes('professional') || addon.name.includes('business')
                                  ? addon.name.includes('business') 
                                    ? 'Everything in Professional, plus:'
                                    : 'Everything in Essential, plus:'
                                  : 'Features:'}
                              </p>
                              <ul className="space-y-2">
                                {addon.features.slice(0, 6).map((feature: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-gray-300">{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Pricing - Monthly per site */}
                          <div className="mb-6">
                            <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-xl p-6 border-2 border-blue-500/30 text-center">
                              {addon.monthly_management_cost ? (
                                <>
                                  <p className="text-4xl font-bold text-white mb-2">
                                    £{addon.monthly_management_cost.toFixed(0)}
                                  </p>
                                  <p className="text-sm text-white/70">per site / month</p>
                                </>
                              ) : addon.price ? (
                                <>
                                  <p className="text-4xl font-bold text-white mb-2">
                                    £{addon.price.toFixed(0)}
                                  </p>
                                  <p className="text-sm text-white/70">per site / month</p>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto pt-5 border-t border-white/15">
                          {isPurchased ? (
                            <Button variant="outline" fullWidth disabled className="border-green-500/50 text-green-400">
                              ✓ Active
                            </Button>
                          ) : isPurchasing ? (
                            <Button variant="outline" fullWidth disabled>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {hasPurchased ? 'Switching...' : 'Adding...'}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              fullWidth
                              onClick={async () => {
                                if (hasPurchased) {
                                  const currentPurchased = purchasedAddons.find(p => 
                                    p.addon?.name?.startsWith('asset_tags_software_') && p.status === 'active'
                                  );
                                  if (currentPurchased) {
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                  }
                                }
                                handlePurchaseAddon(addon.id, addon.name, 1);
                              }}
                              disabled={isPurchasing}
                              className="bg-blue-500 text-white border-blue-500 hover:bg-blue-500/90 hover:shadow-[0_0_16px_rgba(59,130,246,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold py-3"
                            >
                              {hasPurchased ? (
                                <>
                                  <Plus className="w-5 h-5 mr-2" />
                                  Switch to This Tier
                                </>
                              ) : (
                                <>
                                  <Plus className="w-5 h-5 mr-2" />
                                  Select This Tier
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Non-tiered Add-ons */}
          {filteredAddons.filter(a => !a.name.startsWith('smart_sensor_') && !a.name.startsWith('maintenance_kit_') && !a.name.startsWith('asset_tags_pack_') && !a.name.startsWith('asset_tags_software_')).length > 0 && (
          <div className="pt-6 border-t border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Other Add-ons</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAddons
                .filter(a => !a.name.startsWith('smart_sensor_') && !a.name.startsWith('maintenance_kit_') && !a.name.startsWith('asset_tags_pack_') && !a.name.startsWith('asset_tags_software_'))
                .map((addon) => {
                  const isPurchased = isAddonPurchased(addon.id);
                  const isPurchasing = purchasing === addon.id;

                  return (
                    <GlassCard
                      key={addon.id}
                      className={`flex flex-col min-h-[300px] ${
                        isPurchased
                          ? 'border-green-500/50'
                          : 'hover:border-[#EC4899]/50 hover:shadow-[0_0_12px_rgba(236,72,153,0.2)]'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-lg font-semibold text-white">{addon.display_name}</h4>
                          {isPurchased && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                              Purchased
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/60 mb-4">{addon.description}</p>

                        <div className="mb-4">
                          <p className="text-2xl font-bold text-[#EC4899] mb-1">
                            {getAddonPrice(addon, 1)}
                          </p>
                          <p className="text-xs text-white/60">{getAddonPriceDescription(addon, 1)}</p>
                        </div>

                        {addon.features.length > 0 && (
                          <ul className="space-y-1.5 mb-4">
                            {addon.features.slice(0, 3).map((feature, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                                <span className="text-xs text-white/70">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="mt-auto pt-4 border-t border-white/10">
                        {isPurchased ? (
                          <Button variant="outline" fullWidth disabled>
                            Already Added
                          </Button>
                        ) : isPurchasing ? (
                          <Button variant="outline" fullWidth disabled>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            fullWidth
                            onClick={() => handlePurchaseAddon(addon.id, addon.name, 1)}
                            className="border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add to Plan
                          </Button>
                        )}
                      </div>
                    </GlassCard>
                  );
                })}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

