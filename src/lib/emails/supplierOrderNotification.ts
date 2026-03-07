/**
 * Generate HTML email template for sending purchase orders to suppliers.
 * Sent when an order is emailed to a supplier from the Stockly orders page.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const OPSLY_LOGO = `<img src="https://opslytech.com/logos/opsly-logo-email.png" alt="Opsly" width="120" style="display: block; margin: 0 auto 24px;" />`

export interface OrderLine {
  productName: string
  quantity: number
  unit?: string
  unitPrice?: number
  lineTotal?: number
}

export function generateSupplierOrderEmailHTML({
  companyName,
  supplierName,
  contactName,
  orderNumber,
  orderDate,
  expectedDelivery,
  lines,
  subtotal,
  tax,
  total,
  notes,
}: {
  companyName: string
  supplierName: string
  contactName?: string
  orderNumber: string
  orderDate: string
  expectedDelivery: string
  lines: OrderLine[]
  subtotal?: number
  tax?: number
  total?: number
  notes?: string | null
}): string {
  const greeting = contactName ? escapeHtml(contactName) : escapeHtml(supplierName)

  const formatCurrency = (val: number) =>
    val.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })

  const showPricing = lines.some(l => l.unitPrice != null)

  const lineRows = lines
    .map(
      (l) =>
        `<tr>
          <td style="padding: 8px 12px; color: #1a1a2e; font-size: 13px; border-bottom: 1px solid #e4e4e7;">${escapeHtml(l.productName)}</td>
          <td style="padding: 8px 12px; color: #1a1a2e; font-size: 13px; text-align: right; border-bottom: 1px solid #e4e4e7;">${l.quantity}${l.unit ? ` ${escapeHtml(l.unit)}` : ''}</td>
          ${showPricing ? `<td style="padding: 8px 12px; color: #1a1a2e; font-size: 13px; text-align: right; border-bottom: 1px solid #e4e4e7;">${l.unitPrice != null ? formatCurrency(l.unitPrice) : ''}</td>
          <td style="padding: 8px 12px; color: #1a1a2e; font-size: 13px; text-align: right; font-weight: 500; border-bottom: 1px solid #e4e4e7;">${l.lineTotal != null ? formatCurrency(l.lineTotal) : ''}</td>` : ''}
        </tr>`
    )
    .join('')

  const totalsBlock =
    showPricing && total != null
      ? `
        ${subtotal != null ? `<tr>
          <td colspan="${showPricing ? 3 : 1}" style="padding: 6px 12px; text-align: right; color: #a1a1aa; font-size: 13px;">Subtotal</td>
          <td style="padding: 6px 12px; text-align: right; color: #1a1a2e; font-size: 13px; font-weight: 500;">${formatCurrency(subtotal)}</td>
        </tr>` : ''}
        ${tax != null && tax > 0 ? `<tr>
          <td colspan="${showPricing ? 3 : 1}" style="padding: 6px 12px; text-align: right; color: #a1a1aa; font-size: 13px;">VAT</td>
          <td style="padding: 6px 12px; text-align: right; color: #1a1a2e; font-size: 13px; font-weight: 500;">${formatCurrency(tax)}</td>
        </tr>` : ''}
        <tr>
          <td colspan="${showPricing ? 3 : 1}" style="padding: 8px 12px; text-align: right; color: #1a1a2e; font-size: 14px; font-weight: 700;">Total</td>
          <td style="padding: 8px 12px; text-align: right; color: #1a1a2e; font-size: 14px; font-weight: 700;">${formatCurrency(total)}</td>
        </tr>`
      : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #f4f4f5; margin: 0; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7;">
    <tr>
      <td style="padding: 40px 30px;">
        <!-- Logo -->
        <div style="text-align: center;">
          ${OPSLY_LOGO}
          <h2 style="color: #1a1a2e; font-size: 22px; font-weight: bold; margin: 0 0 4px;">Purchase Order</h2>
          <p style="color: #a1a1aa; font-size: 13px; margin: 0 0 24px;">${escapeHtml(orderNumber)}</p>
        </div>

        <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">Hi ${greeting},</p>
        <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">Please find our order details below.</p>

        <!-- Order Info -->
        <table cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f4f4f5; border-radius: 8px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 16px 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #a1a1aa; font-size: 13px; width: 120px;">From</td>
                  <td style="padding: 4px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${escapeHtml(companyName)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #a1a1aa; font-size: 13px;">Order Date</td>
                  <td style="padding: 4px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${escapeHtml(orderDate)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #a1a1aa; font-size: 13px;">Delivery Date</td>
                  <td style="padding: 4px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${escapeHtml(expectedDelivery)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Order Lines -->
        <table cellspacing="0" cellpadding="0" style="width: 100%; border: 1px solid #e4e4e7; border-radius: 8px; border-collapse: separate; margin-bottom: 20px;">
          <tr style="background-color: #f4f4f5;">
            <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e4e4e7;">Item</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e4e4e7;">Qty</th>
            ${showPricing ? `<th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e4e4e7;">Price</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e4e4e7;">Total</th>` : ''}
          </tr>
          ${lineRows}
          ${totalsBlock}
        </table>

        ${notes ? `
        <!-- Notes -->
        <table cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f4f4f5; border-radius: 8px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 12px 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px;">Notes</p>
              <p style="margin: 0; font-size: 13px; color: #52525b; line-height: 1.5;">${escapeHtml(notes)}</p>
            </td>
          </tr>
        </table>` : ''}

        <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin: 0 0 0;">Thanks,<br><strong>${escapeHtml(companyName)}</strong></p>

        <p style="color: #a1a1aa; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #e4e4e7; padding-top: 20px;">Sent via Opsly</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
