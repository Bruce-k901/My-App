import { supabase } from '@/lib/supabase';
import { getLibraryConfig } from './library-config';

interface MoveResult {
  success: boolean;
  error?: string;
}

/**
 * Move an item from one library table to another.
 * Maps the name field and copies only columns the target table accepts.
 */
export async function moveLibraryItem(
  item: Record<string, any>,
  sourceTable: string,
  targetTable: string,
  companyId: string,
): Promise<MoveResult> {
  const sourceConfig = getLibraryConfig(sourceTable);
  const targetConfig = getLibraryConfig(targetTable);

  if (!sourceConfig || !targetConfig) {
    return { success: false, error: 'Unknown library table' };
  }

  // Build payload: map name field + copy only columns the target table supports
  const payload: Record<string, any> = {
    [targetConfig.nameField]: item[sourceConfig.nameField],
    company_id: companyId,
  };

  for (const col of targetConfig.moveColumns) {
    if (col === 'company_id') continue;
    if (item[col] !== undefined && item[col] !== null) {
      payload[col] = item[col];
    }
  }

  // Ensure category has a value if the target table expects it (NOT NULL constraint)
  if (targetConfig.moveColumns.includes('category') && !payload.category) {
    payload.category = item.stock_category || item.category || 'General';
  }

  try {
    const { error: insertErr } = await supabase
      .from(targetTable)
      .insert(payload);

    if (insertErr) {
      return { success: false, error: insertErr.message };
    }

    const { error: deleteErr } = await supabase
      .from(sourceTable)
      .delete()
      .eq('id', item.id)
      .eq('company_id', companyId);

    if (deleteErr) {
      return { success: false, error: `Moved but failed to delete original: ${deleteErr.message}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}
