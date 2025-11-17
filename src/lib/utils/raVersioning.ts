/**
 * Utility functions for Risk Assessment version management
 * Similar to SOP versioning but for Risk Assessments
 */

import { supabase } from '@/lib/supabase';

export interface RAVersioningResult {
  newVersion: string;
  versionNumber: number;
  parentId: string | null;
  newRefCode: string; // Incremented ref_code (e.g., RA-GEN-BESH-001 -> RA-GEN-BESH-002)
  hasVersionColumns?: boolean; // Whether version_number and parent_id columns exist
}

/**
 * Parse ref_code to extract base and number (e.g., RA-GEN-BESH-001 -> { base: 'RA-GEN-BESH', number: 1 })
 */
function parseRARefCode(refCode: string): { base: string; number: number } | null {
  // Match pattern like RA-GEN-BESH-001 or RA-COSHH-CHEM-001
  const match = refCode.match(/^(.+)-(\d+)$/);
  if (!match) return null;
  
  const base = match[1];
  const number = parseInt(match[2], 10);
  return { base, number };
}

/**
 * Generate incremented ref_code (e.g., RA-GEN-BESH-001 -> RA-GEN-BESH-002)
 */
function incrementRARefCode(refCode: string): string {
  const parsed = parseRARefCode(refCode);
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
 * Get versioning information for creating a new version of a Risk Assessment
 * @param refCode - The reference code of the RA
 * @param companyId - The company ID
 * @param originalRA - The original RA being edited (optional)
 * @returns Versioning information including new version number, parent ID, and incremented ref_code
 */
export async function getRAVersioningInfo(
  refCode: string,
  companyId: string,
  originalRA?: any
): Promise<RAVersioningResult> {
  // Get the latest version number for this ref_code base (all versions share the same base)
  const parsed = parseRARefCode(refCode);
  const basePattern = parsed ? parsed.base : refCode;
  
  // Get all RAs with matching base pattern
  // Note: version_number and parent_id columns may not exist if migration hasn't run yet
  // Start with basic columns that definitely exist, then try to add optional ones
  let allVersions: any[] = [];
  let versionsError: any = null;
  let hasVersionColumns = false; // Declare at function scope
  
  // Start with just ref_code and id (these definitely exist)
  let result = await supabase
    .from('risk_assessments')
    .select('ref_code, id')
    .eq('company_id', companyId)
    .like('ref_code', `${basePattern}-%`)
    .order('created_at', { ascending: false });
  
  if (result.error) {
    const errorMessage = result.error.message || JSON.stringify(result.error) || '';
    const errorCode = result.error.code || '';
    
    console.error('RA versioning query error:', { 
      message: errorMessage, 
      code: errorCode, 
      error: result.error,
      basePattern,
      fullError: JSON.stringify(result.error, null, 2)
    });
    
    versionsError = result.error;
  } else {
    allVersions = result.data || [];
    
    // Check if version_number column exists by trying to fetch it
    // If the query fails with a 400 error, it means the columns don't exist
    const extendedResult = await supabase
      .from('risk_assessments')
      .select('ref_code, version_number, parent_id, id')
      .eq('company_id', companyId)
      .like('ref_code', `${basePattern}-%`)
      .limit(1);
    
    // Check if error is due to missing columns (400 Bad Request or column not found)
    if (extendedResult.error) {
      const errorCode = extendedResult.error.code || '';
      const errorMessage = extendedResult.error.message || '';
      
      // If it's a column not found error (42703) or 400 Bad Request, columns don't exist
      if (errorCode === '42703' || 
          errorCode === 'PGRST204' ||
          errorMessage.includes('version_number') ||
          errorMessage.includes('column') ||
          errorMessage.includes('schema cache')) {
        // Columns don't exist, use defaults
        console.log('Version columns (version_number, parent_id) do not exist, using defaults');
        hasVersionColumns = false;
        allVersions = allVersions.map((v: any) => ({
          ...v,
          version_number: 1,
          parent_id: null
        }));
      } else {
        // Some other error occurred, log it but continue with defaults
        console.warn('Unexpected error checking version columns:', extendedResult.error);
        hasVersionColumns = false;
        allVersions = allVersions.map((v: any) => ({
          ...v,
          version_number: 1,
          parent_id: null
        }));
      }
    } else if (extendedResult.data && extendedResult.data.length > 0) {
      // Query succeeded, check if version_number actually exists in the result
      hasVersionColumns = 'version_number' in extendedResult.data[0];
      
      if (hasVersionColumns) {
        // Fetch all with version columns
        const fullResult = await supabase
          .from('risk_assessments')
          .select('ref_code, version_number, parent_id, id')
          .eq('company_id', companyId)
          .like('ref_code', `${basePattern}-%`)
          .order('created_at', { ascending: false });
        
        if (!fullResult.error && fullResult.data) {
          allVersions = fullResult.data.map((v: any) => ({
            ...v,
            version_number: v.version_number || 1,
            parent_id: v.parent_id || null
          }));
        }
      } else {
        // Columns don't exist in result, use defaults
        allVersions = allVersions.map((v: any) => ({
          ...v,
          version_number: 1,
          parent_id: null
        }));
      }
    } else {
      // No data returned, use defaults
      allVersions = allVersions.map((v: any) => ({
        ...v,
        version_number: 1,
        parent_id: null
      }));
    }
    
    console.log('RA versioning query succeeded, found', allVersions.length, 'versions, hasVersionColumns:', hasVersionColumns);
  }

  if (versionsError) {
    console.error('Error fetching RA version info:', {
      error: versionsError,
      message: versionsError?.message,
      code: versionsError?.code,
      details: versionsError?.details,
      hint: versionsError?.hint,
      fullError: JSON.stringify(versionsError, null, 2)
    });
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
  const newRefCode = incrementRARefCode(refCode);

  // Find the original parent (first version) or use current as parent
  let parentId: string | null = null;
  if (originalRA) {
    // If editing, use the original's parent_id if it exists, otherwise use the original's id
    parentId = originalRA.parent_id || originalRA.id;
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
    newRefCode,
    hasVersionColumns
  };
}

/**
 * Create versioning payload for inserting a new RA version
 * @param baseData - Base RA data
 * @param versioningInfo - Versioning information from getRAVersioningInfo
 * @param profile - User profile (for created_by/updated_by)
 * @param isNewRA - Whether this is a completely new RA (first version)
 * @returns Payload ready for database insert
 */
export function createRAVersionPayload(
  baseData: any,
  versioningInfo: RAVersioningResult,
  profile: any,
  isNewRA: boolean = false
) {
  const payload: any = {
    ...baseData
  };
  
  // Only include versioning columns if they exist in the database
  const hasVersionColumns = versioningInfo.hasVersionColumns === true; // Only true if explicitly detected
  
  if (hasVersionColumns) {
    if (isNewRA) {
      payload.version_number = 1;
      payload.parent_id = null;
    } else {
      payload.ref_code = versioningInfo.newRefCode; // Use incremented ref_code
      payload.version_number = versioningInfo.versionNumber;
      payload.parent_id = versioningInfo.parentId;
      // Only add change_notes if versioning columns exist (it's part of the same migration)
      payload.change_notes = `Version ${versioningInfo.newVersion} - Updated by ${profile?.full_name || baseData.assessor_name || 'Unknown'}`;
    }
  } else {
    // If versioning columns don't exist, just update ref_code for new versions
    if (!isNewRA) {
      payload.ref_code = versioningInfo.newRefCode;
    }
  }
  
  return payload;
}

