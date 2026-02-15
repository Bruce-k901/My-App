import { useState } from 'react';
import { mutate } from 'swr';
import type { PlanlyCustomer } from '@/types/planly';

interface CreateCustomerData {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  postcode?: string;
  destination_group_id?: string;
  default_ship_state?: 'baked' | 'frozen';
  minimum_order_value?: number;
  below_minimum_delivery_charge?: number;
  is_ad_hoc?: boolean;
  frozen_only?: boolean;
  is_active?: boolean;
  notes?: string;
  delivery_instructions?: string;
  finance_contact_name?: string;
  finance_contact_email?: string;
  finance_contact_phone?: string;
  default_payment_terms?: string;
  portal_enabled?: boolean;
  site_id: string;
}

export function useCreateCustomer() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCustomer = async (data: CreateCustomerData): Promise<PlanlyCustomer | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/planly/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create customer');
      }

      const customer = await res.json();

      // Invalidate customers cache
      mutate((key: string) => typeof key === 'string' && key.includes('/api/planly/customers'));

      return customer;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { createCustomer, isLoading, error };
}
