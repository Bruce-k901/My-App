// Quick email configuration verification script
// Usage: node scripts/verify-email-setup.js

const fs = require('fs')
const path = require('path')

// Read .env.local file manually (no dotenv dependency)
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["'](.*)["']$/, '$1')
      process.env[key] = value
    }
  })
}

console.log('\n📧 Email Configuration Checker\n')
console.log('=' .repeat(60))

const checks = {
  'Supabase URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'Supabase Anon Key': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'Supabase Service Key': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'Resend API Key': process.env.RESEND_API_KEY,
  'Resend From Email': process.env.RESEND_FROM,
  'App URL': process.env.NEXT_PUBLIC_APP_URL,
}

let allGood = true

for (const [name, value] of Object.entries(checks)) {
  if (value) {
    const masked = name.includes('Key') || name.includes('Supabase')
      ? `${value.substring(0, 10)}...`
      : value
    console.log(`✅ ${name.padEnd(25)} ${masked}`)
  } else {
    console.log(`❌ ${name.padEnd(25)} NOT SET`)
    allGood = false
  }
}

console.log('=' .repeat(60))

if (!allGood) {
  console.log('\n⚠️  ISSUES FOUND\n')
  console.log('Missing environment variables. Please check your .env.local file.')
  console.log('\nFor email to work, you MUST set:')
  console.log('  - RESEND_API_KEY (get from https://resend.com)')
  console.log('  - RESEND_FROM (e.g., noreply@yourdomain.com)')
  console.log('\nSee SETUP_EMAIL_CORRECTLY.md for detailed instructions.\n')
  process.exit(1)
} else {
  console.log('\n✅ ALL CONFIGURATION LOOKS GOOD!\n')
  console.log('Email system should work correctly.')
  console.log('\nTest by:')
  console.log('1. Creating a job in the recruitment section')
  console.log('2. Applying as a candidate (use a REAL email you can check)')
  console.log('3. Sending an offer letter from the candidate profile')
  console.log('4. Checking your email inbox (and spam folder!)\n')
  
  if (process.env.RESEND_FROM === 'onboarding@resend.dev') {
    console.log('⚠️  NOTE: You\'re using Resend\'s test domain.')
    console.log('    Emails may go to spam. Consider setting up your own domain.\n')
  }
}
