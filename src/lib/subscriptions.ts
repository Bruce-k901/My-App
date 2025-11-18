/**
 * Subscription utilities
 * Handles auto-creation of subscriptions for new companies
 */

import { supabase } from './supabase';

/**
 * Auto-create a trial subscription for a new company
 * Called when a company is first created
 */
export async function createTrialSubscription(companyId: string, planName: string | null = null) {
  try {
    // Count active sites for this company
    // Note: archived column may not exist in sites table
    const { count: siteCount } = await supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const finalSiteCount = siteCount || 0;

    // Auto-assign plan based on site count if not specified:
    // - 1 site = Starter plan
    // - More than 1 site = Pro plan
    if (!planName) {
      planName = finalSiteCount === 1 ? 'starter' : 'pro';
    }

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
 * Update site count for a subscription and auto-assign plan
 * Call this when sites are added/removed
 * Automatically assigns plans based on site count:
 * - 1 site = Starter plan
 * - More than 1 site = Pro plan
 */
export async function updateSubscriptionSiteCount(companyId: string) {
  try {
    // Count active sites for this company
    // Note: archived column may not exist in sites table
    const { count: siteCount } = await supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const finalSiteCount = siteCount || 0;

    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('company_subscriptions')
      .select('*, plan:subscription_plans(name, pricing_model)')
      .eq('company_id', companyId)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subError);
      return { error: subError.message };
    }

    if (!subscription) {
      // No subscription exists, create one based on site count
      const planName = finalSiteCount === 1 ? 'starter' : 'pro';
      return await createTrialSubscription(companyId, planName);
    }

    // Automatically assign plan based on site count:
    // - 1 site = Starter plan
    // - More than 1 site = Pro plan
    let targetPlanName = finalSiteCount === 1 ? 'starter' : 'pro';
    const currentPlanName = (subscription.plan as any)?.name;

    // Check if plan needs to be changed
    if (currentPlanName !== targetPlanName) {
      // Get the target plan
      const { data: targetPlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', targetPlanName)
        .single();

      if (planError || !targetPlan) {
        console.error('Error fetching target plan:', planError);
        // Continue with just updating site count if plan fetch fails
      } else {
        // Update both plan and site count
        const { error: updateError } = await supabase
          .from('company_subscriptions')
          .update({ 
            plan_id: targetPlan.id,
            site_count: finalSiteCount,
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
          return { error: updateError.message };
        }

        return { 
          success: true, 
          siteCount: finalSiteCount,
          planChanged: true,
          newPlan: targetPlanName,
        };
      }
    }

    // Only update site count if plan doesn't need to change
    const { error: updateError } = await supabase
      .from('company_subscriptions')
      .update({ site_count: finalSiteCount })
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
 * Change subscription plan
 * Allows users to manually select Starter, Pro, or Enterprise
 */
export async function changeSubscriptionPlan(companyId: string, planName: string) {
  try {
    // Get the plan
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id, name, pricing_model, flat_rate_price')
      .eq('name', planName)
      .single();

    if (planError || !plan) {
      console.error('Error fetching plan:', planError);
      return { error: 'Plan not found' };
    }

    // Count active sites for this company
    // Note: archived column may not exist in sites table
    const { count: siteCount } = await supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const finalSiteCount = siteCount || 0;

    // Validate plan availability
    if (plan.name === 'starter' && finalSiteCount > 1) {
      return { error: 'Starter plan is only available for single site users' };
    }

    if (plan.name === 'pro' && finalSiteCount < 2) {
      return { error: 'Pro plan requires 2 or more sites' };
    }

    // Get or create subscription
    const { data: existingSubscription } = await supabase
      .from('company_subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (existingSubscription) {
      // Update existing subscription
      const updateData: any = {
        plan_id: plan.id,
        site_count: finalSiteCount,
        updated_at: new Date().toISOString(),
      };

      // If trial ended and switching to paid plan, update status
      if (existingSubscription.status === 'trial' || existingSubscription.status === 'expired') {
        updateData.status = 'active';
        updateData.subscription_started_at = new Date().toISOString();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        updateData.subscription_ends_at = endDate.toISOString();
      }

      const { data: updated, error: updateError } = await supabase
        .from('company_subscriptions')
        .update(updateData)
        .eq('company_id', companyId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return { error: 'Failed to update subscription' };
      }

      return { data: updated };
    } else {
      // Create new subscription
      const trialStartedAt = new Date().toISOString();
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 60);

      const { data: newSubscription, error: createError } = await supabase
        .from('company_subscriptions')
        .insert({
          company_id: companyId,
          plan_id: plan.id,
          trial_started_at: trialStartedAt,
          trial_ends_at: trialEndsAt.toISOString(),
          trial_used: true,
          status: 'trial',
          site_count: finalSiteCount,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating subscription:', createError);
        return { error: 'Failed to create subscription' };
      }

      return { data: newSubscription };
    }
  } catch (error: any) {
    console.error('Error in changeSubscriptionPlan:', error);
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

