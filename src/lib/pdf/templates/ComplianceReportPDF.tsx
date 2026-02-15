import { Document, Page, View, Text } from '@react-pdf/renderer';
import { PDFHeader } from '../components/PDFHeader';
import { PDFFooter } from '../components/PDFFooter';
import { baseStyles, colours } from '../components/PDFStyles';

type EntryStatus = 'pass' | 'fail' | 'warning';

interface ComplianceEntry {
  date: string;
  time: string;
  item: string;
  value: string;
  status: EntryStatus;
  notes?: string;
}

interface ComplianceSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
}

export interface ComplianceReportPDFProps {
  siteName: string;
  reportType: string;
  dateRange: string;
  completedBy: string;
  entries: ComplianceEntry[];
  summary?: ComplianceSummary;
}

const getStatusStyle = (status: EntryStatus) => {
  switch (status) {
    case 'pass':
      return baseStyles.statusPass;
    case 'fail':
      return baseStyles.statusFail;
    case 'warning':
      return baseStyles.statusWarning;
    default:
      return {};
  }
};

const getStatusText = (status: EntryStatus): string => {
  switch (status) {
    case 'pass':
      return 'PASS';
    case 'fail':
      return 'FAIL';
    case 'warning':
      return 'WARNING';
    default:
      return status;
  }
};

export function ComplianceReportPDF({
  siteName,
  reportType,
  dateRange,
  completedBy,
  entries,
  summary,
}: ComplianceReportPDFProps) {
  // Calculate summary if not provided
  const calculatedSummary = summary || {
    totalChecks: entries.length,
    passed: entries.filter((e) => e.status === 'pass').length,
    failed: entries.filter((e) => e.status === 'fail').length,
    warnings: entries.filter((e) => e.status === 'warning').length,
  };

  const completionRate =
    calculatedSummary.totalChecks > 0
      ? Math.round((calculatedSummary.passed / calculatedSummary.totalChecks) * 100)
      : 0;

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PDFHeader
          title={reportType}
          siteName={siteName}
          date={new Date().toISOString()}
          subtitle={`Period: ${dateRange}`}
        />

        {/* Summary box */}
        <View style={[baseStyles.summaryBox, baseStyles.mb12]}>
          <View style={baseStyles.spaceBetween}>
            <View style={{ flex: 1 }}>
              <Text style={baseStyles.summaryLabel}>Total Checks</Text>
              <Text style={[baseStyles.summaryValue, { fontSize: 16 }]}>
                {calculatedSummary.totalChecks}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={baseStyles.summaryLabel}>Completion Rate</Text>
              <Text style={[baseStyles.summaryValue, { fontSize: 16 }]}>
                {completionRate}%
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={baseStyles.summaryLabel}>Completed By</Text>
              <Text style={baseStyles.summaryValue}>{completedBy}</Text>
            </View>
          </View>

          {/* Status breakdown */}
          <View style={[baseStyles.row, baseStyles.mt8]}>
            <View style={{ flex: 1 }}>
              <View style={baseStyles.row}>
                <Text style={[baseStyles.statusPass, { marginRight: 4 }]}>●</Text>
                <Text style={baseStyles.summaryLabel}>
                  Passed: {calculatedSummary.passed}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={baseStyles.row}>
                <Text style={[baseStyles.statusFail, { marginRight: 4 }]}>●</Text>
                <Text style={baseStyles.summaryLabel}>
                  Failed: {calculatedSummary.failed}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={baseStyles.row}>
                <Text style={[baseStyles.statusWarning, { marginRight: 4 }]}>●</Text>
                <Text style={baseStyles.summaryLabel}>
                  Warnings: {calculatedSummary.warnings}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Entries table */}
        <View style={baseStyles.section}>
          <Text style={baseStyles.sectionTitle}>Compliance Log</Text>

          {/* Table header */}
          <View style={baseStyles.tableHeader} fixed>
            <View style={{ width: 70 }}>
              <Text style={baseStyles.tableHeaderCell}>Date</Text>
            </View>
            <View style={{ width: 50 }}>
              <Text style={[baseStyles.tableHeaderCell, { textAlign: 'center' }]}>Time</Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={baseStyles.tableHeaderCell}>Item</Text>
            </View>
            <View style={{ width: 70 }}>
              <Text style={[baseStyles.tableHeaderCell, { textAlign: 'center' }]}>Value</Text>
            </View>
            <View style={{ width: 60 }}>
              <Text style={[baseStyles.tableHeaderCell, { textAlign: 'center' }]}>Status</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={baseStyles.tableHeaderCell}>Notes</Text>
            </View>
          </View>

          {/* Entry rows */}
          {entries.map((entry, index) => (
            <View
              key={index}
              style={[
                baseStyles.tableRow,
                index % 2 === 1 ? baseStyles.tableRowAlt : {},
              ]}
              wrap={false}
            >
              <View style={{ width: 70 }}>
                <Text style={baseStyles.tableCell}>{entry.date}</Text>
              </View>
              <View style={{ width: 50 }}>
                <Text style={baseStyles.tableCellCenter}>{entry.time}</Text>
              </View>
              <View style={{ flex: 2 }}>
                <Text style={baseStyles.tableCell}>{entry.item}</Text>
              </View>
              <View style={{ width: 70 }}>
                <Text style={baseStyles.tableCellCenter}>{entry.value}</Text>
              </View>
              <View style={{ width: 60, alignItems: 'center' }}>
                <Text style={[baseStyles.tableCellCenter, getStatusStyle(entry.status)]}>
                  {getStatusText(entry.status)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={baseStyles.tableCell}>{entry.notes || ''}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Failed/Warning items highlight (if any) */}
        {calculatedSummary.failed > 0 && (
          <View style={[baseStyles.section, baseStyles.mt12]}>
            <Text style={[baseStyles.sectionTitle, { color: colours.danger }]}>
              Items Requiring Attention
            </Text>
            {entries
              .filter((e) => e.status === 'fail' || e.status === 'warning')
              .map((entry, index) => (
                <View
                  key={index}
                  style={[baseStyles.tableRow, { backgroundColor: colours.alternateRow }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={baseStyles.tableCell}>
                      <Text style={getStatusStyle(entry.status)}>
                        {getStatusText(entry.status)}
                      </Text>
                      {' - '}
                      {entry.item}: {entry.value}
                      {entry.notes && ` (${entry.notes})`}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* Compliance statement */}
        <View style={[baseStyles.mt12, { marginTop: 30 }]}>
          <Text style={[baseStyles.tableCell, baseStyles.textMuted, { fontStyle: 'italic' }]}>
            This compliance report has been generated automatically based on recorded data.
            All entries are subject to verification. Any discrepancies should be reported
            to management immediately.
          </Text>
        </View>

        {/* Signature section */}
        <View style={[baseStyles.mt12, { marginTop: 30 }]}>
          <View style={baseStyles.spaceBetween}>
            <View>
              <View style={baseStyles.signatureLine}>
                <Text style={baseStyles.signatureLabel}>Manager Signature</Text>
              </View>
            </View>
            <View>
              <View style={baseStyles.signatureLine}>
                <Text style={baseStyles.signatureLabel}>Date</Text>
              </View>
            </View>
          </View>
        </View>

        <PDFFooter />
      </Page>
    </Document>
  );
}

export default ComplianceReportPDF;
