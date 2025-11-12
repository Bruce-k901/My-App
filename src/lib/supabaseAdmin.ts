import { createClient } from "@supabase/supabase-js";

// Lazily create the server-side Supabase client using the Service Role key.
// This avoids throwing during Next.js build when env vars are missing, but will
// provide a clear error at runtime if the API route is invoked without proper configuration.
let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;

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
    throw new Error("Invalid admin key: received a publishable anon key. Use SUPABASE_SERVICE_ROLE_KEY.");
  }
  cachedClient = createClient(url, key);
  return cachedClient;
}