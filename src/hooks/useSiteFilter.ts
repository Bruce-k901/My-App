/**
 * useSiteFilter Hook
 * 
 * Provides utilities for filtering data by the currently selected site.
 * This hook reads from SiteContext and provides helper functions to:
 * - Apply site filters to Supabase queries
 * - Add site_id to new records
 * - Check if "all sites" view is active
 * 
 * Usage:
 * ```typescript
 * const { applySiteFilter, createRecord, selectedSiteId, isAllSites } = useSiteFilter();
 * 
 * // Fetching data
 * const { data } = await applySiteFilter(
 *   supabase.from('tasks').select('*')
 * ).order('created_at');
 * 
 * // Creating data
 * const newTask = createRecord({
 *   title: 'New task',
 *   status: 'pending'
 * });
 * await supabase.from('tasks').insert(newTask);
 * ```
 */

import { useSiteContext } from "@/contexts/SiteContext";
import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";

/**
 * Hook for site-based data filtering
 * 
 * @returns Object with filtering utilities and current site state
 */
export function useSiteFilter() {
  const { selectedSiteId, loading } = useSiteContext();

  /**
   * Apply site filter to a Supabase query
   * 
   * If selectedSiteId is 'all', returns the query unchanged (no filter).
   * Otherwise, adds .eq('site_id', selectedSiteId) to the query.
   * 
   * @param query - Supabase query builder
   * @returns Query builder with site filter applied (if not 'all')
   */
  function applySiteFilter<T>(
    query: PostgrestFilterBuilder<any, T, any>
  ): PostgrestFilterBuilder<any, T, any> {
    if (selectedSiteId === "all" || loading) {
      return query;
    }
    return query.eq("site_id", selectedSiteId);
  }

  /**
   * Add site_id to a record before inserting
   * 
   * If selectedSiteId is 'all', throws an error because you must
   * select a specific site to create records.
   * 
   * @param data - Record data to add site_id to
   * @returns Record with site_id added
   * @throws Error if selectedSiteId is 'all'
   */
  function createRecord<T extends Record<string, any>>(data: T): T & { site_id: string } {
    if (selectedSiteId === "all") {
      throw new Error(
        "Cannot create record: Please select a specific site first. 'All Sites' view is read-only for creating records."
      );
    }
    if (loading) {
      throw new Error("Cannot create record: Site context is still loading.");
    }
    return {
      ...data,
      site_id: selectedSiteId,
    };
  }

  /**
   * Check if currently viewing "all sites"
   */
  const isAllSites = selectedSiteId === "all";

  return {
    selectedSiteId,
    isAllSites,
    loading,
    applySiteFilter,
    createRecord,
  };
}
