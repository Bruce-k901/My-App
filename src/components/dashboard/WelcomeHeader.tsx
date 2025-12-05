"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

// ⚠️ CRITICAL HYDRATION FIX - STATIC STRUCTURE
// Server and client must render the EXACT same HTML structure.
// Use suppressHydrationWarning for dynamic content (dates, names).
export default function WelcomeHeader() {
  // Initialize with empty string to match server rendering
  const [formattedDate, setFormattedDate] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const { session } = useAppContext();

  // Update date on client - runs after mount
  useEffect(() => {
    const updateDate = () => {
      try {
        const now = new Date();
        setFormattedDate(format(now, "EEEE, d MMMM yyyy"));
      } catch (error) {
        console.error('Error formatting date:', error);
        setFormattedDate('');
      }
    };
    
    updateDate();
    const intervalId = setInterval(updateDate, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Fetch user name - runs after mount
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const fetchUserName = async () => {
      try {
        // Try direct query first, fall back to API route if RLS blocks it (406 error)
        let profile = null;
        let error = null;
        
        const result = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .maybeSingle();
        
        profile = result.data;
        error = result.error;
        
        // If we get a 406 error, fall back to API route
        if (error && (error.code === 'PGRST116' || error.message?.includes('406') || (error as any).status === 406)) {
          console.debug('⚠️ Direct profile query blocked by RLS (406), using API route fallback');
          try {
            const apiResponse = await fetch(`/api/profile/get?userId=${session.user.id}`);
            if (apiResponse.ok) {
              const fullProfile = await apiResponse.json();
              profile = { full_name: fullProfile.full_name };
              error = null;
            } else {
              // Silently fail - profile might not exist yet
              return;
            }
          } catch (apiError) {
            // Silently fail - API route error
            return;
          }
        }
        
        if (error) {
          // Suppress expected errors
          if (error.code === 'PGRST116' || error.code === 'PGRST301') {
            return; // No rows returned, which is fine
          }
          // Only log unexpected errors
          console.debug("Error fetching profile:", error.message || error.code);
          return;
        }
        
        if (profile?.full_name) {
          const name = profile.full_name.split(" ")[0];
          setFirstName(name);
        }
      } catch (err) {
        console.debug("Exception fetching user name:", err);
      }
    };
    fetchUserName();
  }, [session]);

  // Always render the same structure - server and client must match
  // CRITICAL: suppressHydrationWarning on root div to prevent Suspense wrapper mismatch
  return (
    <div className="text-white" suppressHydrationWarning>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold" suppressHydrationWarning>
            Welcome{firstName ? `, ${firstName}` : ""}
          </h1>
          <p 
            className="text-white/60 text-xs sm:text-sm md:text-base"
            suppressHydrationWarning
          >
            {formattedDate || "\u00A0"}
          </p>
        </div>
      </div>
    </div>
  );
}
