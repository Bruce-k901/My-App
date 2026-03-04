/**
 * Fire RA AI Assist Hook
 * Wraps the /api/assistant/fire-ra-assist endpoint
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import type {
  FireRAAIField,
  FireRAAIMode,
  FireRAAIAssistRequest,
  FireRAAIAssistResponse,
  FireRAComplexityTier,
} from '@/types/fire-ra';

interface AIAssistParams {
  sectionNumber: number;
  itemNumber: string;
  field: FireRAAIField;
  existingText: string;
  mode?: FireRAAIMode;
  userInput?: string;
}

interface PremisesContext {
  premisesType: string;
  premisesAddress: string;
  tier: FireRAComplexityTier;
  floorCount: string;
  occupancy: string;
  sleepingOnPremises: boolean;
  flammableMaterials: string;
}

export function useFireRAAI(premisesContext: PremisesContext) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const loadingKey = (sectionNumber: number, itemNumber: string, field: string) =>
    `${itemNumber}_${field}`;

  const assist = useCallback(
    async (params: AIAssistParams): Promise<FireRAAIAssistResponse | null> => {
      const key = loadingKey(params.sectionNumber, params.itemNumber, params.field);

      // Prevent duplicate requests
      if (loading[key]) return null;

      setLoading(prev => ({ ...prev, [key]: true }));
      setError(null);

      try {
        const body: FireRAAIAssistRequest = {
          sectionNumber: params.sectionNumber,
          itemNumber: params.itemNumber,
          field: params.field,
          existingText: params.existingText,
          premisesContext,
          mode: params.mode || (params.existingText?.trim()
            ? (params.field === 'action_required' ? 'suggest_actions' : 'improve')
            : 'generate'),
          userInput: params.userInput,
        };

        const res = await fetch('/api/assistant/fire-ra-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg = data.error || `AI assist failed (${res.status})`;
          throw new Error(msg);
        }

        const result: FireRAAIAssistResponse = await res.json();
        return result;
      } catch (err: any) {
        const msg = err.message || 'AI assist failed';
        setError(msg);
        showToast({ title: 'AI Assist Error', description: msg, type: 'error' });
        return null;
      } finally {
        setLoading(prev => ({ ...prev, [key]: false }));
      }
    },
    [premisesContext, loading, showToast]
  );

  return { assist, loading, error };
}
