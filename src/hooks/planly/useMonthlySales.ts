import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useMonthlySales(year: number, month: number, siteId?: string) {
  const params = new URLSearchParams();
  params.set('year', String(year));
  params.set('month', String(month));
  if (siteId) params.set('siteId', siteId);

  return useSWR(
    year && month ? `/api/planly/monthly-sales?${params.toString()}` : null,
    fetcher
  );
}
