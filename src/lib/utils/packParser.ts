/**
 * Utility functions for parsing pack size strings and normalizing costs
 */

export interface ParsedPackSize {
  qty: number;
  unit: string | null;
}

/**
 * Parse pack size strings like "500g", "1L", "10kg", "5L"
 * @param packSize - The pack size string to parse
 * @returns Object with quantity and unit
 */
export function parsePackSize(packSize?: string): ParsedPackSize {
  if (!packSize) return { qty: 1, unit: null };
  
  const match = packSize.match(/([\d.]+)\s*(kg|g|l|ml)/i);
  if (!match) return { qty: 1, unit: null };
  
  return {
    qty: parseFloat(match[1]),
    unit: match[2].toLowerCase()
  };
}

/**
 * Normalize cost to base units (£/kg or £/L)
 * @param selected - The selected ingredient from library
 * @returns Normalized cost and unit
 */
export function normalizeCost(selected: any): { cost: number; unit: string } {
  const { qty, unit: packUnit } = parsePackSize(selected?.pack_size);
  let cost = selected?.unit_cost ?? 0;
  let unit = selected?.unit?.toLowerCase() || "kg";

  // If supplier cost represents a pack (e.g. 500g pack)
  if (packUnit && qty > 0) {
    if (packUnit === "g" && qty !== 1000) {
      // Convert g pack to kg base unit
      cost = (cost / qty) * 1000;
      unit = "kg";
    } else if (packUnit === "ml" && qty !== 1000) {
      // Convert ml pack to L base unit
      cost = (cost / qty) * 1000;
      unit = "l";
    } else if (packUnit === "kg" || packUnit === "l") {
      // Already in base units, keep as is
      unit = packUnit;
    }
  }

  return { cost, unit };
}

/**
 * Check if there's a unit conflict between pack size and declared unit
 * @param packSize - The pack size string
 * @param declaredUnit - The declared unit from the ingredient
 * @returns True if there's a conflict
 */
export function hasUnitConflict(packSize?: string, declaredUnit?: string): boolean {
  if (!packSize || !declaredUnit) return false;
  
  const { unit: packUnit } = parsePackSize(packSize);
  const declaredUnitLower = declaredUnit.toLowerCase();
  
  // Check for common conflicts
  if (packUnit === "g" && declaredUnitLower === "kg") return false; // This is fine
  if (packUnit === "ml" && declaredUnitLower === "l") return false; // This is fine
  if (packUnit === "kg" && declaredUnitLower === "g") return false; // This is fine
  if (packUnit === "l" && declaredUnitLower === "ml") return false; // This is fine
  
  // Check if pack size contains the declared unit
  return !packSize.toLowerCase().includes(declaredUnitLower);
}

/**
 * Generate tooltip text for normalized values
 * @param originalPackSize - Original pack size
 * @param originalCost - Original cost
 * @param normalizedCost - Normalized cost
 * @param normalizedUnit - Normalized unit
 * @returns Tooltip text
 */
export function generateCostTooltip(
  originalPackSize?: string,
  originalCost?: number,
  normalizedCost?: number,
  normalizedUnit?: string
): string {
  if (!originalPackSize || !originalCost || !normalizedCost || !normalizedUnit) {
    return "";
  }
  
  return `Original pack: ${originalPackSize} @ £${originalCost.toFixed(2)} → Normalized: £${normalizedCost.toFixed(2)}/${normalizedUnit}`;
}
