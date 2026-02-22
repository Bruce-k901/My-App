/**
 * Offline Task Submission Hook
 * Handles task completion with offline queueing support
 */

'use client';

import { useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { queueWrite, queueFile } from '@/lib/offline/db';
import { toast } from 'sonner';

export interface TaskSubmissionData {
  taskId: string;
  temperatures?: Record<string, number>; // assetId -> reading
  checklistItems?: Array<{ id: string; completed: boolean; notes?: string }>;
  yesNoItems?: Array<{ id: string; answer: boolean; notes?: string }>;
  photos?: File[];
  notes?: string;
  outOfRangeActions?: Record<string, 'monitor' | 'callout'>;
  completedBy?: string;
}

export function useOfflineTaskSubmission() {
  const { isOnline } = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitTask(data: TaskSubmissionData): Promise<{
    success: boolean;
    queued?: boolean;
    error?: string
  }> {
    setIsSubmitting(true);

    try {
      // Queue photos first if any
      const photoIds: string[] = [];
      if (data.photos && data.photos.length > 0) {
        for (const photo of data.photos) {
          const writeId = crypto.randomUUID();
          await queueFile(writeId, photo, photo.name, photo.type);
          photoIds.push(writeId);
        }
      }

      // Prepare payload
      const payload = {
        taskId: data.taskId,
        temperatures: data.temperatures || {},
        checklistItems: data.checklistItems || [],
        yesNoItems: data.yesNoItems || [],
        notes: data.notes || '',
        outOfRangeActions: data.outOfRangeActions || {},
        photoIds, // Reference to queued files
        completedBy: data.completedBy,
        submittedAt: new Date().toISOString()
      };

      if (isOnline) {
        // Try direct submission
        try {
          const response = await fetch('/api/tasks/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
          });

          if (response.ok) {
            const result = await response.json();
            toast.success('Task completed successfully');
            setIsSubmitting(false);
            return { success: true };
          }

          // If network error, fall through to queue
          if (response.status >= 500) {
            throw new Error('Server error');
          }

          // If client error (4xx), don't queue - show error
          const error = await response.json();
          toast.error(error.message || 'Failed to complete task');
          setIsSubmitting(false);
          return { success: false, error: error.message };

        } catch (networkError) {
          console.warn('[Task Submission] Network error, queueing for sync:', networkError);
          // Fall through to queue
        }
      }

      // Queue for sync (offline or network error)
      await queueWrite('complete_task', '/api/tasks/complete', payload, 'checkly');

      toast.info('Task saved - will sync when online', {
        description: photoIds.length > 0
          ? `Saved with ${photoIds.length} photo${photoIds.length > 1 ? 's' : ''}`
          : undefined
      });

      setIsSubmitting(false);
      return { success: true, queued: true };

    } catch (error: any) {
      console.error('[Task Submission] Error:', error);
      toast.error('Failed to save task');
      setIsSubmitting(false);
      return { success: false, error: error.message };
    }
  }

  return {
    submitTask,
    isSubmitting
  };
}
