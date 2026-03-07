import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { renderToBuffer } from '@react-pdf/renderer';
import { PurchaseOrderPDF } from '@/lib/pdf/templates/PurchaseOrderPDF';

const STORAGE_BUCKET = 'purchase-orders-pdfs';

export async function POST(request: NextRequest) {
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

    // 2. Parse request body
    const body = await request.json();
    const { purchaseOrderId, recipientWhatsApp, message } = body;

    if (!purchaseOrderId || !recipientWhatsApp) {
      return NextResponse.json(
        { error: 'purchaseOrderId and recipientWhatsApp are required' },
        { status: 400 },
      );
    }

    // 3. Fetch PO with all related data (same as PDF route)
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
      .eq('id', purchaseOrderId)
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

      const itemName = stockItem?.name || variant?.product_name || 'Unknown Item';
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

    // 7. Upload PDF to Supabase Storage
    const admin = getSupabaseAdmin();
    const storagePath = `${profile.company_id}/${purchaseOrderId}.pdf`;

    const { error: uploadError } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Allow overwriting for resends
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload PDF to storage' },
        { status: 500 },
      );
    }

    // 8. Get signed URL (expires in 7 days)
    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
    const { data: signedUrlData, error: urlError } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (urlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL error:', urlError);
      return NextResponse.json(
        { error: 'Failed to generate PDF URL' },
        { status: 500 },
      );
    }

    // 9. Send WhatsApp message
    const whatsappMessage = message
      ? `${message}\n\nView Purchase Order ${po.order_number}: ${signedUrlData.signedUrl}`
      : `Purchase Order ${po.order_number}\n\nView: ${signedUrlData.signedUrl}`;

    const whatsappResponse = await fetch(
      `${request.nextUrl.origin}/api/whatsapp/send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') || '', // Forward auth cookies
        },
        body: JSON.stringify({
          phone_number: recipientWhatsApp,
          text: whatsappMessage,
        }),
      },
    );

    if (!whatsappResponse.ok) {
      const errorData = await whatsappResponse.json();
      return NextResponse.json(
        { error: 'Failed to send WhatsApp message', details: errorData },
        { status: 500 },
      );
    }

    // 10. Update PO record
    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({
        sent_via: 'whatsapp',
        sent_at: new Date().toISOString(),
        sent_message: whatsappMessage,
        status: 'sent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchaseOrderId)
      .eq('company_id', profile.company_id);

    if (updateError) {
      console.error('PO update error:', updateError);
      // Don't fail the request if update fails - message was sent
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase order sent via WhatsApp',
      pdfUrl: signedUrlData.signedUrl,
    });
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    return NextResponse.json(
      { error: 'Failed to send purchase order', details: error.message },
      { status: 500 },
    );
  }
}
