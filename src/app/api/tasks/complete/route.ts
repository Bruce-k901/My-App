import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  try {
    // Parse completion record from request
    const completionRecord = await request.json();

    // Use service role client to bypass RLS entirely
    // We'll verify the user's identity via the completed_by field
    let serviceClient;
    try {
      serviceClient = getSupabaseAdmin();
    } catch (error: any) {
      console.warn(
        "⚠️ Failed to initialize Supabase admin client, falling back to user session:",
        error.message,
      );

      // Fallback: Try to use the authenticated user's session
      // This works if the user has permission to insert/update their own data (RLS)
      try {
        const cookieStore = await cookies();
        serviceClient = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                return cookieStore.getAll();
              },
              setAll(cookiesToSet) {
                try {
                  cookiesToSet.forEach(({ name, value, options }) =>
                    cookieStore.set(name, value, options)
                  );
                } catch {
                  // Ignored in Route Handlers
                }
              },
            },
          },
        );
        console.log(
          "✅ Successfully initialized Supabase client using user session (fallback)",
        );
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);

        // If both fail, return the original error with diagnostics
        const serviceKey1 = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const serviceKey2 = process.env.SUPABASE_SERVICE_ROLE;
        const serviceKey3 = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
        const serviceKey4 = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        const foundKey = serviceKey1 || serviceKey2 || serviceKey3 ||
          serviceKey4;
        const availableKeys = Object.keys(process.env).filter((k) =>
          k.includes("SUPABASE") || k.includes("VERCEL")
        );

        console.error("❌ Failed to initialize Supabase admin client:", error);

        // Get all available env keys (names only) for debugging
        const availableKeysDebug = Object.keys(process.env).filter((k) =>
          k.includes("SUPABASE") || k.includes("VERCEL")
        );

        console.error("❌ Environment check:", {
          environment: process.env.VERCEL_ENV || "development",
          nodeEnv: process.env.NODE_ENV,
          hasUrl:
            !!(process.env.SUPABASE_URL ||
              process.env.NEXT_PUBLIC_SUPABASE_URL),
          availableSupabaseKeys: availableKeysDebug,
          hasServiceKey1: !!serviceKey1,
          hasServiceKey2: !!serviceKey2,
          hasServiceKey3: !!serviceKey3,
          hasServiceKey4: !!serviceKey4,
          serviceKey1Prefix: serviceKey1
            ? serviceKey1.substring(0, 10) + "..."
            : "MISSING",
          errorMessage: error.message,
        });

        // Provide specific error message based on what we found
        let errorDetails = error.message;
        let hint =
          "Please ensure SUPABASE_SERVICE_ROLE_KEY is set in your environment variables (Vercel deployment settings)";

        if (foundKey?.startsWith("sb_publishable_")) {
          errorDetails =
            "Service role key is set to a publishable anon key. You need the service_role key (starts with eyJ...)";
          hint =
            "In Vercel, update SUPABASE_SERVICE_ROLE_KEY with the service_role key from Supabase Dashboard > Project Settings > API";
        } else if (!foundKey) {
          errorDetails =
            "No service role key found in any environment variable";
          hint =
            "Add SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables. Make sure to select the correct environment (Production/Preview/Development)";
        }

        return NextResponse.json({
          error:
            "Supabase service role key is required and user session fallback failed",
          details: errorDetails,
          hint,
          debug: {
            environment: process.env.VERCEL_ENV || "development",
            hasKey: !!foundKey,
            availableKeys: availableKeys,
            keyType: foundKey?.startsWith("sb_publishable_")
              ? "publishable"
              : foundKey?.startsWith("eyJ")
              ? "service_role"
              : "unknown",
            fallbackError: fallbackError.message,
          },
        }, { status: 500 });
      }
    }

    // Verify completed_by exists and get their profile
    if (!completionRecord.completed_by) {
      return NextResponse.json({ error: "completed_by is required" }, {
        status: 400,
      });
    }

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("id, company_id")
      .eq("id", completionRecord.completed_by)
      .or(`auth_user_id.eq.${completionRecord.completed_by}`)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found for completed_by" },
        { status: 404 },
      );
    }

    // Verify company_id matches profile's company
    if (completionRecord.company_id !== profile.company_id) {
      return NextResponse.json({ error: "Company ID mismatch" }, {
        status: 403,
      });
    }

    // Insert completion record using service role (bypasses RLS)
    console.log("📝 Inserting completion record:", {
      task_id: completionRecord.task_id,
      company_id: completionRecord.company_id,
      site_id: completionRecord.site_id,
      completed_by: completionRecord.completed_by,
    });

    const { data: insertedRecord, error: insertError } = await serviceClient
      .from("task_completion_records")
      .insert(completionRecord)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Task completion insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log("✅ Completion record inserted successfully:", {
      id: insertedRecord?.id,
      task_id: insertedRecord?.task_id,
      completed_at: insertedRecord?.completed_at,
    });

    // Update task status to 'completed' using service role (bypasses RLS)
    // Check if task has multiple dayparts - if so, only mark complete if all dayparts are done
    const { data: task, error: taskFetchError } = await serviceClient
      .from("checklist_tasks")
      .select("id, task_data, flag_reason, flagged, status")
      .eq("id", completionRecord.task_id)
      .single();

    if (taskFetchError) {
      console.error("❌ Error fetching task for status update:", {
        error: taskFetchError,
        code: taskFetchError.code,
        message: taskFetchError.message,
        task_id: completionRecord.task_id,
      });
      // Don't fail - completion record was saved successfully
      // But log the error clearly
    }

    if (!task) {
      console.error("❌ Task not found for status update:", {
        task_id: completionRecord.task_id,
        error: taskFetchError,
      });
      // Don't fail - completion record was saved successfully
      // Return success but indicate task update failed
      return NextResponse.json({
        data: insertedRecord,
        taskUpdated: false,
        taskUpdateSuccess: false,
        warning:
          "Task not found - completion record saved but task status not updated",
      });
    }

    const taskData = task.task_data || {};
    const daypartsInData = taskData.dayparts || [];
    const hasMultipleDayparts = Array.isArray(daypartsInData) &&
      daypartsInData.length > 1;
    const isMonitoringTask = task.flag_reason === "monitoring" ||
      task.flagged === true;

    // Helper function to normalize daypart names
    const normalizeDaypart = (daypart: string | null | undefined): string => {
      if (!daypart || typeof daypart !== "string") {
        return "anytime";
      }
      const normalized = daypart.toLowerCase().trim();
      const daypartMap: Record<string, string> = {
        "afternoon": "during_service",
        "morning": "before_open",
        "evening": "after_service",
        "night": "after_service",
        "lunch": "during_service",
        "dinner": "during_service",
      };
      return daypartMap[normalized] || normalized;
    };

    let shouldMarkTaskCompleted = true;

    // For multi-daypart tasks, check if all dayparts are completed
    if (hasMultipleDayparts && !isMonitoringTask) {
      const { data: existingCompletions } = await serviceClient
        .from("task_completion_records")
        .select("completion_data")
        .eq("task_id", task.id);

      const completedDayparts = new Set<string>();
      if (existingCompletions) {
        existingCompletions.forEach((record) => {
          const completedDaypart = record.completion_data?.completed_daypart;
          if (completedDaypart) {
            completedDayparts.add(normalizeDaypart(completedDaypart));
          }
        });
      }

      // Normalize all dayparts from task data (handle both strings and objects)
      const allDayparts = daypartsInData.map((d: any) => {
        const daypartStr = typeof d === "string" ? d : (d.daypart || d);
        return normalizeDaypart(daypartStr);
      });

      const allCompleted = allDayparts.every((daypart) =>
        completedDayparts.has(daypart)
      );
      shouldMarkTaskCompleted = allCompleted;
    }

    // Update task status if it should be marked as completed
    let taskUpdateSuccess = false;
    if (shouldMarkTaskCompleted) {
      console.log("🔄 Attempting to update task status to completed:", {
        task_id: completionRecord.task_id,
        completed_at: completionRecord.completed_at,
        completed_by: completionRecord.completed_by,
      });

      // Use maybeSingle() to handle case where task might not exist
      // But we already checked above, so this should work
      const { data: updatedTask, error: updateError } = await serviceClient
        .from("checklist_tasks")
        .update({
          status: "completed",
          completed_at: completionRecord.completed_at,
          completed_by: completionRecord.completed_by,
        })
        .eq("id", completionRecord.task_id)
        .select()
        .maybeSingle();

      if (updateError) {
        console.error("❌ Task status update error:", {
          error: updateError,
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          task_id: completionRecord.task_id,
        });
        // For critical errors, we should still return success for the completion record
        // but log the task update failure clearly
        // Don't throw - completion record was saved successfully
      } else if (updatedTask) {
        taskUpdateSuccess = true;
        console.log("✅ Task status updated successfully:", {
          taskId: updatedTask.id,
          status: updatedTask.status,
          completed_at: updatedTask.completed_at,
          completed_by: updatedTask.completed_by,
        });
      } else {
        console.warn("⚠️ Task update returned no data - task may not exist:", {
          task_id: completionRecord.task_id,
        });
      }
    } else {
      console.log(
        "ℹ️ Task not marked as completed (multi-daypart task, waiting for all instances)",
      );
    }

    return NextResponse.json({
      data: insertedRecord,
      taskUpdated: shouldMarkTaskCompleted && taskUpdateSuccess,
      taskUpdateSuccess,
    });
  } catch (error: any) {
    console.error("Task completion API error:", error);
    return NextResponse.json({
      error: error.message || "Internal server error",
    }, { status: 500 });
  }
}
