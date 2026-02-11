/**
 * Customer Portal API Helper Functions
 * Client-side functions for the customer portal, backed by planly tables.
 */

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  bake_group_id?: string | null;
  bake_group_name?: string | null;
  bake_group_priority?: number;
  base_price: number;
  unit: string;
  is_active: boolean;
  is_available?: boolean;
  default_ship_state?: string;
  can_ship_frozen?: boolean;
  // Legacy order_book fields (optional for backward compat)
  supplier_id?: string;
  sku?: string | null;
  bulk_discounts?: any;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  product_id: string;
  quantity: number;
}

export interface Order {
  id: string;
  customer_id: string;
  delivery_date: string;
  order_date?: string;
  status: string;
  total: number;
  subtotal?: number;
  items?: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    product?: Partial<Product>;
  }>;
  // Legacy order_book fields (optional)
  supplier_id?: string;
  order_number?: string;
  customer?: {
    id: string;
    business_name: string;
    contact_name: string | null;
    email: string | null;
  };
}

export interface StandingOrder {
  id: string;
  site_id: string;
  customer_id: string;
  delivery_days: string[];
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  is_paused: boolean;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  customer?: {
    id: string;
    business_name: string;
    contact_name: string | null;
  };
}

export interface Customer {
  id: string;
  site_id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  is_active?: boolean;
  default_ship_state?: string;
  // Legacy order_book fields (optional)
  company_id?: string;
  supplier_id?: string;
  trading_name?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get product catalog for a site (from planly_products)
 */
export async function getProductCatalog(siteId?: string): Promise<Product[]> {
  const url = new URL('/api/customer/products', window.location.origin);
  if (siteId) {
    url.searchParams.set('site_id', siteId);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch products');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get customer profile (from planly_customers)
 */
export async function getCustomerProfile(customerId?: string): Promise<Customer | null> {
  // In admin preview mode, use the selected customer from sessionStorage
  if (!customerId && typeof window !== 'undefined') {
    let previewId = sessionStorage.getItem('admin_preview_customer_id');

    // If admin mode is active but no customer selected yet, auto-select the first one
    if (!previewId && sessionStorage.getItem('admin_preview_mode') === 'true') {
      try {
        const listRes = await fetch('/api/planly/customers?isActive=true');
        if (listRes.ok) {
          const listJson = await listRes.json();
          const customers = listJson.data || listJson;
          if (Array.isArray(customers) && customers.length > 0) {
            previewId = customers[0].id;
            sessionStorage.setItem('admin_preview_customer_id', previewId!);
          }
        }
      } catch (e) {
        console.error('[Admin Preview] Error loading customer list:', e);
      }
    }

    if (previewId) {
      customerId = previewId;
    }
  }

  const url = new URL('/api/customer/profile', window.location.origin);
  if (customerId) {
    url.searchParams.set('customer_id', customerId);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch customer profile');
  }

  const data = await response.json();
  return data.data || null;
}

/**
 * Create a new order (writes to planly_orders)
 */
export async function createOrder(data: {
  site_id: string;
  customer_id: string;
  delivery_date: string;
  items: OrderItem[];
}): Promise<Order> {
  const response = await fetch('/api/customer/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to create order');
  }

  try {
    const result = await response.json();
    return result.data;
  } catch {
    return {
      id: data.delivery_date,
      delivery_date: data.delivery_date,
      status: 'confirmed',
    } as Order;
  }
}

/**
 * Get orders (from planly_orders)
 */
export async function getOrders(params?: {
  customer_id?: string;
  delivery_date?: string;
}): Promise<Order[]> {
  const url = new URL('/api/customer/orders', window.location.origin);
  if (params?.customer_id) {
    url.searchParams.set('customer_id', params.customer_id);
  }
  if (params?.delivery_date) {
    url.searchParams.set('delivery_date', params.delivery_date);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch orders');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get standing orders from planly_standing_orders
 */
export async function getStandingOrders(params?: {
  customer_id?: string;
}): Promise<StandingOrder[]> {
  const url = new URL('/api/customer/standing-orders', window.location.origin);
  if (params?.customer_id) {
    url.searchParams.set('customer_id', params.customer_id);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    // Standing orders may not exist yet — return empty
    return [];
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Create or update standing order for customer in planly_standing_orders
 */
export async function createStandingOrder(data: {
  customer_id: string;
  delivery_days: string[];
  items: OrderItem[];
  start_date?: string;
  end_date?: string | null;
}): Promise<StandingOrder> {
  const response = await fetch('/api/customer/standing-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create standing order');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update standing order in planly_standing_orders
 */
export async function updateStandingOrder(
  id: string,
  updates: {
    delivery_days?: string[];
    items?: OrderItem[];
    is_active?: boolean;
    is_paused?: boolean;
    start_date?: string;
    end_date?: string | null;
  }
): Promise<StandingOrder> {
  const response = await fetch('/api/customer/standing-orders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update standing order');
  }

  const result = await response.json();
  return result.data;
}
