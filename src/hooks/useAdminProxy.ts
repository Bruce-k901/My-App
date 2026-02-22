'use client';

import { useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

type Operation = 'insert' | 'update' | 'upsert' | 'delete';

interface MutateOptions {
  table: string;
  operation: Operation;
  payload?: Record<string, unknown>;
  filters?: Record<string, unknown>;
}

interface MutateResult {
  data: unknown[] | null;
  error: string | null;
}

/**
 * Hook that routes Supabase mutations through the admin proxy API when
 * the current user is in "View As" mode (platform admin viewing another company).
 * Otherwise, uses the direct Supabase client.
 */
export function useAdminProxy() {
  const { isViewingAs, companyId } = useAppContext();

  const mutate = useCallback(
    async ({ table, operation, payload, filters }: MutateOptions): Promise<MutateResult> => {
      if (isViewingAs) {
        // Route through admin proxy API (bypasses RLS)
        try {
          const res = await fetch('/api/admin/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table,
              operation,
              payload: payload ? { ...payload, company_id: companyId } : undefined,
              filters,
            }),
          });

          const json = await res.json();

          if (!res.ok) {
            return { data: null, error: json.error || `Proxy error: ${res.status}` };
          }

          return { data: json.data, error: null };
        } catch (err) {
          return { data: null, error: err instanceof Error ? err.message : 'Proxy request failed' };
        }
      }

      // Direct Supabase client (normal user flow)
      try {
        let result;

        if (operation === 'insert') {
          result = await supabase.from(table).insert(payload || {}).select();
        } else if (operation === 'upsert') {
          result = await supabase.from(table).upsert(payload || {}).select();
        } else if (operation === 'update') {
          let query = supabase.from(table).update(payload || {});
          for (const [key, value] of Object.entries(filters || {})) {
            query = query.eq(key, value as string);
          }
          result = await query.select();
        } else if (operation === 'delete') {
          let query = supabase.from(table).delete();
          for (const [key, value] of Object.entries(filters || {})) {
            query = query.eq(key, value as string);
          }
          result = await query.select();
        }

        if (result?.error) {
          return { data: null, error: result.error.message };
        }

        return { data: result?.data || null, error: null };
      } catch (err) {
        return { data: null, error: err instanceof Error ? err.message : 'Mutation failed' };
      }
    },
    [isViewingAs, companyId]
  );

  return { mutate, isViewingAs };
}
