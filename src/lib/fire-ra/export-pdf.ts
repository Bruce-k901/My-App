/**
 * Fire RA — PDF Export
 * Generates a professional multi-page PDF for regulatory evidence
 * Uses jsPDF + jspdf-autotable (same as src/lib/export-pdf.ts)
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FIRE_RA_SECTIONS, TIER_INFO, getRiskLevel, PREMISES_TYPE_LABELS } from './constants';
import { computeOverallRisk, computeItemRiskScore, extractActionItems, computeOverallCompletion } from './utils';
import type { FireRAAssessmentData } from '@/types/fire-ra';

interface FireRAPdfOptions {
  title: string;
  refCode: string;
  assessmentData: FireRAAssessmentData;
  siteName?: string;
}

export function exportFireRAPdf(options: FireRAPdfOptions): void {
  const { title, refCode, assessmentData, siteName } = options;
  const { screening, generalInfo, sections, signOff } = assessmentData;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = 20;

  const isSpecialist = screening.tier === 'specialist';

  // ---------------------------------------------------------------------------
  // Helper: add page footer
  // ---------------------------------------------------------------------------
  const addFooter = () => {
    const pageNum = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    doc.text('OPSLY Fire Risk Assessment', margin, pageHeight - 10);
    if (isSpecialist) {
      doc.setTextColor(200, 50, 50);
      doc.text('SPECIALIST TIER - Professional assessment recommended', pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
  };

  // ---------------------------------------------------------------------------
  // Helper: check page break
  // ---------------------------------------------------------------------------
  const checkPageBreak = (needed: number) => {
    if (yPos + needed > pageHeight - 25) {
      addFooter();
      doc.addPage();
      yPos = 20;
    }
  };

  // ---------------------------------------------------------------------------
  // COVER PAGE
  // ---------------------------------------------------------------------------
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text('OPSLY', margin, yPos);
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 20;

  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text('Fire Risk Assessment', margin, yPos);
  yPos += 10;

  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  doc.text(title, margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Reference: ${refCode}`, margin, yPos);
  yPos += 15;

  // Specialist warning
  if (isSpecialist) {
    doc.setFillColor(255, 240, 240);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 15, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(180, 30, 30);
    doc.text('SPECIALIST TIER - Professional fire risk assessment is recommended for this premises.', margin + 5, yPos + 9);
    yPos += 20;
  }

  // Cover details
  const coverDetails = [
    ['Premises', generalInfo.premisesName],
    ['Address', generalInfo.premisesAddress],
    ['Type', generalInfo.premisesDescription || PREMISES_TYPE_LABELS[screening.answers.premisesType] || ''],
    ['Assessor', generalInfo.assessorName],
    ['Qualifications', generalInfo.assessorQualifications],
    ['Assessment Date', generalInfo.assessmentDate],
    ['Review Date', generalInfo.reviewDate],
    ['Responsible Person', `${generalInfo.responsiblePersonName} (${generalInfo.responsiblePersonRole})`],
    ['Complexity Tier', TIER_INFO[screening.tier].label],
  ].filter(row => row[1]);

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: coverDetails,
    theme: 'plain',
    margin: { left: margin, right: margin },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45, textColor: [80, 80, 80] },
      1: { cellWidth: 'auto' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Overall risk
  const overall = computeOverallRisk(sections);
  if (overall.level) {
    checkPageBreak(20);
    const riskInfo = getRiskLevel(overall.score);
    const riskColors: Record<string, [number, number, number]> = {
      Low: [34, 197, 94],
      Medium: [245, 158, 11],
      High: [239, 68, 68],
    };
    const color = riskColors[overall.level] || [100, 100, 100];

    doc.setFillColor(...color);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 12, 2, 2, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(`Overall Risk: ${overall.level} (Score: ${overall.score})`, margin + 5, yPos + 8);
    yPos += 18;
  }

  addFooter();

  // ---------------------------------------------------------------------------
  // SCREENING SUMMARY PAGE
  // ---------------------------------------------------------------------------
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Complexity Screening', margin, yPos);
  yPos += 10;

  const screeningRows = [
    ['Premises Type', PREMISES_TYPE_LABELS[screening.answers.premisesType] || screening.answers.premisesTypeOther || ''],
    ['Floor Count', screening.answers.floorCount],
    ['Sleeping Accommodation', screening.answers.sleepingOnPremises ? 'Yes' : 'No'],
    ['Flammable Materials', screening.answers.flammableMaterials],
    ['Occupancy', screening.answers.occupancy],
    ['Disabilities on Site', screening.answers.disabilitiesOnSite],
    ['Last Professional Assessment', screening.answers.lastProfessionalAssessment],
    ['Determined Tier', `${TIER_INFO[screening.tier].label} - ${screening.tierExplanation}`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Question', 'Answer']],
    body: screeningRows,
    theme: 'striped',
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [60, 60, 60] },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  if (screening.enhancedReasons.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(180, 100, 0);
    doc.text('Enhanced/Specialist triggers:', margin, yPos);
    yPos += 5;
    screening.enhancedReasons.forEach(reason => {
      doc.setFontSize(9);
      doc.text(`  - ${reason}`, margin, yPos);
      yPos += 5;
    });
  }

  addFooter();

  // ---------------------------------------------------------------------------
  // SECTION PAGES (2-11)
  // ---------------------------------------------------------------------------
  for (const section of sections) {
    if (!section.isApplicable || section.items.length === 0) continue;
    if (section.sectionNumber === 1 || section.sectionNumber === 12) continue;

    doc.addPage();
    yPos = 20;

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Section ${section.sectionNumber}: ${section.sectionName}`, margin, yPos);
    yPos += 8;

    const sectionDef = FIRE_RA_SECTIONS.find(s => s.number === section.sectionNumber);
    if (sectionDef) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(sectionDef.description, margin, yPos);
      yPos += 8;
    }

    // Helper: format checklist data for PDF cells
    const formatChecklist = (checklist: any, fallback: string): string => {
      if (checklist?.checklist?.some((o: any) => o.checked)) {
        const items = checklist.checklist
          .filter((o: any) => o.checked)
          .map((o: any) => `\u2713 ${o.label}`);
        if (checklist.notes?.trim()) items.push(checklist.notes.trim());
        return items.join('\n') || fallback || '-';
      }
      return fallback || '-';
    };

    // Items table
    const itemRows = section.items.map(item => {
      const score = computeItemRiskScore(item);
      const riskInfo = score > 0 ? getRiskLevel(score) : null;
      return [
        item.itemNumber,
        item.itemName.slice(0, 50),
        formatChecklist(item.findingChecklist, item.finding),
        formatChecklist(item.existingControlsChecklist, item.existingControls),
        score > 0 ? `${score} (${riskInfo?.level})` : '-',
        formatChecklist(item.actionRequiredChecklist, item.actionRequired),
        item.priority || '-',
        item.targetDate || '-',
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Item', 'Finding', 'Controls', 'Risk', 'Action', 'Priority', 'Due']],
      body: itemRows,
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [60, 60, 60], fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25 },
        4: { cellWidth: 15 },
        5: { cellWidth: 30 },
        6: { cellWidth: 15 },
        7: { cellWidth: 18 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 5;

    // Section notes
    if (section.sectionNotes) {
      checkPageBreak(15);
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Notes: ${section.sectionNotes}`, margin, yPos, { maxWidth: pageWidth - margin * 2 });
      yPos += 10;
    }

    addFooter();
  }

  // ---------------------------------------------------------------------------
  // ACTION PLAN SUMMARY
  // ---------------------------------------------------------------------------
  const actionItems = extractActionItems(assessmentData);
  if (actionItems.length > 0) {
    doc.addPage();
    yPos = 20;

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Action Plan Summary', margin, yPos);
    yPos += 10;

    const actionRows = actionItems
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, '': 3 };
        return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
      })
      .map(item => [
        `${item.sectionName} - ${item.itemNumber}`,
        item.actionRequired,
        item.priority || '-',
        item.targetDate || '-',
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Section / Item', 'Action Required', 'Priority', 'Due Date']],
      body: actionRows,
      theme: 'striped',
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [60, 60, 60] },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20 },
        3: { cellWidth: 25 },
      },
    });

    addFooter();
  }

  // ---------------------------------------------------------------------------
  // SIGN-OFF PAGE
  // ---------------------------------------------------------------------------
  doc.addPage();
  yPos = 20;

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Sign-off & Declaration', margin, yPos);
  yPos += 15;

  const signOffRows = [
    ['Assessor Name', signOff.assessorName || '-'],
    ['Assessor Date', signOff.assessorDate || '-'],
    ['Responsible Person Name', signOff.responsiblePersonName || '-'],
    ['Responsible Person Date', signOff.responsiblePersonDate || '-'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: signOffRows,
    theme: 'plain',
    margin: { left: margin, right: margin },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { cellWidth: 'auto' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Disclaimer
  checkPageBreak(30);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const disclaimer = 'This fire risk assessment has been conducted using the Opsly platform as a structured guide. It is the responsibility of the Responsible Person to ensure the assessment is thorough, accurate, and maintained. For complex premises or where specific fire safety expertise is required, a competent person with relevant qualifications should be engaged. This assessment does not constitute professional fire safety advice.';
  doc.text(disclaimer, margin, yPos, { maxWidth: pageWidth - margin * 2 });

  addFooter();

  // ---------------------------------------------------------------------------
  // SAVE
  // ---------------------------------------------------------------------------
  doc.save(`${refCode || 'Fire-RA'}_${new Date().toISOString().split('T')[0]}.pdf`);
}
