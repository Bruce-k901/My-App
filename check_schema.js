
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking profile_settings...');
  const { data: settings, error: settingsError } = await supabase
    .from('profile_settings')
    .select('*')
    .limit(1);

  if (settingsError) {
    console.error('Error fetching profile_settings:', settingsError);
  } else {
    console.log('profile_settings data:', settings);
    if (settings.length > 0) {
      console.log('profile_settings columns:', Object.keys(settings[0]));
    } else {
      console.log('profile_settings is empty, cannot determine columns from data.');
      // Try to insert a dummy to see error or success? No, don't mutate.
    }
  }

  console.log('\nChecking site_compliance_score...');
  const { data: compliance, error: complianceError } = await supabase
    .from('site_compliance_score')
    .select('*')
    .limit(1);

  if (complianceError) {
    console.error('Error fetching site_compliance_score:', complianceError);
  } else {
    console.log('site_compliance_score data:', compliance);
  }
}

check();
