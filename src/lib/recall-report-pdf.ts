// @salsa - SALSA Compliance: Recall report PDF/print generation utility
import { allergenKeyToLabel } from '@/lib/stockly/allergens';

interface RecallReportData {
  recall: {
    recall_code: string;
    title: string;
    description: string | null;
    recall_type: string;
    severity: string;
    status: string;
    reason: string | null;
    root_cause: string | null;
    corrective_actions: string | null;
    initiated_at: string;
    resolved_at: string | null;
    closed_at: string | null;
    fsa_notified: boolean;
    fsa_notified_at: string | null;
    fsa_reference: string | null;
    salsa_notified: boolean;
    salsa_notified_at: string | null;
    notes: string | null;
  };
  company_name: string;
  affected_batches: any[];
  notifications: any[];
  allergen_summary: string[];
  mass_balance: { total_produced: number; total_recovered: number; unaccounted: number };
  timeline: { label: string; date: string }[];
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const SEVERITY_LABELS: Record<string, string> = {
  class_1: 'Class 1 — Serious health risk',
  class_2: 'Class 2 — May cause illness',
  class_3: 'Class 3 — Unlikely health risk',
};

// @salsa — Generate recall report HTML for browser print
export function generateRecallReportHTML(data: RecallReportData): string {
  const { recall, company_name, affected_batches, notifications, allergen_summary, mass_balance, timeline } = data;

  const batchRows = affected_batches.map(ab => `
    <tr>
      <td>${ab.stock_batch?.batch_code || '-'}</td>
      <td>${ab.stock_batch?.stock_item?.name || '-'}</td>
      <td>${ab.batch_type?.replace('_', ' ') || '-'}</td>
      <td style="text-align:right">${ab.quantity_affected ?? '-'}</td>
      <td style="text-align:right">${ab.quantity_recovered ?? '-'}</td>
      <td>${ab.action_taken || '-'}</td>
    </tr>
  `).join('');

  const notificationRows = notifications.map((n: any) => `
    <tr>
      <td>${n.customer_name}</td>
      <td>${n.contact_email || n.contact_phone || '-'}</td>
      <td>${n.notification_method || '-'}</td>
      <td>${n.notified_at ? formatDate(n.notified_at) : '-'}</td>
      <td>${n.response_received ? 'Yes' : 'Awaiting'}${n.response_notes ? ` — ${n.response_notes}` : ''}</td>
    </tr>
  `).join('');

  const allergenBadges = allergen_summary.map(a =>
    `<span style="display:inline-block;padding:2px 8px;margin:2px;background:#FEE2E2;color:#991B1B;border-radius:4px;font-size:12px">${allergenKeyToLabel(a)}</span>`
  ).join('');

  const timelineItems = timeline.map(t =>
    `<div><strong>${t.label}:</strong> ${formatDate(t.date)}</div>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${recall.recall_type === 'withdrawal' ? 'Withdrawal' : 'Recall'} Report - ${recall.recall_code}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; padding: 40px; background: #fff; }
    .header { border-bottom: 3px solid #DC2626; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #DC2626; font-size: 24px; margin-bottom: 8px; }
    .header-meta { display: flex; gap: 20px; font-size: 13px; color: #666; }
    section { margin-bottom: 24px; }
    section h2 { font-size: 16px; color: #1a1a1a; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 8px; border-bottom: 2px solid #ccc; font-weight: 600; }
    td { padding: 6px 8px; border-bottom: 1px solid #eee; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; font-size: 13px; }
    .footer { border-top: 1px solid #ddd; padding-top: 16px; margin-top: 30px; font-size: 11px; color: #999; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${recall.recall_type === 'withdrawal' ? 'Product Withdrawal' : 'Product Recall'} Report</h1>
    <div class="header-meta">
      <span><strong>Code:</strong> ${recall.recall_code}</span>
      <span><strong>Company:</strong> ${company_name}</span>
      <span><strong>Severity:</strong> ${SEVERITY_LABELS[recall.severity] || recall.severity}</span>
      <span><strong>Status:</strong> ${recall.status}</span>
    </div>
  </div>

  <section>
    <h2>Recall Details</h2>
    <div class="grid">
      <div><strong>Title:</strong> ${recall.title}</div>
      <div><strong>Type:</strong> ${recall.recall_type === 'withdrawal' ? 'Withdrawal (trade level)' : 'Recall (consumer level)'}</div>
    </div>
    <div style="margin-top:8px"><strong>Reason:</strong> ${recall.reason || 'Not specified'}</div>
    ${recall.description ? `<div style="margin-top:4px"><strong>Description:</strong> ${recall.description}</div>` : ''}
  </section>

  <section>
    <h2>Affected Batches</h2>
    ${affected_batches.length === 0 ? '<p>No batches recorded</p>' : `
    <table>
      <thead><tr><th>Batch Code</th><th>Product</th><th>Type</th><th style="text-align:right">Qty Affected</th><th style="text-align:right">Qty Recovered</th><th>Action</th></tr></thead>
      <tbody>${batchRows}</tbody>
    </table>`}
  </section>

  ${allergen_summary.length > 0 ? `
  <section>
    <h2>Allergen Summary</h2>
    <div>${allergenBadges}</div>
  </section>` : ''}

  <section>
    <h2>Customer Notifications</h2>
    ${notifications.length === 0 ? '<p>No notifications recorded</p>' : `
    <table>
      <thead><tr><th>Customer</th><th>Contact</th><th>Method</th><th>Date Notified</th><th>Response</th></tr></thead>
      <tbody>${notificationRows}</tbody>
    </table>`}
  </section>

  <section>
    <h2>Investigation</h2>
    <div><strong>Root Cause:</strong> ${recall.root_cause || 'Not yet identified'}</div>
    <div style="margin-top:4px"><strong>Corrective Actions:</strong> ${recall.corrective_actions || 'Not yet documented'}</div>
  </section>

  <section>
    <h2>Regulatory Notifications</h2>
    <div class="grid">
      <div><strong>FSA Notified:</strong> ${recall.fsa_notified ? 'Yes' : 'No'}${recall.fsa_notified_at ? ` — ${formatDate(recall.fsa_notified_at)}` : ''}${recall.fsa_reference ? ` (Ref: ${recall.fsa_reference})` : ''}</div>
      <div><strong>SALSA Notified:</strong> ${recall.salsa_notified ? 'Yes' : 'No'}${recall.salsa_notified_at ? ` — ${formatDate(recall.salsa_notified_at)}` : ''}</div>
    </div>
  </section>

  <section>
    <h2>Mass Balance</h2>
    <div class="grid-3">
      <div><strong>Total Affected:</strong> ${mass_balance.total_produced}</div>
      <div><strong>Total Recovered:</strong> ${mass_balance.total_recovered}</div>
      <div><strong>Unaccounted:</strong> ${mass_balance.unaccounted}</div>
    </div>
  </section>

  ${timeline.length > 0 ? `
  <section>
    <h2>Timeline</h2>
    <div style="display:flex;gap:20px;flex-wrap:wrap">${timelineItems}</div>
  </section>` : ''}

  <div class="footer">
    <p>Report generated: ${new Date().toLocaleString('en-GB')}</p>
    <p>This report is confidential and intended for internal use and SALSA audit purposes only.</p>
  </div>
</body>
</html>`;
}

// @salsa — Open recall report in new window for printing
export function printRecallReport(data: RecallReportData) {
  const html = generateRecallReportHTML(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }
}
