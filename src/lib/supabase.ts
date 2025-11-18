/**
 * ============================================================================
 * SUPABASE CLIENT - ATTENDANCE LOGS PROTECTION
 * ============================================================================
 * 
 * This file contains MULTIPLE LAYERS of protection to prevent attendance_logs
 * 406 errors from ever happening again:
 * 
 * LAYER 1: Fetch Interceptor (Network Level)
 *   - Intercepts ALL network requests to /rest/v1/attendance_logs
 *   - Automatically fixes: clock_in_at::date → clock_in_date
 *   - Redirects: INSERT/UPDATE/DELETE → staff_attendance
 *   - Works even with cached/old code
 * 
 * LAYER 2: Client Interceptor (Supabase Client Level)
 *   - Backup protection if fetch interceptor misses something
 *   - Can be added here if needed
 * 
 * IMPORTANT RULES:
 *   1. SELECT queries: Use attendance_logs view with clock_in_date column
 *   2. Write operations: Use staff_attendance table directly
 *   3. Never use: clock_in_at::date (PostgREST doesn't support it)
 * 
 * If you see 406 errors:
 *   1. Check browser console for interceptor messages
 *   2. Verify migration 20250221000010 has been applied
 *   3. See docs/ATTENDANCE_LOGS_PERMANENT_FIX.md
 * ============================================================================
 */

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

// Intercept fetch requests to attendance_logs table BEFORE Supabase client is created
// This catches queries at the network level, even from cached code
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    try {
      let url: string;
      
      // Safely extract URL from different input types
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input && typeof input === 'object' && 'url' in input) {
        url = (input as any).url || '';
      } else {
        // If we can't extract URL, just pass through
        return originalFetch.call(window, input, init);
      }
      
      // Check if this is a request to attendance_logs table
      if (url && url.includes('/rest/v1/attendance_logs')) {
        const method = init?.method || 'GET';
        let fixedUrl = url;
        let wasFixed = false;
        
        // CRITICAL: Views are read-only - redirect INSERT/UPDATE/DELETE to staff_attendance
        if (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
          console.warn('🚨 INTERCEPTED: Write operation on attendance_logs view detected!');
          console.warn('📋 Redirecting to staff_attendance table');
          console.warn('📋 Original URL:', url);
          
          // Redirect to staff_attendance table
          fixedUrl = url.replace('/rest/v1/attendance_logs', '/rest/v1/staff_attendance');
          wasFixed = true;
          console.warn('✅ Redirected to staff_attendance:', fixedUrl);
        } else {
          // For SELECT queries, fix clock_in_at::date patterns
          if (url.includes('clock_in_at%3A%3Adate') || url.includes('clock_in_at::date')) {
            console.warn('🚨 INTERCEPTED: Query with clock_in_at::date detected!');
            console.warn('📋 Original URL:', url);
            
            // Replace URL-encoded ::date syntax first (%3A%3A = ::)
            fixedUrl = url
              // Replace URL-encoded ::date syntax (%3A%3Adate -> clock_in_date)
              .replace(/clock_in_at%3A%3Adate/g, 'clock_in_date')
              // Replace non-encoded ::date syntax (in case it's partially decoded)
              .replace(/clock_in_at::date/g, 'clock_in_date')
              // Handle any remaining ::date patterns on clock_in_at
              .replace(/clock_in_at%3A%3A/g, 'clock_in_at')
              .replace(/clock_in_at::/g, 'clock_in_at');
            
            wasFixed = true;
            console.warn('✅ Fixed URL (converted clock_in_at::date to clock_in_date):', fixedUrl);
          }
        }
        
        // Update the request safely if we made changes
        if (wasFixed) {
          let fixedInput: RequestInfo | URL;
          if (typeof input === 'string') {
            fixedInput = fixedUrl;
          } else if (input instanceof URL) {
            fixedInput = new URL(fixedUrl);
          } else if (input && typeof input === 'object') {
            // Preserve all request properties when creating new Request
            const requestInit: RequestInit = {
              method: init?.method || (input as Request).method || 'GET',
              headers: init?.headers || (input as Request).headers || {},
              body: init?.body || (input as Request).body || null,
              cache: init?.cache || (input as Request).cache,
              credentials: init?.credentials || (input as Request).credentials,
              mode: init?.mode || (input as Request).mode,
              redirect: init?.redirect || (input as Request).redirect,
              referrer: init?.referrer || (input as Request).referrer,
              referrerPolicy: init?.referrerPolicy || (input as Request).referrerPolicy,
              integrity: init?.integrity || (input as Request).integrity,
            };
            fixedInput = new Request(fixedUrl, requestInit);
          } else {
            fixedInput = input;
          }
          
          return originalFetch.call(window, fixedInput, init);
        }
      }
    } catch (error) {
      // If interceptor fails, log and continue with original request
      console.error('⚠️ Fetch interceptor error:', error);
    }
    
    return originalFetch.call(window, input, init);
  };
}

// Create a singleton Supabase client using SSR helpers for proper session handling
// Typed with Database from auto-generated supabase.ts
const _supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Note: attendance_logs is now a VIEW that maps to staff_attendance
// The view provides clock_in_date column for date filtering (SELECT queries)
// Write operations (INSERT/UPDATE/DELETE) are redirected to staff_attendance by the fetch interceptor
// We don't redirect at client level to allow SELECT queries to use the view

export const supabase = _supabase;
export default supabase;
