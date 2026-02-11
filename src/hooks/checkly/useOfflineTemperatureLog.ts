/**
 * Offline Temperature Logging Hook
 * Handles temperature logging with offline queueing
 */

'use client';

import { useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { queueWrite } from '@/lib/offline/db';
import { toast } from 'sonner';

export interface TemperatureLogData {
  assetId: string;
  reading: number;
  unit?: 'celsius' | 'fahrenheit';
  recordedAt?: string;
  source?: 'manual' | 'automatic';
  notes?: string;
}

export function useOfflineTemperatureLog() {
  const { isOnline } = useOnlineStatus();
  const [isLogging, setIsLogging] = useState(false);

  async function logTemperature(data: TemperatureLogData): Promise<{
    success: boolean;
    queued?: boolean;
    error?: string;
  }> {
    setIsLogging(true);

    try {
      const payload = {
        assetId: data.assetId,
        reading: data.reading,
        unit: data.unit || 'celsius',
        recordedAt: data.recordedAt || new Date().toISOString(),
        source: data.source || 'manual',
        notes: data.notes
      };

      if (isOnline) {
        // Try direct API call
        try {
          const response = await fetch('/api/temperature/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
          });

          if (response.ok) {
            toast.success('Temperature logged');
            setIsLogging(false);
            return { success: true };
          }

          // Server error - queue instead
          if (response.status >= 500) {
            throw new Error('Server error');
          }

          // Client error - show error
          const error = await response.json();
          toast.error(error.message || 'Failed to log temperature');
          setIsLogging(false);
          return { success: false, error: error.message };

        } catch (networkError) {
          console.warn('[Temperature Log] Network error, queueing:', networkError);
          // Fall through to queue
        }
      }

      // Queue for later sync
      await queueWrite('log_temperature', '/api/temperature/log', payload, 'checkly');

      toast.info('Temperature saved - will sync when online');

      setIsLogging(false);
      return { success: true, queued: true };

    } catch (error: any) {
      console.error('[Temperature Log] Error:', error);
      toast.error('Failed to save temperature');
      setIsLogging(false);
      return { success: false, error: error.message };
    }
  }

  return {
    logTemperature,
    isLogging
  };
}
