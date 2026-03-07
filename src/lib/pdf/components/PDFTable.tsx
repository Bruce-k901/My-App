import { View, Text } from '@react-pdf/renderer';
import { baseStyles, colours } from './PDFStyles';
import type { ReactNode } from 'react';

export interface PDFTableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => ReactNode;
}

interface PDFTableProps<T> {
  columns: PDFTableColumn<T>[];
  data: T[];
  alternateRowColors?: boolean;
  tallRows?: boolean; // For handwriting-friendly rows
}

export function PDFTable<T extends Record<string, unknown>>({
  columns,
  data,
  alternateRowColors = true,
  tallRows = false,
}: PDFTableProps<T>) {
  const getAlignment = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return baseStyles.tableCellCenter;
      case 'right':
        return baseStyles.tableCellRight;
      default:
        return baseStyles.tableCell;
    }
  };

  const getCellValue = (
    row: T,
    column: PDFTableColumn<T>,
    index: number
  ): ReactNode => {
    const value = typeof column.key === 'string' ? row[column.key] : undefined;

    if (column.render) {
      return column.render(value, row, index);
    }

    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  };

  const rowStyle = tallRows ? baseStyles.tableRowTall : baseStyles.tableRow;

  return (
    <View style={baseStyles.table}>
      {/* Header Row - fixed to repeat on page breaks */}
      <View style={baseStyles.tableHeader} fixed>
        {columns.map((column, colIndex) => (
          <View
            key={colIndex}
            style={{
              width: column.width || 'auto',
              flex: column.width ? undefined : 1,
            }}
          >
            <Text style={[baseStyles.tableHeaderCell, getAlignment(column.align)]}>
              {column.header}
            </Text>
          </View>
        ))}
      </View>

      {/* Data Rows */}
      {data.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            rowStyle,
            alternateRowColors && rowIndex % 2 === 1
              ? baseStyles.tableRowAlt
              : {},
          ]}
          wrap={false}
        >
          {columns.map((column, colIndex) => (
            <View
              key={colIndex}
              style={{
                width: column.width || 'auto',
                flex: column.width ? undefined : 1,
              }}
            >
              <Text style={getAlignment(column.align)}>
                {getCellValue(row, column, rowIndex)}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// Empty write-in box component for manual entry sheets
export function WriteInBox({ width = 50, height = 16 }: { width?: number; height?: number }) {
  return (
    <View
      style={{
        width,
        height,
        borderWidth: 1,
        borderColor: colours.border,
      }}
    />
  );
}

// Empty checkbox component
export function Checkbox() {
  return <View style={baseStyles.checkbox} />;
}
