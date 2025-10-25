#!/usr/bin/env node

/**
 * Test script for contractor assignment logic
 * This script tests the updated contractor assignment functionality
 */

const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables or replace with actual values
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testContractorAssignment() {
  console.log('🧪 Testing Contractor Assignment Logic...\n');

  try {
    // Test 1: Check if contractors have the new 'type' column
    console.log('1. Checking contractor types...');
    const { data: contractors, error: contractorsError } = await supabase
      .from('contractors')
      .select('id, name, type, region, category')
      .limit(5);
    
    if (contractorsError) {
      console.error('❌ Error fetching contractors:', contractorsError);
      return;
    }
    
    console.log('✅ Contractors with types:');
    contractors.forEach(c => {
      console.log(`   - ${c.name} (${c.type}) - ${c.region}/${c.category}`);
    });
    console.log('');

    // Test 2: Test the assign_default_contractors RPC function
    console.log('2. Testing assign_default_contractors RPC...');
    
    // Get a site to test with
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id, name, region')
      .limit(1);
    
    if (sitesError) {
      console.error('❌ Error fetching sites:', sitesError);
      return;
    }
    
    if (sites.length === 0) {
      console.log('⚠️  No sites found. Please create a site first.');
      return;
    }
    
    const testSite = sites[0];
    console.log(`   Testing with site: ${testSite.name} (${testSite.region})`);
    
    // Test with different categories
    const testCategories = ['HVAC', 'Electrical', 'Plumbing'];
    
    for (const category of testCategories) {
      console.log(`\n   Testing category: ${category}`);
      
      const { data: defaults, error: defaultsError } = await supabase.rpc('assign_default_contractors', {
        p_site_id: testSite.id,
        p_category: category
      });
      
      if (defaultsError) {
        console.log(`   ❌ Error for ${category}:`, defaultsError.message);
        continue;
      }
      
      if (defaults && defaults.length > 0) {
        const result = defaults[0];
        console.log(`   ✅ Default contractors for ${category}:`);
        console.log(`      PPM: ${result.ppm_contractor_id ? 'Assigned' : 'None'}`);
        console.log(`      Reactive: ${result.reactive_contractor_id ? 'Assigned' : 'None'}`);
        console.log(`      Warranty: ${result.warranty_contractor_id ? 'Assigned' : 'None'}`);
      } else {
        console.log(`   ⚠️  No default contractors found for ${category}`);
      }
    }

    // Test 3: Test contractor filtering by type
    console.log('\n3. Testing contractor filtering by type...');
    
    const contractorTypes = ['ppm', 'reactive', 'warranty'];
    
    for (const type of contractorTypes) {
      console.log(`\n   Testing ${type} contractors:`);
      
      const { data: typeContractors, error: typeError } = await supabase
        .from('contractors')
        .select('id, name, type, region, category')
        .eq('type', type)
        .limit(3);
      
      if (typeError) {
        console.log(`   ❌ Error fetching ${type} contractors:`, typeError.message);
        continue;
      }
      
      if (typeContractors.length > 0) {
        console.log(`   ✅ Found ${typeContractors.length} ${type} contractors:`);
        typeContractors.forEach(c => {
          console.log(`      - ${c.name} (${c.region}/${c.category})`);
        });
      } else {
        console.log(`   ⚠️  No ${type} contractors found`);
      }
    }

    // Test 4: Test the new RPC functions
    console.log('\n4. Testing new RPC functions...');
    
    // Test get_contractors_by_type
    if (sites.length > 0) {
      const { data: byTypeContractors, error: byTypeError } = await supabase.rpc('get_contractors_by_type', {
        site_id: testSite.id,
        category: 'HVAC',
        contractor_type: 'ppm'
      });
      
      if (byTypeError) {
        console.log('   ❌ Error testing get_contractors_by_type:', byTypeError.message);
      } else {
        console.log(`   ✅ get_contractors_by_type returned ${byTypeContractors?.length || 0} PPM contractors for HVAC`);
      }
    }

    console.log('\n🎉 Contractor assignment testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testContractorAssignment();
