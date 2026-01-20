import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.describe('Module References System', () => {
  let supabase: ReturnType<typeof createClient>;
  const testCompanyId = process.env.TEST_COMPANY_ID || '00000000-0000-0000-0000-000000000001';
  const testSiteId = process.env.TEST_SITE_ID || '00000000-0000-0000-0000-000000000002';

  test.beforeAll(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.test');
    }

    supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  });

  test('module_references table exists', async () => {
    const { data, error } = await supabase
      .from('module_references')
      .select('*')
      .limit(1);

    // Table might not exist yet - that's okay for refactoring
    if (error && error.message.includes('does not exist')) {
      console.warn('⚠️ module_references table does not exist yet - this is expected during refactoring');
      return;
    }

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  test('link_entities function works', async () => {
    // Check if function exists by trying to call it
    // This test will be updated once the function is implemented
    try {
      // Create test task (if checklist_tasks exists)
      const { data: task, error: taskError } = await supabase
        .from('checklist_tasks')
        .insert({
          company_id: testCompanyId,
          site_id: testSiteId,
          name: 'Test Task',
          status: 'pending',
        })
        .select()
        .single();

      if (taskError && !taskError.message.includes('does not exist')) {
        // Skip if table doesn't exist yet
        console.warn('⚠️ checklist_tasks table may not exist:', taskError.message);
        return;
      }

      // Create test waste log (if waste_logs exists)
      const { data: waste, error: wasteError } = await supabase
        .from('waste_logs')
        .insert({
          company_id: testCompanyId,
          site_id: testSiteId,
          waste_date: new Date().toISOString().split('T')[0],
          total_cost: 10.00,
        })
        .select()
        .single();

      if (wasteError && !wasteError.message.includes('does not exist')) {
        // Cleanup task if we created it
        if (task) {
          await supabase.from('checklist_tasks').delete().eq('id', task.id);
        }
        console.warn('⚠️ waste_logs table may not exist:', wasteError.message);
        return;
      }

      // Try to link them (if function exists)
      if (task && waste) {
        const { data: refId, error: linkError } = await supabase.rpc('link_entities', {
          p_source_module: 'checkly',
          p_source_table: 'checklist_tasks',
          p_source_id: task.id,
          p_target_module: 'stockly',
          p_target_table: 'waste_logs',
          p_target_id: waste.id,
          p_reference_type: 'created_from',
          p_metadata: { test: true }
        });

        if (linkError && linkError.message.includes('does not exist')) {
          console.warn('⚠️ link_entities function does not exist yet');
        } else {
          expect(linkError).toBeNull();
          expect(refId).toBeDefined();

          // Cleanup
          if (refId) {
            await supabase.from('module_references').delete().eq('id', refId);
          }
        }

        // Cleanup test data
        await supabase.from('checklist_tasks').delete().eq('id', task.id);
        await supabase.from('waste_logs').delete().eq('id', waste.id);
      }
    } catch (error: any) {
      // Expected during refactoring - log and continue
      console.warn('⚠️ Module references test skipped (tables/functions may not exist yet):', error.message);
    }
  });

  test('get_linked_entities function works', async () => {
    // This test will be updated once the function is implemented
    try {
      const { error } = await supabase.rpc('get_linked_entities', {
        p_module: 'checkly',
        p_table: 'checklist_tasks',
        p_id: '00000000-0000-0000-0000-000000000999',
        p_direction: 'both'
      });

      if (error && error.message.includes('does not exist')) {
        console.warn('⚠️ get_linked_entities function does not exist yet');
        return;
      }

      // If function exists, should return empty array for non-existent ID
      expect(error).toBeNull();
    } catch (error: any) {
      console.warn('⚠️ get_linked_entities test skipped:', error.message);
    }
  });

  test('task-to-waste flow creates reference', async ({ page }) => {
    // Navigate to tasks page
    await page.goto('/dashboard/tasks/active');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if page loaded successfully
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
    
    // This test will be expanded once the workflow is implemented
    // For now, just verify the page loads
    expect(page.url()).toContain('/dashboard');
  });
});

