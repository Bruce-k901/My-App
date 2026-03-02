import { Document, Page, View, Text } from '@react-pdf/renderer';
import { PDFHeader } from '../components/PDFHeader';
import { PDFFooter } from '../components/PDFFooter';
import { baseStyles, colours, formatUKDate } from '../components/PDFStyles';

interface DeliveryItem {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface DeliveryNotePDFProps {
  siteName: string;
  deliveryDate: string;
  orderRef: string;
  supplier?: string;
  customer?: string;
  items: DeliveryItem[];
  deliveryNotes?: string;
  preparedBy?: string;
}

export function DeliveryNotePDF({
  siteName,
  deliveryDate,
  orderRef,
  supplier,
  customer,
  items,
  deliveryNotes,
  preparedBy,
}: DeliveryNotePDFProps) {
  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PDFHeader
          title="Delivery Note"
          siteName={siteName}
          date={deliveryDate}
        />

        {/* Order reference - prominent */}
        <View style={[baseStyles.summaryBox, baseStyles.mb12]}>
          <View style={baseStyles.spaceBetween}>
            <View>
              <Text style={baseStyles.summaryLabel}>Order Reference</Text>
              <Text style={[baseStyles.summaryValue, { fontSize: 14 }]}>{orderRef}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={baseStyles.summaryLabel}>Delivery Date</Text>
              <Text style={baseStyles.summaryValue}>{formatUKDate(deliveryDate)}</Text>
            </View>
          </View>
        </View>

        {/* Delivery details */}
        <View style={[baseStyles.section, baseStyles.mb12]}>
          <View style={baseStyles.spaceBetween}>
            {supplier && (
              <View style={{ flex: 1 }}>
                <Text style={[baseStyles.bold, baseStyles.mb4]}>Supplier</Text>
                <Text style={baseStyles.tableCell}>{supplier}</Text>
              </View>
            )}
            {customer && (
              <View style={{ flex: 1 }}>
                <Text style={[baseStyles.bold, baseStyles.mb4]}>Customer</Text>
                <Text style={baseStyles.tableCell}>{customer}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Delivery notes if present */}
        {deliveryNotes && (
          <View style={[baseStyles.section, baseStyles.mb12]}>
            <Text style={[baseStyles.bold, baseStyles.mb4]}>Delivery Instructions</Text>
            <Text style={baseStyles.tableCell}>{deliveryNotes}</Text>
          </View>
        )}

        {/* Items table */}
        <View style={baseStyles.section}>
          <Text style={baseStyles.sectionTitle}>Items</Text>

          {/* Table header */}
          <View style={baseStyles.tableHeader}>
            <View style={{ flex: 3 }}>
              <Text style={baseStyles.tableHeaderCell}>Item</Text>
            </View>
            <View style={{ width: 60 }}>
              <Text style={[baseStyles.tableHeaderCell, { textAlign: 'center' }]}>Qty</Text>
            </View>
            <View style={{ width: 60 }}>
              <Text style={[baseStyles.tableHeaderCell, { textAlign: 'center' }]}>Unit</Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={baseStyles.tableHeaderCell}>Notes</Text>
            </View>
            <View style={{ width: 50 }}>
              <Text style={[baseStyles.tableHeaderCell, { textAlign: 'center' }]}>Received</Text>
            </View>
          </View>

          {/* Item rows */}
          {items.map((item, index) => (
            <View
              key={index}
              style={[
                baseStyles.tableRow,
                index % 2 === 1 ? baseStyles.tableRowAlt : {},
              ]}
              wrap={false}
            >
              <View style={{ flex: 3 }}>
                <Text style={baseStyles.tableCell}>{item.name}</Text>
              </View>
              <View style={{ width: 60 }}>
                <Text style={baseStyles.tableCellCenter}>{item.quantity}</Text>
              </View>
              <View style={{ width: 60 }}>
                <Text style={baseStyles.tableCellCenter}>{item.unit}</Text>
              </View>
              <View style={{ flex: 2 }}>
                <Text style={baseStyles.tableCell}>{item.notes || ''}</Text>
              </View>
              {/* Checkbox for received confirmation */}
              <View style={{ width: 50, alignItems: 'center', justifyContent: 'center' }}>
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderWidth: 1,
                    borderColor: colours.text,
                  }}
                />
              </View>
            </View>
          ))}

          {/* Total row */}
          <View style={[baseStyles.tableRow, { backgroundColor: colours.headerBg }]}>
            <View style={{ flex: 1 }}>
              <Text style={[baseStyles.tableCell, baseStyles.bold]}>
                Total Items: {items.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Prepared by */}
        {preparedBy && (
          <View style={baseStyles.mt12}>
            <Text style={baseStyles.tableCell}>
              <Text style={baseStyles.bold}>Prepared by: </Text>
              {preparedBy}
            </Text>
          </View>
        )}

        {/* Signature section */}
        <View style={[baseStyles.mt12, { marginTop: 40 }]}>
          <View style={baseStyles.spaceBetween}>
            <View>
              <View style={baseStyles.signatureLine}>
                <Text style={baseStyles.signatureLabel}>Received By (Print Name)</Text>
              </View>
            </View>
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

export default DeliveryNotePDF;
