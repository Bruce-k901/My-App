/**
 * Offline Stock Count Hook
 * Handles stock count submissions with offline queueing
 */

'use client';

import { useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { queueWrite } from '@/lib/offline/db';
import { toast } from 'sonner';

export interface StockCountItemData {
  stockItemId: string;
  countedQty: number;
  variance?: number;
  notes?: string;
}

export interface StockCountSubmissionData {
  stockCountId: string;
  items: StockCountItemData[];
  storageAreaId?: string;
  notes?: string;
}

export function useOfflineStockCount() {
  const { isOnline } = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitStockCount(data: StockCountSubmissionData): Promise<{
    success: boolean;
    queued?: boolean;
    error?: string;
  }> {
    setIsSubmitting(true);

    try {
      const payload = {
        stockCountId: data.stockCountId,
        items: data.items,
        storageAreaId: data.storageAreaId,
        notes: data.notes,
        submittedAt: new Date().toISOString()
      };

      if (isOnline) {
        // Try direct submission
        try {
          const response = await fetch('/api/stock-counts/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
          });

          if (response.ok) {
            toast.success('Stock count submitted');
            setIsSubmitting(false);
            return { success: true };
          }

          // Server error - queue
          if (response.status >= 500) {
            throw new Error('Server error');
          }

          // Client error
          const error = await response.json();
          toast.error(error.message || 'Failed to submit stock count');
          setIsSubmitting(false);
          return { success: false, error: error.message };

        } catch (networkError) {
          console.warn('[Stock Count] Network error, queueing:', networkError);
          // Fall through to queue
        }
      }

      // Queue for sync
      await queueWrite('submit_stock_count', '/api/stock-counts/submit', payload, 'stockly');

      toast.info('Stock count saved - will sync when online', {
        description: `${data.items.length} item${data.items.length !== 1 ? 's' : ''} counted`
      });

      setIsSubmitting(false);
      return { success: true, queued: true };

    } catch (error: any) {
      console.error('[Stock Count] Error:', error);
      toast.error('Failed to save stock count');
      setIsSubmitting(false);
      return { success: false, error: error.message };
    }
  }

  async function markAreaComplete(
    stockCountId: string,
    storageAreaId: string
  ): Promise<{
    success: boolean;
    queued?: boolean;
    error?: string;
  }> {
    setIsSubmitting(true);

    try {
      const payload = {
        stockCountId,
        storageAreaId,
        completedAt: new Date().toISOString()
      };

      if (isOnline) {
        try {
          const response = await fetch('/api/stock-counts/area-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
          });

          if (response.ok) {
            toast.success('Area marked complete');
            setIsSubmitting(false);
            return { success: true };
          }

          if (response.status >= 500) {
            throw new Error('Server error');
          }

          const error = await response.json();
          toast.error(error.message || 'Failed to mark area complete');
          setIsSubmitting(false);
          return { success: false, error: error.message };

        } catch (networkError) {
          console.warn('[Stock Count Area] Network error, queueing:', networkError);
        }
      }

      // Queue for sync
      await queueWrite('mark_area_complete', '/api/stock-counts/area-complete', payload, 'stockly');

      toast.info('Area completion saved - will sync when online');

      setIsSubmitting(false);
      return { success: true, queued: true };

    } catch (error: any) {
      console.error('[Stock Count Area] Error:', error);
      toast.error('Failed to save area completion');
      setIsSubmitting(false);
      return { success: false, error: error.message };
    }
  }

  return {
    submitStockCount,
    markAreaComplete,
    isSubmitting
  };
}
