import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useProducts(siteId?: string, isActive?: boolean) {
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);
  if (isActive !== undefined) params.set('isActive', String(isActive));

  return useSWR(
    siteId ? `/api/planly/products?${params.toString()}` : null,
    fetcher
  );
}
