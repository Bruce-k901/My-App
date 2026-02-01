/**
 * @ai-knowledge
 * @title Clock In/Out Service
 * @category Features
 * @subcategory Attendance
 * @tags attendance, time-tracking, clock-in, clock-out, employees, shifts
 *
 * The Clock In/Out service manages employee time tracking functionality.
 *
 * Key Functions:
 * - clockIn(siteId, location?, notes?): Start a new shift for the current user
 * - clockOut(notes?): End the current active shift
 * - isClockedIn(siteId?): Check if user has an active shift
 * - getCurrentAttendance(): Get the current active attendance log
 *
 * Database Table: staff_attendance
 * - Tracks clock_in_time, clock_out_time, site_id, shift_status
 * - shift_status: "on_shift" (active) or "off_shift" (completed)
 * - total_hours: Auto-calculated by database trigger on clock out
 *
 * UI Components:
 * - ClockInButton (src/components/notifications/ClockInButton.tsx): Quick clock in/out toggle
 * - TimeClock (src/components/time-clock.tsx): Full time clock with site selection
 *
 * Locations:
 * - ClockInButton appears in ModuleBar (second header) and DashboardHeader
 * - Full TimeClock available on the attendance signoff page
 */

/**
 * Attendance / Clock-in Service
 * Handles clock-in and clock-out functionality
 */

import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

export interface AttendanceLog {
  id: string;
  profile_id: string;
  company_id: string;
  site_id: string | null;
  clock_in_time: string;
  clock_out_time: string | null;
  shift_status: "on_shift" | "off_shift";
  total_hours: number | null;
  shift_notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Clock in for the current user
 */
export async function clockIn(
  siteId: string,
  location?: { lat: number; lng: number; accuracy: number },
  notes?: string,
): Promise<
  { success: boolean; error?: string; attendanceLog?: AttendanceLog }
> {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Current user:", user);
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Get user profile to get company_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return { success: false, error: "Failed to fetch user profile" };
    }

    // Check if already clocked in (any active shift)
    const { data: existing } = await supabase
      .from("staff_attendance")
      .select("id")
      .eq("profile_id", user.id)
      .eq("shift_status", "on_shift")
      .is("clock_out_time", null)
      .order("clock_in_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: "Already clocked in. Please clock out first.",
      };
    }

    // Create attendance log
    const insertData = {
      profile_id: user.id,
      company_id: profile.company_id,
      site_id: siteId,
      shift_status: "on_shift" as const,
      shift_notes: notes ||
        (location ? `Location: ${location.lat}, ${location.lng}` : null),
    };

    console.log("🕐 Clocking in with data:", insertData);

    const { data: attendanceLog, error } = await supabase
      .from("staff_attendance")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("❌ Error clocking in:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Clock-in successful:", attendanceLog);
    return { success: true, attendanceLog: attendanceLog as AttendanceLog };
  } catch (error: any) {
    console.error("Error in clockIn:", error);
    return { success: false, error: error.message || "Failed to clock in" };
  }
}

/**
 * Clock out for the current user
 */
export async function clockOut(
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Current user:", user);
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Find active clock-in (any active shift)
    // This allows clocking out even if clocked in yesterday
    console.log("🕐 Looking for active clock-in for user:", user.id);

    const { data: activeLog, error: findError } = await supabase
      .from("staff_attendance")
      .select("id, clock_in_time, site_id")
      .eq("profile_id", user.id)
      .eq("shift_status", "on_shift")
      .is("clock_out_time", null)
      .order("clock_in_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("🔍 Active clock-in query result:", {
      activeLog,
      error: findError,
    });

    if (findError) {
      console.error("❌ Error finding active clock-in:", findError);
      return { success: false, error: `Database error: ${findError.message}` };
    }

    if (!activeLog) {
      // Debug: Check if there are ANY attendance logs for this user
      const { data: allLogs } = await supabase
        .from("staff_attendance")
        .select("id, clock_in_time, clock_out_time, site_id")
        .eq("profile_id", user.id)
        .order("clock_in_time", { ascending: false })
        .limit(5);

      console.log("📋 All attendance logs for user:", allLogs);
      return {
        success: false,
        error: "No active clock-in found. Please clock in first.",
      };
    }

    console.log("✅ Found active clock-in:", activeLog);

    // Update clock-out time and shift status
    // Note: total_hours will be auto-calculated by database trigger
    const { error: updateError } = await supabase
      .from("staff_attendance")
      .update({
        clock_out_time: new Date().toISOString(),
        shift_status: "off_shift", // ✅ Explicitly set to 'off_shift' (not 'clocked_out')
        shift_notes: notes || null,
      })
      .eq("id", activeLog.id);

    if (updateError) {
      console.error("Error clocking out:", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in clockOut:", error);
    return { success: false, error: error.message || "Failed to clock out" };
  }
}

/**
 * Check if current user is clocked in
 */
export async function isClockedIn(siteId?: string): Promise<boolean> {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Current user:", user);
    if (!user) return false;

    // Check for any active shift
    let query = supabase
      .from("staff_attendance")
      .select("id")
      .eq("profile_id", user.id)
      .eq("shift_status", "on_shift")
      .is("clock_out_time", null)
      .order("clock_in_time", { ascending: false })
      .limit(1);

    if (siteId) {
      query = query.eq("site_id", siteId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("❌ Supabase error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      console.error("💥 Full error object:", error);
      console.error("Error type:", typeof error);
      console.error("Error keys:", Object.keys(error || {}));
      return false;
    }

    return !!data;
  } catch (error: any) {
    console.error("💥 Exception checking clock-in status:", error);
    console.error("Error type:", typeof error);
    console.error("Error keys:", Object.keys(error || {}));
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    return false;
  }
}

/**
 * Get current attendance log
 */
export async function getCurrentAttendance(): Promise<AttendanceLog | null> {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Current user:", user);
    if (!user) return null;

    // Get any active shift
    const { data, error } = await supabase
      .from("staff_attendance")
      .select("*")
      .eq("profile_id", user.id)
      .eq("shift_status", "on_shift")
      .is("clock_out_time", null)
      .order("clock_in_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error getting current attendance:", error);
      return null;
    }

    if (!data) return null;

    return data as AttendanceLog;
  } catch (error) {
    console.error("Exception getting current attendance:", error);
    return null;
  }
}
