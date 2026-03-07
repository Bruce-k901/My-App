import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useOrderBook(deliveryDate: string, siteId?: string) {
  const params = new URLSearchParams();
  params.set('deliveryDate', deliveryDate);
  if (siteId) params.set('siteId', siteId);

  return useSWR(
    deliveryDate ? `/api/planly/orders/book?${params.toString()}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );
}
