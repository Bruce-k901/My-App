import { supabase } from '@/lib/supabase';

/**
 * Generate PPM schedules for all assets that have PPM data but no schedule entry
 */
export async function generatePPMSchedulesForAllAssets(companyId: string) {
  try {
    // Fetch all assets with PPM data that don't have a schedule
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select(`
        id,
        name,
        site_id,
        ppm_frequency_months,
        last_service_date,
        next_service_date,
        ppm_contractor_id,
        ppm_status
      `)
      .eq('company_id', companyId)
      .eq('archived', false)  // Exclude archived assets
      .not('ppm_frequency_months', 'is', null)
      .not('next_service_date', 'is', null);

    if (assetsError) {
      throw new Error(`Failed to fetch assets: ${assetsError.message}`);
    }

    if (!assets || assets.length === 0) {
      return {
        success: true,
        created: 0,
        skipped: 0,
        message: 'No assets with PPM data found'
      };
    }

    // Check which assets already have schedules
    const assetIds = assets.map(a => a.id);
    const { data: existingSchedules, error: schedulesError } = await supabase
      .from('ppm_schedules')
      .select('asset_id')
      .in('asset_id', assetIds);

    if (schedulesError) {
      throw new Error(`Failed to check existing schedules: ${schedulesError.message}`);
    }

    const existingAssetIds = new Set(existingSchedules?.map(s => s.asset_id) || []);
    
    // Filter out assets that already have schedules
    const assetsNeedingSchedules = assets.filter(a => !existingAssetIds.has(a.id));

    if (assetsNeedingSchedules.length === 0) {
      return {
        success: true,
        created: 0,
        skipped: assets.length,
        message: 'All assets already have PPM schedules'
      };
    }

    // Convert frequency_months to frequency string
    const convertFrequencyToString = (months: number | null): string => {
      if (!months) return 'yearly';
      if (months === 1) return 'monthly';
      if (months === 3) return 'quarterly';
      if (months === 6) return 'bi-annually';
      if (months === 12) return 'yearly';
      if (months === 24) return 'every-2-years';
      return `${months}-months`;
    };

    // Prepare schedule entries
    const schedulesToInsert = assetsNeedingSchedules.map(asset => {
      // Ensure next_service_date is in the future
      let nextDueDate = asset.next_service_date;
      if (nextDueDate) {
        const nextDate = new Date(nextDueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // If the date is in the past, calculate the next service date
        if (nextDate < today && asset.ppm_frequency_months) {
          const monthsToAdd = asset.ppm_frequency_months;
          nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
          
          // Keep adding months until we get a future date
          while (nextDate < today) {
            nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
          }
          
          nextDueDate = nextDate.toISOString().split('T')[0];
        }
      }

      return {
        asset_id: asset.id,
        next_due_date: nextDueDate || new Date().toISOString().split('T')[0],
        frequency: convertFrequencyToString(asset.ppm_frequency_months),
        task_type: 'ppm', // Default task type
        description: `PPM schedule for ${asset.name}`
      };
    });

    // Insert schedules in batches
    const batchSize = 50;
    let created = 0;
    let errors: string[] = [];

    for (let i = 0; i < schedulesToInsert.length; i += batchSize) {
      const batch = schedulesToInsert.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('ppm_schedules')
        .insert(batch);

      if (insertError) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
        console.error('Error inserting batch:', insertError);
      } else {
        created += batch.length;
      }
    }

    return {
      success: errors.length === 0,
      created,
      skipped: existingAssetIds.size,
      errors: errors.length > 0 ? errors : undefined,
      message: `Created ${created} PPM schedules. ${existingAssetIds.size} assets already had schedules.`
    };
  } catch (error: any) {
    console.error('Error generating PPM schedules:', error);
    return {
      success: false,
      created: 0,
      skipped: 0,
      errors: [error.message || 'Unknown error'],
      message: `Failed to generate schedules: ${error.message || 'Unknown error'}`
    };
  }
}

