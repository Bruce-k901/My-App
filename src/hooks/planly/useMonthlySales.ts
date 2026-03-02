import useSWR from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('Failed to fetch monthly sales') as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

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
