/**
 * Subscription utilities
 * Handles auto-creation of subscriptions for new companies
 *
 * Simplified pricing model: £300/site/month, everything included
 */

import { supabase } from './supabase';

/**
 * Auto-create a trial subscription for a new company
 * Called when a company is first created
 * Always uses the 'opsly' plan (£300/site/month)
 */
export async function createTrialSubscription(companyId: string, planName: string = 'opsly') {
  try {
    // Count active sites for this company
    const { count: siteCount } = await supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const finalSiteCount = siteCount || 0;

    // Get the opsly plan (single unified plan)
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', 'opsly')
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.error('Error fetching plan:', planError);
      return { error: 'Plan not found' };
    }

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
        site_count: finalSiteCount,
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
 * No more auto-plan switching - everyone is on 'opsly' plan
 */
export async function updateSubscriptionSiteCount(companyId: string) {
  try {
    // Count active sites for this company
    const { count: siteCount } = await supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const finalSiteCount = siteCount || 0;

    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('company_subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subError);
      return { error: subError.message };
    }

    if (!subscription) {
      // No subscription exists, create one
      return await createTrialSubscription(companyId);
    }

    // Just update the site count - the DB trigger handles monthly_amount calculation
    const { error: updateError } = await supabase
      .from('company_subscriptions')
      .update({
        site_count: finalSiteCount,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return { error: updateError.message };
    }

    return { success: true, siteCount: finalSiteCount };
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
