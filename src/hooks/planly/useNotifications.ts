import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useNotifications(isRead?: boolean) {
  const params = new URLSearchParams();
  if (isRead !== undefined) params.set('isRead', String(isRead));

  return useSWR(
    `/api/planly/notifications?${params.toString()}`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );
}
