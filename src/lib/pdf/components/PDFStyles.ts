import { StyleSheet } from '@react-pdf/renderer';

// Colour palette for PDF documents
export const colours = {
  primary: '#1a1a2e',      // Dark header background
  accent: '#4f46e5',       // Opsly brand accent
  border: '#d1d5db',       // Light grey borders
  headerBg: '#f3f4f6',     // Light grey header row background
  text: '#111827',         // Body text
  textLight: '#6b7280',    // Secondary text
  white: '#ffffff',
  // Status colours
  success: '#10b981',      // Green for pass
  warning: '#f59e0b',      // Amber for warning
  danger: '#ef4444',       // Red for fail
  // Row colours
  alternateRow: '#f9fafb', // Zebra striping
};

// Font size definitions (in points)
export const fontSizes = {
  title: 16,
  subtitle: 12,
  sectionTitle: 11,
  body: 10,
  tableHeader: 9,
  tableCell: 8,
  small: 7,
  footer: 7,
};

// Base styles used across all PDF templates
export const baseStyles = StyleSheet.create({
  // Page layouts
  page: {
    padding: 30,
    fontSize: fontSizes.tableCell,
    fontFamily: 'Helvetica',
    color: colours.text,
  },
  pageLandscape: {
    padding: 30,
    fontSize: fontSizes.tableCell,
    fontFamily: 'Helvetica',
    color: colours.text,
  },

  // Header styles
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colours.primary,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: fontSizes.title,
    fontFamily: 'Helvetica-Bold',
    color: colours.primary,
  },
  subtitle: {
    fontSize: fontSizes.subtitle,
    color: colours.textLight,
    marginTop: 2,
  },
  siteName: {
    fontSize: fontSizes.body,
    fontFamily: 'Helvetica-Bold',
  },
  dateText: {
    fontSize: fontSizes.tableCell,
    color: colours.textLight,
    marginTop: 2,
  },

  // Section styles
  section: {
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: fontSizes.sectionTitle,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: colours.primary,
  },

  // Table styles
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colours.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: fontSizes.tableHeader,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: colours.border,
    paddingVertical: 4,
    paddingHorizontal: 4,
    minHeight: 20,
  },
  tableRowAlt: {
    backgroundColor: colours.alternateRow,
  },
  tableRowTall: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: colours.border,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minHeight: 24, // Taller rows for handwriting
  },
  tableCell: {
    fontSize: fontSizes.tableCell,
  },
  tableCellCenter: {
    fontSize: fontSizes.tableCell,
    textAlign: 'center',
  },
  tableCellRight: {
    fontSize: fontSizes.tableCell,
    textAlign: 'right',
  },

  // Checkbox/write-in box for manual entry
  writeInBox: {
    borderWidth: 1,
    borderColor: colours.border,
    minHeight: 16,
    minWidth: 40,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: colours.text,
  },

  // Footer styles
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: fontSizes.footer,
    color: colours.textLight,
    borderTopWidth: 0.5,
    borderTopColor: colours.border,
    paddingTop: 5,
  },

  // Utility styles
  row: {
    flexDirection: 'row',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  italic: {
    fontFamily: 'Helvetica-Oblique',
  },
  textMuted: {
    color: colours.textLight,
  },
  mb4: {
    marginBottom: 4,
  },
  mb8: {
    marginBottom: 8,
  },
  mb12: {
    marginBottom: 12,
  },
  mt8: {
    marginTop: 8,
  },
  mt12: {
    marginTop: 12,
  },

  // Status indicators (coloured text)
  statusPass: {
    color: colours.success,
    fontFamily: 'Helvetica-Bold',
  },
  statusWarning: {
    color: colours.warning,
    fontFamily: 'Helvetica-Bold',
  },
  statusFail: {
    color: colours.danger,
    fontFamily: 'Helvetica-Bold',
  },

  // Summary box
  summaryBox: {
    backgroundColor: colours.headerBg,
    padding: 10,
    marginBottom: 12,
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: fontSizes.tableCell,
    color: colours.textLight,
  },
  summaryValue: {
    fontSize: fontSizes.tableCell,
    fontFamily: 'Helvetica-Bold',
  },

  // Signature line
  signatureLine: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: colours.text,
    width: 200,
    paddingTop: 4,
  },
  signatureLabel: {
    fontSize: fontSizes.small,
    color: colours.textLight,
  },
});

// Helper to format UK dates
export function formatUKDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Helper to format date with day name (e.g., "Saturday 21 Jan")
export function formatDateWithDay(dateString: string): string {
  const date = new Date(dateString);
  const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const dayNum = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  return `${dayName} ${dayNum} ${month}`;
}

// Helper to format time ranges
export function formatTimeRange(start?: string, end?: string): string {
  if (!start || !end) return '';
  const formatTime = (t: string) => {
    const [hours, minutes] = t.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'p' : 'a';
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return minutes === '00' ? `${hour12}${suffix}` : `${hour12}:${minutes}${suffix}`;
  };
  return `${formatTime(start)}-${formatTime(end)}`;
}
