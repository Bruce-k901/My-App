import { useState, useCallback } from 'react';
import { mutate } from 'swr';

interface PortalInviteResult {
  success: boolean;
  invite_sent_at?: string;
  invite_expires_at?: string;
  error?: string;
}

export function usePortalInvite(customerId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendInvite = useCallback(async (userId: string): Promise<PortalInviteResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/planly/customers/${customerId}/portal-users/${userId}/invite`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error || 'Failed to send invite';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Refresh portal users list
      mutate(`/api/planly/customers/${customerId}/portal-users`);

      return {
        success: true,
        invite_sent_at: data.invite_sent_at,
        invite_expires_at: data.invite_expires_at,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  return {
    sendInvite,
    isLoading,
    error,
  };
}
