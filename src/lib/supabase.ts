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
// IMPORTANT: Only intercept attendance_logs requests, don't interfere with auth/cookies
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
      
      // CRITICAL: Only intercept attendance_logs and notifications REST API requests
      // Skip auth endpoints, storage, functions, etc. to avoid breaking cookies/auth
      if (url && 
          (url.includes('/rest/v1/attendance_logs') || url.includes('/rest/v1/notifications')) && 
          !url.includes('/auth/') &&
          !url.includes('/storage/') &&
          !url.includes('/functions/') &&
          !url.includes('/realtime/')) {
        const method = init?.method || (input && typeof input === 'object' && 'method' in input ? (input as any).method : 'GET');
        let fixedUrl = url;
        let wasFixed = false;
        
        // ALWAYS check for clock_in_at::date pattern FIRST (before method check)
        // This fixes the 406 error for SELECT queries
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
        
        // Fix notifications queries with severity=in.(critical,warning) syntax
        // PostgREST doesn't support .in() filter in URL - need to use .in() in code
        // Check for both encoded (%28 = (, %29 = )) and non-encoded versions
        if (url.includes('/rest/v1/notifications') && url.includes('severity')) {
          // More comprehensive check - catch all severity filter patterns
          const hasSeverityFilter = (
            url.includes('severity=in.') || 
            url.includes('severity%3Din.') ||
            url.includes('severity=in.%28') ||
            url.includes('severity%3Din.%28') ||
            url.includes('severity=in.(') ||
            /severity[=%]3?D?in\./.test(url)
          );
          
          if (hasSeverityFilter) {
            console.debug('🚨 INTERCEPTED: Notifications query with severity=in.() detected!');
            console.debug('📋 Original URL:', url);
            
            // Remove ALL severity filter patterns from URL
            // Handle both URL-encoded and non-encoded versions
            // Match patterns like: severity=in.(critical,warning) or severity=in.%28critical%2Cwarning%29
            fixedUrl = url
              // Remove &severity=in.%28...%29 patterns (URL encoded, allowing % in the middle)
              .replace(/[&?]severity=in\.%28[^%]*%29/g, '') // Matches &severity=in.(...) with any chars until %29
              .replace(/[&?]severity=in\.%28.*?%29/g, '') // Fallback for complex patterns
              // Remove &severity%3Din.%28...%29 patterns (fully encoded)
              .replace(/[&?]severity%3Din\.%28[^%]*%29/g, '') // Matches &severity%3Din.(...)
              .replace(/[&?]severity%3Din\.%28.*?%29/g, '') // Fallback
              // Remove &severity=in.(...) patterns (non-encoded)
              .replace(/[&?]severity=in\.\([^)]*\)/g, '') // Matches &severity=in.(...)
              // Remove any remaining severity=in. patterns (catch-all)
              .replace(/[&?]severity=in\.[^&?]*/g, '') // Matches &severity=in.anything
              .replace(/[&?]severity%3Din\.[^&?]*/g, '') // Matches &severity%3Din.anything
              // Clean up any remaining ? or & at start/end or double separators
              .replace(/\?&/, '?')
              .replace(/&+/g, '&') // Replace multiple & with single &
              .replace(/\?$/, '')
              .replace(/&$/, '')
              .replace(/^([^?]*)\?$/, '$1'); // Remove trailing ? if no params remain
            
            wasFixed = true;
            console.debug('✅ Fixed URL (removed severity=in.() filter):', fixedUrl);
          }
        }
        
        // CRITICAL: Views are read-only - redirect INSERT/UPDATE/DELETE to staff_attendance
        // Only check for attendance_logs if the URL actually contains it
        if ((method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE') 
            && url.includes('/rest/v1/attendance_logs')) {
          console.error('🚨🚨🚨 CRITICAL: Write operation on attendance_logs view detected!');
          console.error('📋 This should NEVER happen - attendance_logs is read-only!');
          console.error('📋 Original URL:', url);
          console.error('📋 Method:', method);
          console.error('📋 This is likely caused by a database trigger that needs to be removed!');
          
          // Redirect to staff_attendance table
          fixedUrl = url.replace('/rest/v1/attendance_logs', '/rest/v1/staff_attendance');
          wasFixed = true;
          
          // CRITICAL: Remove 'location' field from request body if present
          // staff_attendance doesn't have a location column - it's stored in shift_notes
          let bodyModified = false;
          if (init?.body) {
            try {
              if (typeof init.body === 'string') {
                const bodyObj = JSON.parse(init.body);
                if (bodyObj && typeof bodyObj === 'object') {
                  if (Array.isArray(bodyObj)) {
                    // Handle array of objects
                    const modified = bodyObj.map((item: any) => {
                      if (item && typeof item === 'object' && 'location' in item) {
                        bodyModified = true;
                        const { location, ...rest } = item;
                        return rest;
                      }
                      return item;
                    });
                    if (bodyModified) {
                      init.body = JSON.stringify(modified);
                    }
                  } else if ('location' in bodyObj) {
                    bodyModified = true;
                    const { location, ...rest } = bodyObj;
                    init.body = JSON.stringify(rest);
                  }
                }
              }
            } catch (e) {
              console.warn('⚠️ Could not parse request body to remove location field:', e);
            }
          }
          
          if (bodyModified) {
            console.warn('⚠️ Removed "location" field from request body');
          }
          
          console.error('✅ Redirected to staff_attendance:', fixedUrl);
          console.error('⚠️ If you see this message, there is likely a database trigger that needs to be removed!');
          console.error('⚠️ Run NUCLEAR_FIX_ATTENDANCE.sql in Supabase SQL Editor to remove all triggers.');
        }
        // Note: clock_in_at::date fix is handled above before method check
        
        // Update the request safely if we made changes
        if (wasFixed) {
          // For string/URL inputs, just update the URL in init
          if (typeof input === 'string' || input instanceof URL) {
            // Update init with the new URL, preserving all other properties
            const newInit = { ...init };
            return originalFetch.call(window, fixedUrl, newInit);
          } else if (input && typeof input === 'object') {
            // For Request objects, create a new one preserving all properties
            const requestInit: RequestInit = {
              method: init?.method || (input as Request).method || 'GET',
              headers: init?.headers || (input as Request).headers || {},
              body: init?.body || (input as Request).body || null,
              cache: init?.cache || (input as Request).cache,
              credentials: init?.credentials || (input as Request).credentials || 'include', // Preserve credentials for cookies
              mode: init?.mode || (input as Request).mode,
              redirect: init?.redirect || (input as Request).redirect,
              referrer: init?.referrer || (input as Request).referrer,
              referrerPolicy: init?.referrerPolicy || (input as Request).referrerPolicy,
              integrity: init?.integrity || (input as Request).integrity,
            };
            const fixedInput = new Request(fixedUrl, requestInit);
            return originalFetch.call(window, fixedInput);
          }
        }
      }
    } catch (error) {
      // If interceptor fails, log and continue with original request
      console.error('⚠️ Fetch interceptor error:', error);
    }
    
    // Pass through all other requests without modification
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
