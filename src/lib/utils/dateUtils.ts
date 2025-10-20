/**
 * Date utility functions for asset management
 */

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Calculate asset age from purchase date
 */
export function calculateAssetAge(purchaseDate?: string | null): string {
  if (!purchaseDate) return "Unknown";
  
  const purchase = new Date(purchaseDate);
  const now = new Date();
  
  let years = now.getFullYear() - purchase.getFullYear();
  let months = now.getMonth() - purchase.getMonth();
  
  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // Handle edge case where the day hasn't occurred yet this month
  if (now.getDate() < purchase.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }
  
  return `${years}y ${months}m`;
}

/**
 * Calculate next service date based on purchase date and services per year
 */
export function calculateNextServiceDate(
  purchaseDate?: string | null,
  addToPpm?: boolean | null,
  servicesPerYear?: number | null
): Date | null {
  if (!addToPpm || !servicesPerYear || servicesPerYear <= 0 || !purchaseDate) {
    return null;
  }
  
  const monthsBetweenServices = 12 / servicesPerYear;
  const purchase = new Date(purchaseDate);
  const now = new Date();
  
  let nextService = addMonths(purchase, monthsBetweenServices);
  
  // If the asset was purchased years ago, calculate forward until the next service is in the future
  while (nextService <= now) {
    nextService = addMonths(nextService, monthsBetweenServices);
  }
  
  return nextService;
}