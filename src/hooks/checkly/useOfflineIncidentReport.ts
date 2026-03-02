/**
 * Offline Incident Report Hook
 * Handles incident reporting with offline queueing
 */

'use client';

import { useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { queueWrite, queueFile } from '@/lib/offline/db';
import { toast } from 'sonner';

export interface CasualtyData {
  name: string;
  age?: number;
  injuryType?: string;
  severity?: 'minor' | 'moderate' | 'major' | 'critical';
  treatmentRequired?: string;
}

export interface WitnessData {
  name: string;
  contact?: string;
  statement?: string;
}

export interface IncidentReportData {
  title: string;
  description: string;
  incidentType: 'accident' | 'food_poisoning' | 'customer_complaint' | 'staff_sickness';
  severity?: 'near_miss' | 'minor' | 'moderate' | 'major' | 'critical' | 'fatality';
  location?: string;
  incidentDate: string;
  casualties?: CasualtyData[];
  witnesses?: WitnessData[];
  emergencyServicesCalled?: boolean;
  firstAidProvided?: boolean;
  scenePreserved?: boolean;
  riddorReportable?: boolean;
  photos?: File[];
  notes?: string;
}

export function useOfflineIncidentReport() {
  const { isOnline } = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitIncident(data: IncidentReportData): Promise<{
    success: boolean;
    queued?: boolean;
    error?: string;
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

      const payload = {
        title: data.title,
        description: data.description,
        incidentType: data.incidentType,
        severity: data.severity || 'moderate',
        location: data.location,
        incidentDate: data.incidentDate,
        reportedDate: new Date().toISOString(),
        casualties: data.casualties || [],
        witnesses: data.witnesses || [],
        emergencyServicesCalled: data.emergencyServicesCalled || false,
        firstAidProvided: data.firstAidProvided || false,
        scenePreserved: data.scenePreserved || false,
        riddorReportable: data.riddorReportable || false,
        photoIds, // Reference to queued files
        notes: data.notes
      };

      if (isOnline) {
        // Try direct submission
        try {
          const response = await fetch('/api/incidents/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
          });

          if (response.ok) {
            toast.success('Incident reported');
            setIsSubmitting(false);
            return { success: true };
          }

          // Server error - queue
          if (response.status >= 500) {
            throw new Error('Server error');
          }

          // Client error
          const error = await response.json();
          toast.error(error.message || 'Failed to report incident');
          setIsSubmitting(false);
          return { success: false, error: error.message };

        } catch (networkError) {
          console.warn('[Incident Report] Network error, queueing:', networkError);
          // Fall through to queue
        }
      }

      // Queue for sync
      await queueWrite('report_incident', '/api/incidents/create', payload, 'checkly');

      toast.info('Incident report saved - will sync when online', {
        description: photoIds.length > 0
          ? `Saved with ${photoIds.length} photo${photoIds.length > 1 ? 's' : ''}`
          : undefined
      });

      setIsSubmitting(false);
      return { success: true, queued: true };

    } catch (error: any) {
      console.error('[Incident Report] Error:', error);
      toast.error('Failed to save incident report');
      setIsSubmitting(false);
      return { success: false, error: error.message };
    }
  }

  async function updateIncident(
    incidentId: string,
    updates: Partial<IncidentReportData>
  ): Promise<{
    success: boolean;
    queued?: boolean;
    error?: string;
  }> {
    setIsSubmitting(true);

    try {
      // Queue photos if any
      const photoIds: string[] = [];
      if (updates.photos && updates.photos.length > 0) {
        for (const photo of updates.photos) {
          const writeId = crypto.randomUUID();
          await queueFile(writeId, photo, photo.name, photo.type);
          photoIds.push(writeId);
        }
      }

      const payload = {
        incidentId,
        updates: {
          ...updates,
          photoIds: photoIds.length > 0 ? photoIds : undefined,
          photos: undefined // Remove File objects from payload
        },
        updatedAt: new Date().toISOString()
      };

      if (isOnline) {
        try {
          const response = await fetch('/api/incidents/update', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
          });

          if (response.ok) {
            toast.success('Incident updated');
            setIsSubmitting(false);
            return { success: true };
          }

          if (response.status >= 500) {
            throw new Error('Server error');
          }

          const error = await response.json();
          toast.error(error.message || 'Failed to update incident');
          setIsSubmitting(false);
          return { success: false, error: error.message };

        } catch (networkError) {
          console.warn('[Incident Update] Network error, queueing:', networkError);
        }
      }

      // Queue for sync
      await queueWrite('update_incident', '/api/incidents/update', payload, 'checkly');

      toast.info('Incident update saved - will sync when online');

      setIsSubmitting(false);
      return { success: true, queued: true };

    } catch (error: any) {
      console.error('[Incident Update] Error:', error);
      toast.error('Failed to save incident update');
      setIsSubmitting(false);
      return { success: false, error: error.message };
    }
  }

  return {
    submitIncident,
    updateIncident,
    isSubmitting
  };
}
