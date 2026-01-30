import { test as setup } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

setup('seed test data', async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.test');
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey, // Service role bypasses RLS
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
  const testCompanyId = process.env.TEST_COMPANY_ID || '00000000-0000-0000-0000-000000000001';
  const testSiteId = process.env.TEST_SITE_ID || '00000000-0000-0000-0000-000000000002';

  try {
    // Clean up previous test data (optional - comment out if you want to keep data)
    // await supabase.from('module_references').delete().ilike('metadata->>test', 'true');
    // await supabase.from('attendance_records').delete().eq('shift_notes', 'TEST_DATA');

    // Check if test user exists, create if not
    let userId: string | undefined;
    try {
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const user = existingUser?.users?.find(u => u.email === testEmail);
      
      if (user) {
        userId = user.id;
        console.log(`✅ Test user already exists: ${testEmail}`);
      } else {
        // Create test user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: testEmail,
          password: testPassword,
          email_confirm: true,
        });

        if (createError) throw createError;
        userId = newUser.user.id;
        console.log(`✅ Test user created: ${testEmail}`);
      }
    } catch (error: any) {
      console.error('Error creating test user:', error);
      // Continue anyway - user might already exist
    }

    // Seed test company (upsert - creates or updates)
    const { error: companyError } = await supabase
      .from('companies')
      .upsert({
        id: testCompanyId,
        name: 'Test Company',
        slug: 'test-company',
      }, { onConflict: 'id' });

    if (companyError && !companyError.message.includes('duplicate')) {
      console.warn('Company upsert error:', companyError);
    } else {
      console.log('✅ Test company seeded');
    }

    // Seed test site
    const { error: siteError } = await supabase
      .from('sites')
      .upsert({
        id: testSiteId,
        company_id: testCompanyId,
        name: 'Test Site',
      }, { onConflict: 'id' });

    if (siteError && !siteError.message.includes('duplicate')) {
      console.warn('Site upsert error:', siteError);
    } else {
      console.log('✅ Test site seeded');
    }

    // Seed test profile (if user was created/found)
    if (userId) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          company_id: testCompanyId,
          primary_site_id: testSiteId,
          full_name: 'Test User',
          email: testEmail,
          app_role: 'admin', // Give admin access for testing
        }, { onConflict: 'id' });

      if (profileError && !profileError.message.includes('duplicate')) {
        console.warn('Profile upsert error:', profileError);
      } else {
        console.log('✅ Test profile seeded');
      }
    }

    console.log('✅ Test data seeding complete');
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
});

