// src/lib/utils/unitConversions.ts
//
// Unit conversion utilities for production calculations
//

/**
 * Normalize recipe yield to kilograms
 * Used for production calculations that operate in kg
 *
 * @param yieldQuantity - The numeric yield amount
 * @param yieldUnit - The unit string (g, kg, etc)
 * @returns The yield quantity converted to kilograms
 */
export function normalizeYieldToKg(yieldQuantity: number, yieldUnit: string): number {
  const unit = (yieldUnit || 'kg').toLowerCase().trim();

  // Kilograms - no conversion needed
  if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms' || unit === 'kgs') {
    return yieldQuantity;
  }

  // Grams - convert to kg
  if (unit === 'g' || unit === 'gram' || unit === 'grams') {
    return yieldQuantity / 1000;
  }

  // Default to treating as kg for other units (L, ml, etc.)
  // These would need density considerations for accurate conversion
  return yieldQuantity;
}
