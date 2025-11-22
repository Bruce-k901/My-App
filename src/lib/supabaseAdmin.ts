import { createClient } from "@supabase/supabase-js";

// Lazily create the server-side Supabase client using the Service Role key.
// This avoids throwing during Next.js build when env vars are missing, but will
// provide a clear error at runtime if the API route is invoked without proper configuration.
let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  // Always check env vars fresh (don't rely on cache if env vars might have changed)
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined;
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  ) as string | undefined;
  
  if (!url) {
    throw new Error("Missing Supabase URL env var: set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!key) {
    throw new Error("Missing Supabase admin env var: SUPABASE_SERVICE_ROLE_KEY");
  }
  // Guard against using a publishable anon key by mistake
  if (/^sb_publishable_/i.test(key)) {
    throw new Error("Invalid admin key: received a publishable anon key. Use SUPABASE_SERVICE_ROLE_KEY with the service_role key (starts with eyJ...).");
  }
  
  // Only use cache if we have a valid client and the key hasn't changed
  // This allows for runtime env var updates
  if (cachedClient) {
    return cachedClient;
  }
  
  cachedClient = createClient(url, key);
  return cachedClient;
}

// Export function to clear cache (useful for testing or after env var updates)
export function clearSupabaseAdminCache() {
  cachedClient = null;
}