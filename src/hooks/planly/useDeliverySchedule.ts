import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useDeliverySchedule(startDate: string, endDate: string, siteId?: string) {
  const params = new URLSearchParams();
  params.set('startDate', startDate);
  params.set('endDate', endDate);
  if (siteId) params.set('siteId', siteId);

  return useSWR(
    startDate && endDate ? `/api/planly/delivery-schedule?${params.toString()}` : null,
    fetcher
  );
}
