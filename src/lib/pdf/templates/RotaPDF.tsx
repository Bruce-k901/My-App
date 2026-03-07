import { Document, Page, View, Text } from '@react-pdf/renderer';
import { PDFHeader } from '../components/PDFHeader';
import { PDFFooter } from '../components/PDFFooter';
import { baseStyles, colours, formatTimeRange } from '../components/PDFStyles';

interface Shift {
  day: string; // "Mon", "Tue", etc.
  startTime?: string;
  endTime?: string;
  isOff?: boolean;
}

interface StaffMember {
  name: string;
  role: string;
  shifts: Shift[];
  totalHours: number;
}

interface DailyTotal {
  day: string;
  staffCount: number;
  totalHours: number;
}

export interface RotaPDFProps {
  siteName: string;
  weekStarting: string;
  staff: StaffMember[];
  dailyTotals: DailyTotal[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKEND_DAYS = ['Sat', 'Sun'];

export function RotaPDF({
  siteName,
  weekStarting,
  staff,
  dailyTotals,
}: RotaPDFProps) {
  const getShiftForDay = (shifts: Shift[], day: string): Shift | undefined => {
    return shifts.find((s) => s.day === day);
  };

  const formatShift = (shift?: Shift): string => {
    if (!shift) return '';
    if (shift.isOff) return 'OFF';
    if (shift.startTime && shift.endTime) {
      return formatTimeRange(shift.startTime, shift.endTime);
    }
    return '';
  };

  const getDayTotal = (day: string): DailyTotal | undefined => {
    return dailyTotals.find((t) => t.day === day);
  };

  const isWeekend = (day: string): boolean => WEEKEND_DAYS.includes(day);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={baseStyles.pageLandscape}>
        <PDFHeader
          title="Staff Rota"
          siteName={siteName}
          date={weekStarting}
          subtitle={`Week commencing ${weekStarting}`}
        />

        {/* Rota grid */}
        <View style={baseStyles.table}>
          {/* Header row */}
          <View style={baseStyles.tableHeader} fixed>
            <View style={{ width: 100 }}>
              <Text style={baseStyles.tableHeaderCell}>Name</Text>
            </View>
            <View style={{ width: 70 }}>
              <Text style={baseStyles.tableHeaderCell}>Role</Text>
            </View>
            {DAYS.map((day) => (
              <View
                key={day}
                style={{
                  flex: 1,
                  backgroundColor: isWeekend(day) ? colours.alternateRow : undefined,
                }}
              >
                <Text style={[baseStyles.tableHeaderCell, { textAlign: 'center' }]}>
                  {day}
                </Text>
              </View>
            ))}
            <View style={{ width: 50 }}>
              <Text style={[baseStyles.tableHeaderCell, { textAlign: 'center' }]}>
                Total
              </Text>
            </View>
          </View>

          {/* Staff rows */}
          {staff.map((member, index) => (
            <View
              key={index}
              style={[
                baseStyles.tableRow,
                index % 2 === 1 ? baseStyles.tableRowAlt : {},
              ]}
              wrap={false}
            >
              <View style={{ width: 100 }}>
                <Text style={[baseStyles.tableCell, baseStyles.bold]}>{member.name}</Text>
              </View>
              <View style={{ width: 70 }}>
                <Text style={[baseStyles.tableCell, baseStyles.textMuted]}>
                  {member.role}
                </Text>
              </View>
              {DAYS.map((day) => {
                const shift = getShiftForDay(member.shifts, day);
                const shiftText = formatShift(shift);
                return (
                  <View
                    key={day}
                    style={{
                      flex: 1,
                      backgroundColor: isWeekend(day) ? colours.alternateRow : undefined,
                    }}
                  >
                    <Text
                      style={[
                        baseStyles.tableCellCenter,
                        shift?.isOff ? baseStyles.textMuted : {},
                      ]}
                    >
                      {shiftText}
                    </Text>
                  </View>
                );
              })}
              <View style={{ width: 50 }}>
                <Text style={[baseStyles.tableCellCenter, baseStyles.bold]}>
                  {member.totalHours}h
                </Text>
              </View>
            </View>
          ))}

          {/* Daily totals row */}
          <View
            style={[
              baseStyles.tableRow,
              { backgroundColor: colours.headerBg, borderTopWidth: 1 },
            ]}
          >
            <View style={{ width: 100 }}>
              <Text style={[baseStyles.tableCell, baseStyles.bold]}>Daily Totals</Text>
            </View>
            <View style={{ width: 70 }}>
              <Text style={baseStyles.tableCell}></Text>
            </View>
            {DAYS.map((day) => {
              const dayTotal = getDayTotal(day);
              return (
                <View
                  key={day}
                  style={{
                    flex: 1,
                    backgroundColor: isWeekend(day) ? colours.alternateRow : undefined,
                  }}
                >
                  <Text style={baseStyles.tableCellCenter}>
                    {dayTotal ? `${dayTotal.staffCount} staff` : '-'}
                  </Text>
                  <Text style={[baseStyles.tableCellCenter, { fontSize: 7 }]}>
                    {dayTotal ? `${dayTotal.totalHours}h` : ''}
                  </Text>
                </View>
              );
            })}
            <View style={{ width: 50 }}>
              <Text style={[baseStyles.tableCellCenter, baseStyles.bold]}>
                {staff.reduce((sum, m) => sum + m.totalHours, 0)}h
              </Text>
            </View>
          </View>
        </View>

        {/* Summary */}
        <View style={[baseStyles.summaryBox, baseStyles.mt12]}>
          <View style={baseStyles.row}>
            <View style={{ flex: 1 }}>
              <View style={baseStyles.summaryRow}>
                <Text style={baseStyles.summaryLabel}>Total Staff</Text>
                <Text style={baseStyles.summaryValue}>{staff.length}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={baseStyles.summaryRow}>
                <Text style={baseStyles.summaryLabel}>Total Hours</Text>
                <Text style={baseStyles.summaryValue}>
                  {staff.reduce((sum, m) => sum + m.totalHours, 0)}h
                </Text>
              </View>
            </View>
          </View>
        </View>

        <PDFFooter />
      </Page>
    </Document>
  );
}

export default RotaPDF;
