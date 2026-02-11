"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, Loader2 } from "@/components/ui/icons";
import { Button } from "@/components/ui";
import GlassCard from "@/components/ui/GlassCard";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_per_site_monthly: number;
  pricing_model: 'per_site' | 'flat_rate' | 'custom';
  flat_rate_price: number | null;
  min_sites: number | null;
  max_sites: number | null;
  features: string[];
}

interface PlanSelectionProps {
  companyId: string;
  currentPlanId: string | null;
  siteCount: number;
  onPlanChanged?: () => void;
}

export default function PlanSelection({
  companyId,
  currentPlanId,
  siteCount,
  onPlanChanged,
}: PlanSelectionProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(currentPlanId);

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    setSelectedPlan(currentPlanId);
  }, [currentPlanId]);

  async function loadPlans() {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_per_site_monthly', { ascending: true });

      if (error) throw error;

      const plansWithFeatures = (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : [],
      }));

      setPlans(plansWithFeatures);
    } catch (error: any) {
      console.error('Error loading plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  }

  async function handlePlanChange(planId: string) {
    if (changingPlan) return;

    setChangingPlan(planId);
    try {
      const response = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          plan_id: planId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to change plan');
      }

      setSelectedPlan(planId);
      toast.success('Plan updated successfully');
      onPlanChanged?.();
    } catch (error: any) {
      console.error('Error changing plan:', error);
      toast.error(error.message || 'Failed to change plan');
    } finally {
      setChangingPlan(null);
    }
  }

  function getPlanPrice(plan: Plan): string {
    if (plan.pricing_model === 'custom') {
      return 'Custom';
    }
    
    if (plan.pricing_model === 'flat_rate' && plan.flat_rate_price) {
      return `£${plan.flat_rate_price.toFixed(2)}`;
    }

    // Per site pricing
    if (siteCount === 1) {
      return `£${plan.price_per_site_monthly.toFixed(2)}`;
    }
    
    return `£${(plan.price_per_site_monthly * siteCount).toFixed(2)}`;
  }

  function getPlanPriceDescription(plan: Plan): string {
    if (plan.pricing_model === 'custom') {
      return 'pricing available';
    }
    
    // Per site pricing (default)
    if (siteCount === 1) {
      return 'per site / month';
    }

    return `per site / month (${siteCount} sites = £${(plan.price_per_site_monthly * siteCount).toFixed(2)}/month)`;
  }

  function isPlanAvailable(plan: Plan): boolean {
    // Enterprise is always available (custom pricing)
    if (plan.name === 'enterprise') return true;

    // Starter: available for single site users
    if (plan.name === 'starter') {
      return siteCount === 1;
    }

    // Pro: available for 2+ sites
    if (plan.name === 'pro') {
      return siteCount >= 2;
    }

    return true;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#D37E91]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Select Your Plan</h2>
        <p className="text-white/60 text-sm">
          {siteCount === 1
            ? "As a single site user, you can choose Starter or upgrade to Pro or Enterprise."
            : `You have ${siteCount} sites. Choose the plan that best fits your needs.`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrentPlan = selectedPlan === plan.id;
          const isAvailable = isPlanAvailable(plan);
          const isChanging = changingPlan === plan.id;

          return (
            <GlassCard
              key={plan.id}
              className={`flex flex-col min-h-[400px] relative transition-all ${
                isCurrentPlan
                  ? 'border-[#D37E91] shadow-[0_0_18px_rgba(211, 126, 145,0.35)]'
                  : isAvailable
                  ? 'hover:border-[#D37E91]/50 hover:shadow-[0_0_12px_rgba(211, 126, 145,0.2)] cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => {
                if (isAvailable && !isCurrentPlan && !isChanging) {
                  handlePlanChange(plan.id);
                }
              }}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#D37E91] text-white px-3 py-1 rounded-full text-xs font-semibold">
                  Current Plan
                </div>
              )}

              {plan.name === 'pro' && !isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#D37E91] text-black px-3 py-1 rounded-full text-xs font-semibold">
                  Most Popular
                </div>
              )}

              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">{plan.display_name}</h3>
                
                {plan.name === 'starter' && (
                  <p className="text-sm text-white/60 mb-4">For single cafés, restaurants, or bakeries</p>
                )}
                {plan.name === 'pro' && (
                  <p className="text-sm text-white/60 mb-4">For multi-site operators & growing groups</p>
                )}
                {plan.name === 'enterprise' && (
                  <p className="text-sm text-white/60 mb-4">For hotels, schools, and multi-venue operators</p>
                )}

                <div className="mb-4">
                  <p className="text-3xl font-bold text-[#D37E91] mb-1">
                    {getPlanPrice(plan)}
                  </p>
                  <p className="text-sm text-white/60">{getPlanPriceDescription(plan)}</p>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-white/80">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-4 border-t border-white/10">
                {!isAvailable && (
                  <p className="text-xs text-white/40 text-center mb-3">
                    {plan.name === 'starter' && siteCount > 1
                      ? 'Available for single site only'
                      : plan.name === 'pro' && siteCount === 1
                      ? 'Available for 2+ sites'
                      : 'Not available'}
                  </p>
                )}

                {isCurrentPlan ? (
                  <Button variant="outline" fullWidth disabled>
                    Current Plan
                  </Button>
                ) : isChanging ? (
                  <Button variant="outline" fullWidth disabled>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Changing...
                  </Button>
                ) : isAvailable ? (
                  <Button
                    variant="outline"
                    fullWidth
                    className="border-[#D37E91] text-[#D37E91] hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)]"
                  >
                    Select Plan
                  </Button>
                ) : (
                  <Button variant="outline" fullWidth disabled>
                    Not Available
                  </Button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {siteCount === 1 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-white/80">
            <strong className="text-white">Note:</strong> As a single site user, you can choose Starter (£40/month) 
            or upgrade to Pro (£55/month) for access to advanced features. Enterprise plans are available 
            with custom pricing - contact sales for details.
          </p>
        </div>
      )}
    </div>
  );
}

