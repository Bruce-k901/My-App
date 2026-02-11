export const REPORT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #1e293b;
    background: #fff;
    line-height: 1.5;
    font-size: 11px;
  }

  .container { max-width: 960px; margin: 0 auto; padding: 20px 28px; }

  /* ===== COVER PAGE ===== */
  .cover-page {
    min-height: auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 40px 40px 24px;
  }
  .cover-page .brand-bar {
    width: 60px;
    height: 3px;
    background: linear-gradient(90deg, #D37E91, #8B5CF6);
    border-radius: 2px;
    margin-bottom: 20px;
  }
  .cover-page h1 {
    font-size: 24px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 6px;
    letter-spacing: -0.5px;
  }
  .cover-page .subtitle {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 20px;
  }
  .cover-page .site-name {
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 4px;
  }
  .cover-page .site-address {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 20px;
  }
  .cover-score {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 20px;
    margin-bottom: 20px;
  }
  .cover-score .score-value {
    font-size: 28px;
    font-weight: 800;
  }
  .cover-score .score-label {
    font-size: 11px;
    color: #64748b;
    text-align: left;
  }
  .cover-meta {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 10px;
  }
  .cover-meta span { margin: 0 8px; }

  /* ===== TABLE OF CONTENTS ===== */
  .toc { padding: 20px 0; }
  .toc h2 {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 20px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e2e8f0;
  }
  .toc-list { list-style: none; }
  .toc-list li {
    display: flex;
    align-items: baseline;
    padding: 5px 0;
    border-bottom: 1px dotted #cbd5e1;
    font-size: 12px;
  }
  .toc-list .toc-num {
    width: 32px;
    font-weight: 700;
    color: #D37E91;
    flex-shrink: 0;
  }
  .toc-list .toc-title { flex: 1; color: #1e293b; font-weight: 500; }

  /* ===== SECTIONS ===== */
  .report-section {
    margin-bottom: 4px;
    padding-top: 10px;
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 3px solid #D37E91;
  }
  .section-number {
    width: 32px;
    height: 32px;
    background: #D37E91;
    color: #fff;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 14px;
    flex-shrink: 0;
  }
  .section-header h2 {
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
  }

  .sub-section {
    margin-bottom: 12px;
  }
  .sub-section h3 {
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
    padding-bottom: 3px;
    border-bottom: 1px solid #e2e8f0;
  }

  /* ===== STATS GRID ===== */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 10px;
  }
  .stats-grid-3 { grid-template-columns: repeat(3, 1fr); }
  .stat-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px;
    text-align: center;
  }
  .stat-value { font-size: 18px; font-weight: 800; color: #0f172a; }
  .stat-label { font-size: 9px; color: #64748b; margin-top: 1px; text-transform: uppercase; letter-spacing: 0.3px; }

  /* ===== TABLES ===== */
  table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px; }
  thead { background: #f1f5f9; }
  th {
    text-align: left;
    padding: 6px 8px;
    font-weight: 600;
    color: #334155;
    border-bottom: 2px solid #e2e8f0;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; color: #475569; }
  tr:nth-child(even) { background: #fafafa; }
  .center { text-align: center; }
  .right { text-align: right; }

  /* ===== BADGES ===== */
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-gray { background: #f1f5f9; color: #475569; }

  /* ===== CALLOUT BOXES ===== */
  .callout {
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 10px;
    border-left: 4px solid;
  }
  .callout-danger { background: #fef2f2; border-color: #dc2626; }
  .callout-danger .callout-title { color: #991b1b; }
  .callout-warning { background: #fffbeb; border-color: #d97706; }
  .callout-warning .callout-title { color: #92400e; }
  .callout-info { background: #eff6ff; border-color: #2563eb; }
  .callout-info .callout-title { color: #1e40af; }
  .callout-success { background: #f0fdf4; border-color: #16a34a; }
  .callout-success .callout-title { color: #166534; }
  .callout-title { font-weight: 700; font-size: 11px; margin-bottom: 4px; }
  .callout-body { font-size: 10px; color: #475569; }

  /* ===== COLORS ===== */
  .text-green { color: #16a34a; }
  .text-red { color: #dc2626; }
  .text-amber { color: #d97706; }
  .text-blue { color: #2563eb; }
  .muted { color: #94a3b8; font-size: 10px; margin-bottom: 8px; }

  /* ===== EVIDENCE GRID ===== */
  .evidence-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
    margin-top: 8px;
  }
  .evidence-item { text-align: center; }
  .evidence-thumb {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }
  .evidence-caption { font-size: 8px; color: #94a3b8; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* ===== FOOTER ===== */
  .report-footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    font-size: 9px;
    color: #94a3b8;
    text-align: center;
  }

  /* ===== EMPTY STATE ===== */
  .empty-state {
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    padding: 12px;
    text-align: center;
    color: #94a3b8;
    font-size: 10px;
    margin-bottom: 8px;
  }

  /* ===== PRINT STYLES ===== */
  .page-break { page-break-before: always; }

  @page {
    size: A4;
    margin: 15mm 12mm 20mm 12mm;
  }

  @media print {
    body { font-size: 9px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .container { padding: 0; max-width: none; }
    .page-break { page-break-before: always; }
    .no-break { page-break-inside: avoid; }
    .cover-page { min-height: auto; page-break-after: always; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    .stat-card, .callout { page-break-inside: avoid; }
    .report-section { page-break-inside: auto; }
    .section-header { page-break-after: avoid; }
    .sub-section { page-break-inside: auto; }
    table { font-size: 8px; }
    th { font-size: 8px; }
  }
`
