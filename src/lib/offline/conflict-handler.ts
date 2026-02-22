/**
 * Conflict Handler
 * Manages sync conflicts with toast-based resolution
 */

import { toast } from 'sonner';
import { updatePendingWrite, deletePendingWrite } from '@/lib/offline/db';

export type ConflictType = 'duplicate' | 'version' | 'deleted' | 'unauthorized';

export interface ConflictDetails {
  writeId: string;
  operation: string;
  conflictType: ConflictType;
  serverData?: any;
  localData?: any;
  message?: string;
}

/**
 * Handle sync conflicts based on type
 */
export async function handleSyncConflict(details: ConflictDetails): Promise<void> {
  const { writeId, operation, conflictType, serverData, localData, message } = details;

  switch (conflictType) {
    case 'duplicate':
      // Task/record already completed by someone else
      await handleDuplicateConflict(writeId, operation, serverData);
      break;

    case 'version':
      // Data was modified since we went offline (e.g., stock count updated)
      await handleVersionConflict(writeId, operation, serverData, localData);
      break;

    case 'deleted':
      // Entity was deleted while offline (e.g., asset removed)
      await handleDeletedConflict(writeId, operation, message);
      break;

    case 'unauthorized':
      // User no longer has permission
      await handleUnauthorizedConflict(writeId, operation);
      break;

    default:
      console.warn('[Conflict Handler] Unknown conflict type:', conflictType);
      await markWriteFailed(writeId, 'Unknown conflict type');
  }
}

/**
 * Handle duplicate submission (95% of conflicts)
 */
async function handleDuplicateConflict(
  writeId: string,
  operation: string,
  serverData?: any
): Promise<void> {
  // Mark as resolved (accepted as duplicate)
  await deletePendingWrite(writeId);

  // Show info toast
  toast.info('Already completed', {
    description: serverData?.completedBy
      ? `${serverData.completedBy} completed "${serverData.taskName || operation}" at ${formatTime(serverData.completedAt)}`
      : `This ${operation.replace(/_/g, ' ')} was already completed. Your submission recorded as duplicate.`,
    duration: 8000
  });
}

/**
 * Handle version conflict (requires user decision)
 */
async function handleVersionConflict(
  writeId: string,
  operation: string,
  serverData?: any,
  localData?: any
): Promise<void> {
  // For now, use last-write-wins (local wins)
  // In the future, show ConflictModal for user to decide

  await deletePendingWrite(writeId);

  toast.warning('Data conflict resolved', {
    description: `The ${operation.replace(/_/g, ' ')} was updated by ${serverData?.updatedBy || 'another user'}. Your changes were applied.`,
    duration: 8000,
    action: {
      label: 'View Details',
      onClick: () => {
        // TODO: Show conflict details modal
        console.log('[Conflict] Version conflict details:', { serverData, localData });
      }
    }
  });
}

/**
 * Handle deleted entity conflict
 */
async function handleDeletedConflict(
  writeId: string,
  operation: string,
  message?: string
): Promise<void> {
  await markWriteFailed(writeId, 'Entity deleted');

  toast.error('Sync failed', {
    description: message || `The ${operation.replace(/_/g, ' ')} target was deleted. Your changes could not be applied.`,
    duration: 10000,
    action: {
      label: 'Dismiss',
      onClick: () => {
        // User acknowledged
      }
    }
  });
}

/**
 * Handle unauthorized conflict
 */
async function handleUnauthorizedConflict(
  writeId: string,
  operation: string
): Promise<void> {
  await markWriteFailed(writeId, 'Unauthorized');

  toast.error('Permission denied', {
    description: `You no longer have permission to ${operation.replace(/_/g, ' ')}. Please contact your manager.`,
    duration: 10000
  });
}

/**
 * Mark a write as failed
 */
async function markWriteFailed(writeId: string, error: string): Promise<void> {
  await updatePendingWrite(writeId, {
    status: 'failed',
    error
  });
}

/**
 * Mark a write as resolved (accepted)
 */
export async function markWriteResolved(writeId: string): Promise<void> {
  await deletePendingWrite(writeId);
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp?: string): string {
  if (!timestamp) return 'recently';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  return date.toLocaleString();
}

/**
 * Detect conflict type from API error response
 */
export function detectConflictType(error: any): ConflictType | null {
  if (!error) return null;

  const message = error.message?.toLowerCase() || error.error?.toLowerCase() || '';

  if (message.includes('already completed') || message.includes('duplicate')) {
    return 'duplicate';
  }

  if (message.includes('modified') || message.includes('version conflict')) {
    return 'version';
  }

  if (message.includes('not found') || message.includes('deleted')) {
    return 'deleted';
  }

  if (message.includes('unauthorized') || message.includes('permission denied')) {
    return 'unauthorized';
  }

  return null;
}
