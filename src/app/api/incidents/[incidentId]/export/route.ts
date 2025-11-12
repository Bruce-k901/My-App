import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: {
    incidentId: string;
  };
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const incidentId = params.incidentId;

  if (!incidentId) {
    return NextResponse.json({ error: "Incident ID is required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: incident, error } = await supabase
      .from("incidents")
      .select(
        `
          *,
          site:sites(name),
          company:companies(name)
        `
      )
      .eq("id", incidentId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const followUpTaskIds = Array.isArray(incident.follow_up_tasks)
      ? incident.follow_up_tasks
      : [];

    let followUpTasks: Array<Record<string, unknown>> = [];
    if (followUpTaskIds.length > 0) {
      const { data: tasksData, error: tasksError } = await supabase
        .from("checklist_tasks")
        .select("id, title, status, due_date, due_time, assigned_to_role, priority")
        .in("id", followUpTaskIds);

      if (tasksError) throw tasksError;
      followUpTasks = tasksData ?? [];
    }

    const exportPayload = {
      generated_at: new Date().toISOString(),
      incident: {
        id: incident.id,
        title: incident.title,
        description: incident.description,
        incident_type: incident.incident_type,
        severity: incident.severity,
        status: incident.status,
        location: incident.location,
        incident_date: incident.incident_date,
        reported_date: incident.reported_date,
        company: incident.company?.name ?? null,
        site: incident.site?.name ?? null,
        company_id: incident.company_id,
        site_id: incident.site_id,
        reported_by: incident.reported_by,
        immediate_actions_taken: incident.immediate_actions_taken,
        lost_time_days: incident.lost_time_days,
        hospitalisation: incident.hospitalisation,
        public_involved: incident.public_involved,
        reportable_disease: incident.reportable_disease,
        environmental_release: incident.environmental_release,
      },
      riddor: {
        reportable: incident.riddor_reportable,
        category: incident.riddor_category,
        reason: incident.riddor_reason,
        due_date: incident.riddor_due_date,
        reported: incident.riddor_reported,
        reported_at: incident.riddor_reported_date,
        reference: incident.riddor_reference,
        notes: incident.riddor_notes,
      },
      emergency_response: {
        emergency_services_called: incident.emergency_services_called,
        emergency_services_type: incident.emergency_services_type,
        first_aid_provided: incident.first_aid_provided,
        scene_preserved: incident.scene_preserved,
      },
      people_involved: {
        casualties: incident.casualties ?? [],
        witnesses: incident.witnesses ?? [],
      },
      evidence: {
        photos: incident.photos ?? [],
        documents: incident.documents ?? [],
      },
      follow_up_tasks: followUpTasks,
      investigation: {
        notes: incident.investigation_notes,
        root_cause: incident.root_cause,
        corrective_actions: incident.corrective_actions,
      },
    };

    return NextResponse.json(exportPayload);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected error exporting incident";
    console.error("Incident export error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


