/**
 * Module References System - React Hooks
 * 
 * Provides React Query hooks for managing cross-module entity links
 * Uses @tanstack/react-query for data fetching and caching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ModuleReferences, LinkHelpers } from '@/lib/module-references';
import { useAppContext } from '@/context/AppContext';
import type {
  CreateModuleReferenceInput,
  LinkedEntity,
  ReferencedEntity,
  UnlinkEntitiesParams,
} from '@/types/module-references';

/**
 * Get all entities linked TO a target entity
 * Example: Get all tasks that link to this waste record
 */
export function useLinkedEntities(
  targetModule: string,
  targetTable: string,
  targetId: string | null | undefined
) {
  return useQuery({
    queryKey: ['module-references', 'linked-to', targetModule, targetTable, targetId],
    queryFn: () => {
      if (!targetId) {
        throw new Error('targetId is required');
      }
      return ModuleReferences.getLinkedEntities(targetModule, targetTable, targetId);
    },
    enabled: !!targetId,
  });
}

/**
 * Get all entities that a source entity links TO
 * Example: Get all waste records linked from this task
 */
export function useReferencesFrom(
  sourceModule: string,
  sourceTable: string,
  sourceId: string | null | undefined
) {
  return useQuery({
    queryKey: ['module-references', 'from', sourceModule, sourceTable, sourceId],
    queryFn: () => {
      if (!sourceId) {
        throw new Error('sourceId is required');
      }
      return ModuleReferences.getReferencesFrom(sourceModule, sourceTable, sourceId);
    },
    enabled: !!sourceId,
  });
}

/**
 * Hook to link two entities
 * Automatically uses companyId and profileId from AppContext
 */
export function useLinkEntities() {
  const queryClient = useQueryClient();
  const { companyId, profile } = useAppContext();

  return useMutation({
    mutationFn: (input: CreateModuleReferenceInput) => {
      if (!companyId) {
        throw new Error('Company ID is required. User must be logged in.');
      }
      return ModuleReferences.linkEntities(
        input,
        companyId,
        profile?.id || null
      );
    },
    onSuccess: () => {
      // Invalidate relevant queries to refetch linked entities
      queryClient.invalidateQueries({ queryKey: ['module-references'] });
    },
  });
}

/**
 * Hook to unlink two entities
 */
export function useUnlinkEntities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UnlinkEntitiesParams) =>
      ModuleReferences.unlinkEntities(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-references'] });
    },
  });
}

/**
 * Convenience hook: Get all tasks linked to a waste record
 */
export function useWasteTasks(wasteId: string | null | undefined) {
  return useLinkedEntities('stockly', 'waste_logs', wasteId);
}

/**
 * Convenience hook: Get all waste records linked from a task
 */
export function useTaskWaste(taskId: string | null | undefined) {
  return useReferencesFrom('checkly', 'checklist_tasks', taskId);
}

/**
 * Convenience hook: Link a task to a waste record
 */
export function useLinkTaskToWaste() {
  const queryClient = useQueryClient();
  const { companyId, profile } = useAppContext();

  return useMutation({
    mutationFn: ({
      taskId,
      wasteId,
      metadata,
    }: {
      taskId: string;
      wasteId: string;
      metadata?: Record<string, any>;
    }) => {
      if (!companyId) {
        throw new Error('Company ID is required. User must be logged in.');
      }
      return LinkHelpers.linkTaskToWaste(
        taskId,
        wasteId,
        companyId,
        profile?.id || null,
        metadata
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-references'] });
    },
  });
}

/**
 * Convenience hook: Get all references for an entity (bidirectional)
 * Returns both incoming and outgoing references
 */
export function useAllReferences(
  module: string,
  table: string,
  entityId: string | null | undefined
) {
  const incoming = useLinkedEntities(module, table, entityId);
  const outgoing = useReferencesFrom(module, table, entityId);

  return {
    incoming: incoming.data || [],
    outgoing: outgoing.data || [],
    isLoading: incoming.isLoading || outgoing.isLoading,
    isError: incoming.isError || outgoing.isError,
    error: incoming.error || outgoing.error,
    refetch: () => {
      incoming.refetch();
      outgoing.refetch();
    },
  };
}
