"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  CheckCircle2, 
  Loader2, 
  Zap, 
  TrendingUp, 
  Award, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  Package,
  Wrench,
  Star,
  Shield
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_per_site_monthly: number;
  pricing_model: 'per_site' | 'flat_rate' | 'custom';
  flat_rate_price: number | null;
  features: string[];
}

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

interface Site {
  id: string;
  name: string;
}

interface UnifiedPlanSelectionProps {
  companyId: string;
  currentPlanId: string | null;
  siteCount: number;
  onChanged?: () => void;
}

export default function UnifiedPlanSelection({
  companyId,
  currentPlanId,
  siteCount,
  onChanged,
}: UnifiedPlanSelectionProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Selection state
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(currentPlanId);
  // Smart Sensors: separate hardware pack and software tier
  const [selectedSmartSensorPack, setSelectedSmartSensorPack] = useState<string | null>(null);
  const [selectedSmartSensorSoftware, setSelectedSmartSensorSoftware] = useState<string | null>(null);
  // Asset Tags: separate tag pack and software tier
  const [selectedAssetTagPack, setSelectedAssetTagPack] = useState<string | null>(null);
  const [selectedAssetTagSoftware, setSelectedAssetTagSoftware] = useState<string | null>(null);
  // Backward compatibility: old naming
  const [selectedSmartSensor, setSelectedSmartSensor] = useState<string | null>(null);
  const [selectedMaintenanceKit, setSelectedMaintenanceKit] = useState<string | null>(null);
  const [selectedOtherAddons, setSelectedOtherAddons] = useState<Set<string>>(new Set());

  // Quantity state for sensors and kits (per-site)
  const [sensorQuantities, setSensorQuantities] = useState<Record<string, number>>({});
  const [kitQuantities, setKitQuantities] = useState<Record<string, number>>({});

  // UI state
  const [expandedSensorSites, setExpandedSensorSites] = useState(false);
  const [expandedKitSites, setExpandedKitSites] = useState(false);
  const [showPlanDetails, setShowPlanDetails] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [companyId]);

  async function loadData() {
    try {
      setLoading(true);

      // Load plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_per_site_monthly', { ascending: true });

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Load addons
      const { data: addonsData, error: addonsError } = await supabase
        .from('subscription_addons')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (addonsError) throw addonsError;

      const addonsWithFeatures = (addonsData || []).map(addon => ({
        ...addon,
        features: Array.isArray(addon.features) ? addon.features : [],
        monthly_management_cost: addon.monthly_management_cost ? parseFloat(addon.monthly_management_cost) : null,
        hardware_cost: addon.hardware_cost ? parseFloat(addon.hardware_cost) : null,
      }));

      setAddons(addonsWithFeatures);

      // Calculate addon groups for debugging
      const smartSensorPacks = addonsWithFeatures.filter(a => a.name.startsWith('smart_sensor_pack_'));
      const smartSensorSoftware = addonsWithFeatures.filter(a => a.name.startsWith('smart_sensor_software_'));
      const assetTagPacks = addonsWithFeatures.filter(a => a.name.startsWith('maintenance_kit_') || a.name.startsWith('asset_tags_pack_'));
      const assetTagSoftware = addonsWithFeatures.filter(a => a.name.startsWith('asset_tags_software_'));

      console.log('🔍 Addon Debug Info:');
      console.log('Total addons loaded:', addonsWithFeatures.length);
      console.log('Smart Sensor Packs:', smartSensorPacks.length, smartSensorPacks.map(a => a.name));
      console.log('Smart Sensor Software:', smartSensorSoftware.length, smartSensorSoftware.map(a => a.name));
      console.log('Asset Tag Packs:', assetTagPacks.length, assetTagPacks.map(a => a.name));
      console.log('Asset Tag Software:', assetTagSoftware.length, assetTagSoftware.map(a => a.name));
      console.log('All addon names:', addonsWithFeatures.map(a => a.name));

      // Load sites
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name');

      if (!sitesError && sitesData) {
        setSites(sitesData);
        // Initialize quantities (1 per site by default)
        const defaultQty: Record<string, number> = {};
        sitesData.forEach(site => {
          defaultQty[site.id] = 1;
        });
        setSensorQuantities(defaultQty);
        setKitQuantities(defaultQty);
      }

      // Load current purchases to pre-select
      const { data: purchasedData } = await supabase
        .from('company_addon_purchases')
        .select('addon_id, addon:subscription_addons(name)')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (purchasedData) {
        purchasedData.forEach((purchase: any) => {
          const addonName = purchase.addon?.name;
          // Handle new naming conventions
          if (addonName?.startsWith('smart_sensor_pack_')) {
            setSelectedSmartSensorPack(purchase.addon_id);
          } else if (addonName?.startsWith('smart_sensor_software_')) {
            setSelectedSmartSensorSoftware(purchase.addon_id);
          } else if (addonName?.startsWith('asset_tags_pack_') || addonName?.startsWith('maintenance_kit_')) {
            setSelectedAssetTagPack(purchase.addon_id);
          } else if (addonName?.startsWith('asset_tags_software_')) {
            setSelectedAssetTagSoftware(purchase.addon_id);
          } else {
            setSelectedOtherAddons(prev => new Set(prev).add(purchase.addon_id));
          }
        });
      }

      // Debug: Log loaded addons
      console.log('Loaded addons:', addonsWithFeatures.length);
      console.log('Smart Sensor Packs:', smartSensorPackAddons.length);
      console.log('Smart Sensor Software:', smartSensorSoftwareAddons.length);
      console.log('Asset Tag Packs:', assetTagPackAddons.length);
      console.log('Asset Tag Software:', assetTagsSoftwareAddons.length);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load billing options');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateSubscription() {
    if (!selectedPlanId) {
      toast.error('Please select a plan');
      return;
    }

    setUpdating(true);
    try {
      // 1. Update plan if changed
      if (selectedPlanId !== currentPlanId) {
        const response = await fetch('/api/billing/change-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: companyId,
            new_plan_id: selectedPlanId,
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to update plan');
        }
      }

      // 2. Get current purchases to determine what to add/remove
      const { data: currentPurchases } = await supabase
        .from('company_addon_purchases')
        .select('id, addon_id, addon:subscription_addons(name)')
        .eq('company_id', companyId)
        .eq('status', 'active');

      const currentAddonIds = new Set(currentPurchases?.map(p => p.addon_id) || []);

      // 3. Handle Smart Sensor Hardware Pack (one-time)
      const currentSensorPack = currentPurchases?.find((p: any) => 
        p.addon?.name?.startsWith('smart_sensor_pack_')
      );
      if (selectedSmartSensorPack && selectedSmartSensorPack !== currentSensorPack?.addon_id) {
        // Cancel old pack if exists
        if (currentSensorPack) {
          await fetch('/api/billing/cancel-addon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purchase_id: currentSensorPack.id }),
          });
        }
        // Purchase new pack (one-time, quantity 1)
        await fetch('/api/billing/purchase-addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: companyId,
            addon_id: selectedSmartSensorPack,
            quantity: 1,
          }),
        });
      } else if (!selectedSmartSensorPack && currentSensorPack) {
        // Remove pack
        await fetch('/api/billing/cancel-addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purchase_id: currentSensorPack.id }),
        });
      }

      // 4. Handle Smart Sensor Software Tier (monthly per site)
      const currentSensorSoftware = currentPurchases?.find((p: any) => 
        p.addon?.name?.startsWith('smart_sensor_software_') || 
        (p.addon?.name?.startsWith('smart_sensor_') && !p.addon?.name?.startsWith('smart_sensor_pack_'))
      );
      if (selectedSmartSensorSoftware && selectedSmartSensorSoftware !== currentSensorSoftware?.addon_id) {
        // Cancel old software if exists
        if (currentSensorSoftware) {
          await fetch('/api/billing/cancel-addon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purchase_id: currentSensorSoftware.id }),
          });
        }
        // Purchase new software (monthly per site)
        await fetch('/api/billing/purchase-addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: companyId,
            addon_id: selectedSmartSensorSoftware,
            quantity: siteCount,
          }),
        });
      } else if (!selectedSmartSensorSoftware && currentSensorSoftware) {
        // Remove software
        await fetch('/api/billing/cancel-addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purchase_id: currentSensorSoftware.id }),
        });
      }

      // 5. Handle Asset Tag Pack (one-time)
      const currentTagPack = currentPurchases?.find((p: any) => 
        p.addon?.name?.startsWith('asset_tags_pack_') || 
        p.addon?.name?.startsWith('maintenance_kit_')
      );
      if (selectedAssetTagPack && selectedAssetTagPack !== currentTagPack?.addon_id) {
        // Cancel old pack if exists
        if (currentTagPack) {
          await fetch('/api/billing/cancel-addon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purchase_id: currentTagPack.id }),
          });
        }
        // Purchase new pack (one-time, quantity 1)
        await fetch('/api/billing/purchase-addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: companyId,
            addon_id: selectedAssetTagPack,
            quantity: 1,
          }),
        });
      } else if (!selectedAssetTagPack && currentTagPack) {
        // Remove pack
        await fetch('/api/billing/cancel-addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purchase_id: currentTagPack.id }),
        });
      }

      // 6. Handle Asset Tags Software Tier (monthly per site)
      const currentTagSoftware = currentPurchases?.find((p: any) => 
        p.addon?.name?.startsWith('asset_tags_software_')
      );
      if (selectedAssetTagSoftware && selectedAssetTagSoftware !== currentTagSoftware?.addon_id) {
        // Cancel old software if exists
        if (currentTagSoftware) {
          await fetch('/api/billing/cancel-addon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purchase_id: currentTagSoftware.id }),
          });
        }
        // Purchase new software (monthly per site)
        await fetch('/api/billing/purchase-addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: companyId,
            addon_id: selectedAssetTagSoftware,
            quantity: siteCount,
          }),
        });
      } else if (!selectedAssetTagSoftware && currentTagSoftware) {
        // Remove software
        await fetch('/api/billing/cancel-addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purchase_id: currentTagSoftware.id }),
        });
      }

      // 7. Handle other addons (exclude all tiered addons)
      const otherCurrentPurchases = currentPurchases?.filter((p: any) => {
        const name = p.addon?.name || '';
        return !name.startsWith('smart_sensor_pack_') &&
               !name.startsWith('smart_sensor_software_') &&
               !name.startsWith('smart_sensor_') &&
               !name.startsWith('asset_tags_pack_') &&
               !name.startsWith('asset_tags_software_') &&
               !name.startsWith('maintenance_kit_') &&
               !name.startsWith('maintenance_');
      }) || [];

      // Remove deselected addons
      for (const purchase of otherCurrentPurchases) {
        if (!selectedOtherAddons.has(purchase.addon_id)) {
          await fetch('/api/billing/cancel-addon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purchase_id: purchase.id }),
          });
        }
      }

      // Add newly selected addons
      for (const addonId of selectedOtherAddons) {
        if (!currentAddonIds.has(addonId)) {
          await fetch('/api/billing/purchase-addon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              company_id: companyId,
              addon_id: addonId,
              quantity: 1,
            }),
          });
        }
      }

      toast.success('Subscription updated successfully!');
      onChanged?.();
      await loadData();

    } catch (error: any) {
      console.error('Error updating subscription:', error);
      toast.error(error.message || 'Failed to update subscription');
    } finally {
      setUpdating(false);
    }
  }

  // Cost calculation
  function calculateCosts() {
    let planMonthlyCost = 0;
    let addonMonthlyCost = 0;
    let oneTimeCost = 0;

    // Plan cost
    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    if (selectedPlan) {
      if (selectedPlan.pricing_model === 'per_site') {
        planMonthlyCost = selectedPlan.price_per_site_monthly * siteCount;
      } else if (selectedPlan.pricing_model === 'flat_rate' && selectedPlan.flat_rate_price) {
        planMonthlyCost = selectedPlan.flat_rate_price;
      }
    }

    // Smart Sensor Hardware Pack (one-time)
    if (selectedSmartSensorPack) {
      const pack = addons.find(a => a.id === selectedSmartSensorPack);
      if (pack && pack.hardware_cost) {
        oneTimeCost += pack.hardware_cost;
      } else if (pack && pack.price) {
        oneTimeCost += pack.price;
      }
    }

    // Smart Sensor Software Tier (monthly per site)
    if (selectedSmartSensorSoftware) {
      const software = addons.find(a => a.id === selectedSmartSensorSoftware);
      if (software) {
        const monthlyCost = software.monthly_management_cost || software.price || 0;
        addonMonthlyCost += monthlyCost * siteCount;
      }
    }

    // Asset Tag Pack (one-time)
    if (selectedAssetTagPack) {
      const pack = addons.find(a => a.id === selectedAssetTagPack);
      if (pack && pack.hardware_cost) {
        oneTimeCost += pack.hardware_cost;
      } else if (pack && pack.price) {
        oneTimeCost += pack.price;
      }
    }

    // Asset Tags Software Tier (monthly per site)
    if (selectedAssetTagSoftware) {
      const software = addons.find(a => a.id === selectedAssetTagSoftware);
      if (software) {
        const monthlyCost = software.monthly_management_cost || software.price || 0;
        addonMonthlyCost += monthlyCost * siteCount;
      }
    }

    // Backward compatibility: Old smart sensor addons (combined hardware + software)
    if (selectedSmartSensor && !selectedSmartSensorPack && !selectedSmartSensorSoftware) {
      const sensor = addons.find(a => a.id === selectedSmartSensor);
      if (sensor) {
        // Hardware cost (one-time)
        if (sensor.hardware_cost) {
          const totalSensors = Object.values(sensorQuantities).reduce((sum, qty) => sum + qty, 0);
          oneTimeCost += sensor.hardware_cost * totalSensors;
        }
        // Monthly management cost (per site)
        if (sensor.monthly_management_cost) {
          addonMonthlyCost += sensor.monthly_management_cost * siteCount;
        }
      }
    }

    // Backward compatibility: Old maintenance kit addons
    if (selectedMaintenanceKit && !selectedAssetTagPack) {
      const kit = addons.find(a => a.id === selectedMaintenanceKit);
      if (kit && kit.hardware_cost) {
        const totalKits = Object.values(kitQuantities).reduce((sum, qty) => sum + qty, 0);
        oneTimeCost += kit.hardware_cost * totalKits;
      }
    }

    // Other addons
    selectedOtherAddons.forEach(addonId => {
      const addon = addons.find(a => a.id === addonId);
      if (addon) {
        if (addon.price_type === 'monthly') {
          addonMonthlyCost += addon.price;
        } else if (addon.price_type === 'one_time') {
          oneTimeCost += addon.price;
        }
      }
    });

    return {
      planMonthlyCost,
      addonMonthlyCost,
      totalMonthlyCost: planMonthlyCost + addonMonthlyCost,
      oneTimeCost,
    };
  }

  const costs = calculateCosts();

  // Get addon groups - Updated for new pricing structure
  // Smart Sensor Hardware Packs (one-time)
  const smartSensorPackAddons = addons
    .filter(a => a.name.startsWith('smart_sensor_pack_'))
    .sort((a, b) => {
      const tierOrder = { 'starter': 1, 'standard': 2, 'professional': 3 };
      const aTier = a.name.split('_').pop() || '';
      const bTier = b.name.split('_').pop() || '';
      return (tierOrder[aTier as keyof typeof tierOrder] || 99) - (tierOrder[bTier as keyof typeof tierOrder] || 99);
    });

  // Smart Sensor Software Tiers (monthly per site) - ONLY new naming convention
  const smartSensorSoftwareAddons = addons
    .filter(a => a.name.startsWith('smart_sensor_software_'))
    .sort((a, b) => {
      const tierOrder = { 'essential': 1, 'professional': 2, 'business': 3 };
      const aTier = a.name.split('_').pop() || '';
      const bTier = b.name.split('_').pop() || '';
      return (tierOrder[aTier as keyof typeof tierOrder] || 99) - (tierOrder[bTier as keyof typeof tierOrder] || 99);
    });

  // Asset Tag Packs (one-time) - backward compatible with maintenance_kit_ (but NOT maintenance_hardware_kit)
  const assetTagPackAddons = addons
    .filter(a => a.name.startsWith('maintenance_kit_') || 
                 a.name.startsWith('asset_tags_pack_'))
    .sort((a, b) => {
      const tierOrder = { 'basic': 1, 'starter': 1, 'pro': 2, 'professional': 2, 'observatory': 3, 'premium': 3 };
      const aTier = a.name.split('_').pop() || '';
      const bTier = b.name.split('_').pop() || '';
      return (tierOrder[aTier as keyof typeof tierOrder] || 99) - (tierOrder[bTier as keyof typeof tierOrder] || 99);
    });

  // Asset Tags Software Tiers (monthly per site)
  const assetTagsSoftwareAddons = addons
    .filter(a => a.name.startsWith('asset_tags_software_'))
    .sort((a, b) => {
      const tierOrder = { 'essential': 1, 'professional': 2, 'business': 3 };
      const aTier = a.name.split('_').pop() || '';
      const bTier = b.name.split('_').pop() || '';
      return (tierOrder[aTier as keyof typeof tierOrder] || 99) - (tierOrder[bTier as keyof typeof tierOrder] || 99);
    });

  const otherAddons = addons.filter(a => {
    const name = a.name;
    // Exclude all tiered addons (both old and new naming)
    // Also exclude maintenance_hardware_kit completely
    return !name.startsWith('smart_sensor_pack_') &&
           !name.startsWith('smart_sensor_software_') &&
           !name.startsWith('smart_sensor_') && // Exclude all old smart_sensor_ addons (bundles, basic, pro, etc.)
           !name.startsWith('maintenance_kit_') &&
           !name.startsWith('maintenance_hardware_kit') && // Exclude maintenance_hardware_kit completely
           !name.startsWith('asset_tags_pack_') &&
           !name.startsWith('asset_tags_software_');
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#EC4899]" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Selection Area */}
      <div className="lg:col-span-2 space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Plan & Add-ons Selection</h2>
          <p className="text-white/70">Choose your plan tier and enhance with add-ons. All changes are applied when you click "Update Subscription".</p>
        </div>

        {/* STEP 1: Plan Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#EC4899] text-white font-bold text-sm">
              1
            </div>
            <h3 className="text-xl font-bold text-white">Choose Your Plan Tier</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const isMostPopular = plan.name === 'pro';

              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`relative text-left p-6 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-[#EC4899] bg-[#EC4899]/10 shadow-[0_0_20px_rgba(236,72,153,0.3)]'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  {isMostPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 bg-[#EC4899] text-white text-xs font-bold rounded-full">
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle2 className="w-6 h-6 text-[#EC4899]" />
                    </div>
                  )}

                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-white mb-1">{plan.display_name}</h4>
                    <div className="text-2xl font-bold text-white">
                      {plan.pricing_model === 'custom' ? (
                        'Custom'
                      ) : plan.pricing_model === 'flat_rate' ? (
                        `£${plan.flat_rate_price?.toFixed(2)}/mo`
                      ) : (
                        <>
                          £{plan.price_per_site_monthly.toFixed(2)}
                          <span className="text-sm text-white/60 font-normal">/site/mo</span>
                        </>
                      )}
                    </div>
                    {plan.pricing_model === 'per_site' && siteCount > 0 && (
                      <p className="text-sm text-white/60 mt-1">
                        £{(plan.price_per_site_monthly * siteCount).toFixed(2)}/mo for {siteCount} {siteCount === 1 ? 'site' : 'sites'}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2 text-sm text-white/70">
                    {plan.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.features.length > 3 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPlanDetails(showPlanDetails === plan.id ? null : plan.id);
                      }}
                      className="mt-3 text-sm text-[#EC4899] hover:text-[#EC4899]/80 flex items-center gap-1 cursor-pointer"
                    >
                      {showPlanDetails === plan.id ? 'Show less' : `+${plan.features.length - 3} more features`}
                      {showPlanDetails === plan.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  )}

                  {showPlanDetails === plan.id && (
                    <ul className="mt-3 space-y-2 text-sm text-white/70 pt-3 border-t border-white/10">
                      {plan.features.slice(3).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 2: Smart Temperature Sensors */}
        {/* Debug: Show section even if no addons for testing */}
        {true && (
          <div className="space-y-6">
          <div className="bg-gradient-to-r from-[#EC4899]/10 to-transparent border-l-4 border-[#EC4899] rounded-r-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-[#EC4899]" />
              <h3 className="text-2xl font-bold text-white">Smart Temperature Sensors</h3>
            </div>
            <p className="text-white/70 text-sm ml-7 mb-4">
              Plug-and-play temperature monitoring for fridges, freezers, and prep areas. Automatic logging, instant breach alerts, and EHO-ready compliance reports. Stop worrying about stock losses.
            </p>
            <div className="ml-7 mt-4">
              <div className="bg-gradient-to-r from-[#EC4899]/10 to-blue-500/10 rounded-xl p-4 border border-[#EC4899]/20">
                <p className="text-sm font-semibold text-white mb-2 text-center">How It Works:</p>
                <p className="text-xs text-gray-300 text-center">
                  Choose <strong className="text-white">one hardware pack</strong> (physical sensors) + <strong className="text-white">one software tier</strong> (monitoring features). The hardware pack is a one-time purchase, and the software tier is billed monthly per site.
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: Hardware Packs */}
          {smartSensorPackAddons.length > 0 ? (
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-xl font-bold text-white mb-2">Step 1: Choose Your Hardware Pack</h4>
                <p className="text-white/60 text-sm">One-time purchase • Free replacement for faulty units within warranty period</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {smartSensorPackAddons.map((addon) => {
                  const isSelected = selectedSmartSensorPack === addon.id;
                  const tier = addon.name.split('_').pop() || '';
                  const tierIcons = { 'starter': TrendingUp, 'standard': Sparkles, 'professional': Award };
                  const TierIcon = tierIcons[tier as keyof typeof tierIcons] || Zap;
                  const isMostPopular = tier === 'standard';

                  return (
                    <button
                      key={addon.id}
                      onClick={() => setSelectedSmartSensorPack(isSelected ? null : addon.id)}
                      className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-[#EC4899] bg-[#EC4899]/10 shadow-[0_0_20px_rgba(236,72,153,0.3)]'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      {isMostPopular && !isSelected && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="px-3 py-1 bg-gradient-to-r from-[#EC4899] to-purple-500 text-white text-xs font-bold rounded-full">
                            Most Popular
                          </span>
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute top-4 right-4">
                          <CheckCircle2 className="w-6 h-6 text-[#EC4899]" />
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-[#EC4899]/20 rounded-lg">
                          <TierIcon className="w-5 h-5 text-[#EC4899]" />
                        </div>
                        <h4 className="text-lg font-bold text-white">{addon.display_name}</h4>
                      </div>

                      <p className="text-sm text-white/70 mb-4">{addon.description}</p>

                      <div className="mb-4">
                        <div className="text-2xl font-bold text-white mb-1">
                          £{addon.hardware_cost?.toFixed(0) || addon.price.toFixed(0)}
                        </div>
                        <div className="text-xs text-white/60">one-time</div>
                      </div>

                      {addon.features && addon.features.length > 0 && (
                        <ul className="space-y-1.5 text-xs text-white/70">
                          {addon.features.slice(0, 4).map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-white/[0.03] rounded-lg border border-white/10">
              <p className="text-white/60 mb-2">No hardware packs available</p>
              <p className="text-xs text-white/40">Addons: {addons.filter(a => a.name.startsWith('smart_sensor_pack_')).length} found</p>
            </div>
          )}

          {/* Connecting Element */}
          {smartSensorPackAddons.length > 0 && smartSensorSoftwareAddons.length > 0 && (
            <div className="flex items-center justify-center my-4">
              <div className="flex items-center gap-4">
                <div className="h-px bg-gradient-to-r from-transparent via-[#EC4899]/40 to-[#EC4899]/40 w-16"></div>
                <div className="bg-[#EC4899]/20 border border-[#EC4899]/40 rounded-full px-3 py-1.5">
                  <span className="text-sm font-semibold text-white">+</span>
                </div>
                <div className="h-px bg-gradient-to-l from-transparent via-[#EC4899]/40 to-[#EC4899]/40 w-16"></div>
              </div>
            </div>
          )}

          {/* Step 2: Software Tiers */}
          {smartSensorSoftwareAddons.length > 0 ? (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="text-center">
                <h4 className="text-xl font-bold text-white mb-2">Step 2: Choose Your Software Tier</h4>
                <p className="text-white/60 text-sm">Monthly per site • Cancel anytime • Works with any hardware pack</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {smartSensorSoftwareAddons.map((addon) => {
                  const isSelected = selectedSmartSensorSoftware === addon.id;
                  const tier = addon.name.split('_').pop() || '';
                  const tierIcons = { 'essential': TrendingUp, 'professional': Sparkles, 'business': Award, 'basic': TrendingUp, 'pro': Sparkles, 'observatory': Award };
                  const TierIcon = tierIcons[tier as keyof typeof tierIcons] || Zap;
                  const isMostPopular = tier === 'professional' || tier === 'pro';

                  const monthlyCost = addon.monthly_management_cost ? addon.monthly_management_cost * siteCount : 0;

                  return (
                    <button
                      key={addon.id}
                      onClick={() => setSelectedSmartSensorSoftware(isSelected ? null : addon.id)}
                      className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-[#EC4899] bg-[#EC4899]/10 shadow-[0_0_20px_rgba(236,72,153,0.3)]'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      {isMostPopular && !isSelected && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="px-3 py-1 bg-gradient-to-r from-[#EC4899] to-purple-500 text-white text-xs font-bold rounded-full">
                            Most Popular
                          </span>
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute top-4 right-4">
                          <CheckCircle2 className="w-6 h-6 text-[#EC4899]" />
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-[#EC4899]/20 rounded-lg">
                          <TierIcon className="w-5 h-5 text-[#EC4899]" />
                        </div>
                        <h4 className="text-lg font-bold text-white">{addon.display_name}</h4>
                      </div>

                      <p className="text-sm text-white/70 mb-4">{addon.description}</p>

                      <div className="mb-4">
                        <div className="text-2xl font-bold text-white mb-1">
                          £{addon.monthly_management_cost?.toFixed(0) || addon.price.toFixed(0)}
                        </div>
                        <div className="text-xs text-white/60">per site / month</div>
                        {siteCount > 0 && (
                          <div className="text-xs text-white/50 mt-1">
                            {siteCount} sites × £{addon.monthly_management_cost?.toFixed(0) || addon.price.toFixed(0)} = £{monthlyCost.toFixed(2)}/mo
                          </div>
                        )}
                      </div>

                      {addon.features && addon.features.length > 0 && (
                        <ul className="space-y-1.5 text-xs text-white/70">
                          {addon.features.slice(0, 4).map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-white/[0.03] rounded-lg border border-white/10">
              <p className="text-white/60 mb-2">No software tiers available</p>
              <p className="text-xs text-white/40">Addons: {addons.filter(a => a.name.startsWith('smart_sensor_software_')).length} found</p>
            </div>
          )}
          </div>
        )}

        {/* STEP 3: Asset Tags */}
        {/* Debug: Show section even if no addons for testing */}
        {true && (
          <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500/10 to-transparent border-l-4 border-blue-500 rounded-r-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-blue-400" />
              <h3 className="text-2xl font-bold text-white">Asset Tags</h3>
            </div>
            <p className="text-white/70 text-sm ml-7 mb-4">
              Give your equipment a digital passport. Physical tags that staff and contractors scan to access service history, report faults, and log maintenance visits. No more chasing paperwork or forgotten serial numbers.
            </p>
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

          {/* Step 1: Tag Packs */}
          {assetTagPackAddons.length > 0 ? (
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-xl font-bold text-white mb-2">Step 1: Choose Your Tag Pack</h4>
                <p className="text-white/60 text-sm">One-time purchase • Free replacement tags included</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {assetTagPackAddons.map((addon) => {
                  const isSelected = selectedAssetTagPack === addon.id;
                  const tier = addon.name.split('_').pop() || '';
                  const tierIcons = { 'basic': Package, 'starter': Package, 'pro': Wrench, 'professional': Wrench, 'observatory': Shield, 'premium': Shield };
                  const TierIcon = tierIcons[tier as keyof typeof tierIcons] || Package;
                  const isMostPopular = tier === 'professional' || tier === 'pro';

                  return (
                    <button
                      key={addon.id}
                      onClick={() => setSelectedAssetTagPack(isSelected ? null : addon.id)}
                      className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                          : 'border-white/10 bg-white/[0.03] hover:border-blue-500/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      {isMostPopular && !isSelected && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full">
                            Most Popular
                          </span>
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute top-4 right-4">
                          <CheckCircle2 className="w-6 h-6 text-blue-400" />
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <TierIcon className="w-5 h-5 text-blue-400" />
                        </div>
                        <h4 className="text-lg font-bold text-white">{addon.display_name}</h4>
                      </div>

                      <p className="text-sm text-white/70 mb-4">{addon.description}</p>

                      <div className="mb-4">
                        <div className="text-2xl font-bold text-white mb-1">
                          £{addon.hardware_cost?.toFixed(0) || addon.price.toFixed(0)}
                        </div>
                        <div className="text-xs text-white/60">one-time</div>
                      </div>

                      {addon.features && addon.features.length > 0 && (
                        <ul className="space-y-1.5 text-xs text-white/70">
                          {addon.features.slice(0, 4).map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-white/[0.03] rounded-lg border border-white/10">
              <p className="text-white/60 mb-2">No tag packs available</p>
              <p className="text-xs text-white/40">Addons: {addons.filter(a => a.name.startsWith('asset_tags_pack_') || a.name.startsWith('maintenance_kit_')).length} found</p>
            </div>
          )}

          {/* Connecting Element */}
          {assetTagPackAddons.length > 0 && assetTagsSoftwareAddons.length > 0 && (
            <div className="flex items-center justify-center my-4">
              <div className="flex items-center gap-4">
                <div className="h-px bg-gradient-to-r from-transparent via-[#EC4899]/40 to-[#EC4899]/40 w-16"></div>
                <div className="bg-[#EC4899]/20 border border-[#EC4899]/40 rounded-full px-3 py-1.5">
                  <span className="text-sm font-semibold text-white">+</span>
                </div>
                <div className="h-px bg-gradient-to-l from-transparent via-[#EC4899]/40 to-[#EC4899]/40 w-16"></div>
              </div>
            </div>
          )}

          {/* Step 2: Software Tiers */}
          {assetTagsSoftwareAddons.length > 0 ? (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="text-center">
                <h4 className="text-xl font-bold text-white mb-2">Step 2: Choose Your Software Tier</h4>
                <p className="text-white/60 text-sm">Monthly per site • Cancel anytime • Works with any tag pack</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {assetTagsSoftwareAddons.map((addon) => {
                  const isSelected = selectedAssetTagSoftware === addon.id;
                  const tier = addon.name.split('_').pop() || '';
                  const tierIcons = { 'essential': TrendingUp, 'professional': Sparkles, 'business': Award };
                  const TierIcon = tierIcons[tier as keyof typeof tierIcons] || Zap;
                  const isMostPopular = tier === 'professional';

                  const monthlyCost = addon.monthly_management_cost ? addon.monthly_management_cost * siteCount : 0;

                  return (
                    <button
                      key={addon.id}
                      onClick={() => setSelectedAssetTagSoftware(isSelected ? null : addon.id)}
                      className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                          : 'border-white/10 bg-white/[0.03] hover:border-blue-500/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      {isMostPopular && !isSelected && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full">
                            Most Popular
                          </span>
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute top-4 right-4">
                          <CheckCircle2 className="w-6 h-6 text-blue-400" />
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <TierIcon className="w-5 h-5 text-blue-400" />
                        </div>
                        <h4 className="text-lg font-bold text-white">{addon.display_name}</h4>
                      </div>

                      <p className="text-sm text-white/70 mb-4">{addon.description}</p>

                      <div className="mb-4">
                        <div className="text-2xl font-bold text-white mb-1">
                          £{addon.monthly_management_cost?.toFixed(0) || addon.price.toFixed(0)}
                        </div>
                        <div className="text-xs text-white/60">per site / month</div>
                        {siteCount > 0 && (
                          <div className="text-xs text-white/50 mt-1">
                            {siteCount} sites × £{addon.monthly_management_cost?.toFixed(0) || addon.price.toFixed(0)} = £{monthlyCost.toFixed(2)}/mo
                          </div>
                        )}
                      </div>

                      {addon.features && addon.features.length > 0 && (
                        <ul className="space-y-1.5 text-xs text-white/70">
                          {addon.features.slice(0, 4).map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-white/[0.03] rounded-lg border border-white/10">
              <p className="text-white/60 mb-2">No software tiers available</p>
              <p className="text-xs text-white/40">Addons: {addons.filter(a => a.name.startsWith('smart_sensor_software_')).length} found</p>
            </div>
          )}
          </div>
        )}

        {/* STEP 4: Other Add-ons */}
        {otherAddons.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white font-bold text-sm">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">Other Add-ons</h3>
                <p className="text-sm text-white/60">Optional - Select any additional services</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherAddons.map((addon) => {
                const isSelected = selectedOtherAddons.has(addon.id);

                return (
                  <button
                    key={addon.id}
                    onClick={() => {
                      const newSet = new Set(selectedOtherAddons);
                      if (isSelected) {
                        newSet.delete(addon.id);
                      } else {
                        newSet.add(addon.id);
                      }
                      setSelectedOtherAddons(newSet);
                    }}
                    className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-[#EC4899] bg-[#EC4899]/10 shadow-[0_0_20px_rgba(236,72,153,0.3)]'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-4 right-4">
                        <CheckCircle2 className="w-6 h-6 text-[#EC4899]" />
                      </div>
                    )}

                    <h4 className="text-lg font-bold text-white mb-2">{addon.display_name}</h4>
                    <p className="text-sm text-white/60 mb-3">{addon.description}</p>

                    <div className="text-xl font-bold text-white mb-3">
                      £{addon.price.toFixed(2)}
                      {addon.price_type === 'monthly' && <span className="text-sm font-normal text-white/60">/month</span>}
                      {addon.price_type === 'one_time' && <span className="text-sm font-normal text-white/60"> one-time</span>}
                    </div>

                    {addon.features.length > 0 && (
                      <ul className="space-y-1.5 text-xs text-white/70">
                        {addon.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Cost Summary Sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            💰 Cost Summary
          </h3>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <span className="text-sm text-white/70">Plan</span>
              <span className="text-lg font-bold text-white">£{costs.planMonthlyCost.toFixed(2)}/mo</span>
            </div>

            {/* Smart Sensor Hardware Pack */}
            {selectedSmartSensorPack && (() => {
              const pack = addons.find(a => a.id === selectedSmartSensorPack);
              const cost = pack?.hardware_cost || pack?.price || 0;
              return cost > 0 ? (
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/70">Sensor Hardware Pack</span>
                  <span className="text-lg font-bold text-white">£{cost.toFixed(2)}</span>
                </div>
              ) : null;
            })()}

            {/* Smart Sensor Software Tier */}
            {selectedSmartSensorSoftware && (() => {
              const software = addons.find(a => a.id === selectedSmartSensorSoftware);
              const monthlyCost = (software?.monthly_management_cost || software?.price || 0) * siteCount;
              return monthlyCost > 0 ? (
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/70">Sensor Software ({siteCount} sites)</span>
                  <span className="text-lg font-bold text-[#EC4899]">£{monthlyCost.toFixed(2)}/mo</span>
                </div>
              ) : null;
            })()}

            {/* Asset Tag Pack */}
            {selectedAssetTagPack && (() => {
              const pack = addons.find(a => a.id === selectedAssetTagPack);
              const cost = pack?.hardware_cost || pack?.price || 0;
              return cost > 0 ? (
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/70">Tag Pack</span>
                  <span className="text-lg font-bold text-white">£{cost.toFixed(2)}</span>
                </div>
              ) : null;
            })()}

            {/* Asset Tags Software Tier */}
            {selectedAssetTagSoftware && (() => {
              const software = addons.find(a => a.id === selectedAssetTagSoftware);
              const monthlyCost = (software?.monthly_management_cost || software?.price || 0) * siteCount;
              return monthlyCost > 0 ? (
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/70">Tag Software ({siteCount} sites)</span>
                  <span className="text-lg font-bold text-[#EC4899]">£{monthlyCost.toFixed(2)}/mo</span>
                </div>
              ) : null;
            })()}

            {/* Other Add-ons Monthly */}
            {(() => {
              let otherMonthly = 0;
              selectedOtherAddons.forEach(addonId => {
                const addon = addons.find(a => a.id === addonId);
                if (addon && addon.price_type === 'monthly') {
                  otherMonthly += addon.price;
                }
              });
              return otherMonthly > 0 ? (
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/70">Other Add-ons (Monthly)</span>
                  <span className="text-lg font-bold text-[#EC4899]">£{otherMonthly.toFixed(2)}/mo</span>
                </div>
              ) : null;
            })()}

            {/* Other Add-ons One-time */}
            {(() => {
              let otherOneTime = 0;
              selectedOtherAddons.forEach(addonId => {
                const addon = addons.find(a => a.id === addonId);
                if (addon && addon.price_type === 'one_time') {
                  otherOneTime += addon.price;
                }
              });
              return otherOneTime > 0 ? (
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/70">Other Add-ons (One-time)</span>
                  <span className="text-lg font-bold text-white">£{otherOneTime.toFixed(2)}</span>
                </div>
              ) : null;
            })()}
          </div>

          <div className="space-y-3 pt-4 border-t-2 border-[#EC4899]/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Total Monthly</span>
              <span className="text-2xl font-bold text-white">£{costs.totalMonthlyCost.toFixed(2)}</span>
            </div>

            {costs.oneTimeCost > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Total One-time</span>
                <span className="text-2xl font-bold text-white">£{costs.oneTimeCost.toFixed(2)}</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleUpdateSubscription}
            disabled={updating || !selectedPlanId}
            className="w-full mt-6 bg-white/[0.05] backdrop-blur-md border-2 border-[#EC4899] hover:border-[#EC4899] hover:shadow-[0_0_20px_rgba(192,38,211,0.5)] text-white font-bold py-3 transition-all duration-300"
          >
            {updating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Subscription'
            )}
          </Button>

          <p className="text-xs text-white/50 text-center mt-3">
            Changes will be reflected in your next invoice
          </p>
        </div>
      </div>
    </div>
  );
}



