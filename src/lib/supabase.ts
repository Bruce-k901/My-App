import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

// Environment variable validation
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  const missingVars = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  console.error(`❌ Missing Supabase environment variables: ${missingVars.join(', ')}`);
  console.error('📋 To fix this:');
  console.error('1. Copy .env.template to .env.local');
  console.error('2. Add your real Supabase credentials');
  console.error('3. Restart the development server');
  console.error('4. For production: Update Vercel Environment Variables');
  
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}. Check .env.local or Vercel config.`);
}

// Create a singleton Supabase client using SSR helpers for proper session handling
// Typed with Database from auto-generated supabase.ts
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default supabase;
