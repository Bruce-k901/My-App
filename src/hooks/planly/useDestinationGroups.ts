import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useDestinationGroups(siteId?: string) {
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);

  return useSWR(
    siteId ? `/api/planly/destination-groups?${params.toString()}` : null,
    fetcher
  );
}
