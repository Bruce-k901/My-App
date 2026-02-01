import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useDeliveryNotes(deliveryDate: string, siteId?: string) {
  const params = new URLSearchParams();
  params.set('deliveryDate', deliveryDate);
  if (siteId) params.set('siteId', siteId);

  return useSWR(
    deliveryDate ? `/api/planly/delivery-notes?${params.toString()}` : null,
    fetcher
  );
}
