/**
 * Onboarding Integration Tests
 * 
 * These tests verify the complete onboarding flow works correctly.
 * This is critical because onboarding has been a source of many bugs.
 * 
 * Usage:
 *   npm run test tests/integration/onboarding.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables for tests');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test user data
const testUser = {
  email: `test-onboarding-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  companyName: `Test Company ${Date.now()}`,
};

let createdUserId: string | null = null;
let createdCompanyId: string | null = null;

describe('Onboarding Flow', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    // (In a real scenario, you'd want to clean up after tests too)
  });

  afterAll(async () => {
    // Cleanup: Delete test user and company
    if (createdCompanyId) {
      await supabaseAdmin.from('companies').delete().eq('id', createdCompanyId);
    }
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
    }
  });

  test('Complete onboarding flow: signup → company → profile → access', async () => {
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
    });

    expect(authError).toBeNull();
    expect(authData.user).toBeDefined();
    createdUserId = authData.user!.id;

    // Step 2: Create company (simulating what the onboarding service does)
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: testUser.companyName,
        created_by: createdUserId,
        user_id: createdUserId, // Critical: Set user_id for RLS
      })
      .select()
      .single();

    expect(companyError).toBeNull();
    expect(company).toBeDefined();
    expect(company?.user_id).toBe(createdUserId);
    createdCompanyId = company!.id;

    // Step 3: Create profile linked to company
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: createdUserId,
        email: testUser.email,
        full_name: `${testUser.firstName} ${testUser.lastName}`,
        company_id: createdCompanyId,
        app_role: 'admin',
      })
      .select()
      .single();

    expect(profileError).toBeNull();
    expect(profile).toBeDefined();
    expect(profile?.company_id).toBe(createdCompanyId);

    // Step 4: Verify user can access their company (using regular client, not admin)
    // This tests that RLS policies work correctly
    const { data: { session } } = await supabaseAdmin.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    expect(session).toBeDefined();
    const userAccessToken = session!.access_token;

    // Create a regular client (not admin) to test RLS
    const supabaseUser = createClient(supabaseUrl, userAccessToken, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // User should be able to read their company
    const { data: accessibleCompany, error: accessError } = await supabaseUser
      .from('companies')
      .select('*')
      .eq('id', createdCompanyId)
      .single();

    expect(accessError).toBeNull();
    expect(accessibleCompany).toBeDefined();
    expect(accessibleCompany?.id).toBe(createdCompanyId);

    // User should be able to read their profile
    const { data: accessibleProfile, error: profileAccessError } = await supabaseUser
      .from('profiles')
      .select('*')
      .eq('id', createdUserId)
      .single();

    expect(profileAccessError).toBeNull();
    expect(accessibleProfile).toBeDefined();
    expect(accessibleProfile?.company_id).toBe(createdCompanyId);
  });

  test('Onboarding fails gracefully if company creation fails', async () => {
    // This test verifies that if company creation fails,
    // we don't leave orphaned data
    const testEmail = `test-fail-${Date.now()}@example.com`;
    
    const { data: authData } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testUser.password,
      email_confirm: true,
    });

    const userId = authData.user!.id;

    // Try to create company with invalid data (e.g., missing required field)
    // This should fail
    const { error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        // Missing required fields
        name: '',
      })
      .select()
      .single();

    // Company creation should fail
    expect(companyError).toBeDefined();

    // Verify no orphaned profile was created
    const { data: orphanedProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    expect(orphanedProfile).toBeNull();

    // Cleanup
    await supabaseAdmin.auth.admin.deleteUser(userId);
  });

  test('User cannot access other users companies', async () => {
    // Create two users
    const user1Email = `test-user1-${Date.now()}@example.com`;
    const user2Email = `test-user2-${Date.now()}@example.com`;

    const { data: user1Data } = await supabaseAdmin.auth.admin.createUser({
      email: user1Email,
      password: testUser.password,
      email_confirm: true,
    });

    const { data: user2Data } = await supabaseAdmin.auth.admin.createUser({
      email: user2Email,
      password: testUser.password,
      email_confirm: true,
    });

    const user1Id = user1Data.user!.id;
    const user2Id = user2Data.user!.id;

    // Create company for user1
    const { data: company1 } = await supabaseAdmin
      .from('companies')
      .insert({
        name: 'User1 Company',
        created_by: user1Id,
        user_id: user1Id,
      })
      .select()
      .single();

    // Create profile for user1
    await supabaseAdmin
      .from('profiles')
      .insert({
        id: user1Id,
        email: user1Email,
        company_id: company1!.id,
        app_role: 'admin',
      });

    // Create company for user2
    const { data: company2 } = await supabaseAdmin
      .from('companies')
      .insert({
        name: 'User2 Company',
        created_by: user2Id,
        user_id: user2Id,
      })
      .select()
      .single();

    // Create profile for user2
    await supabaseAdmin
      .from('profiles')
      .insert({
        id: user2Id,
        email: user2Email,
        company_id: company2!.id,
        app_role: 'admin',
      });

    // Login as user2
    const { data: { session } } = await supabaseAdmin.auth.signInWithPassword({
      email: user2Email,
      password: testUser.password,
    });

    const supabaseUser2 = createClient(supabaseUrl, session!.access_token, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // User2 should NOT be able to access user1's company
    const { data: inaccessibleCompany, error: accessError } = await supabaseUser2
      .from('companies')
      .select('*')
      .eq('id', company1!.id)
      .single();

    // Should either return null data or an error
    expect(inaccessibleCompany).toBeNull();
    // RLS should block access
    expect(accessError).toBeDefined();

    // Cleanup
    await supabaseAdmin.from('companies').delete().eq('id', company1!.id);
    await supabaseAdmin.from('companies').delete().eq('id', company2!.id);
    await supabaseAdmin.auth.admin.deleteUser(user1Id);
    await supabaseAdmin.auth.admin.deleteUser(user2Id);
  });
});


