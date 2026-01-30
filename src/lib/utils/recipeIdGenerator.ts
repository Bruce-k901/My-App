import { supabase } from '@/lib/supabase';

/**
 * Extracts first 3 letters from item name
 * Removes special characters and spaces
 */
export function extractPrefix(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'XXX';
  }
  
  // Convert to uppercase and remove all non-letters
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z]/g, ''); // Remove non-letters
  
  // Take first 3 letters, pad if needed
  const prefix = cleaned.substring(0, 3).padEnd(3, 'X');
  
  return prefix;
}

/**
 * Generates unique recipe ID in format: REC-{PREFIX}-{NUMBER}
 * Example: REC-OKJ-001 for "Okja Butter"
 */
export async function generateRecipeId(
  itemName: string,
  companyId: string
): Promise<string> {
  const prefix = extractPrefix(itemName);
  
  // Find highest number for this prefix
  // Try to query recipes with code column
  let existingRecipes: any[] = [];
  let nextNumber = 1;
  
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('code')
      .eq('company_id', companyId)
      .not('code', 'is', null)
      .like('code', `REC-${prefix}-%`)
      .order('code', { ascending: false })
      .limit(1);
    
    if (error) {
      // If code column doesn't exist, use default numbering
      if (error.code === 'PGRST204' || error.message?.includes('code') || error.message?.includes('column')) {
        console.warn('Code column not found in recipes view, using default numbering');
        const paddedNumber = '001';
        return `REC-${prefix}-${paddedNumber}`;
      }
      console.error('Error fetching existing recipes:', error);
      // For other errors, still return a default code
      const paddedNumber = '001';
      return `REC-${prefix}-${paddedNumber}`;
    }
    
    existingRecipes = data || [];
  } catch (err: any) {
    console.warn('Exception fetching recipes with code:', err);
    // Return default code on any exception
    const paddedNumber = '001';
    return `REC-${prefix}-${paddedNumber}`;
  }
  
  // Calculate next number from existing recipes
  if (existingRecipes && existingRecipes.length > 0) {
    // Extract number from last code (e.g., "REC-OKJ-005" -> 5)
    const lastCode = existingRecipes[0].code;
    if (lastCode) {
      const match = lastCode.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
  }
  
  // Format: REC-OKJ-001
  const paddedNumber = nextNumber.toString().padStart(3, '0');
  return `REC-${prefix}-${paddedNumber}`;
}

