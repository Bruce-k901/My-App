import type { EHOReportData, TrainingMatrixItem } from "../types";
import { escapeHtml, formatDate } from "../utils/formatters";
import {
  buildCallout,
  buildDataTable,
  buildSection,
  buildSubSection,
  statusBadge,
} from "../utils/helpers";

export function buildStaffTrainingSection(data: EHOReportData): string {
  const { trainingRecords, staffProfiles, trainingMatrix } = data;

  // Helper to find status for a specific course code (or list of codes)
  const getStatus = (
    profileId: string,
    codes: string[],
  ): { status: string; label: string; level?: string; expiry?: string } => {
    // Find all matching records for this person and these codes
    // Sort by level (L3 > L2) and then by status priority
    const matches = trainingMatrix.filter((m) =>
      m.profile_id === profileId && codes.includes(m.course_code)
    );

    // Priority: compliant > expiring_soon > in_progress > expired > required > not_started > optional
    const statusPriority: Record<string, number> = {
      "compliant": 10,
      "expiring_soon": 9,
      "in_progress": 5,
      "expired": 4,
      "required": 3,
      "not_started": 2,
      "optional": 1,
    };

    // Sort to find the "best" record to display
    matches.sort((a, b) => {
      // Prefer higher level (L3 > L2)
      if (a.course_code.includes("L3") && !b.course_code.includes("L3")) {
        return -1;
      }
      if (!a.course_code.includes("L3") && b.course_code.includes("L3")) {
        return 1;
      }

      // Then status
      const scoreA = statusPriority[a.compliance_status || "not_started"] || 0;
      const scoreB = statusPriority[b.compliance_status || "not_started"] || 0;
      return scoreB - scoreA;
    });

    const best = matches[0];

    if (!best) {
      return {
        status: "unknown",
        label: '<span class="muted">Not recorded</span>',
      };
    }

    let badgeColor = "gray";
    let text = "Recorded";

    switch (best.compliance_status) {
      case "compliant":
        badgeColor = "green";
        text = "Valid";
        break;
      case "expiring_soon":
        badgeColor = "amber";
        text = "Expiring";
        break;
      case "expired":
        badgeColor = "red";
        text = "Expired";
        break;
      case "in_progress":
        badgeColor = "blue";
        text = "In Progress";
        break;
      case "required":
        badgeColor = "red";
        text = "Required";
        break;
      default:
        return {
          status: "unknown",
          label: '<span class="muted">Not recorded</span>',
        };
    }

    // Extract level if applicable
    let levelStr = "";
    if (best.course_code.includes("L3")) levelStr = " L3";
    else if (best.course_code.includes("L2")) levelStr = " L2";

    return {
      status: best.compliance_status,
      label: `${statusBadge(text, badgeColor)}${levelStr}`,
      level: levelStr,
      expiry: best.expiry_date ? formatDate(best.expiry_date) : "",
    };
  };

  // Staff training matrix
  // Iterate staffProfiles to ensure we only show staff for this site
  const matrixRows = staffProfiles
    .filter((p) => p.full_name)
    .map((p) => {
      // Food Safety: FS-L2, FS-L3
      const fs = getStatus(p.id, ["FS-L2", "FS-L3"]);
      // H&S: HS-L2, HS-L3
      const hs = getStatus(p.id, ["HS-L2", "HS-L3"]);
      // Fire: FIRE, FIRE-MARSHAL
      const fire = getStatus(p.id, ["FIRE", "FIRE-MARSHAL"]);
      // First Aid: FIRST-AID, FAW (First Aid at Work)
      const fa = getStatus(p.id, ["FIRST-AID", "FAW"]);
      // COSHH: COSHH
      const coshh = getStatus(p.id, ["COSHH"]);
      // Allergens: ALLERGY
      const allergy = getStatus(p.id, ["ALLERGY"]);

      return {
        name: p.full_name,
        role: p.position_title || p.app_role || "N/A",
        food_safety: fs.label,
        food_safety_expiry: fs.expiry || '<span class="muted">-</span>',
        h_and_s: hs.label,
        fire_marshal: fire.label,
        first_aid: fa.label,
        coshh: coshh.label,
        allergy: allergy.label,
      };
    });

  // Check for expiring/expired certifications (across all staff in the matrix)
  // We check the trainingMatrix directly for this site's staff
  const staffIds = new Set(staffProfiles.map((p) => p.id));
  const alerts = trainingMatrix.filter((m) =>
    staffIds.has(m.profile_id) &&
    (m.compliance_status === "expired" ||
      m.compliance_status === "expiring_soon")
  );

  let expiryCallout = "";
  if (alerts.length > 0) {
    // Group by staff name
    const staffAlerts = new Map<string, string[]>();
    alerts.forEach((a) => {
      const list = staffAlerts.get(a.full_name) || [];
      list.push(
        `${a.course_name} (${
          a.compliance_status === "expired" ? "Expired" : "Expiring"
        })`,
      );
      staffAlerts.set(a.full_name, list);
    });

    const details = Array.from(staffAlerts.entries()).map(([name, courses]) =>
      `<strong>${escapeHtml(name)}</strong>: ${escapeHtml(courses.join(", "))}`
    ).join("<br/>");

    expiryCallout = buildCallout(
      "danger",
      `${alerts.length} Training Alert${alerts.length > 1 ? "s" : ""} Detected`,
      details,
    );
  }

  // The matrix table uses raw HTML values so we need a custom approach
  let matrixHtml: string;
  if (matrixRows.length === 0) {
    matrixHtml =
      '<div class="empty-state">No staff profiles found. Add staff members to the system to track training compliance.</div>';
  } else {
    const rows = matrixRows.map((r) => `
      <tr>
        <td>${escapeHtml(r.name || "")}</td>
        <td>${escapeHtml(r.role)}</td>
        <td class="center">${r.food_safety}</td>
        <td class="center">${r.food_safety_expiry}</td>
        <td class="center">${r.allergy}</td>
        <td class="center">${r.h_and_s}</td>
        <td class="center">${r.fire_marshal}</td>
        <td class="center">${r.first_aid}</td>
        <td class="center">${r.coshh}</td>
      </tr>`).join("");

    matrixHtml = `
      <table>
        <thead><tr>
          <th>Name</th><th>Role</th>
          <th class="center">Food Safety</th><th class="center">FS Expiry</th>
          <th class="center">Allergens</th>
          <th class="center">H&amp;S</th><th class="center">Fire Safety</th><th class="center">First Aid</th><th class="center">COSHH</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // Training records for the period (keep the activity log)
  const recordsTable = buildDataTable({
    headers: [
      { key: "staff_name", label: "Staff Member" },
      { key: "training_type", label: "Training Type" },
      { key: "completed_at", label: "Completed", format: "datetime" },
      { key: "expiry_date", label: "Expiry", format: "date" },
      { key: "certificate_number", label: "Certificate No." },
      { key: "provider", label: "Provider" },
    ],
    rows: trainingRecords,
    emptyMessage: "No training records found for this period.",
  });

  return buildSection(
    6,
    "Staff Training & Competency",
    `
    ${expiryCallout}
    ${buildSubSection("Staff Training Matrix", matrixHtml)}
    ${buildSubSection("Training Records (Period)", recordsTable)}
  `,
  );
}
