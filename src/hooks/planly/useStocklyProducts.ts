import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export interface StocklyProduct {
  id: string;
  name: string;
  sku: string;
  category?: string;
  unit?: string;
  is_active?: boolean;
}

export function useStocklyProducts(siteId?: string) {
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);

  return useSWR<StocklyProduct[]>(
    siteId ? `/api/planly/stockly-products?${params.toString()}` : null,
    fetcher
  );
}
