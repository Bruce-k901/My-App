import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { renderToBuffer } from '@react-pdf/renderer';
import { PurchaseOrderPDF } from '@/lib/pdf/templates/PurchaseOrderPDF';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    // 2. Get PO ID from query params
    const searchParams = request.nextUrl.searchParams;
    const poId = searchParams.get('id');

    if (!poId) {
      return NextResponse.json({ error: 'Purchase order ID is required' }, { status: 400 });
    }

    // 3. Fetch PO with all related data
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        order_number,
        order_date,
        expected_delivery_date,
        subtotal,
        tax,
        total,
        notes,
        supplier:suppliers!supplier_id(
          id,
          name,
          address,
          phone,
          email
        ),
        lines:purchase_order_lines(
          id,
          quantity_ordered,
          unit_price,
          line_total,
          product_variant:product_variants!product_variant_id(
            product_name,
            pack_size,
            pack_unit:uom!pack_unit_id(abbreviation),
            stock_item:stock_items!stock_item_id(name, base_unit:uom!base_unit_id(abbreviation))
          )
        )
      `)
      .eq('id', poId)
      .eq('company_id', profile.company_id)
      .single();

    if (poError || !po) {
      console.error('PO fetch error:', poError);
      return NextResponse.json(
        { error: 'Purchase order not found or access denied' },
        { status: 404 },
      );
    }

    // 4. Fetch company details
    const { data: company } = await supabase
      .from('companies')
      .select('name, address, phone, email')
      .eq('id', profile.company_id)
      .single();

    // 5. Transform data for PDF
    const supplier = po.supplier as any;
    const lines = (po.lines as any[]) || [];

    const items = lines.map((line: any) => {
      const variant = line.product_variant;
      const stockItem = variant?.stock_item;
      const packUnit = variant?.pack_unit?.abbreviation || '';
      const baseUnit = stockItem?.base_unit?.abbreviation || 'ea';

      // Use stock item name if available, fallback to product name
      const itemName = stockItem?.name || variant?.product_name || 'Unknown Item';

      // Use pack_size + pack_unit if available, else just base unit
      const unit = variant?.pack_size
        ? `${variant.pack_size}${packUnit}`
        : baseUnit;

      return {
        name: itemName,
        quantity: line.quantity_ordered || 0,
        unit,
        unitPrice: line.unit_price || 0,
        lineTotal: line.line_total || 0,
      };
    });

    // 6. Generate PDF
    const pdfBuffer = await renderToBuffer(
      <PurchaseOrderPDF
        orderNumber={po.order_number}
        orderDate={po.order_date}
        expectedDeliveryDate={po.expected_delivery_date}
        supplier={{
          name: supplier?.name || 'Unknown Supplier',
          address: supplier?.address,
          phone: supplier?.phone,
          email: supplier?.email,
        }}
        company={{
          name: company?.name || 'Your Company',
          address: company?.address,
          phone: company?.phone,
          email: company?.email,
        }}
        items={items}
        subtotal={po.subtotal || 0}
        tax={po.tax || 0}
        total={po.total || 0}
        notes={po.notes}
      />,
    );

    // 7. Return PDF as download
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PO-${po.order_number}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 },
    );
  }
}
