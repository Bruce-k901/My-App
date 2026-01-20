/**
 * SKU generation utilities
 * Generates SKU format: {companyPrefix}-{itemPrefix}-{3digitNumber}
 */

/**
 * Extract first 3 alphanumeric characters from a string (uppercase)
 */
export function extractPrefix(text: string): string {
  if (!text) return 'XXX';
  const alphanumeric = text.replace(/[^a-zA-Z0-9]/g, '');
  if (alphanumeric.length === 0) return 'XXX';
  return alphanumeric.substring(0, 3).toUpperCase();
}

/**
 * Generate next SKU number for a given prefix
 * Format: {companyPrefix}-{itemPrefix}-{3digitNumber}
 * 
 * @param companyPrefix - First 3 letters of company name
 * @param itemPrefix - First 3 letters of item name
 * @param existingSKUs - Array of existing SKUs for the company
 * @returns Generated SKU string
 */
export function generateSKU(
  companyPrefix: string,
  itemPrefix: string,
  existingSKUs: string[]
): string {
  const baseSKU = `${companyPrefix}-${itemPrefix}-`;
  
  // Find all existing SKUs with this prefix
  const matchingSKUs = existingSKUs.filter((sku) => sku.startsWith(baseSKU));
  
  // Extract numbers from existing SKUs
  const numbers = matchingSKUs
    .map((sku) => {
      const match = sku.match(/-(\d{3})$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);
  
  // Find next available number
  let nextNumber = 1;
  for (const num of numbers) {
    if (num === nextNumber) {
      nextNumber++;
    } else if (num > nextNumber) {
      break;
    }
  }
  
  // Format with 3 digits, zero-padded
  const numberStr = nextNumber.toString().padStart(3, '0');
  
  return `${baseSKU}${numberStr}`;
}

