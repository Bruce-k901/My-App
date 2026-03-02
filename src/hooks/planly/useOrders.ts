import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useOrders(customerId?: string, deliveryDate?: string, status?: string) {
  const params = new URLSearchParams();
  if (customerId) params.set('customerId', customerId);
  if (deliveryDate) params.set('deliveryDate', deliveryDate);
  if (status) params.set('status', status);

  return useSWR(
    `/api/planly/orders?${params.toString()}`,
    fetcher
  );
}
