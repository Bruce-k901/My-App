import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export interface PackingPlanCustomer {
  id: string;
  name: string;
}

export interface PackingPlanProduct {
  id: string;
  name: string;
  bake_group_id: string | null;
  sort_order: number;
}

export interface PackingPlanBakeGroup {
  id: string;
  name: string;
  priority: number;
}

export interface PackingPlanOrderItem {
  customer_id: string;
  product_id: string;
  quantity: number;
}

export interface PackingPlanData {
  date: string;
  orderCount: number;
  customers: PackingPlanCustomer[];
  products: PackingPlanProduct[];
  bakeGroups: PackingPlanBakeGroup[];
  orderItems: PackingPlanOrderItem[];
}

export function usePackingPlan(deliveryDate: string, siteId?: string) {
  const params = new URLSearchParams();
  params.set('deliveryDate', deliveryDate);
  if (siteId) params.set('siteId', siteId);

  return useSWR<PackingPlanData>(
    deliveryDate && siteId ? `/api/planly/packing-plan?${params.toString()}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );
}
