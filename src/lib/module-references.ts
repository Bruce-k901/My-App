/**
 * Module References System - Helper Library
 * 
 * Provides functions for creating and querying cross-module entity links
 * All functions require companyId and profileId as parameters (not from hooks)
 */

import { supabase } from '@/lib/supabase';
import type {
  CreateModuleReferenceInput,
  LinkedEntity,
  ReferencedEntity,
  UnlinkEntitiesParams,
  ModuleReference,
} from '@/types/module-references';

export class ModuleReferences {
  /**
   * Link two entities together
   * 
   * @param input - Reference creation input
   * @param companyId - Current user's company ID (from useAppContext)
   * @param profileId - Current user's profile ID (from useAppContext, optional)
   * @returns UUID of created link, or null if link already exists
   */
  static async linkEntities(
    input: CreateModuleReferenceInput,
    companyId: string,
    profileId?: string | null
  ): Promise<string | null> {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const { data, error } = await supabase.rpc('link_entities', {
      p_source_module: input.source_module,
      p_source_table: input.source_table,
      p_source_id: input.source_id,
      p_target_module: input.target_module,
      p_target_table: input.target_table,
      p_target_id: input.target_id,
      p_company_id: companyId,
      p_created_by_profile_id: profileId || null,
      p_link_type: input.link_type || null,
      p_metadata: input.metadata || null,
    });

    if (error) {
      console.error('Error linking entities:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get all entities that link TO a specific target
   * Example: Get all tasks that reference this waste record
   * 
   * @param targetModule - Module name (e.g., 'stockly')
   * @param targetTable - Table name (e.g., 'waste_logs')
   * @param targetId - Entity ID
   * @returns Array of source entities that link to the target
   */
  static async getLinkedEntities(
    targetModule: string,
    targetTable: string,
    targetId: string
  ): Promise<LinkedEntity[]> {
    const { data, error } = await supabase.rpc('get_linked_entities', {
      p_target_module: targetModule,
      p_target_table: targetTable,
      p_target_id: targetId,
    });

    if (error) {
      console.error('Error getting linked entities:', error);
      throw error;
    }

    return (data || []) as LinkedEntity[];
  }

  /**
   * Get all entities that a source entity links TO
   * Example: Get all waste records linked from this task
   * 
   * @param sourceModule - Module name (e.g., 'checkly')
   * @param sourceTable - Table name (e.g., 'checklist_tasks')
   * @param sourceId - Entity ID
   * @returns Array of target entities that the source links to
   */
  static async getReferencesFrom(
    sourceModule: string,
    sourceTable: string,
    sourceId: string
  ): Promise<ReferencedEntity[]> {
    const { data, error } = await supabase.rpc('get_references_from', {
      p_source_module: sourceModule,
      p_source_table: sourceTable,
      p_source_id: sourceId,
    });

    if (error) {
      console.error('Error getting references from:', error);
      throw error;
    }

    return (data || []) as ReferencedEntity[];
  }

  /**
   * Remove a link between two entities
   * 
   * @param params - Parameters identifying the link to remove
   * @returns true if link was deleted, false if not found
   */
  static async unlinkEntities(
    params: UnlinkEntitiesParams
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('unlink_entities', {
      p_source_module: params.source_module,
      p_source_table: params.source_table,
      p_source_id: params.source_id,
      p_target_module: params.target_module,
      p_target_table: params.target_table,
      p_target_id: params.target_id,
    });

    if (error) {
      console.error('Error unlinking entities:', error);
      throw error;
    }

    return data || false;
  }

  /**
   * Delete all references to/from an entity (cleanup helper)
   * Useful when deleting an entity to prevent orphaned references
   * 
   * @param module - Module name
   * @param table - Table name
   * @param entityId - Entity ID
   * @param companyId - Company ID for RLS filtering
   */
  static async deleteAllReferences(
    module: string,
    table: string,
    entityId: string,
    companyId: string
  ): Promise<void> {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Delete references where entity is source
    const { error: sourceError } = await supabase
      .from('module_references')
      .delete()
      .eq('source_module', module)
      .eq('source_table', table)
      .eq('source_id', entityId)
      .eq('company_id', companyId);

    if (sourceError) {
      console.error('Error deleting source references:', sourceError);
      throw sourceError;
    }

    // Delete references where entity is target
    const { error: targetError } = await supabase
      .from('module_references')
      .delete()
      .eq('target_module', module)
      .eq('target_table', table)
      .eq('target_id', entityId)
      .eq('company_id', companyId);

    if (targetError) {
      console.error('Error deleting target references:', targetError);
      throw targetError;
    }
  }
}

/**
 * Convenience helpers for common linking patterns
 */
export class LinkHelpers {
  /**
   * Link a task to a waste log
   */
  static async linkTaskToWaste(
    taskId: string,
    wasteId: string,
    companyId: string,
    profileId?: string | null,
    metadata?: Record<string, any>
  ): Promise<string | null> {
    return ModuleReferences.linkEntities(
      {
        source_module: 'checkly',
        source_table: 'checklist_tasks',
        source_id: taskId,
        target_module: 'stockly',
        target_table: 'waste_logs',
        target_id: wasteId,
        link_type: 'generated_waste',
        metadata,
      },
      companyId,
      profileId
    );
  }

  /**
   * Link a delivery to a task
   */
  static async linkDeliveryToTask(
    deliveryId: string,
    taskId: string,
    companyId: string,
    profileId?: string | null,
    metadata?: Record<string, any>
  ): Promise<string | null> {
    return ModuleReferences.linkEntities(
      {
        source_module: 'stockly',
        source_table: 'deliveries',
        source_id: deliveryId,
        target_module: 'checkly',
        target_table: 'checklist_tasks',
        target_id: taskId,
        link_type: 'created_task',
        metadata,
      },
      companyId,
      profileId
    );
  }

  /**
   * Get all tasks linked to a waste record
   */
  static async getTasksForWaste(wasteId: string): Promise<LinkedEntity[]> {
    return ModuleReferences.getLinkedEntities(
      'stockly',
      'waste_logs',
      wasteId
    );
  }

  /**
   * Get all waste records linked from a task
   */
  static async getWasteForTask(taskId: string): Promise<ReferencedEntity[]> {
    return ModuleReferences.getReferencesFrom(
      'checkly',
      'checklist_tasks',
      taskId
    );
  }
}
