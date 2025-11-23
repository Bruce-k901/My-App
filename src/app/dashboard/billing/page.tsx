"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { 
  CreditCard, 
  Calendar, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  FileText,
  ExternalLink,
  Loader2,
  Package,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui";
import Link from "next/link";
import PlanSelection from "@/components/billing/PlanSelection";
import AddonsSelection from "@/components/billing/AddonsSelection";

interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  plan: {
    name: string;
    display_name: string;
    price_per_site_monthly: number;
    pricing_model?: 'per_site' | 'flat_rate' | 'custom';
    flat_rate_price?: number | null;
  };
  trial_started_at: string;
  trial_ends_at: string;
  trial_used: boolean;
  status: 'trial' | 'active' | 'expired' | 'cancelled' | 'past_due';
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  cancelled_at: string | null;
  site_count: number;
  monthly_amount: number;
  billing_email: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paid_at: string | null;
  billing_period_start: string;
  billing_period_end: string;
}

export default function BillingPage() {
  const { companyId, company, loading: contextLoading } = useAppContext();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'addons'>('overview');
  const [siteCount, setSiteCount] = useState(0);
  const [purchasedAddons, setPurchasedAddons] = useState<any[]>([]);
  const [totalAddonMonthlyCost, setTotalAddonMonthlyCost] = useState(0);
  const [totalAddonOneTimeCost, setTotalAddonOneTimeCost] = useState(0);

  useEffect(() => {
    if (companyId && !contextLoading) {
      loadBillingData();
      
      // Set up real-time subscription to sites table for dynamic updates
      const sitesChannel = supabase
        .channel('billing-sites-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sites',
            filter: `company_id=eq.${companyId}`,
          },
          () => {
            // Reload billing data when sites change (added/archived/updated)
            loadBillingData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(sitesChannel);
      };
    }
  }, [companyId, contextLoading]);

  async function loadBillingData() {
    if (!companyId) return;
    
    setLoading(true);
    setError(null);

    try {
      // Load active site count
      // Query all sites - archived column may not exist in sites table
      const { count: sitesCount, error: sitesError } = await supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId);
      
      const finalSiteCount = sitesError ? 0 : (sitesCount || 0);
      
      setSiteCount(finalSiteCount);

      // Load subscription with plan details including pricing_model
      const { data: subData, error: subError } = await supabase
        .from('company_subscriptions')
        .select(`
          *,
          plan:subscription_plans(id, name, display_name, price_per_site_monthly, pricing_model, flat_rate_price)
        `)
        .eq('company_id', companyId)
        .single();

      if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw subError;
      }

      if (subData) {
        const currentSubscription = subData as any;
        setSubscription(currentSubscription);
        
        // Update subscription site count and auto-assign plan if it changed
        if (currentSubscription.site_count !== finalSiteCount) {
          // Automatically update subscription - this will also auto-assign plan based on site count
          const { updateSubscriptionSiteCount } = await import('@/lib/subscriptions');
          await updateSubscriptionSiteCount(companyId);
          // Reload subscription data after update to get fresh monthly_amount
          const { data: updatedSub } = await supabase
            .from('company_subscriptions')
            .select(`
              *,
              plan:subscription_plans(id, name, display_name, price_per_site_monthly, pricing_model, flat_rate_price)
            `)
            .eq('company_id', companyId)
            .single();
          if (updatedSub) {
            setSubscription(updatedSub as any);
          }
        }
      }

      // Load invoices
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .order('invoice_date', { ascending: false })
        .limit(12);

      if (invError) throw invError;
      setInvoices(invData || []);

      // Load purchased addons with full details for cost calculation
      const { data: addonsData, error: addonsErr } = await supabase
        .from('company_addon_purchases')
        .select(`
          *,
          addon:subscription_addons(
            id,
            name,
            display_name,
            monthly_management_cost,
            hardware_cost,
            price_type
          )
        `)
        .eq('company_id', companyId)
        .eq('status', 'active');
      
      if (!addonsErr && addonsData) {
        setPurchasedAddons(addonsData || []);
        
        // Calculate total monthly and one-time addon costs using finalSiteCount
        let monthlyTotal = 0;
        let oneTimeTotal = 0;
        
        console.log('Calculating addon costs:', { addonsData, finalSiteCount });
        
        addonsData.forEach((purchase: any) => {
          const addon = purchase.addon;
          
          if (!addon) {
            console.warn('Purchase missing addon:', purchase);
            return;
          }
          
          console.log('Processing addon:', { 
            name: addon.name, 
            monthly_management_cost: addon.monthly_management_cost,
            monthly_recurring_cost: purchase.monthly_recurring_cost,
            hardware_cost_total: purchase.hardware_cost_total,
            finalSiteCount 
          });
          
          // One-time costs
          if (addon.name === 'personalized_onboarding') {
            const cost = purchase.total_price ? parseFloat(purchase.total_price) : 1200.00;
            oneTimeTotal += cost;
            console.log('Added onboarding one-time cost:', cost);
          } else if (purchase.hardware_cost_total) {
            const cost = parseFloat(purchase.hardware_cost_total) || 0;
            oneTimeTotal += cost;
            console.log('Added hardware one-time cost:', cost);
          } else if (purchase.price_type === 'one_time' && purchase.total_price) {
            const cost = parseFloat(purchase.total_price) || 0;
            oneTimeTotal += cost;
            console.log('Added one-time cost:', cost);
          }
          
          // Monthly recurring costs
          if (purchase.monthly_recurring_cost) {
            const cost = parseFloat(purchase.monthly_recurring_cost) || 0;
            monthlyTotal += cost;
            console.log('Added stored monthly cost:', cost);
          } else if (addon.monthly_management_cost && finalSiteCount > 0) {
            // Fallback: calculate from addon's monthly_management_cost per site
            const monthlyCost = parseFloat(addon.monthly_management_cost.toString());
            const calculated = monthlyCost * finalSiteCount;
            monthlyTotal += calculated;
            console.log('Calculated monthly cost:', { monthlyCost, finalSiteCount, calculated });
          } else if (purchase.price_type === 'monthly' && purchase.total_price) {
            const cost = parseFloat(purchase.total_price) || 0;
            monthlyTotal += cost;
            console.log('Added monthly cost from price_type:', cost);
          }
        });
        
        console.log('Final totals:', { monthlyTotal, oneTimeTotal, purchasedAddonsCount: addonsData.length });
        
        setTotalAddonMonthlyCost(monthlyTotal);
        setTotalAddonOneTimeCost(oneTimeTotal);
      } else {
        setPurchasedAddons([]);
        setTotalAddonMonthlyCost(0);
        setTotalAddonOneTimeCost(0);
      }

    } catch (err: any) {
      console.error('Error loading billing data:', err);
      setError(err.message || 'Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }

  function handlePlanChanged() {
    loadBillingData();
  }

  function handleAddonChanged() {
    loadBillingData();
  }

  async function requestDataExport(exportType: string = 'full') {
    if (!companyId) return;

    setExportLoading(true);
    try {
      // Call the API route to generate the export
      const response = await fetch('/api/billing/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          exportType: exportType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate export');
      }

      // Get the JSON data
      const exportData = await response.json();

      // Create a blob and download it
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checkly-export-${companyId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success message
      alert('Data export downloaded successfully!');
      
    } catch (err: any) {
      console.error('Error requesting data export:', err);
      alert(`Failed to export data: ${err.message || 'Please try again or contact support.'}`);
    } finally {
      setExportLoading(false);
    }
  }

  function getTrialDaysRemaining() {
    if (!subscription || subscription.status !== 'trial') return null;
    const days = differenceInDays(new Date(subscription.trial_ends_at), new Date());
    return Math.max(0, days);
  }

  function calculateMonthlyAmount(sub: Subscription | null, count: number): string {
    if (!sub || !sub.plan) return '0.00';
    
    const plan = sub.plan;
    const siteCount = count || sub.site_count || 0;
    
    if (plan.pricing_model === 'custom') {
      return sub.monthly_amount?.toFixed(2) || '0.00';
    }
    
    if (plan.pricing_model === 'flat_rate' && plan.flat_rate_price) {
      return plan.flat_rate_price.toFixed(2);
    }
    
    // Per site pricing (default)
    const pricePerSite = plan.price_per_site_monthly || 0;
    const total = pricePerSite * siteCount;
    return total.toFixed(2);
  }

  function getStatusBadge() {
    if (!subscription) return null;

    const statusConfig = {
      trial: { label: 'Free Trial', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', icon: Clock },
      active: { label: 'Active', color: 'bg-green-500/20 text-green-400 border-green-500/40', icon: CheckCircle2 },
      expired: { label: 'Expired', color: 'bg-red-500/20 text-red-400 border-red-500/40', icon: AlertCircle },
      cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-400 border-gray-500/40', icon: FileText },
      past_due: { label: 'Past Due', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40', icon: AlertCircle },
    };

    const config = statusConfig[subscription.status] || statusConfig.trial;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
    );
  }

  if (contextLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="p-8">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <p className="text-white/60 text-center">Please complete company setup to view billing information.</p>
        </div>
      </div>
    );
  }

  const trialDaysRemaining = getTrialDaysRemaining();
  const isTrialActive = subscription?.status === 'trial' && trialDaysRemaining !== null && trialDaysRemaining > 0;
  const isTrialExpired = subscription?.status === 'trial' && trialDaysRemaining !== null && trialDaysRemaining <= 0;
  const needsPlanSelection = !subscription || isTrialExpired || subscription.status === 'expired';

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">Billing & Subscription</h1>
        <p className="text-sm sm:text-base text-white/60">Manage your subscription, plans, add-ons, invoices, and data exports</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Trial Expired / Plan Selection Required Banner */}
      {needsPlanSelection && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                {isTrialExpired ? 'Trial Period Ended' : 'Select Your Subscription Plan'}
              </h3>
              <p className="text-white/80 mb-4">
                {isTrialExpired
                  ? 'Your 60-day free trial has ended. Please select a subscription plan to continue using Checkly. You can upgrade or modify your plan at any time.'
                  : 'Please select a subscription plan to continue. You can upgrade or modify your plan at any time.'}
              </p>
              <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setActiveTab('plans')}
            className="min-h-[44px] bg-[#EC4899] text-white hover:bg-[#EC4899]/90 active:bg-[#EC4899]/80 touch-manipulation w-full sm:w-auto"
          >
            Choose Your Plan
          </Button>
                {subscription && (
                  <span className="text-sm text-white/60 self-center">
                    Your current setup: {siteCount} {siteCount === 1 ? 'site' : 'sites'}
                    {purchasedAddons.length > 0 && `, ${purchasedAddons.length} add-on${purchasedAddons.length === 1 ? '' : 's'}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`min-h-[44px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 touch-manipulation ${
            activeTab === 'overview'
              ? 'bg-[#EC4899] text-white'
              : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1] active:bg-white/[0.15] border border-white/[0.1]'
          }`}
        >
          <Settings className="w-4 h-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`min-h-[44px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 touch-manipulation ${
            activeTab === 'plans'
              ? 'bg-[#EC4899] text-white'
              : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1] active:bg-white/[0.15] border border-white/[0.1]'
          }`}
        >
          <Package className="w-4 h-4" />
          Plans
        </button>
        <button
          onClick={() => setActiveTab('addons')}
          className={`min-h-[44px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 touch-manipulation ${
            activeTab === 'addons'
              ? 'bg-[#EC4899] text-white'
              : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1] active:bg-white/[0.15] border border-white/[0.1]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span className="hidden sm:inline">Add-ons & Offers</span>
          <span className="sm:hidden">Add-ons</span>
        </button>
      </div>

      {/* Plan Selection Tab */}
      {activeTab === 'plans' && companyId && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <PlanSelection
            companyId={companyId}
            currentPlanId={subscription?.plan_id || null}
            siteCount={siteCount}
            onPlanChanged={handlePlanChanged}
          />
        </div>
      )}

      {/* Add-ons Selection Tab */}
      {activeTab === 'addons' && companyId && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <AddonsSelection
            companyId={companyId}
            siteCount={siteCount}
            onAddonChanged={handleAddonChanged}
          />
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Subscription Status Card */}
          <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3">Current Subscription</h2>
            {subscription ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {getStatusBadge()}
                  <span className="text-white/60">
                    {subscription.plan?.display_name || 'No Plan'}
                  </span>
                </div>
                {subscription.billing_email && (
                  <p className="text-sm text-white/60">Billing email: {subscription.billing_email}</p>
                )}
              </div>
            ) : (
              <p className="text-white/60">No active subscription</p>
            )}
          </div>
          <Link href="/pricing">
            <Button variant="outline" size="sm">
              View Plans
            </Button>
          </Link>
        </div>

        {/* Trial Countdown */}
        {isTrialActive && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white font-medium">
                  {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} remaining in your free trial
                </p>
                <p className="text-sm text-white/60 mt-1">
                  Trial ends on {format(new Date(subscription.trial_ends_at), 'PPP')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Details */}
        {subscription && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mt-4 sm:mt-6">
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] border border-white/15 rounded-xl p-6 shadow-md">
              <p className="text-sm font-medium text-white/70 uppercase tracking-wide mb-2">Sites</p>
              <p className="text-4xl font-bold text-white">{siteCount || subscription.site_count || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-[#EC4899]/10 to-white/[0.04] border border-[#EC4899]/20 rounded-xl p-6 shadow-md">
              <p className="text-sm font-medium text-white/70 uppercase tracking-wide mb-2">Monthly Amount</p>
              <p className="text-2xl font-bold text-white">
                £{(() => {
                  // Use siteCount (current) if available, otherwise subscription.site_count
                  const currentSiteCount = siteCount || subscription.site_count || 0;
                  let planCost = 0;
                  if (subscription.plan?.pricing_model === 'per_site' && subscription.plan.price_per_site_monthly) {
                    planCost = subscription.plan.price_per_site_monthly * currentSiteCount;
                  } else if (subscription.monthly_amount) {
                    planCost = parseFloat(subscription.monthly_amount.toString());
                  } else {
                    planCost = parseFloat(calculateMonthlyAmount(subscription, currentSiteCount));
                  }
                  return (planCost + totalAddonMonthlyCost).toFixed(2);
                })()}
              </p>
              {subscription.plan && (
                <p className="text-xs text-white/50 mt-1">
                  {subscription.plan.pricing_model === 'per_site' && siteCount > 0
                    ? `${siteCount} site${siteCount !== 1 ? 's' : ''} × £${subscription.plan.price_per_site_monthly?.toFixed(2)}/site = £${(subscription.plan.price_per_site_monthly || 0) * siteCount}`
                    : subscription.plan.pricing_model === 'custom'
                    ? 'Custom pricing'
                    : subscription.plan.pricing_model === 'flat_rate'
                    ? 'Flat rate pricing'
                    : `£${subscription.plan.price_per_site_monthly?.toFixed(2)}/site`}
                  {totalAddonMonthlyCost > 0 && (
                    <span className="block mt-1">+ £{totalAddonMonthlyCost.toFixed(2)}/mo from add-ons</span>
                  )}
                </p>
              )}
            </div>
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] border border-white/15 rounded-xl p-6 shadow-md">
              <p className="text-sm font-medium text-white/70 uppercase tracking-wide mb-2">Price per Site</p>
              <p className="text-4xl font-bold text-white">
                £{subscription.plan?.price_per_site_monthly?.toFixed(2) || '0.00'}
              </p>
              {subscription.plan?.pricing_model === 'custom' && (
                <p className="text-xs text-white/50 mt-1">Custom pricing</p>
              )}
            </div>
          </div>
        )}

        {/* Cost Breakdown Section */}
        {purchasedAddons.length > 0 && (
          <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-2xl p-8 mt-8 shadow-lg">
            <h2 className="text-3xl font-bold text-white mb-6">Cost Breakdown</h2>
            
            <div className="space-y-4">
              {/* Subscription Plan Cost */}
              <div className="flex items-center justify-between py-4 px-4 bg-white/[0.05] rounded-lg border border-white/10">
                <div>
                  <p className="text-sm font-medium text-white/70 uppercase tracking-wide mb-1">Subscription Plan</p>
                  <p className="text-xs text-white/50">Base plan cost</p>
                </div>
                <span className="text-2xl font-bold text-white">
                  £{(() => {
                    if (!subscription) return '0.00';
                    const currentSiteCount = siteCount || subscription.site_count || 0;
                    let planCost = 0;
                    if (subscription.plan?.pricing_model === 'per_site' && subscription.plan.price_per_site_monthly) {
                      planCost = subscription.plan.price_per_site_monthly * currentSiteCount;
                    } else if (subscription.monthly_amount) {
                      planCost = parseFloat(subscription.monthly_amount.toString());
                    } else {
                      planCost = parseFloat(calculateMonthlyAmount(subscription, currentSiteCount));
                    }
                    return planCost.toFixed(2);
                  })()}/month
                </span>
              </div>

              {/* Add-on Monthly Costs */}
              {totalAddonMonthlyCost > 0 ? (
                <div className="flex items-center justify-between py-4 px-4 bg-white/[0.05] rounded-lg border border-white/10">
                  <div>
                    <p className="text-sm font-medium text-white/70 uppercase tracking-wide mb-1">Add-ons (Monthly)</p>
                    <p className="text-xs text-white/50">Recurring addon costs</p>
                  </div>
                  <span className="text-2xl font-bold text-[#EC4899]">
                    £{totalAddonMonthlyCost.toFixed(2)}/month
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between py-4 px-4 bg-white/[0.03] rounded-lg border border-white/10 opacity-50">
                  <div>
                    <p className="text-sm font-medium text-white/50 uppercase tracking-wide mb-1">Add-ons (Monthly)</p>
                    <p className="text-xs text-white/40">No monthly addon costs</p>
                  </div>
                  <span className="text-lg font-semibold text-white/40">£0.00/month</span>
                </div>
              )}

              {/* Add-on One-Time Costs */}
              {totalAddonOneTimeCost > 0 ? (
                <div className="flex items-center justify-between py-4 px-4 bg-white/[0.05] rounded-lg border border-white/10">
                  <div>
                    <p className="text-sm font-medium text-white/70 uppercase tracking-wide mb-1">Add-ons (One-Time)</p>
                    <p className="text-xs text-white/50">Hardware and setup costs</p>
                  </div>
                  <span className="text-2xl font-bold text-white">
                    £{totalAddonOneTimeCost.toFixed(2)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between py-4 px-4 bg-white/[0.03] rounded-lg border border-white/10 opacity-50">
                  <div>
                    <p className="text-sm font-medium text-white/50 uppercase tracking-wide mb-1">Add-ons (One-Time)</p>
                    <p className="text-xs text-white/40">No one-time addon costs</p>
                  </div>
                  <span className="text-lg font-semibold text-white/40">£0.00</span>
                </div>
              )}

              {/* Total Monthly */}
              {subscription && (
                <div className="flex items-center justify-between py-6 px-6 bg-gradient-to-r from-[#EC4899]/20 to-[#EC4899]/10 rounded-xl border-2 border-[#EC4899]/30 mt-4">
                  <div>
                    <span className="text-white font-bold text-xl">Total Monthly</span>
                    <p className="text-xs text-white/70 mt-1">All recurring costs combined</p>
                  </div>
                  <span className="text-4xl font-bold text-white">
                    £{(() => {
                      const currentSiteCount = siteCount || subscription.site_count || 0;
                      let planCost = 0;
                      if (subscription.plan?.pricing_model === 'per_site' && subscription.plan.price_per_site_monthly) {
                        planCost = subscription.plan.price_per_site_monthly * currentSiteCount;
                      } else if (subscription.monthly_amount) {
                        planCost = parseFloat(subscription.monthly_amount.toString());
                      } else {
                        planCost = parseFloat(calculateMonthlyAmount(subscription, currentSiteCount));
                      }
                      return (planCost + totalAddonMonthlyCost).toFixed(2);
                    })()}/month
                  </span>
                </div>
              )}

              {/* Add-on Details */}
              {purchasedAddons.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm text-white/60 mb-2">Active Add-ons:</p>
                  <div className="space-y-2">
                    {purchasedAddons.map((purchase: any) => {
                      const addon = purchase.addon;
                      if (!addon) return null;
                      
                      const oneTime = purchase.hardware_cost_total ? parseFloat(purchase.hardware_cost_total) : 
                                    (addon.name === 'personalized_onboarding' ? 1200.00 : 0);
                      // Get monthly cost from stored value, or calculate from monthly_management_cost if not stored
                      let monthly = purchase.monthly_recurring_cost ? parseFloat(purchase.monthly_recurring_cost) : 0;
                      if (!monthly && addon.monthly_management_cost && siteCount > 0) {
                        monthly = parseFloat(addon.monthly_management_cost) * siteCount;
                      }
                      
                      return (
                        <div key={purchase.id} className="flex items-center justify-between text-sm bg-white/[0.05] p-2 rounded">
                          <span className="text-white/70">{addon.display_name || addon.name}</span>
                          <div className="flex gap-3 text-white/80">
                            {oneTime > 0 && <span>£{oneTime.toFixed(2)} one-time</span>}
                            {monthly > 0 && <span>£{monthly.toFixed(2)}/mo</span>}
                            {oneTime === 0 && monthly === 0 && <span className="text-white/50">Free</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual Invoice Notice */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-white font-medium mb-1">Manual Invoicing</p>
              <p className="text-sm text-white/60">
                We invoice monthly via email. No automatic payments are set up. You'll receive invoices at the end of each billing period.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Section */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Invoice History</h2>
        
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-white/30 mx-auto mb-3" />
            <p className="text-white/60">No invoices yet</p>
            {isTrialActive && (
              <p className="text-sm text-white/40 mt-2">
                Invoices will appear here after your trial ends
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white/[0.05] border border-white/10 rounded-lg p-4 hover:bg-white/[0.08] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-white">{invoice.invoice_number}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        invoice.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                        invoice.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                        invoice.status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-sm text-white/60 space-y-1">
                      <p>
                        Period: {format(new Date(invoice.billing_period_start), 'MMM dd')} - {format(new Date(invoice.billing_period_end), 'MMM dd, yyyy')}
                      </p>
                      <p>
                        Due: {format(new Date(invoice.due_date), 'PPP')}
                        {invoice.paid_at && (
                          <span className="ml-2 text-green-400">
                            • Paid {format(new Date(invoice.paid_at), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">£{invoice.total_amount.toFixed(2)}</p>
                    {invoice.status === 'sent' && (
                      <Button variant="outline" size="sm" className="mt-2">
                        Download PDF
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Export Section */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-2">Data Export</h2>
        <p className="text-white/60 mb-4">
          Request a copy of your data. This is useful if you're leaving Checkly or need a backup. 
          Exports are provided in JSON format and typically ready within 24 hours.
        </p>
        
        <div className="space-y-3">
          <Button
            onClick={() => requestDataExport('full')}
            disabled={exportLoading}
            variant="outline"
            className="min-h-[44px] w-full md:w-auto touch-manipulation"
          >
            {exportLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Request Full Data Export
              </>
            )}
          </Button>
          
          <div className="text-sm text-white/60 mt-4">
            <p className="mb-2">Your export will include:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>All tasks and checklists</li>
              <li>Incident reports</li>
              <li>Asset and maintenance records</li>
              <li>SOPs and documentation</li>
              <li>Temperature logs</li>
              <li>Library items</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Terms & Cancellation */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-2">Terms & Cancellation</h2>
        <div className="space-y-3 text-white/60 text-sm">
          <p>
            • <strong className="text-white">60-Day Free Trial:</strong> New accounts get 60 days free. No payment required during trial.
          </p>
          <p>
            • <strong className="text-white">Monthly Billing:</strong> After trial, you'll be invoiced monthly. No automatic payments.
          </p>
          <p>
            • <strong className="text-white">60-Day Notice:</strong> To cancel, please provide 60 days written notice via email.
          </p>
          <p>
            • <strong className="text-white">Data Export:</strong> You can request your data at any time, including after cancellation.
          </p>
          <div className="pt-3 border-t border-white/10">
            <Link href="/terms" className="text-pink-400 hover:text-pink-300 inline-flex items-center gap-1">
              View Full Terms <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

