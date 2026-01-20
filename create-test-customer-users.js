/**
 * Script to create test customer accounts for the Order Book customer portal
 * 
 * This creates Supabase auth users and links them to existing customer records
 * Run with: node create-test-customer-users.js
 * 
 * Make sure your .env.local file has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

const fs = require('fs');
const path = require('path');

// Load .env.local file manually
const envPath = path.join(process.cwd(), '.env.local');
let envVars = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
} else {
  // Fallback to process.env (for Next.js environments)
  envVars = process.env;
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createCustomerUsers() {
  console.log('🔧 Creating test customer accounts...\n');

  // Okja customers from real data (customers with email addresses)
  const testCustomers = [
    {
      email: 'accounts@highgrade.coffee',
      password: 'TestPassword123',
      businessName: 'High Grade',
    },
    {
      email: 'hi@thirdculturedeli.com',
      password: 'TestPassword123',
      businessName: '3rd Culture',
    },
    {
      email: 'greg@unitydiner.com',
      password: 'TestPassword123',
      businessName: 'Unity Diner',
    },
  ];

  for (const customer of testCustomers) {
    try {
      console.log(`\n📧 Processing: ${customer.email}`);

      // 1. Check if auth user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers.users.find((u) => u.email === customer.email.toLowerCase());

      let authUserId;
      if (existingUser) {
        console.log(`   ✅ Auth user already exists: ${existingUser.id}`);
        authUserId = existingUser.id;
      } else {
        // 2. Create auth user
        console.log(`   🔐 Creating auth user...`);
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: customer.email.toLowerCase(),
          password: customer.password,
          email_confirm: true, // Skip email confirmation
          user_metadata: {
            full_name: customer.businessName,
          },
        });

        if (createError) {
          console.error(`   ❌ Error creating auth user:`, createError.message);
          continue;
        }

        console.log(`   ✅ Auth user created: ${newUser.user.id}`);
        authUserId = newUser.user.id;
      }

      // 3. Find customer record by email
      const { data: customerRecord, error: customerError } = await supabase
        .from('order_book_customers')
        .select('id, company_id, business_name, email')
        .eq('email', customer.email.toLowerCase())
        .maybeSingle();

      if (customerError) {
        console.error(`   ❌ Error finding customer record:`, customerError.message);
        continue;
      }

      if (!customerRecord) {
        console.warn(`   ⚠️  No customer record found with email: ${customer.email}`);
        console.log(`   💡 Customer records need to be created first via the sample data migration`);
        continue;
      }

      console.log(`   📋 Found customer record: ${customerRecord.business_name} (${customerRecord.id})`);

      // 4. Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, company_id')
        .eq('id', authUserId)
        .maybeSingle();

      if (existingProfile) {
        console.log(`   ✅ Profile already exists (company_id: ${existingProfile.company_id})`);
        
        // Update company_id if it doesn't match
        if (existingProfile.company_id !== customerRecord.company_id) {
          console.log(`   🔄 Updating profile company_id...`);
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ company_id: customerRecord.company_id })
            .eq('id', authUserId);

          if (updateError) {
            console.error(`   ❌ Error updating profile:`, updateError.message);
          } else {
            console.log(`   ✅ Profile updated`);
          }
        }
      } else {
        // 5. Create profile linked to customer's company_id
        console.log(`   👤 Creating profile...`);
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authUserId,
          auth_user_id: authUserId,
          email: customer.email.toLowerCase(),
          full_name: customer.businessName,
          company_id: customerRecord.company_id,
          app_role: 'Staff', // Customer role
        });

        if (profileError) {
          console.error(`   ❌ Error creating profile:`, profileError.message);
          continue;
        }

        console.log(`   ✅ Profile created with company_id: ${customerRecord.company_id}`);
      }

      console.log(`   ✨ Setup complete for ${customer.businessName}`);
      console.log(`   🔑 Login: ${customer.email}`);
      console.log(`   🔑 Password: ${customer.password}`);
    } catch (error) {
      console.error(`   ❌ Unexpected error:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Customer account setup complete!');
  console.log('='.repeat(60));
  console.log('\n📝 Test Customer Accounts:');
  testCustomers.forEach((c) => {
    console.log(`   Email: ${c.email}`);
    console.log(`   Password: ${c.password}`);
    console.log('');
  });
  console.log('🌐 Access the portal at: http://localhost:3000/customer/login');
}

createCustomerUsers().catch(console.error);

