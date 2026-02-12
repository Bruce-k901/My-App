import React from "react";
import { ClipboardCheck, FileText, AlertTriangle } from '@/components/ui/icons';
import { EHOSection } from "./EHOSection";
import { EHOStatusTag } from "./EHOStatusTag";

type ReportData = {
  policies: any[] | null;
  risks: any[] | null;
  coshh: any[] | null;
};

function countStatuses(arr: any[] | null) {
  const list = Array.isArray(arr) ? arr : [];
  const valid = list.filter((d) => d.status === "valid").length;
  const due = list.filter((d) => d.status === "due_review").length;
  const expired = list.filter((d) => d.status === "expired").length;
  return { valid, due, expired, total: list.length };
}

export function EHOCards({ data }: { data: ReportData | null }) {
  const policies = countStatuses(data?.policies || null);
  const risks = countStatuses(data?.risks || null);
  const coshh = countStatuses(data?.coshh || null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <EHOSection title="Policies" icon={FileText}>
        <div className="flex items-center gap-3">
          <EHOStatusTag status="valid" count={policies.valid} />
          <EHOStatusTag status="due_review" count={policies.due} />
          <EHOStatusTag status="expired" count={policies.expired} />
 <span className="text-gray-500 dark:text-theme-tertiary text-sm ml-auto">Total: {policies.total}</span>
        </div>
      </EHOSection>

      <EHOSection title="Risk Assessments" icon={ClipboardCheck}>
        <div className="flex items-center gap-3">
          <EHOStatusTag status="valid" count={risks.valid} />
          <EHOStatusTag status="due_review" count={risks.due} />
          <EHOStatusTag status="expired" count={risks.expired} />
 <span className="text-gray-500 dark:text-theme-tertiary text-sm ml-auto">Total: {risks.total}</span>
        </div>
      </EHOSection>

      <EHOSection title="COSHH Register" icon={AlertTriangle}>
        <div className="flex items-center gap-3">
          <EHOStatusTag status="valid" count={coshh.valid} />
          <EHOStatusTag status="due_review" count={coshh.due} />
          <EHOStatusTag status="expired" count={coshh.expired} />
 <span className="text-gray-500 dark:text-theme-tertiary text-sm ml-auto">Total: {coshh.total}</span>
        </div>
      </EHOSection>
    </div>
  );
}