/**
 * Generate and download an incident report as PDF
 * Uses browser print functionality to generate PDF
 */

interface Incident {
  id: string;
  title: string;
  description: string;
  incident_type: string;
  severity: string;
  status: string;
  location?: string;
  incident_date?: string;
  reported_date?: string;
  reported_at?: string;
  reported_by?: string;
  reported_by_name?: string;
  casualties?: any[];
  witnesses?: any[];
  emergency_services_called?: boolean;
  emergency_services_type?: string;
  first_aid_provided?: boolean;
  scene_preserved?: boolean;
  riddor_reportable?: boolean;
  riddor_reported?: boolean;
  riddor_reported_date?: string;
  riddor_reference?: string;
  photos?: string[];
  documents?: string[];
  immediate_actions_taken?: string;
  site_id?: string;
  site_name?: string;
  [key: string]: any;
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Not specified';
  return new Date(dateString).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function generateIncidentReportHTML(incident: Incident): string {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Incident Report - ${incident.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      background: #fff;
    }
    .header {
      border-bottom: 3px solid #D37E91;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #D37E91;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header-meta {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 14px;
      color: #666;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 20px;
      color: #D37E91;
      border-bottom: 2px solid #D37E91;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    .detail-row {
      display: flex;
      margin-bottom: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-label {
      font-weight: 600;
      color: #666;
      width: 180px;
      flex-shrink: 0;
    }
    .detail-value {
      color: #333;
      flex: 1;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-severity-critical {
      background: #fee2e2;
      color: #991b1b;
    }
    .badge-severity-major {
      background: #fed7aa;
      color: #9a3412;
    }
    .badge-severity-moderate {
      background: #fef3c7;
      color: #92400e;
    }
    .badge-severity-minor {
      background: #dbeafe;
      color: #1e40af;
    }
    .badge-status-open {
      background: #fee2e2;
      color: #991b1b;
    }
    .badge-status-investigating {
      background: #fed7aa;
      color: #9a3412;
    }
    .badge-status-resolved {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-status-closed {
      background: #f3f4f6;
      color: #374151;
    }
    .casualty-item, .witness-item {
      background: #f9fafb;
      padding: 15px;
      margin-bottom: 10px;
      border-left: 3px solid #D37E91;
      border-radius: 4px;
    }
    .casualty-item h4, .witness-item h4 {
      color: #D37E91;
      margin-bottom: 8px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .check-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .check-yes {
      color: #059669;
      font-weight: 600;
    }
    .check-no {
      color: #dc2626;
      font-weight: 600;
    }
    .riddor-box {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      padding: 15px;
      border-radius: 4px;
      margin-top: 10px;
    }
    .riddor-box h4 {
      color: #92400e;
      margin-bottom: 10px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #eee;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    @media print {
      body {
        padding: 20px;
      }
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Incident Report</h1>
    <div class="header-meta">
      <span><strong>Report ID:</strong> ${incident.id}</span>
      <span><strong>Generated:</strong> ${new Date().toLocaleString('en-GB')}</span>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Incident Overview</h2>
    <div class="detail-row">
      <div class="detail-label">Title:</div>
      <div class="detail-value"><strong>${incident.title || 'Not specified'}</strong></div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Type:</div>
      <div class="detail-value">${(incident.incident_type || 'Unknown').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Severity:</div>
      <div class="detail-value">
        <span class="badge badge-severity-${incident.severity?.toLowerCase() || 'minor'}">
          ${(incident.severity || 'Unknown').toUpperCase()}
        </span>
      </div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Status:</div>
      <div class="detail-value">
        <span class="badge badge-status-${incident.status?.toLowerCase() || 'open'}">
          ${(incident.status || 'Unknown').toUpperCase()}
        </span>
      </div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Description:</div>
      <div class="detail-value">${(incident.description || 'No description provided').replace(/\n/g, '<br>')}</div>
    </div>
    ${incident.location ? `
    <div class="detail-row">
      <div class="detail-label">Location:</div>
      <div class="detail-value">${incident.location}</div>
    </div>
    ` : ''}
    <div class="detail-row">
      <div class="detail-label">Incident Date & Time:</div>
      <div class="detail-value">${formatDate(incident.incident_date || incident.reported_date || incident.reported_at)}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Reported By:</div>
      <div class="detail-value">${incident.reported_by_name || incident.reported_by || 'Unknown'}</div>
    </div>
    ${incident.site_name ? `
    <div class="detail-row">
      <div class="detail-label">Site:</div>
      <div class="detail-value">${incident.site_name}</div>
    </div>
    ` : ''}
  </div>

  ${incident.casualties && Array.isArray(incident.casualties) && incident.casualties.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Casualties (${incident.casualties.length})</h2>
    ${incident.casualties.map((casualty: any, index: number) => `
      <div class="casualty-item">
        <h4>Casualty ${index + 1}</h4>
        <div class="grid-2">
          <div><strong>Name:</strong> ${casualty.name || 'Not specified'}</div>
          ${casualty.age ? `<div><strong>Age:</strong> ${casualty.age}</div>` : ''}
          <div><strong>Injury Type:</strong> ${casualty.injury_type || 'Not specified'}</div>
          <div><strong>Severity:</strong> ${casualty.severity || 'Not specified'}</div>
        </div>
        ${casualty.treatment_required ? `<div style="margin-top: 8px;"><strong>Treatment Required:</strong> ${casualty.treatment_required}</div>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${incident.witnesses && Array.isArray(incident.witnesses) && incident.witnesses.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Witnesses (${incident.witnesses.length})</h2>
    ${incident.witnesses.map((witness: any, index: number) => `
      <div class="witness-item">
        <h4>Witness ${index + 1}</h4>
        <div><strong>Name:</strong> ${witness.name || 'Not specified'}</div>
        ${witness.contact ? `<div><strong>Contact:</strong> ${witness.contact}</div>` : ''}
        ${witness.statement ? `<div style="margin-top: 8px;"><strong>Statement:</strong><br>${witness.statement.replace(/\n/g, '<br>')}</div>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${(incident.emergency_services_called || incident.first_aid_provided || incident.scene_preserved) ? `
  <div class="section">
    <h2 class="section-title">Emergency Response</h2>
    <div class="check-item">
      <span class="${incident.emergency_services_called ? 'check-yes' : 'check-no'}">
        ${incident.emergency_services_called ? '✓' : '✗'}
      </span>
      <span><strong>Emergency Services Called:</strong> ${incident.emergency_services_called ? 'Yes' : 'No'}
      ${incident.emergency_services_type ? ` (${incident.emergency_services_type})` : ''}</span>
    </div>
    <div class="check-item">
      <span class="${incident.first_aid_provided ? 'check-yes' : 'check-no'}">
        ${incident.first_aid_provided ? '✓' : '✗'}
      </span>
      <span><strong>First Aid Provided:</strong> ${incident.first_aid_provided ? 'Yes' : 'No'}</span>
    </div>
    <div class="check-item">
      <span class="${incident.scene_preserved ? 'check-yes' : 'check-no'}">
        ${incident.scene_preserved ? '✓' : '✗'}
      </span>
      <span><strong>Scene Preserved:</strong> ${incident.scene_preserved ? 'Yes' : 'No'}</span>
    </div>
  </div>
  ` : ''}

  ${incident.immediate_actions_taken ? `
  <div class="section">
    <h2 class="section-title">Immediate Actions Taken</h2>
    <div style="white-space: pre-wrap; padding: 15px; background: #f9fafb; border-radius: 4px;">
      ${incident.immediate_actions_taken.replace(/\n/g, '<br>')}
    </div>
  </div>
  ` : ''}

  ${incident.riddor_reportable ? `
  <div class="section">
    <h2 class="section-title">RIDDOR Information</h2>
    <div class="riddor-box">
      <h4>⚠️ RIDDOR Reportable Incident</h4>
      <div><strong>Reportable:</strong> Yes</div>
      ${incident.riddor_reported ? `
        <div style="margin-top: 10px;">
          <div><strong>Reported:</strong> Yes</div>
          ${incident.riddor_reported_date ? `<div><strong>Reported Date:</strong> ${formatDate(incident.riddor_reported_date)}</div>` : ''}
          ${incident.riddor_reference ? `<div><strong>Reference Number:</strong> ${incident.riddor_reference}</div>` : ''}
        </div>
      ` : '<div style="margin-top: 10px;"><strong>Reported:</strong> No (Action Required)</div>'}
    </div>
  </div>
  ` : ''}

  ${((incident.photos && incident.photos.length > 0) || (incident.documents && incident.documents.length > 0)) ? `
  <div class="section">
    <h2 class="section-title">Evidence</h2>
    ${incident.photos && incident.photos.length > 0 ? `
      <div style="margin-bottom: 15px;">
        <strong>Photos (${incident.photos.length}):</strong>
        <ul style="margin-top: 8px; margin-left: 20px;">
          ${incident.photos.map((photo: string, index: number) => `
            <li><a href="${photo}" target="_blank">Photo ${index + 1}</a></li>
          `).join('')}
        </ul>
      </div>
    ` : ''}
    ${incident.documents && incident.documents.length > 0 ? `
      <div>
        <strong>Documents (${incident.documents.length}):</strong>
        <ul style="margin-top: 8px; margin-left: 20px;">
          ${incident.documents.map((doc: string, index: number) => `
            <li><a href="${doc}" target="_blank">Document ${index + 1}</a></li>
          `).join('')}
        </ul>
      </div>
    ` : ''}
  </div>
  ` : ''}

  <div class="footer">
    <p>This report was generated on ${new Date().toLocaleString('en-GB')}</p>
    <p>Report ID: ${incident.id}</p>
  </div>
</body>
</html>
  `;
  return html;
}

export async function downloadIncidentReportPDF(incident: Incident): Promise<void> {
  try {
    // Generate HTML report
    const html = generateIncidentReportHTML(incident);
    
    // Create a blob and open in new window for printing
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    
    if (!printWindow) {
      throw new Error('Popup blocked. Please allow popups to download the report.');
    }
    
    // Wait for window to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Clean up URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      }, 500);
    };
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    throw new Error(error.message || 'Failed to generate PDF report');
  }
}















