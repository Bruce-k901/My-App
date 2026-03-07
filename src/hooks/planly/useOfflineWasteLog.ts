/**
 * Offline Waste Log Hook
 * Handles waste logging with offline queueing (Planly module)
 */

'use client';

import { useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { queueWrite } from '@/lib/offline/db';
import { toast } from 'sonner';

export interface WasteLogItemData {
  productId: string;
  productName?: string;
  quantity: number;
  unit: string;
  reason?: 'expired' | 'damaged' | 'over_production' | 'spoiled' | 'other';
  notes?: string;
  estimatedValue?: number;
}

export interface WasteLogData {
  orderId?: string;
  customerId?: string;
  logDate: string;
  items: WasteLogItemData[];
  totalValue?: number;
  notes?: string;
  status?: 'draft' | 'submitted';
}

export function useOfflineWasteLog() {
  const { isOnline } = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitWasteLog(data: WasteLogData): Promise<{
    success: boolean;
    queued?: boolean;
    error?: string;
  }> {
    setIsSubmitting(true);

    try {
      const payload = {
        orderId: data.orderId,
        customerId: data.customerId,
        logDate: data.logDate,
        items: data.items,
        totalValue: data.totalValue || data.items.reduce((sum, item) => sum + (item.estimatedValue || 0), 0),
        notes: data.notes,
        status: data.status || 'submitted',
        submittedAt: new Date().toISOString()
      };

      if (isOnline) {
        // Try direct submission
        try {
          const response = await fetch('/api/customer/waste/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
          });

          if (response.ok) {
            toast.success('Waste log submitted');
            setIsSubmitting(false);
            return { success: true };
          }

          // Server error - queue
          if (response.status >= 500) {
            throw new Error('Server error');
          }

          // Client error
          const error = await response.json();
          toast.error(error.message || 'Failed to submit waste log');
          setIsSubmitting(false);
          return { success: false, error: error.message };

        } catch (networkError) {
          console.warn('[Waste Log] Network error, queueing:', networkError);
          // Fall through to queue
        }
      }

      // Queue for sync
      await queueWrite('submit_waste_log', '/api/customer/waste/log', payload, 'planly');

      toast.info('Waste log saved - will sync when online', {
        description: `${data.items.length} item${data.items.length !== 1 ? 's' : ''} logged`
      });

      setIsSubmitting(false);
      return { success: true, queued: true };

    } catch (error: any) {
      console.error('[Waste Log] Error:', error);
      toast.error('Failed to save waste log');
      setIsSubmitting(false);
      return { success: false, error: error.message };
    }
  }

  async function updateWasteLog(
    wasteLogId: string,
    updates: Partial<WasteLogData>
  ): Promise<{
    success: boolean;
    queued?: boolean;
    error?: string;
  }> {
    setIsSubmitting(true);

    try {
      const payload = {
        wasteLogId,
        updates,
        updatedAt: new Date().toISOString()
      };

      if (isOnline) {
        try {
          const response = await fetch('/api/customer/waste/update', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
          });

          if (response.ok) {
            toast.success('Waste log updated');
            setIsSubmitting(false);
            return { success: true };
          }

          if (response.status >= 500) {
            throw new Error('Server error');
          }

          const error = await response.json();
          toast.error(error.message || 'Failed to update waste log');
          setIsSubmitting(false);
          return { success: false, error: error.message };

        } catch (networkError) {
          console.warn('[Waste Log Update] Network error, queueing:', networkError);
        }
      }

      // Queue for sync
      await queueWrite('update_waste_log', '/api/customer/waste/update', payload, 'planly');

      toast.info('Waste log update saved - will sync when online');

      setIsSubmitting(false);
      return { success: true, queued: true };

    } catch (error: any) {
      console.error('[Waste Log Update] Error:', error);
      toast.error('Failed to save waste log update');
      setIsSubmitting(false);
      return { success: false, error: error.message };
    }
  }

  return {
    submitWasteLog,
    updateWasteLog,
    isSubmitting
  };
}
