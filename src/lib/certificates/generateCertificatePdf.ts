import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface CertificateData {
  candidate_name: string;
  course_title: string;
  completion_date: string;
  expiry_date: string;
  organisation: string;
  certificate_number: string;
}

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
 * Generate certificate PDF bytes by stamping dynamic data onto a template.
 *
 * @param data   – the dynamic certificate fields
 * @param templateBytes – raw bytes of the base PDF template
 */
export async function generateCertificatePdf(
  data: CertificateData,
  templateBytes: Uint8Array | Buffer
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPage(0);
  const { width, height } = page.getSize();

  // Centre X of the page
  const centerX = width / 2;

  // Embed fonts
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Colours
  const primaryInk = rgb(0.15, 0.15, 0.15);   // Near-black for main text
  const secondaryInk = rgb(0.35, 0.35, 0.40);  // Muted for lighter values

  // ── Max widths for shrink-to-fit (relative to page width) ──
  const nameMaxWidth = width * 0.65;
  const courseMaxWidth = width * 0.60;
  const footerMaxWidth = width * 0.20;

  // ── Coordinates (proportional to page size) ──
  // These are tuned against the clean teamly template (≈940 x 660 or A4-ish landscape).
  // Y values are from the bottom (PDF origin).

  const candidateNameY = height * 0.555;   // Between "This is to certify that" and "has successfully completed"
  const courseTitleY = height * 0.435;     // Between "has successfully completed" and "Completed on"
  const completionDateY = height * 0.315;  // Below "Completed on"

  // Footer: 3 columns – values sit just above the label text / lines
  const footerY = height * 0.175;
  const footerLeftX = width * 0.215;       // ISSUED BY column
  const footerCenterX = width * 0.50;      // ORGANISATION column
  const footerRightX = width * 0.80;       // CERTIFICATE ID column

  // === CANDIDATE NAME ===
  const nameSize = shrinkToFit(fontBold, data.candidate_name, nameMaxWidth, 32, 18);
  drawCentered(page, fontBold, data.candidate_name, centerX, candidateNameY, nameSize, primaryInk);

  // === COURSE TITLE ===
  const courseSize = shrinkToFit(fontBold, data.course_title, courseMaxWidth, 20, 12);
  drawCentered(page, fontBold, data.course_title, centerX, courseTitleY, courseSize, primaryInk);

  // === COMPLETION DATE ===
  const dateSize = 14;
  drawCentered(page, fontBold, data.completion_date, centerX, completionDateY, dateSize, primaryInk);

  // === FOOTER: Issuer Name | Organisation | Certificate ID ===
  const footerSize = 11;

  const expirySize = shrinkToFit(fontRegular, data.expiry_date, footerMaxWidth, footerSize, 8);
  drawCentered(page, fontRegular, data.expiry_date, footerLeftX, footerY, expirySize, secondaryInk);

  const orgSize = shrinkToFit(fontRegular, data.organisation, footerMaxWidth, footerSize, 8);
  drawCentered(page, fontRegular, data.organisation, footerCenterX, footerY, orgSize, secondaryInk);

  const certIdSize = shrinkToFit(fontRegular, data.certificate_number, footerMaxWidth, footerSize, 8);
  drawCentered(page, fontRegular, data.certificate_number, footerRightX, footerY, certIdSize, secondaryInk);

  return await pdfDoc.save();
}
