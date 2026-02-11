/**
 * Feature Flag Utilities for Offline Mode
 * Controls offline feature rollout per company
 */

import { createClient } from '@/lib/supabase';

/**
 * Check if offline mode is enabled for a company
 */
export async function isOfflineEnabledForCompany(companyId: string): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('company_id', companyId)
    .eq('feature', 'offline_mode')
    .single();

  if (error) {
    console.debug('[OfflineFlags] No feature flag found for company:', companyId);
    return false; // Default to disabled
  }

  return data?.enabled ?? false;
}

/**
 * Enable offline mode for a company (admin operation)
 */
export async function enableOfflineModeForCompany(
  companyId: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('feature_flags')
    .upsert({
      company_id: companyId,
      feature: 'offline_mode',
      enabled: true,
      metadata: metadata || {},
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'company_id,feature'
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Disable offline mode for a company (admin operation)
 */
export async function disableOfflineModeForCompany(
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('feature_flags')
    .update({
      enabled: false,
      updated_at: new Date().toISOString()
    })
    .eq('company_id', companyId)
    .eq('feature', 'offline_mode');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get all feature flags for a company
 */
export async function getFeatureFlagsForCompany(
  companyId: string
): Promise<{ feature: string; enabled: boolean; metadata?: any }[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('feature_flags')
    .select('feature, enabled, metadata')
    .eq('company_id', companyId);

  if (error) {
    console.error('[OfflineFlags] Failed to fetch feature flags:', error);
    return [];
  }

  return data || [];
}

/**
 * Client-side hook to check if offline mode is enabled
 * Uses the current user's company from AppContext
 */
export function useOfflineEnabled(): boolean {
  // This will be implemented in the next phase when we integrate with AppContext
  // For now, default to enabled for development
  return true; // TODO: Replace with actual AppContext check
}
