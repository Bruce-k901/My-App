import { Document, Page, View, Text } from '@react-pdf/renderer';
import { PDFHeader } from '../components/PDFHeader';
import { PDFFooter } from '../components/PDFFooter';
import { baseStyles, colours, formatUKDate } from '../components/PDFStyles';

interface POLineItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

export interface PurchaseOrderPDFProps {
  orderNumber: string;
  orderDate: string;
  expectedDeliveryDate: string | null;
  supplier: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  items: POLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export function PurchaseOrderPDF({
  orderNumber,
  orderDate,
  expectedDeliveryDate,
  supplier,
  company,
  items,
  subtotal,
  tax,
  total,
  notes,
}: PurchaseOrderPDFProps) {
  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PDFHeader
          title="Purchase Order"
          siteName={company.name}
          date={orderDate}
        />

        {/* PO Number - prominent */}
        <View style={[baseStyles.summaryBox, baseStyles.mb12]}>
          <View style={baseStyles.spaceBetween}>
            <View>
              <Text style={baseStyles.summaryLabel}>Purchase Order #</Text>
              <Text style={[baseStyles.summaryValue, { fontSize: 14 }]}>{orderNumber}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={baseStyles.summaryLabel}>Order Date</Text>
              <Text style={baseStyles.summaryValue}>{formatUKDate(orderDate)}</Text>
            </View>
          </View>
          {expectedDeliveryDate && (
            <View style={{ marginTop: 8 }}>
              <Text style={baseStyles.summaryLabel}>Expected Delivery</Text>
              <Text style={baseStyles.summaryValue}>{formatUKDate(expectedDeliveryDate)}</Text>
            </View>
          )}
        </View>

        {/* From / To */}
        <View style={[baseStyles.section, baseStyles.mb12]}>
          <View style={baseStyles.spaceBetween}>
            {/* From (Buyer) */}
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[baseStyles.bold, baseStyles.mb4]}>From (Buyer)</Text>
              <Text style={[baseStyles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>{company.name}</Text>
              {company.address && (
                <Text style={[baseStyles.tableCell, { marginTop: 2 }]}>{company.address}</Text>
              )}
              {company.phone && (
                <Text style={[baseStyles.tableCell, { marginTop: 2 }]}>Tel: {company.phone}</Text>
              )}
              {company.email && (
                <Text style={[baseStyles.tableCell, { marginTop: 2 }]}>{company.email}</Text>
              )}
            </View>

            {/* To (Supplier) */}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[baseStyles.bold, baseStyles.mb4]}>To (Supplier)</Text>
              <Text style={[baseStyles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>{supplier.name}</Text>
              {supplier.address && (
                <Text style={[baseStyles.tableCell, { marginTop: 2 }]}>{supplier.address}</Text>
              )}
              {supplier.phone && (
                <Text style={[baseStyles.tableCell, { marginTop: 2 }]}>Tel: {supplier.phone}</Text>
              )}
              {supplier.email && (
                <Text style={[baseStyles.tableCell, { marginTop: 2 }]}>{supplier.email}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Items table */}
        <View style={baseStyles.section}>
          <Text style={baseStyles.sectionTitle}>Order Items</Text>

          {/* Table header */}
          <View style={baseStyles.tableHeader}>
            <View style={{ flex: 3 }}>
              <Text style={baseStyles.tableHeaderCell}>Description</Text>
            </View>
            <View style={{ width: 60, alignItems: 'flex-end' }}>
              <Text style={baseStyles.tableHeaderCell}>Qty</Text>
            </View>
            <View style={{ width: 50, alignItems: 'center' }}>
              <Text style={baseStyles.tableHeaderCell}>Unit</Text>
            </View>
            <View style={{ width: 70, alignItems: 'flex-end' }}>
              <Text style={baseStyles.tableHeaderCell}>Unit Price</Text>
            </View>
            <View style={{ width: 80, alignItems: 'flex-end' }}>
              <Text style={baseStyles.tableHeaderCell}>Line Total</Text>
            </View>
          </View>

          {/* Table rows */}
          {items.map((item, idx) => (
            <View
              key={idx}
              style={[
                baseStyles.tableRow,
                idx % 2 === 1 && { backgroundColor: colours.alternateRow },
              ]}
            >
              <View style={{ flex: 3 }}>
                <Text style={baseStyles.tableCell}>{item.name}</Text>
              </View>
              <View style={{ width: 60, alignItems: 'flex-end' }}>
                <Text style={baseStyles.tableCell}>{item.quantity}</Text>
              </View>
              <View style={{ width: 50, alignItems: 'center' }}>
                <Text style={baseStyles.tableCell}>{item.unit}</Text>
              </View>
              <View style={{ width: 70, alignItems: 'flex-end' }}>
                <Text style={baseStyles.tableCell}>£{item.unitPrice.toFixed(2)}</Text>
              </View>
              <View style={{ width: 80, alignItems: 'flex-end' }}>
                <Text style={baseStyles.tableCell}>£{item.lineTotal.toFixed(2)}</Text>
              </View>
            </View>
          ))}

          {/* Totals */}
          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: colours.border, paddingTop: 8 }}>
            <View style={[baseStyles.spaceBetween, { marginBottom: 4 }]}>
              <Text style={[baseStyles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>Subtotal:</Text>
              <Text style={baseStyles.tableCell}>£{subtotal.toFixed(2)}</Text>
            </View>
            <View style={[baseStyles.spaceBetween, { marginBottom: 4 }]}>
              <Text style={[baseStyles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>VAT:</Text>
              <Text style={baseStyles.tableCell}>£{tax.toFixed(2)}</Text>
            </View>
            <View style={[baseStyles.spaceBetween, { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: colours.border }]}>
              <Text style={[baseStyles.tableCell, { fontFamily: 'Helvetica-Bold', fontSize: 11 }]}>Total:</Text>
              <Text style={[baseStyles.tableCell, { fontFamily: 'Helvetica-Bold', fontSize: 11 }]}>£{total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {notes && (
          <View style={[baseStyles.section, { marginTop: 15 }]}>
            <Text style={[baseStyles.bold, baseStyles.mb4]}>Notes</Text>
            <Text style={baseStyles.tableCell}>{notes}</Text>
          </View>
        )}

        {/* Payment terms */}
        <View style={[baseStyles.section, { marginTop: 15 }]}>
          <Text style={[baseStyles.tableCell, { color: colours.textLight }]}>
            Payment terms as agreed. Please confirm receipt of this order.
          </Text>
        </View>

        <PDFFooter pageNumber={1} totalPages={1} />
      </Page>
    </Document>
  );
}
