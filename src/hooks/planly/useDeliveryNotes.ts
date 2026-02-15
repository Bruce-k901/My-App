import useSWR from 'swr';

export interface BakeGroupWithProducts {
  id: string;
  name: string;
  priority: number;
  products: Array<{
    id: string;
    name: string;
    stocklyProductId: string;
  }>;
}

export interface DeliveryNoteData {
  orderId: string;
  customerId: string;
  customerName: string;
  address: string;
  postcode: string;
  contact: string;
  quantities: Record<string, number>;
}

export interface DeliveryNotesResponse {
  date: string;
  companyName: string;
  companyLogo: string | null;
  bakeGroups: BakeGroupWithProducts[];
  notes: DeliveryNoteData[];
}

const fetcher = async (url: string): Promise<DeliveryNotesResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export function useDeliveryNotes(deliveryDate: string, siteId?: string) {
  const params = new URLSearchParams();
  params.set('deliveryDate', deliveryDate);
  if (siteId) params.set('siteId', siteId);

  const cacheKey = deliveryDate && siteId
    ? `/api/planly/delivery-notes?${params.toString()}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<DeliveryNotesResponse>(
    cacheKey,
    fetcher
  );

  return {
    data,
    isLoading,
    error,
    refresh: () => cacheKey && mutate(),
  };
}
