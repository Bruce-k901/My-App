import { Document, Page, View, Text } from '@react-pdf/renderer';
import { PDFHeader } from '../components/PDFHeader';
import { PDFFooter } from '../components/PDFFooter';
import { baseStyles, colours, fontSizes, formatUKDate } from '../components/PDFStyles';

interface StockCountItem {
  name: string;
  unit: string;
  expectedQty?: number;
  location?: string;
}

interface StockCountCategory {
  name: string;
  items: StockCountItem[];
}

export interface StockCountSheetPDFProps {
  siteName: string;
  date: string;
  countedBy?: string;
  categories: StockCountCategory[];
}

export function StockCountSheetPDF({
  siteName,
  date,
  countedBy,
  categories,
}: StockCountSheetPDFProps) {
  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PDFHeader
          title="Stock Count Sheet"
          siteName={siteName}
          date={date}
        />

        {/* Count details section */}
        <View style={baseStyles.mb12}>
          <View style={baseStyles.spaceBetween}>
            <View style={baseStyles.row}>
              <Text style={baseStyles.bold}>Date: </Text>
              <Text>{formatUKDate(date)}</Text>
            </View>
            <View style={baseStyles.row}>
              <Text style={baseStyles.bold}>Counted By: </Text>
              <Text>{countedBy || '________________________'}</Text>
            </View>
          </View>
        </View>

        {/* Categories and items */}
        {categories.map((category, catIndex) => (
          <View key={catIndex} style={baseStyles.section} wrap={false}>
            {/* Category header */}
            <Text style={baseStyles.sectionTitle}>{category.name}</Text>

            {/* Table header */}
            <View style={baseStyles.tableHeader} fixed>
              <View style={{ flex: 3 }}>
                <Text style={baseStyles.tableHeaderCell}>Item</Text>
              </View>
              <View style={{ width: 50 }}>
                <Text style={[baseStyles.tableHeaderCell, { textAlign: 'center' }]}>Unit</Text>
              </View>
              <View style={{ width: 70 }}>
                <Text style={[baseStyles.tableHeaderCell, { textAlign: 'center' }]}>Location</Text>
              </View>
              <View style={{ width: 60 }}>
                <Text style={[baseStyles.tableHeaderCell, { textAlign: 'center' }]}>Expected</Text>
              </View>
              <View style={{ width: 60 }}>
                <Text style={[baseStyles.tableHeaderCell, { textAlign: 'center' }]}>Counted</Text>
              </View>
              <View style={{ width: 60 }}>
                <Text style={[baseStyles.tableHeaderCell, { textAlign: 'center' }]}>Variance</Text>
              </View>
            </View>

            {/* Item rows */}
            {category.items.map((item, itemIndex) => (
              <View
                key={itemIndex}
                style={[
                  baseStyles.tableRowTall,
                  itemIndex % 2 === 1 ? baseStyles.tableRowAlt : {},
                ]}
                wrap={false}
              >
                <View style={{ flex: 3 }}>
                  <Text style={baseStyles.tableCell}>{item.name}</Text>
                </View>
                <View style={{ width: 50 }}>
                  <Text style={baseStyles.tableCellCenter}>{item.unit}</Text>
                </View>
                <View style={{ width: 70 }}>
                  <Text style={baseStyles.tableCellCenter}>{item.location || '-'}</Text>
                </View>
                <View style={{ width: 60 }}>
                  <Text style={baseStyles.tableCellCenter}>
                    {item.expectedQty !== undefined ? item.expectedQty : '-'}
                  </Text>
                </View>
                {/* Write-in box for counted quantity */}
                <View style={{ width: 60, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 45,
                      height: 16,
                      borderWidth: 1,
                      borderColor: colours.border,
                    }}
                  />
                </View>
                {/* Write-in box for variance */}
                <View style={{ width: 60, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 45,
                      height: 16,
                      borderWidth: 1,
                      borderColor: colours.border,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Signature section */}
        <View style={baseStyles.mt12}>
          <View style={baseStyles.spaceBetween}>
            <View>
              <View style={baseStyles.signatureLine}>
                <Text style={baseStyles.signatureLabel}>Signature</Text>
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

export default StockCountSheetPDF;
