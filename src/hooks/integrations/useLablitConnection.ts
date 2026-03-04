'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';

interface LablitConnectionState {
  connected: boolean;
  loading: boolean;
  deviceId: string | null;
  deviceName: string | null;
}

/**
 * Hook to check if Labl.it is connected for the current company.
 * Returns connection status so UI can conditionally show "Push to Labl.it" buttons.
 */
export function useLablitConnection(): LablitConnectionState {
  const { companyId } = useAppContext();
  const [state, setState] = useState<LablitConnectionState>({
    connected: false,
    loading: true,
    deviceId: null,
    deviceName: null,
  });

  useEffect(() => {
    if (!companyId) {
      setState({ connected: false, loading: false, deviceId: null, deviceName: null });
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        const params = new URLSearchParams({ companyId });
        const res = await fetch(`/api/settings/integrations?${params.toString()}`);
        const result = await res.json();
        const connections = result.data || [];

        const lablit = connections.find(
          (c: { integration_type: string; integration_name: string }) =>
            c.integration_type === 'label_printer' && c.integration_name === 'Labl.it',
        );

        if (!cancelled) {
          setState({
            connected: lablit?.status === 'connected' || lablit?.status === 'pending',
            loading: false,
            deviceId: lablit?.config?.device_id ?? null,
            deviceName: lablit?.config?.device_name ?? null,
          });
        }
      } catch {
        if (!cancelled) {
          setState({ connected: false, loading: false, deviceId: null, deviceName: null });
        }
      }
    }

    check();
    return () => { cancelled = true; };
  }, [companyId]);

  return state;
}
