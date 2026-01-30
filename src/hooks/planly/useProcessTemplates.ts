import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useProcessTemplates(siteId?: string, includeMasters = false) {
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);
  if (includeMasters) params.set('includeMasters', 'true');

  return useSWR(
    `/api/planly/process-templates?${params.toString()}`,
    fetcher
  );
}
