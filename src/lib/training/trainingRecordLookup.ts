/**
 * Training Record Lookup Helper
 * 
 * Finds training_records for expiring certificates based on certificate type.
 */

import { supabase } from '@/lib/supabase';
import { certificateTypeToCourseCode } from './certificateMapping';

export interface TrainingRecord {
  id: string;
  profile_id: string;
  course_id: string;
  status: string;
  expiry_date: string | null;
  completed_at: string | null;
  certificate_number: string | null;
  course: {
    id: string;
    name: string;
    code: string | null;
  };
}

/**
 * Find the training record for an expiring certificate
 * 
 * @param profileId - Employee profile ID
 * @param certificateType - Certificate type from task (e.g., 'food_safety', 'h_and_s')
 * @param level - Optional level for food_safety and h_and_s
 * @returns Training record or null if not found
 */
export async function findTrainingRecordForCertificate(
  profileId: string,
  certificateType: string,
  level?: number
): Promise<TrainingRecord | null> {
  console.log('🔍 [TRAINING RECORD LOOKUP] Starting lookup:', {
    profileId,
    certificateType,
    level
  });

  try {
    // Get course code from certificate type
    const courseCode = certificateTypeToCourseCode(certificateType, level);
    
    if (!courseCode) {
      console.warn('❌ [TRAINING RECORD LOOKUP] No course code mapping:', { certificateType, level });
      return null;
    }

    console.log('✅ [TRAINING RECORD LOOKUP] Course code mapped:', courseCode);

    // First, find the course by code
    const { data: courses, error: courseError } = await supabase
      .from('training_courses')
      .select('id, name, code')
      .eq('code', courseCode)
      .limit(1)
      .maybeSingle();

    if (courseError) {
      console.error('❌ [TRAINING RECORD LOOKUP] Course query error:', {
        error: courseError,
        courseCode
      });
      return null;
    }

    if (!courses) {
      console.warn('❌ [TRAINING RECORD LOOKUP] Course not found:', { courseCode });
      return null;
    }

    console.log('✅ [TRAINING RECORD LOOKUP] Course found:', { courseId: courses.id, courseName: courses.name });

    // Find training record - try different column name combinations
    // The database uses completed_date not completed_at
    let allRecords: any[] = [];
    let error: any = null;
    
    // Strategy 1: Check training_records table first
    console.log('🔍 [TRAINING RECORD LOOKUP] Checking training_records table...');
    const { data: allRecordsProfile, error: errorAllProfile } = await supabase
      .from('training_records')
      .select('id, profile_id, expiry_date, completed_date')
      .eq('profile_id', profileId);
    
    if (!errorAllProfile && allRecordsProfile && allRecordsProfile.length > 0) {
      console.log('📊 [TRAINING RECORD LOOKUP] Found records in training_records:', {
        count: allRecordsProfile.length,
        records: allRecordsProfile.map((r: any) => ({
          id: r.id,
          hasExpiry: !!r.expiry_date,
          expiryDate: r.expiry_date,
          completedDate: r.completed_date
        }))
      });
      
      // Filter to only records with expiry_date
      const recordsWithExpiry = allRecordsProfile.filter((r: any) => r.expiry_date !== null);
      console.log('📊 [TRAINING RECORD LOOKUP] Records with expiry_date:', recordsWithExpiry.length);
      
      if (recordsWithExpiry.length > 0) {
        // Sort by completed_date descending
        recordsWithExpiry.sort((a: any, b: any) => {
          const dateA = a.completed_date ? new Date(a.completed_date).getTime() : 0;
          const dateB = b.completed_date ? new Date(b.completed_date).getTime() : 0;
          return dateB - dateA;
        });
        
        allRecords = recordsWithExpiry.map((r: any) => ({
          ...r,
          completed_at: r.completed_date,
        }));
      }
    }
    
    // Strategy 2: If no records found, check legacy profiles table fields
    if (allRecords.length === 0) {
      console.log('🔍 [TRAINING RECORD LOOKUP] No records in training_records, checking legacy profiles fields...');
      
      // Map certificate type to profile field name
      const profileFieldMap: Record<string, { expiryField: string; levelField?: string }> = {
        'food_safety': { expiryField: 'food_safety_expiry_date', levelField: 'food_safety_level' },
        'h_and_s': { expiryField: 'h_and_s_expiry_date', levelField: 'h_and_s_level' },
        'fire_marshal': { expiryField: 'fire_marshal_expiry_date' },
        'first_aid': { expiryField: 'first_aid_expiry_date' },
        'cossh': { expiryField: 'cossh_expiry_date' },
      };
      
      const fieldMapping = profileFieldMap[certificateType.toLowerCase()];
      if (fieldMapping) {
        const selectFields = ['id', fieldMapping.expiryField];
        if (fieldMapping.levelField) {
          selectFields.push(fieldMapping.levelField);
        }
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(selectFields.join(', '))
          .eq('id', profileId)
          .single();
        
        if (!profileError && profileData) {
          const expiryDate = profileData[fieldMapping.expiryField];
          console.log('✅ [TRAINING RECORD LOOKUP] Found expiry date in profiles table:', {
            certificateType,
            expiryDate,
            level: fieldMapping.levelField ? profileData[fieldMapping.levelField] : null
          });
          
          if (expiryDate) {
            // Create a virtual record from the profile data
            // This allows the UI to work with legacy data
            allRecords = [{
              id: `legacy-${profileId}-${certificateType}`, // Virtual ID
              profile_id: profileId,
              expiry_date: expiryDate,
              completed_at: null, // We don't have this in legacy data
              completed_date: null,
              is_legacy: true, // Flag to indicate this is from legacy fields
            }];
            
            console.log('✅ [TRAINING RECORD LOOKUP] Created virtual record from legacy data');
          } else {
            console.warn('⚠️ [TRAINING RECORD LOOKUP] Profile found but no expiry date');
          }
        } else {
          console.warn('⚠️ [TRAINING RECORD LOOKUP] Error querying profiles:', profileError);
        }
      } else {
        console.warn('⚠️ [TRAINING RECORD LOOKUP] Unknown certificate type:', certificateType);
      }
    }

    if (error) {
      console.error('❌ [TRAINING RECORD LOOKUP] Final error:', {
        error,
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details
      });
      return null;
    }

    if (!allRecords || allRecords.length === 0) {
      console.warn('⚠️ [TRAINING RECORD LOOKUP] No records found:', {
        profileId,
        courseId: courses.id,
        courseCode
      });
      return null;
    }
    
    console.log('✅ [TRAINING RECORD LOOKUP] Records found:', {
      count: allRecords.length,
      recordIds: allRecords.map((r: any) => r.id)
    });
    
    // Use the first matching record
    // Since we can't filter by course_id (column doesn't exist), we'll use the most recent record
    // In the future, if course_id column is added, we can filter by it
    let records = allRecords[0];
    console.log('✅ [TRAINING RECORD LOOKUP] Using first record:', {
      recordId: records.id,
      expiryDate: records.expiry_date,
      totalRecords: allRecords.length
    });

    // Combine record with course data
    const result = {
      ...records,
      course: {
        id: courses.id,
        name: courses.name,
        code: courses.code,
      },
    } as TrainingRecord;
    
    console.log('✅ [TRAINING RECORD LOOKUP] Successfully found training record:', {
      recordId: result.id,
      courseName: result.course.name,
      expiryDate: result.expiry_date
    });
    
    return result;
  } catch (error: any) {
    console.error('❌ [TRAINING RECORD LOOKUP] Unexpected error:', {
      error,
      message: error?.message,
      stack: error?.stack,
      profileId,
      certificateType,
      level
    });
    return null;
  }
}

/**
 * Find training record by ID
 */
export async function findTrainingRecordById(
  recordId: string
): Promise<TrainingRecord | null> {
  try {
    // First get the training record
    const { data: record, error } = await supabase
      .from('training_records')
      .select(`
        id,
        profile_id,
        course_id,
        status,
        expiry_date,
        completed_at,
        certificate_number
      `)
      .eq('id', recordId)
      .single();

    if (error || !record) {
      return null;
    }

    // Then get the course
    const { data: course, error: courseError } = await supabase
      .from('training_courses')
      .select('id, name, code')
      .eq('id', record.course_id)
      .single();

    if (courseError || !course) {
      console.warn('Course not found for training record');
      return {
        ...record,
        course: {
          id: record.course_id,
          name: 'Unknown Course',
          code: null,
        },
      } as TrainingRecord;
    }

    return {
      ...record,
      course: {
        id: course.id,
        name: course.name,
        code: course.code,
      },
    } as TrainingRecord;
  } catch (error) {
    console.error('Error finding training record by ID:', error);
    return null;
  }
}
