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
          if (addonName?.startsWith('smart_sensor_')) {
            setSelectedSmartSensor(purchase.addon_id);
          } else if (addonName?.startsWith('maintenance_kit_')) {
            setSelectedMaintenanceKit(purchase.addon_id);
          } else {
            setSelectedOtherAddons(prev => new Set(prev).add(purchase.addon_id));
          }
        });
      }

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

      // 3. Handle Smart Sensor changes
      const currentSensor = currentPurchases?.find((p: any) => p.addon?.name?.startsWith('smart_sensor_'));
      if (selectedSmartSensor && selectedSmartSensor !== currentSensor?.addon_id) {
        // Cancel old sensor if exists
        if (currentSensor) {
          await fetch('/api/billing/cancel-addon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purchase_id: currentSensor.id }),
          });
        }
        // Purchase new sensor
        const totalSensorQty = Object.values(sensorQuantities).reduce((sum, qty) => sum + qty, 0);
        const avgQty = Math.round(totalSensorQty / sites.length) || 1;
        await fetch('/api/billing/purchase-addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: companyId,
            addon_id: selectedSmartSensor,
            quantity: avgQty,
            per_site_quantities: sensorQuantities,
          }),
        });
      } else if (!selectedSmartSensor && currentSensor) {
        // Remove sensor
        await fetch('/api/billing/cancel-addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purchase_id: currentSensor.id }),
        });
      }

      // 4. Handle Maintenance Kit changes
      const currentKit = currentPurchases?.find((p: any) => p.addon?.name?.startsWith('maintenance_kit_'));
      if (selectedMaintenanceKit && selectedMaintenanceKit !== currentKit?.addon_id) {
        if (currentKit) {
          await fetch('/api/billing/cancel-addon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purchase_id: currentKit.id }),
          });
        }
        const totalKitQty = Object.values(kitQuantities).reduce((sum, qty) => sum + qty, 0);
        const avgQty = Math.round(totalKitQty / sites.length) || 1;
        await fetch('/api/billing/purchase-addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: companyId,
            addon_id: selectedMaintenanceKit,
            quantity: avgQty,
            per_site_quantities: kitQuantities,
          }),
        });
      } else if (!selectedMaintenanceKit && currentKit) {
        await fetch('/api/billing/cancel-addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purchase_id: currentKit.id }),
        });
      }

      // 5. Handle other addons
      const otherCurrentPurchases = currentPurchases?.filter((p: any) => 
        !p.addon?.name?.startsWith('smart_sensor_') && 
        !p.addon?.name?.startsWith('maintenance_kit_')
      ) || [];

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

    // Smart Sensor costs
    if (selectedSmartSensor) {
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

    // Maintenance Kit costs
    if (selectedMaintenanceKit) {
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

  // Get addon groups
  const smartSensorAddons = addons
    .filter(a => a.name.startsWith('smart_sensor_'))
    .sort((a, b) => {
      const tierOrder = { 'basic': 1, 'pro': 2, 'observatory': 3 };
      const aTier = a.name.split('_').pop() || '';
      const bTier = b.name.split('_').pop() || '';
      return (tierOrder[aTier as keyof typeof tierOrder] || 99) - (tierOrder[bTier as keyof typeof tierOrder] || 99);
    });

  const maintenanceKitAddons = addons
    .filter(a => a.name.startsWith('maintenance_kit_'))
    .sort((a, b) => {
      const tierOrder = { 'basic': 1, 'pro': 2, 'observatory': 3 };
      const aTier = a.name.split('_').pop() || '';
      const bTier = b.name.split('_').pop() || '';
      return (tierOrder[aTier as keyof typeof tierOrder] || 99) - (tierOrder[bTier as keyof typeof tierOrder] || 99);
    });

  const otherAddons = addons.filter(a => 
    !a.name.startsWith('smart_sensor_') && 
    !a.name.startsWith('maintenance_kit_')
  );

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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPlanDetails(showPlanDetails === plan.id ? null : plan.id);
                      }}
                      className="mt-3 text-sm text-[#EC4899] hover:text-[#EC4899]/80 flex items-center gap-1"
                    >
                      {showPlanDetails === plan.id ? 'Show less' : `+${plan.features.length - 3} more features`}
                      {showPlanDetails === plan.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
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

        {/* STEP 2: Smart Sensor Bundles */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white font-bold text-sm">
              2
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">Smart Sensor Bundles</h3>
              <p className="text-sm text-white/60">Optional - Choose ONE tier for temperature monitoring</p>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-white/80">
              <p className="font-medium text-white mb-1">How Smart Sensors Work</p>
              <p>Hardware cost is <strong>one-time per sensor</strong>. Monthly management is <strong>per site</strong> (not per sensor). You can configure different quantities for each site below.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {smartSensorAddons.map((addon) => {
              const isSelected = selectedSmartSensor === addon.id;
              const tier = addon.name.split('_').pop() || '';
              const tierIcons = { 'basic': TrendingUp, 'pro': Sparkles, 'observatory': Award };
              const TierIcon = tierIcons[tier as keyof typeof tierIcons] || Zap;
              const isRecommended = tier === 'pro';

              const totalSensors = Object.values(sensorQuantities).reduce((sum, qty) => sum + qty, 0);
              const hardwareCost = addon.hardware_cost ? addon.hardware_cost * totalSensors : 0;
              const monthlyCost = addon.monthly_management_cost ? addon.monthly_management_cost * siteCount : 0;

              return (
                <button
                  key={addon.id}
                  onClick={() => setSelectedSmartSensor(isSelected ? null : addon.id)}
                  className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-[#EC4899] bg-[#EC4899]/10 shadow-[0_0_20px_rgba(236,72,153,0.3)]'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 bg-gradient-to-r from-[#EC4899] to-purple-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        RECOMMENDED
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
                    <h4 className="text-lg font-bold text-white capitalize">{tier}</h4>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-white/60">Hardware</span>
                      <span className="text-sm font-bold text-white">£{hardwareCost.toFixed(2)}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-white/60">Monthly</span>
                      <span className="text-sm font-bold text-[#EC4899]">£{monthlyCost.toFixed(2)}/mo</span>
                    </div>
                    <div className="pt-2 border-t border-white/10 text-xs text-white/50">
                      {totalSensors} sensors × £{addon.hardware_cost?.toFixed(2)}<br/>
                      {siteCount} sites × £{addon.monthly_management_cost?.toFixed(2)}/mo
                    </div>
                  </div>

                  <ul className="space-y-1.5 text-xs text-white/70">
                    {addon.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {/* Quantity Configuration */}
          {selectedSmartSensor && sites.length > 0 && (
            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
              <button
                onClick={() => setExpandedSensorSites(!expandedSensorSites)}
                className="w-full flex items-center justify-between text-white hover:text-white/80 transition-colors"
              >
                <span className="font-medium">Configure sensors per site ({sites.length} sites)</span>
                {expandedSensorSites ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {expandedSensorSites && (
                <div className="mt-4 space-y-3">
                  {sites.map((site) => (
                    <div key={site.id} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-white/70">{site.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSensorQuantities(prev => ({
                            ...prev,
                            [site.id]: Math.max(0, (prev[site.id] || 1) - 1)
                          }))}
                          className="w-8 h-8 rounded bg-white/[0.05] backdrop-blur-md border border-[#EC4899]/50 hover:border-[#EC4899] hover:shadow-[0_0_12px_rgba(192,38,211,0.4)] text-white flex items-center justify-center transition-all duration-300"
                        >
                          -
                        </button>
                        <Input
                          type="number"
                          min="0"
                          value={sensorQuantities[site.id] || 1}
                          onChange={(e) => setSensorQuantities(prev => ({
                            ...prev,
                            [site.id]: Math.max(0, parseInt(e.target.value) || 0)
                          }))}
                          className="w-16 text-center"
                        />
                        <button
                          onClick={() => setSensorQuantities(prev => ({
                            ...prev,
                            [site.id]: (prev[site.id] || 1) + 1
                          }))}
                          className="w-8 h-8 rounded bg-white/[0.05] backdrop-blur-md border border-[#EC4899]/50 hover:border-[#EC4899] hover:shadow-[0_0_12px_rgba(192,38,211,0.4)] text-white flex items-center justify-center transition-all duration-300"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* STEP 3: Maintenance Kits */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white font-bold text-sm">
              3
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">Maintenance Kits</h3>
              <p className="text-sm text-white/60">Optional - Choose ONE tier for equipment tagging</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {maintenanceKitAddons.map((addon) => {
              const isSelected = selectedMaintenanceKit === addon.id;
              const tier = addon.name.split('_').pop() || '';
              const tierIcons = { 'basic': Package, 'pro': Wrench, 'observatory': Shield };
              const TierIcon = tierIcons[tier as keyof typeof tierIcons] || Package;

              const totalKits = Object.values(kitQuantities).reduce((sum, qty) => sum + qty, 0);
              const hardwareCost = addon.hardware_cost ? addon.hardware_cost * totalKits : 0;

              return (
                <button
                  key={addon.id}
                  onClick={() => setSelectedMaintenanceKit(isSelected ? null : addon.id)}
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

                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <TierIcon className="w-5 h-5 text-purple-400" />
                    </div>
                    <h4 className="text-lg font-bold text-white capitalize">{tier}</h4>
                  </div>

                  <div className="mb-4">
                    <div className="text-2xl font-bold text-white">£{hardwareCost.toFixed(2)}</div>
                    <div className="text-xs text-white/60 mt-1">
                      {totalKits} tags × £{addon.hardware_cost?.toFixed(2)} (one-time)
                    </div>
                  </div>

                  <ul className="space-y-1.5 text-xs text-white/70">
                    {addon.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {/* Quantity Configuration */}
          {selectedMaintenanceKit && sites.length > 0 && (
            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
              <button
                onClick={() => setExpandedKitSites(!expandedKitSites)}
                className="w-full flex items-center justify-between text-white hover:text-white/80 transition-colors"
              >
                <span className="font-medium">Configure tags per site ({sites.length} sites)</span>
                {expandedKitSites ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {expandedKitSites && (
                <div className="mt-4 space-y-3">
                  {sites.map((site) => (
                    <div key={site.id} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-white/70">{site.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setKitQuantities(prev => ({
                            ...prev,
                            [site.id]: Math.max(0, (prev[site.id] || 1) - 1)
                          }))}
                          className="w-8 h-8 rounded bg-white/[0.05] backdrop-blur-md border border-[#EC4899]/50 hover:border-[#EC4899] hover:shadow-[0_0_12px_rgba(192,38,211,0.4)] text-white flex items-center justify-center transition-all duration-300"
                        >
                          -
                        </button>
                        <Input
                          type="number"
                          min="0"
                          value={kitQuantities[site.id] || 1}
                          onChange={(e) => setKitQuantities(prev => ({
                            ...prev,
                            [site.id]: Math.max(0, parseInt(e.target.value) || 0)
                          }))}
                          className="w-16 text-center"
                        />
                        <button
                          onClick={() => setKitQuantities(prev => ({
                            ...prev,
                            [site.id]: (prev[site.id] || 1) + 1
                          }))}
                          className="w-8 h-8 rounded bg-white/[0.05] backdrop-blur-md border border-[#EC4899]/50 hover:border-[#EC4899] hover:shadow-[0_0_12px_rgba(192,38,211,0.4)] text-white flex items-center justify-center transition-all duration-300"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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

            {costs.addonMonthlyCost > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-sm text-white/70">Add-ons (Monthly)</span>
                <span className="text-lg font-bold text-[#EC4899]">£{costs.addonMonthlyCost.toFixed(2)}/mo</span>
              </div>
            )}

            {costs.oneTimeCost > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-sm text-white/70">Hardware (One-time)</span>
                <span className="text-lg font-bold text-white">£{costs.oneTimeCost.toFixed(2)}</span>
              </div>
            )}
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



