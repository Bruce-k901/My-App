import useSWR from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${res.status}`);
  }
  return res.json();
};

export function useCustomers(siteId?: string, options?: { isActive?: boolean; showArchived?: boolean }) {
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);
  if (options?.isActive !== undefined) params.set('isActive', String(options.isActive));
  if (options?.showArchived !== undefined) params.set('showArchived', String(options.showArchived));

  const { data, error, isLoading, mutate } = useSWR(
    siteId ? `/api/planly/customers?${params.toString()}` : null,
    fetcher
  );

  return { data, error, isLoading, mutate };
}
