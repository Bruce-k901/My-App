/**
 * Subscription utilities
 * Handles auto-creation of subscriptions for new companies
 */

import { supabase } from './supabase';

/**
 * Auto-create a trial subscription for a new company
 * Called when a company is first created
 */
export async function createTrialSubscription(companyId: string, planName: string = 'starter') {
  try {
    // Get the plan
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', planName)
      .single();

    if (planError || !plan) {
      console.error('Error fetching plan:', planError);
      return { error: 'Plan not found' };
    }

    // Count sites for this company
    const { count: siteCount } = await supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    // Create subscription with 60-day trial
    const trialStartedAt = new Date().toISOString();
    const trialEndsAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const { data: subscription, error: subError } = await supabase
      .from('company_subscriptions')
      .insert({
        company_id: companyId,
        plan_id: plan.id,
        trial_started_at: trialStartedAt,
        trial_ends_at: trialEndsAt,
        trial_used: true,
        status: 'trial',
        site_count: siteCount || 0,
      })
      .select()
      .single();

    if (subError) {
      console.error('Error creating subscription:', subError);
      return { error: subError.message };
    }

    return { data: subscription };
  } catch (error: any) {
    console.error('Error in createTrialSubscription:', error);
    return { error: error.message };
  }
}

/**
 * Update site count for a subscription
 * Call this when sites are added/removed
 * Automatically switches between Starter (1 site) and Pro (2+ sites)
 */
export async function updateSubscriptionSiteCount(companyId: string) {
  try {
    const { count: siteCount } = await supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('company_subscriptions')
      .select('*, plan:subscription_plans(name)')
      .eq('company_id', companyId)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subError);
      return { error: subError.message };
    }

    if (!subscription) {
      // No subscription exists, create one
      const planName = (siteCount || 0) === 1 ? 'starter' : 'pro';
      return await createTrialSubscription(companyId, planName);
    }

    // Determine which plan should be used based on site count
    const currentPlanName = (subscription.plan as any)?.name;
    let targetPlanName = currentPlanName;

    if ((siteCount || 0) === 1 && currentPlanName !== 'starter') {
      // Switch to Starter for single site
      targetPlanName = 'starter';
    } else if ((siteCount || 0) >= 2 && currentPlanName === 'starter') {
      // Switch to Pro for multiple sites
      targetPlanName = 'pro';
    }

    // Get the target plan ID
    const { data: targetPlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', targetPlanName)
      .single();

    if (planError || !targetPlan) {
      console.error('Error fetching target plan:', planError);
      return { error: 'Plan not found' };
    }

    // Update subscription with new site count and plan if changed
    const updateData: any = { site_count: siteCount || 0 };
    if (targetPlanName !== currentPlanName) {
      updateData.plan_id = targetPlan.id;
    }

    const { error: updateError } = await supabase
      .from('company_subscriptions')
      .update(updateData)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return { error: updateError.message };
    }

    return { success: true, planChanged: targetPlanName !== currentPlanName };
  } catch (error: any) {
    console.error('Error in updateSubscriptionSiteCount:', error);
    return { error: error.message };
  }
}

/**
 * Check if a company's trial has expired
 */
export async function checkTrialStatus(companyId: string) {
  try {
    const { data: subscription, error } = await supabase
      .from('company_subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (error || !subscription) {
      return { isTrialActive: false, daysRemaining: 0 };
    }

    const now = new Date();
    const trialEndsAt = new Date(subscription.trial_ends_at);
    const daysRemaining = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      isTrialActive: subscription.status === 'trial' && daysRemaining > 0,
      daysRemaining,
      subscription,
    };
  } catch (error: any) {
    console.error('Error checking trial status:', error);
    return { isTrialActive: false, daysRemaining: 0 };
  }
}

