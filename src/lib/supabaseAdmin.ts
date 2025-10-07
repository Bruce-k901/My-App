import { createClient } from "@supabase/supabase-js";

// Lazily create the server-side Supabase client using the Service Role key.
// This avoids throwing during Next.js build when env vars are missing, but will
// provide a clear error at runtime if the API route is invoked without proper configuration.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!url || !key) {
    throw new Error("Missing Supabase admin env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key);
}