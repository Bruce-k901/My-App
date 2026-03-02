import { LibraryType, StockStatus } from '@/types/library.types';

export function getTableName(libraryType: LibraryType): string {
  const mapping: Record<LibraryType, string> = {
    'ingredients': 'ingredients_library',
    'ppe': 'ppe_library',
    'chemicals': 'chemicals_library',
    'disposables': 'disposables_library',
    'first_aid': 'first_aid_supplies_library',
    'products': 'recipe_outputs',
  };
  return mapping[libraryType];
}

export function getLibraryTitle(libraryType: LibraryType): string {
  const mapping: Record<LibraryType, string> = {
    'ingredients': 'Ingredients Library',
    'ppe': 'PPE Library',
    'chemicals': 'Chemicals Library',
    'disposables': 'Disposables Library',
    'first_aid': 'First Aid Supplies',
    'products': 'Products',
  };
  return mapping[libraryType];
}

export function getSingularName(libraryType: LibraryType): string {
  const mapping: Record<LibraryType, string> = {
    'ingredients': 'Ingredient',
    'ppe': 'PPE Item',
    'chemicals': 'Chemical',
    'disposables': 'Disposable',
    'first_aid': 'First Aid Item',
    'products': 'Product',
  };
  return mapping[libraryType];
}

export function getStockStatus(
  currentStock: number, 
  reorderPoint?: number, 
  parLevel?: number
): StockStatus {
  if (!reorderPoint && !parLevel) {
    return { label: 'Not tracked', color: 'gray' };
  }
  
  if (reorderPoint && currentStock <= reorderPoint) {
    return { label: 'Low Stock', color: 'red' };
  }
  
  if (parLevel && currentStock < parLevel * 0.5) {
    return { label: 'Below Par', color: 'yellow' };
  }
  
  return { label: 'In Stock', color: 'green' };
}

export function calculateStockValue(
  currentStock: number,
  unitCost?: number,
  packCost?: number,
  packSize?: number
): number {
  if (!unitCost && !packCost) return 0;
  
  if (packCost && packSize && packSize > 0) {
    const unitCostFromPack = packCost / packSize;
    return currentStock * unitCostFromPack;
  }
  
  return currentStock * (unitCost || 0);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

/**
 * Format unit cost with appropriate decimal places
 * - For values >= £0.01, show 2 decimal places (e.g., £0.25)
 * - For values < £0.01 but >= £0.0001, show 4 decimal places (e.g., £0.0009)
 * - For very small values < £0.0001, show 6 decimal places
 */
export function formatUnitCost(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '-';

  const absAmount = Math.abs(amount);

  if (absAmount === 0) return '£0.00';
  if (absAmount >= 0.01) return `£${amount.toFixed(2)}`;
  if (absAmount >= 0.0001) return `£${amount.toFixed(4)}`;
  return `£${amount.toFixed(6)}`;
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

