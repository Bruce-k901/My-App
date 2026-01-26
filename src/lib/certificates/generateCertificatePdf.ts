import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface CertificateData {
  candidate_name: string;
  course_title: string;
  site_name: string;
  company_name: string;
  completion_date: string;
  expiry_date: string;
  certificate_number: string;
  score_percentage: number;
}

// A4 Landscape coordinates (points, origin bottom-left)
const COORDS = {
  // Page center X for A4 landscape
  centerX: 420.94,
  
  // Main content
  candidateNameY: 330,
  courseTitleY: 265,
  siteNameY: 230,
  
  // Footer row (3 columns)
  completionX: 170,
  expiryX: 420.94,
  certIdX: 672,
  footerY: 145,
  
  // Score badge (optional position)
  scoreX: 720,
  scoreY: 330,
  
  // Max widths for shrink-to-fit
  nameMaxWidth: 680,
  courseMaxWidth: 650,
  siteMaxWidth: 500,
};

/**
 * Shrink font size until text fits within maxWidth
 */
function shrinkToFit(
  font: any,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number
): number {
  let size = startSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 1;
  }
  return size;
}

/**
 * Draw text centered at x coordinate
 */
function drawCentered(
  page: any,
  font: any,
  text: string,
  x: number,
  y: number,
  size: number,
  color: any
): void {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: x - width / 2, y, size, font, color });
}

/**
 * Generate certificate PDF bytes
 */
export async function generateCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  // Load template from private directory (not publicly accessible)
  const templatePath = path.join(
    process.cwd(),
    "private",
    "certificates",
    "teamly_certificate_template.pdf"
  );
  const templateBytes = await readFile(templatePath);

  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPage(0);

  // Embed fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesBold);

  // Colors
  const primaryInk = rgb(0.06, 0.09, 0.16);    // Dark text
  const secondaryInk = rgb(0.35, 0.42, 0.49);  // Muted text
  const accentColor = rgb(0.91, 0.29, 0.51);   // Opsly pink for score

  // === CANDIDATE NAME ===
  const nameSize = shrinkToFit(fontSerifBold, data.candidate_name, COORDS.nameMaxWidth, 42, 24);
  drawCentered(page, fontSerifBold, data.candidate_name, COORDS.centerX, COORDS.candidateNameY, nameSize, primaryInk);

  // === COURSE TITLE ===
  const courseSize = shrinkToFit(fontBold, data.course_title, COORDS.courseMaxWidth, 22, 14);
  drawCentered(page, fontBold, data.course_title, COORDS.centerX, COORDS.courseTitleY, courseSize, primaryInk);

  // === SITE & COMPANY ===
  const siteText = `${data.site_name} • ${data.company_name}`;
  const siteSize = shrinkToFit(fontRegular, siteText, COORDS.siteMaxWidth, 14, 10);
  drawCentered(page, fontRegular, siteText, COORDS.centerX, COORDS.siteNameY, siteSize, secondaryInk);

  // === FOOTER ROW: Completion Date | Expiry Date | Certificate ID ===
  
  // Labels (smaller, above values)
  const labelSize = 9;
  const labelY = COORDS.footerY + 18;
  drawCentered(page, fontRegular, "COMPLETED", COORDS.completionX, labelY, labelSize, secondaryInk);
  drawCentered(page, fontRegular, "VALID UNTIL", COORDS.expiryX, labelY, labelSize, secondaryInk);
  drawCentered(page, fontRegular, "CERTIFICATE ID", COORDS.certIdX, labelY, labelSize, secondaryInk);
  
  // Values
  const valueSize = 12;
  drawCentered(page, fontBold, data.completion_date, COORDS.completionX, COORDS.footerY, valueSize, primaryInk);
  drawCentered(page, fontBold, data.expiry_date, COORDS.expiryX, COORDS.footerY, valueSize, primaryInk);
  drawCentered(page, fontBold, data.certificate_number, COORDS.certIdX, COORDS.footerY, valueSize, primaryInk);

  // === SCORE BADGE (top right) ===
  const scoreText = `${data.score_percentage}%`;
  const scoreSize = 28;
  const scoreWidth = fontBold.widthOfTextAtSize(scoreText, scoreSize);
  page.drawText(scoreText, {
    x: COORDS.scoreX - scoreWidth / 2,
    y: COORDS.scoreY,
    size: scoreSize,
    font: fontBold,
    color: accentColor,
  });
  // "SCORE" label below
  drawCentered(page, fontRegular, "SCORE", COORDS.scoreX, COORDS.scoreY - 18, 10, secondaryInk);

  return await pdfDoc.save();
}
