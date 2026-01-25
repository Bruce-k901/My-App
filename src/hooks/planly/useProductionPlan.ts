import useSWR from 'swr';
import { format } from 'date-fns';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useProductionPlan(siteId: string, date: Date) {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  return useSWR(
    siteId ? `/api/planly/production-plan?siteId=${siteId}&date=${dateStr}` : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
    }
  );
}
