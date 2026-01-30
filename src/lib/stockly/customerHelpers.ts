/**
 * Format a customer's full address as a string
 */
export function formatCustomerAddress(customer: {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
}): string {
  const parts: string[] = [];
  
  if (customer.address_line1) parts.push(customer.address_line1);
  if (customer.address_line2) parts.push(customer.address_line2);
  if (customer.city) parts.push(customer.city);
  if (customer.postcode) parts.push(customer.postcode);
  if (customer.country) parts.push(customer.country);
  
  return parts.join(', ') || 'No address provided';
}

/**
 * Determine order activity status based on order count
 * Returns a status string for UI display
 */
export function getOrderActivityStatus(orderCount: number): 'high' | 'medium' | 'low' | 'none' {
  if (orderCount === 0) return 'none';
  if (orderCount >= 10) return 'high';
  if (orderCount >= 5) return 'medium';
  return 'low';
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 * 
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

