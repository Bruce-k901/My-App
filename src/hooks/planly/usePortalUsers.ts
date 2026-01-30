import useSWR, { mutate } from 'swr';
import { useState, useCallback } from 'react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export interface PortalUser {
  id: string;
  customer_id: string;
  name: string;
  email: string;
  phone?: string;
  is_primary: boolean;
  is_active: boolean;
  auth_user_id?: string;
  invite_sent_at?: string;
  invite_expires_at?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export function usePortalUsers(customerId?: string) {
  const { data, error, isLoading } = useSWR<PortalUser[]>(
    customerId ? `/api/planly/customers/${customerId}/portal-users` : null,
    fetcher
  );

  return {
    data: Array.isArray(data) ? data : [],
    error,
    isLoading,
  };
}

export function usePortalUserMutations(customerId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addUser = useCallback(async (user: { name: string; email: string; phone?: string; is_primary?: boolean }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/planly/customers/${customerId}/portal-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add user');
      }

      const data = await res.json();
      mutate(`/api/planly/customers/${customerId}/portal-users`);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  const updateUser = useCallback(async (userId: string, updates: Partial<PortalUser>) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/planly/customers/${customerId}/portal-users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update user');
      }

      const data = await res.json();
      mutate(`/api/planly/customers/${customerId}/portal-users`);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  const deleteUser = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/planly/customers/${customerId}/portal-users/${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      mutate(`/api/planly/customers/${customerId}/portal-users`);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  return {
    addUser,
    updateUser,
    deleteUser,
    isLoading,
    error,
  };
}
