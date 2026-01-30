/**
 * Order Book Customer API Helper Functions
 * Client-side functions for interacting with Order Book API routes
 */

export interface Product {
  id: string;
  supplier_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  base_price: number;
  unit: string;
  bulk_discounts: any;
  is_active: boolean;
  is_available: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  quantity: number;
}

export interface Order {
  id: string;
  supplier_id: string;
  customer_id: string;
  order_number: string;
  order_date: string;
  delivery_date: string;
  status: string;
  subtotal: number;
  total: number;
  items?: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    product?: Product;
  }>;
  customer?: {
    id: string;
    business_name: string;
    contact_name: string | null;
    email: string | null;
  };
}

export interface StandingOrder {
  id: string;
  supplier_id: string;
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
  company_id: string;
  supplier_id: string;
  business_name: string;
  trading_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get product catalog for a supplier
 */
export async function getProductCatalog(supplierId?: string): Promise<Product[]> {
  const url = new URL('/api/order-book/products', window.location.origin);
  if (supplierId) {
    url.searchParams.set('supplier_id', supplierId);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch products');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get customer profile
 */
export async function getCustomerProfile(customerId?: string): Promise<Customer | null> {
  const url = new URL('/api/order-book/customers', window.location.origin);
  if (customerId) {
    url.searchParams.set('customer_id', customerId);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch customer profile');
  }

  const data = await response.json();
  return data.data || null;
}

/**
 * Create a new order
 */
export async function createOrder(data: {
  supplier_id: string;
  customer_id: string;
  delivery_date: string;
  items: OrderItem[];
}): Promise<Order> {
  // 🔍 DEBUG: Log what we're sending
  console.log(`[createOrder] Sending order for ${data.delivery_date} with ${data.items.length} items`);
  console.log('[createOrder] Items:', data.items.map(i => `${i.product_id}: qty=${i.quantity}`));

  const response = await fetch('/api/order-book/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('[createOrder] API Error:', error);
    throw new Error(error.error || 'Failed to create order');
  }

  try {
    const result = await response.json();
    console.log(`[createOrder] Order saved successfully:`, result.data?.id);
    return result.data;
  } catch (parseError) {
    console.error('[createOrder] Error parsing response:', parseError);
    // Even if response parsing fails, the order was likely saved
    // Return a minimal order object so the frontend can continue
    return {
      id: data.delivery_date, // Temporary ID
      delivery_date: data.delivery_date,
      status: 'draft',
    } as Order;
  }
}

/**
 * Get orders
 */
export async function getOrders(params?: {
  customer_id?: string;
  supplier_id?: string;
  delivery_date?: string;
}): Promise<Order[]> {
  const url = new URL('/api/order-book/orders', window.location.origin);
  if (params?.customer_id) {
    url.searchParams.set('customer_id', params.customer_id);
  }
  if (params?.supplier_id) {
    url.searchParams.set('supplier_id', params.supplier_id);
  }
  if (params?.delivery_date) {
    url.searchParams.set('delivery_date', params.delivery_date);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch orders');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get standing orders
 */
export async function getStandingOrders(params?: {
  customer_id?: string;
  supplier_id?: string;
}): Promise<StandingOrder[]> {
  const url = new URL('/api/order-book/standing-orders', window.location.origin);
  if (params?.customer_id) {
    url.searchParams.set('customer_id', params.customer_id);
  }
  if (params?.supplier_id) {
    url.searchParams.set('supplier_id', params.supplier_id);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch standing orders');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Create or update standing order
 */
export async function createStandingOrder(data: {
  supplier_id: string;
  customer_id: string;
  delivery_days: string[];
  items: OrderItem[];
  start_date?: string;
  end_date?: string | null;
}): Promise<StandingOrder> {
  const response = await fetch('/api/order-book/standing-orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create standing order');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update standing order
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
  const response = await fetch('/api/order-book/standing-orders', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, ...updates }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update standing order');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Skip a delivery date for a standing order
 * Note: This would require a separate API endpoint or we'd update the skips table directly
 * For now, this is a placeholder - you'd need to add an endpoint for this
 */
export async function skipDelivery(standingOrderId: string, date: string): Promise<void> {
  // TODO: Implement skip delivery endpoint
  // For now, this is a placeholder
  throw new Error('Skip delivery endpoint not yet implemented');
}

