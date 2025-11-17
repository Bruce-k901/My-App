/**
 * Utility functions for SOP version management
 */

import { supabase } from '@/lib/supabase';

export interface VersioningResult {
  newVersion: string;
  versionNumber: number;
  parentId: string | null;
  newRefCode: string; // Incremented ref_code (e.g., PREP-BESH-001 -> PREP-BESH-002)
}

/**
 * Parse ref_code to extract base and number (e.g., PREP-BESH-001 -> { base: 'PREP-BESH', number: 1 })
 */
function parseRefCode(refCode: string): { base: string; number: number } | null {
  // Match pattern like PREP-BESH-001 or PREP-BESH-1
  const match = refCode.match(/^(.+)-(\d+)$/);
  if (!match) return null;
  
  const base = match[1];
  const number = parseInt(match[2], 10);
  return { base, number };
}

/**
 * Generate incremented ref_code (e.g., PREP-BESH-001 -> PREP-BESH-002)
 */
function incrementRefCode(refCode: string): string {
  const parsed = parseRefCode(refCode);
  if (!parsed) {
    // If ref_code doesn't match pattern, append -002
    return `${refCode}-002`;
  }
  
  const newNumber = parsed.number + 1;
  // Format number with leading zeros (001, 002, etc.)
  const paddedNumber = newNumber.toString().padStart(3, '0');
  return `${parsed.base}-${paddedNumber}`;
}

/**
 * Get versioning information for creating a new version of an SOP
 * @param refCode - The reference code of the SOP
 * @param companyId - The company ID
 * @param originalSOP - The original SOP being edited (optional)
 * @returns Versioning information including new version number, parent ID, and incremented ref_code
 */
export async function getVersioningInfo(
  refCode: string,
  companyId: string,
  originalSOP?: any
): Promise<VersioningResult> {
  // Get the latest version number for this ref_code base (all versions share the same base)
  // We need to find all versions by matching the base part of ref_code
  const parsed = parseRefCode(refCode);
  const basePattern = parsed ? parsed.base : refCode;
  
  // Get all SOPs with matching base pattern
  const { data: allVersions, error: versionsError } = await supabase
    .from('sop_entries')
    .select('ref_code, version_number, parent_id, id')
    .eq('company_id', companyId)
    .like('ref_code', `${basePattern}-%`)
    .order('version_number', { ascending: false });

  if (versionsError) {
    console.error('Error fetching version info:', versionsError);
    throw versionsError;
  }

  // Find the highest version number
  let latestVersionNumber = 1;
  if (allVersions && allVersions.length > 0) {
    const maxVersion = Math.max(...allVersions.map(v => v.version_number || 1));
    latestVersionNumber = maxVersion + 1;
  } else {
    latestVersionNumber = 2; // First version is 1, so next is 2
  }
  
  const newVersion = `${latestVersionNumber}.0`;
  
  // Generate incremented ref_code
  const newRefCode = incrementRefCode(refCode);

  // Find the original parent (first version) or use current as parent
  let parentId: string | null = null;
  if (originalSOP) {
    // If editing, use the original's parent_id if it exists, otherwise use the original's id
    parentId = originalSOP.parent_id || originalSOP.id;
  } else if (allVersions && allVersions.length > 0) {
    // Find the root parent (version_number = 1)
    const rootVersion = allVersions.find(v => (v.version_number || 1) === 1);
    if (rootVersion) {
      parentId = rootVersion.parent_id || rootVersion.id;
    }
  }

  return {
    newVersion,
    versionNumber: latestVersionNumber,
    parentId,
    newRefCode
  };
}

/**
 * Create versioning payload for inserting a new SOP version
 * @param baseData - Base SOP data
 * @param versioningInfo - Versioning information from getVersioningInfo
 * @param profile - User profile (for created_by/updated_by)
 * @param isNewSOP - Whether this is a completely new SOP (first version)
 * @returns Payload ready for database insert
 */
export function createVersionPayload(
  baseData: any,
  versioningInfo: VersioningResult,
  profile: any,
  isNewSOP: boolean = false
) {
  if (isNewSOP) {
    return {
      ...baseData,
      version: '1.0',
      version_number: 1,
      parent_id: null
    };
  }

  return {
    ...baseData,
    ref_code: versioningInfo.newRefCode, // Use incremented ref_code
    version: versioningInfo.newVersion,
    version_number: versioningInfo.versionNumber,
    parent_id: versioningInfo.parentId,
    change_notes: `Version ${versioningInfo.newVersion} - Updated by ${profile?.full_name || baseData.author || 'Unknown'}`
  };
}

