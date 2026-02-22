import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useProducts(siteId?: string, options?: { isActive?: boolean; archived?: boolean }) {
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);
  if (options?.isActive !== undefined) params.set('isActive', String(options.isActive));
  if (options?.archived !== undefined) params.set('archived', String(options.archived));

  return useSWR(
    siteId ? `/api/planly/products?${params.toString()}` : null,
    fetcher
  );
}
